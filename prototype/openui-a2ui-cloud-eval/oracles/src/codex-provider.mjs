import { spawnSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs";

const disabledFeatures = [
  "shell_tool",
  "unified_exec",
  "code_mode_host",
  "apps",
  "plugins",
  "memories",
  "browser_use",
  "computer_use",
  "image_generation",
  "workspace_dependencies",
  "goals",
  "skill_search",
  "tool_suggest",
  "hooks",
];

export class CodexProviderError extends Error {
  constructor(message, { eventsRaw = "", stderr = "", toolActivity = [] } = {}) {
    super(message);
    this.name = "CodexProviderError";
    this.eventsRaw = eventsRaw;
    this.stderr = stderr;
    this.toolActivity = toolActivity;
  }
}

export function buildCodexArgs({
  outputPath,
  model = "gpt-5.6-luna",
  reasoningEffort = "low",
}) {
  return [
    "exec",
    "--ephemeral",
    "--ignore-user-config",
    "--ignore-rules",
    "-m",
    model,
    "-c",
    `model_reasoning_effort=${JSON.stringify(reasoningEffort)}`,
    "-s",
    "read-only",
    "--skip-git-repo-check",
    "--color",
    "never",
    "--json",
    ...disabledFeatures.flatMap((feature) => ["--disable", feature]),
    "-o",
    outputPath,
    "-",
  ];
}

export function parseCodexEvents(source) {
  const events = source
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const completed = events.findLast((event) => event.type === "turn.completed");
  if (!completed?.usage) throw new Error("Codex event stream has no turn.completed usage");
  const threadId = events.find((event) => event.type === "thread.started")?.thread_id ?? null;
  const toolActivity = events
    .filter((event) => event.type === "item.completed")
    .map((event) => event.item?.type)
    .filter((type) => type && !["agent_message", "reasoning"].includes(type));
  const usage = completed.usage;
  return {
    events,
    threadId,
    toolActivity,
    usage: {
      input_tokens: usage.input_tokens ?? 0,
      cached_input_tokens: usage.cached_input_tokens ?? 0,
      cache_write_input_tokens: usage.cache_write_input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
      reasoning_tokens: usage.reasoning_output_tokens ?? 0,
      total_tokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
      estimated_cost_usd: null,
      usage_source: "codex-cli-chatgpt-plan",
    },
  };
}

export function generateWithCodex({
  prompt,
  outputPath,
  codexHome,
  cwd,
  command = "codex",
  model = "gpt-5.6-luna",
  reasoningEffort = "low",
  maxResponseBytes,
  timeoutMs = 180_000,
}) {
  const started = performance.now();
  const result = spawnSync(
    command,
    buildCodexArgs({ outputPath, model, reasoningEffort }),
    {
      cwd,
      env: { ...process.env, CODEX_HOME: codexHome },
      input: prompt,
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024,
      timeout: timeoutMs,
    },
  );
  const elapsedMs = performance.now() - started;
  if (result.error || result.status !== 0) {
    const detail = String(result.error?.message ?? result.stderr ?? `exit ${result.status}`).slice(0, 2000);
    throw new CodexProviderError(`Codex provider failed: ${detail}`, {
      eventsRaw: result.stdout ?? "",
      stderr: result.stderr ?? "",
    });
  }
  let parsed;
  try {
    parsed = parseCodexEvents(result.stdout);
  } catch (error) {
    throw new CodexProviderError(`Codex event parsing failed: ${error.message}`, {
      eventsRaw: result.stdout,
      stderr: result.stderr,
    });
  }
  if (parsed.toolActivity.length) {
    throw new CodexProviderError(
      `Codex tool activity is forbidden: ${parsed.toolActivity.join(", ")}`,
      {
        eventsRaw: result.stdout,
        stderr: result.stderr,
        toolActivity: parsed.toolActivity,
      },
    );
  }
  const outputBytes = statSync(outputPath).size;
  const outputTooLarge = outputBytes > maxResponseBytes;
  const output = outputTooLarge
    ? readPrefix(outputPath, maxResponseBytes)
    : readFileSync(outputPath, "utf8");
  return {
    output,
    outputBytes,
    outputTooLarge,
    elapsedMs,
    stderr: result.stderr,
    eventsRaw: result.stdout,
    ...parsed,
  };
}

function readPrefix(filePath, maxBytes) {
  const descriptor = openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(maxBytes);
    const bytesRead = readSync(descriptor, buffer, 0, maxBytes, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    closeSync(descriptor);
  }
}

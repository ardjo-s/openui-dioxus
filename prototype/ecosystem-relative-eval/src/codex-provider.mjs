import { randomUUID } from "node:crypto";
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";

import { runBoundedProcess } from "./subprocess.mjs";

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
  constructor(message, {
    eventsRaw = "",
    stderr = "",
    toolActivity = [],
    elapsedMs = 0,
    output = "",
    outputBytes = 0,
    usage = null,
  } = {}) {
    super(message);
    this.name = "CodexProviderError";
    this.eventsRaw = eventsRaw;
    this.stderr = stderr;
    this.toolActivity = toolActivity;
    this.elapsedMs = elapsedMs;
    this.output = output;
    this.outputBytes = outputBytes;
    this.usage = usage;
  }
}

export function buildCodexArgs({ outputPath, model = "gpt-5.6-luna", reasoningEffort = "low" }) {
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

export function buildProviderEnvironment({ codexHome, cwd, source = process.env }) {
  const locale = source.LANG ?? source.LC_ALL ?? "C.UTF-8";
  return {
    CODEX_HOME: codexHome,
    HOME: cwd,
    LANG: locale,
    LC_ALL: source.LC_ALL ?? locale,
    NO_COLOR: "1",
    PATH: source.PATH ?? "/usr/bin:/bin",
    TERM: "dumb",
    TMPDIR: path.join(cwd, "tmp"),
  };
}

export function parseCodexEvents(source) {
  const events = source.split("\n").filter(Boolean).map((line) => JSON.parse(line));
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

export async function generateWithCodex({
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
  const temporaryOutput = `${outputPath}.provider-${randomUUID()}`;
  closeSync(openSync(temporaryOutput, "wx", 0o600));
  const environment = buildProviderEnvironment({ codexHome, cwd });
  mkdirSync(environment.TMPDIR, { recursive: true, mode: 0o700 });
  const started = performance.now();
  let result;
  try {
    result = await runBoundedProcess({
      command,
      args: buildCodexArgs({ outputPath: temporaryOutput, model, reasoningEffort }),
      cwd,
      env: environment,
      input: prompt,
      maximumBytes: 2 * 1024 * 1024,
      timeoutMs,
    });
    const elapsedMs = performance.now() - started;
    const eventsRaw = result.stdout ?? "";
    const stderr = result.stderr ?? "";
    const outputBytes = statSync(temporaryOutput).size;
    const output = outputBytes > maxResponseBytes
      ? readPrefix(temporaryOutput, maxResponseBytes)
      : readFileSync(temporaryOutput, "utf8");
    const parsed = safeParseEvents(eventsRaw);
    if (result.error || result.exitCode !== 0 || !result.process_group_reaped) {
      const detail = String(result.error ?? stderr ?? `exit ${result.exitCode}`).slice(0, 2000);
      throw new CodexProviderError(`Codex provider failed: ${detail}`, {
        eventsRaw,
        stderr,
        elapsedMs,
        output,
        outputBytes,
        usage: parsed?.usage ?? null,
        toolActivity: parsed?.toolActivity ?? [],
      });
    }
    if (!parsed) {
      throw new CodexProviderError("Codex event parsing failed: no completed usage event", {
        eventsRaw,
        stderr,
        elapsedMs,
        output,
        outputBytes,
      });
    }
    if (parsed.toolActivity.length) {
      throw new CodexProviderError(`Codex tool activity is forbidden: ${parsed.toolActivity.join(", ")}`, {
        eventsRaw,
        stderr,
        toolActivity: parsed.toolActivity,
        elapsedMs,
        output,
        outputBytes,
        usage: parsed.usage,
      });
    }
    return {
      output,
      outputBytes,
      outputTooLarge: outputBytes > maxResponseBytes,
      elapsedMs,
      stderr,
      eventsRaw,
      ...parsed,
    };
  } finally {
    try {
      unlinkSync(temporaryOutput);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

function safeParseEvents(source) {
  try {
    return parseCodexEvents(source);
  } catch {
    return null;
  }
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

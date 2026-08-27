import path from "node:path";

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
    processStarted = false,
    threadStarted = false,
    turnCompleted = false,
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
    this.processStarted = processStarted;
    this.threadStarted = threadStarted;
    this.turnCompleted = turnCompleted;
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
  const events = parseEventLines(source);
  assertLifecycleEventSchemas(events);
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

export function inspectCodexEvents(source) {
  const events = parseEventLines(source);
  assertLifecycleEventSchemas(events);
  const threadStarts = positions(events, "thread.started");
  const completedTurns = positions(events, "turn.completed");
  return {
    thread_started: threadStarts.length > 0,
    turn_completed: completedTurns.length > 0,
    thread_start_count: threadStarts.length,
    turn_completed_count: completedTurns.length,
    ordered: completedTurns.length === 0
      || (threadStarts.length > 0
        && threadStarts.at(-1) < completedTurns[0]
        && completedTurns.at(-1) === events.length - 1),
  };
}

export function verifyProviderEventEvidence({ records, eventSources }) {
  for (const record of records) {
    if (record.provider_process_started === true && record.provider_invocation_attempted !== true) {
      throw new Error("provider process start lacks an invocation attempt");
    }
    if (record.provider_thread_started === true && record.provider_process_started !== true) {
      throw new Error("provider thread start lacks a started process");
    }
    if (record.provider_completed === true && record.provider_thread_started !== true) {
      throw new Error("provider completion lacks a started thread");
    }
  }
  const invocations = records.filter((record) => record.provider_invocation_attempted === true);
  const expectedFiles = invocations.map((record) => `${record.evidence_stem}.jsonl`).sort();
  const actualFiles = [...eventSources.keys()].sort();
  if (new Set(expectedFiles).size !== expectedFiles.length
    || JSON.stringify(expectedFiles) !== JSON.stringify(actualFiles)) {
    throw new Error("provider event file inventory differs from invocation records");
  }
  const counts = { files: actualFiles.length, thread_starts: 0, completed_turns: 0 };
  for (const record of invocations) {
    const state = inspectCodexEvents(eventSources.get(`${record.evidence_stem}.jsonl`));
    if (state.thread_start_count > 1 || state.turn_completed_count > 1) {
      throw new Error("provider event stream must contain exactly zero or one thread start and completion");
    }
    if (!state.ordered) throw new Error("provider event stream is out of order");
    if (state.thread_started !== (record.provider_thread_started === true)
      || state.turn_completed !== (record.provider_completed === true)) {
      throw new Error("provider event stream differs from its invocation record");
    }
    counts.thread_starts += state.thread_start_count;
    counts.completed_turns += state.turn_completed_count;
  }
  return counts;
}

function parseEventLines(source) {
  return source.split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function assertLifecycleEventSchemas(events) {
  for (const event of events) {
    if (event?.type === "thread.started"
      && (typeof event.thread_id !== "string" || event.thread_id.trim().length === 0)) {
      throw new Error("invalid thread.started event");
    }
    if (event?.type === "turn.completed") {
      const usage = event.usage;
      if (!usage || typeof usage !== "object" || Array.isArray(usage)) {
        throw new Error("invalid turn.completed event");
      }
      for (const field of ["input_tokens", "cached_input_tokens", "output_tokens"]) {
        if (!Number.isSafeInteger(usage[field]) || usage[field] < 0) {
          throw new Error(`invalid turn.completed usage field: ${field}`);
        }
      }
      for (const [field, value] of Object.entries(usage).filter(([field]) => field.endsWith("_tokens"))) {
        if (!Number.isSafeInteger(value) || value < 0) {
          throw new Error(`invalid turn.completed usage field: ${field}`);
        }
      }
    }
  }
}

function positions(events, type) {
  return events.flatMap((event, index) => event.type === type ? [index] : []);
}

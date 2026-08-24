import { encodeExpected } from "./protocols.mjs";
import { generateWithCodex } from "../../openui-a2ui-cloud-eval/oracles/src/codex-provider.mjs";

const firstAttemptFailures = {
  openui: new Set([4, 12]),
  "typed-json": new Set([8, 16]),
};

export function fakeGenerate({ protocol, passage, attempt, scenario }) {
  const valid = encodeExpected(protocol, scenario.expected);
  const shouldFail = attempt === 1 && firstAttemptFailures[protocol].has(passage);
  const output = shouldFail
    ? protocol === "openui"
      ? "root = UnknownComponent()"
      : JSON.stringify({ ...scenario.expected, unexpected: true })
    : valid;
  return {
    output,
    provider_ms: 8 + passage + (protocol === "typed-json" ? 2 : 0) + attempt,
    usage_source: "deterministic-fake-provider",
  };
}

export function generateOutput({ provider, protocol, passage, attempt, scenario, instructions, userPrompt, rawPath, maxResponseBytes }) {
  if (provider === "fake") return fakeGenerate({ protocol, passage, attempt, scenario });
  if (provider !== "codex") throw new Error(`unknown provider: ${provider}`);
  const codexHome = process.env.EVAL_CODEX_HOME;
  const cwd = process.env.EVAL_CODEX_WORKDIR;
  if (!codexHome || !cwd) throw new Error("EVAL_CODEX_HOME and EVAL_CODEX_WORKDIR are required for provider=codex");
  const result = generateWithCodex({
    prompt: ["SYSTEM INSTRUCTIONS", instructions, "USER REQUEST", userPrompt].join("\n\n"),
    outputPath: rawPath,
    codexHome,
    cwd,
    command: process.env.EVAL_CODEX_BIN ?? "codex",
    model: "gpt-5.6-luna",
    reasoningEffort: "low",
    maxResponseBytes,
    timeoutMs: Number(process.env.EVAL_CODEX_TIMEOUT_MS ?? 180_000),
  });
  return {
    output: result.output,
    provider_ms: result.elapsedMs,
    usage_source: result.usage.usage_source,
    provider_usage: result.usage,
    response_bytes: result.outputBytes,
    events_raw: result.eventsRaw,
    stderr: result.stderr,
  };
}

export function repairPrompt(sharedPrompt, output, diagnostics) {
  return [
    sharedPrompt,
    "REPAIR THE PREVIOUS PAYLOAD",
    output,
    "VALIDATOR DIAGNOSTICS",
    JSON.stringify(diagnostics),
    "Return one complete corrected payload only.",
  ].join("\n\n");
}

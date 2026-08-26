import { generateWithCodex } from "./codex-provider.mjs";

import { encodeExpectedRoute } from "./routes.mjs";

const deterministicFailures = new Set([
  "01-validated-profile-v1:openui",
  "02-preferences-v1:typed-json",
  "compile-03-filter-action-v1:direct-rsx",
  "compile-04-status-dialog-v1:json-render",
]);

export const repairInstruction = "Return one complete corrected output only.";

export function fakeGenerate({ route, scheduleScenarioId, attempt, scenario }) {
  const valid = encodeExpectedRoute(route, scenario);
  const shouldFail = attempt === 1 && deterministicFailures.has(`${scheduleScenarioId}:${route}`);
  let output = valid;
  if (shouldFail && route === "openui") output = "root = UnknownComponent()";
  if (shouldFail && route === "typed-json") output = JSON.stringify({ unexpected: true });
  if (shouldFail && route === "json-render") output = `explanation\n${valid}`;
  if (shouldFail && route === "direct-rsx") output = `${valid}\nfn leak() { std::fs::read_to_string(\"/tmp/x\").unwrap(); }`;
  return {
    output,
    provider_ms: 5 + attempt + route.length,
    usage_source: "deterministic-fake-provider",
    provider_usage: null,
    response_bytes: Buffer.byteLength(output),
  };
}

export async function generateRouteOutput({ provider, route, scheduleScenarioId, attempt, scenario, instructions, userPrompt, rawPath, maximumResponseBytes, timeoutMs }) {
  if (provider === "fake") return fakeGenerate({ route, scheduleScenarioId, attempt, scenario });
  if (provider !== "codex") throw new Error(`unknown provider: ${provider}`);
  const codexHome = process.env.EVAL_CODEX_HOME;
  const cwd = process.env.EVAL_CODEX_WORKDIR;
  if (!codexHome || !cwd) throw new Error("EVAL_CODEX_HOME and EVAL_CODEX_WORKDIR are required for provider=codex");
  const result = await generateWithCodex({
    prompt: ["SYSTEM INSTRUCTIONS", instructions, "USER REQUEST", userPrompt].join("\n\n"),
    outputPath: rawPath,
    codexHome,
    cwd,
    command: process.env.EVAL_CODEX_BIN ?? "codex",
    model: "gpt-5.6-luna",
    reasoningEffort: "low",
    maxResponseBytes: maximumResponseBytes,
    timeoutMs: Math.min(Number(process.env.EVAL_CODEX_TIMEOUT_MS ?? 180_000), timeoutMs),
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

export function repairPrompt(original, output, diagnostics) {
  return [
    original,
    "REPAIR THE PREVIOUS OUTPUT",
    output,
    "VALIDATOR OR COMPILER DIAGNOSTICS",
    JSON.stringify(diagnostics),
    repairInstruction,
  ].join("\n\n");
}

import { encodeExpectedRoute } from "./routes.mjs";
import { OBSERVABLE_CONTRACT_V2 } from "./observable-contract-v2-scenarios.mjs";

const deterministicFailures = new Set([
  "01-validated-profile-v1:openui",
  "02-preferences-v1:typed-json",
  "compile-03-filter-action-v1:direct-rsx",
  "compile-04-status-dialog-v1:json-render",
  "h01-validated-profile-v1:openui",
  "h02-preferences-v1:typed-json",
  "compile-h03-filter-action-v1:direct-rsx",
  "compile-h04-status-dialog-v1:json-render",
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

export function repairPrompt(original, output, diagnostics, { contractVersion = null } = {}) {
  if (contractVersion === OBSERVABLE_CONTRACT_V2) {
    return [
      original,
      "REPAIR THE PREVIOUS OUTPUT",
      output,
      "VALIDATOR DIAGNOSTICS",
      JSON.stringify({
        contract_version: contractVersion,
        failed_checks: diagnostics,
      }),
      repairInstruction,
    ].join("\n\n");
  }
  return [
    original,
    "REPAIR THE PREVIOUS OUTPUT",
    output,
    "VALIDATOR OR COMPILER DIAGNOSTICS",
    JSON.stringify(diagnostics),
    repairInstruction,
  ].join("\n\n");
}

export function repairPromptTemplate({ contractVersion = null } = {}) {
  if (contractVersion === OBSERVABLE_CONTRACT_V2) {
    return `{original}\n\nREPAIR THE PREVIOUS OUTPUT\n\n{output}\n\nVALIDATOR DIAGNOSTICS\n\n{"contract_version":"${OBSERVABLE_CONTRACT_V2}","failed_checks":{diagnostics}}\n\n${repairInstruction}`;
  }
  return `{original}\n\nREPAIR THE PREVIOUS OUTPUT\n\n{output}\n\nVALIDATOR OR COMPILER DIAGNOSTICS\n\n{diagnostics}\n\n${repairInstruction}`;
}

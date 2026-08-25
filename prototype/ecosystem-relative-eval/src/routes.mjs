import {
  encodeExpected,
  protocolPrompt,
  semanticCoverage,
  validateProtocol,
} from "../../openui-typed-json-product-eval/src/protocols.mjs";

import { directRsxPrompt, encodeExpectedRsx, validateDirectRsx } from "./direct-rsx-route.mjs";
import { encodeExpectedJsonRender, jsonRenderPrompt, validateJsonRender } from "./json-render-route.mjs";
import { sha, stableJson } from "./hash.mjs";

export function routeInstructions(route, scenario) {
  if (route === "openui" || route === "typed-json") return protocolPrompt(route);
  if (route === "json-render") return jsonRenderPrompt();
  if (route === "direct-rsx") return directRsxPrompt();
  throw new Error(`unknown route: ${route}`);
}

export function routeUserPrompt(_route, scenario, cohort) {
  if (cohort === "compile-known") {
    return [
      "COMPILE-KNOWN COHORT",
      scenario.shared_prompt,
      "FROZEN COMPLETE UI SPECIFICATION",
      JSON.stringify(scenario.expected),
    ].join("\n\n");
  }
  return [
    "RUNTIME-UNCERTAIN COHORT",
    scenario.shared_prompt,
  ].join("\n\n");
}

export function encodeExpectedRoute(route, scenario) {
  if (route === "openui" || route === "typed-json") return encodeExpected(route, scenario.expected);
  if (route === "json-render") return encodeExpectedJsonRender(scenario.expected);
  if (route === "direct-rsx") return encodeExpectedRsx(scenario.expected);
  throw new Error(`unknown route: ${route}`);
}

export async function validateRoute(route, source, scenario, { deadlineMs = Number.POSITIVE_INFINITY } = {}) {
  if (route === "openui" || route === "typed-json") {
    const result = validateProtocol(route, source, scenario.expected.state);
    if (!result.ok) return { ok: false, diagnostics: result.diagnostics, wire: null, route_artifact: null, semantic_fingerprint: null };
    const coverage = semanticCoverage(result.wire, scenario.expected);
    if (!coverage.passed) {
      return {
        ok: false,
        diagnostics: coverage.diagnostics.map((message) => ({ code: "semantic-coverage", message })),
        wire: null,
        route_artifact: null,
        semantic_fingerprint: null,
      };
    }
    return {
      ok: true,
      diagnostics: [],
      wire: result.wire,
      route_artifact: result.wire,
      semantic_fingerprint: sha(stableJson(result.wire)),
    };
  }
  if (route === "json-render") {
    const result = validateJsonRender(source, scenario.expected);
    return {
      ok: result.ok,
      diagnostics: result.diagnostics,
      wire: null,
      route_artifact: result.spec,
      observable: result.observable,
      semantic_fingerprint: result.ok ? sha(stableJson(result.observable)) : null,
    };
  }
  if (route === "direct-rsx") {
    const result = await validateDirectRsx(source, scenario.expected, { deadlineMs });
    return {
      ok: result.ok,
      diagnostics: result.diagnostics,
      wire: null,
      route_artifact: result.rendered_html,
      rendered_html: result.rendered_html,
      compile_ms: result.compile_ms,
      run_ms: result.run_ms,
      compiled: result.compiled,
      semantic_fingerprint: result.ok ? sha(result.rendered_html) : null,
    };
  }
  throw new Error(`unknown route: ${route}`);
}

export function routeExtension(route) {
  if (route === "openui") return "openui";
  if (route === "direct-rsx") return "rs";
  if (route === "json-render") return "jsonl";
  return "json";
}

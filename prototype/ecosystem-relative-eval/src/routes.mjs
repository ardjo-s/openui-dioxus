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

export async function validateRoute(route, source, scenario, { deadlineMs = Number.POSITIVE_INFINITY, cohort = "compile-known" } = {}) {
  const exact = cohort === "compile-known";
  if (route === "openui" || route === "typed-json") {
    const result = validateProtocol(route, source, scenario.expected.state);
    if (!result.ok) return { ok: false, diagnostics: result.diagnostics, wire: null, route_artifact: null, semantic_fingerprint: null };
    const coverage = exact
      ? semanticCoverage(result.wire, scenario.expected)
      : runtimeContractCoverage(result.wire, scenario.shared_contract);
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
    const result = validateJsonRender(source, scenario.expected, { exact });
    const coverage = result.ok && !exact
      ? runtimeContractCoverage(result.observable, scenario.shared_contract)
      : { passed: result.ok, diagnostics: [] };
    return {
      ok: result.ok && coverage.passed,
      diagnostics: result.ok && !coverage.passed
        ? coverage.diagnostics.map((message) => ({ code: "semantic-coverage", message }))
        : result.diagnostics,
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

export function runtimeContractCoverage(artifact, contract) {
  const diagnostics = [];
  const nodes = artifact.nodes ?? [];
  const kinds = nodes.map((node) => node.kind).sort();
  if (JSON.stringify(kinds) !== JSON.stringify([...contract.acceptance.required_component_kinds].sort())) diagnostics.push("component-kinds");
  if (stableJson(artifact.state ?? {}) !== stableJson(contract.acceptance.required_state)) diagnostics.push("state");
  const actions = nodes.filter((node) => node.kind === "Button").map((node) => {
    const props = node.props ?? node;
    return { name: props.action, target_id: props.target_id };
  }).sort((left, right) => stableJson(left).localeCompare(stableJson(right)));
  const requiredActions = [...contract.acceptance.required_actions].map(({ name, target_id }) => ({ name, target_id }))
    .sort((left, right) => stableJson(left).localeCompare(stableJson(right)));
  if (stableJson(actions) !== stableJson(requiredActions)) diagnostics.push("actions");
  const ids = nodes.map((node) => node.id);
  if (ids.some((id) => typeof id !== "string" || !id) || new Set(ids).size !== ids.length || !ids.includes(artifact.root)) diagnostics.push("stable-ids");
  const supplied = suppliedWorkflowValues(contract);
  const observable = new Set(flattenValues({ kinds, state: artifact.state ?? {}, nodes }));
  for (const value of supplied) {
    if (!observable.has(value)) diagnostics.push(`supplied-value:${JSON.stringify(value)}`);
  }
  return { passed: diagnostics.length === 0, diagnostics };
}

function suppliedWorkflowValues(contract) {
  const text = contract.mcp_tool_result.content.find((entry) => entry.type === "text")?.text;
  if (!text) return [];
  return flattenValues(JSON.parse(text).workflow_data);
}

function flattenValues(value) {
  if (Array.isArray(value)) return value.flatMap(flattenValues);
  if (value && typeof value === "object") return Object.values(value).flatMap(flattenValues);
  return [value];
}

export function routeExtension(route) {
  if (route === "openui") return "openui";
  if (route === "direct-rsx") return "rs";
  if (route === "json-render") return "jsonl";
  return "json";
}

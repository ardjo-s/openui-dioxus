import {
  encodeExpected,
  protocolPrompt,
  semanticCoverage,
  validateProtocol,
} from "../../openui-typed-json-product-eval/src/protocols.mjs";

import { directRsxPrompt, encodeExpectedRsx, validateDirectRsx } from "./direct-rsx-route.mjs";
import { accessibilityContractForSurface, validateStructuredAccessibility } from "./accessibility-contract.mjs";
import { encodeExpectedJsonRender, jsonRenderPrompt, validateJsonRender } from "./json-render-route.mjs";
import { sha, stableJson } from "./hash.mjs";
import { observableBusinessProperties, OBSERVABLE_CONTRACT_V2 } from "./observable-contract-v2-scenarios.mjs";

export { OBSERVABLE_CONTRACT_V2 };

export const observableContractV2FinalChecklist = [
  "OBSERVABLE-CONTRACT-V2 FINAL CHECKLIST",
  "Treat exact_component_multiset as exact counts. Do not add a known catalog component unless its count is required.",
  "Treat exact_host_semantic_state as exact. Do not add host state keys.",
  "Route-native immutable display data is allowed only when every leaf comes from the supplied MCP result, is read only, is referenced by an observable prop, and cannot drive a watcher, action, effect, update, visibility rule, repeat, or replay behavior.",
  "Generic route guidance about sample data, layout containers, or realistic content never overrides the scenario acceptance object.",
  "Use only supplied business values, required actions, and stable nonempty component ids.",
  "Before returning, self-check the complete payload against every acceptance field.",
].join("\n");

export function routeInstructions(route, scenario) {
  if (route === "openui" || route === "typed-json") return protocolPrompt(route);
  if (route === "json-render") return jsonRenderPrompt();
  if (route === "direct-rsx") return directRsxPrompt();
  throw new Error(`unknown route: ${route}`);
}

export function routeUserPrompt(_route, scenario, cohort, { contractVersion = null } = {}) {
  const accessibility = [
    "BYTE-IDENTICAL OBSERVABLE ACCESSIBILITY CONTRACT",
    JSON.stringify(accessibilityContractForSurface(scenario.expected)),
    "ROUTE-NEUTRAL ACCESSIBLE COMPONENT PATTERNS",
    "Meet this contract through route-native semantics. Each data-component must own exactly one approved pattern. The pattern witness may be the marked root or one of its unmarked descendants. Nested data-component roots and host receipts cannot satisfy their parent component. Equivalent markup is allowed, but allowed ARIA, accessible names, keyboard operation, and visible focus are mandatory.",
    "HOST RECEIPT OWNERSHIP",
    "The evaluation host owns the synthetic action receipt. It must not become a data-component or a catalog feedback component in the generated payload.",
    "A Surface feedback component is required only when surface_feedback.required is true. When it is false, do not add Toast or any replacement feedback component.",
  ].join("\n\n");
  const sections = cohort === "compile-known"
    ? [
      "COMPILE-KNOWN COHORT",
      scenario.shared_prompt,
      "FROZEN COMPLETE UI SPECIFICATION",
      JSON.stringify(scenario.expected),
      accessibility,
    ]
    : [
      "RUNTIME-UNCERTAIN COHORT",
      scenario.shared_prompt,
      accessibility,
    ];
  if (contractVersion === OBSERVABLE_CONTRACT_V2) sections.push(observableContractV2FinalChecklist);
  return sections.join("\n\n");
}

export function encodeExpectedRoute(route, scenario) {
  if (route === "openui" || route === "typed-json") return encodeExpected(route, scenario.expected);
  if (route === "json-render") return encodeExpectedJsonRender(scenario.expected);
  if (route === "direct-rsx") return encodeExpectedRsx(scenario.expected);
  throw new Error(`unknown route: ${route}`);
}

export async function validateRoute(route, source, scenario, {
  deadlineMs = Number.POSITIVE_INFINITY,
  cohort = "compile-known",
  contractVersion = null,
} = {}) {
  contractVersion ??= scenario.shared_contract?.contract_version ?? null;
  const exact = cohort === "compile-known";
  if (route === "openui" || route === "typed-json") {
    const result = validateProtocol(route, source, scenario.expected.state);
    if (!result.ok) return { ok: false, diagnostics: result.diagnostics, wire: null, route_artifact: null, semantic_fingerprint: null };
    const coverage = contractVersion === OBSERVABLE_CONTRACT_V2
      ? runtimeContractCoverageV2(result.wire, scenario.shared_contract)
      : exact
        ? semanticCoverage(result.wire, scenario.expected)
        : runtimeContractCoverage(result.wire, scenario.shared_contract);
    if (!coverage.passed) {
      return {
        ok: false,
        diagnostics: contractVersion === OBSERVABLE_CONTRACT_V2
          ? coverage.diagnostics
          : coverage.diagnostics.map((message) => ({ code: "semantic-coverage", message })),
        wire: null,
        route_artifact: null,
        semantic_fingerprint: null,
      };
    }
    if (contractVersion === OBSERVABLE_CONTRACT_V2 && exact) {
      const expectedExact = exactStructuredSurface(scenario.expected);
      const actualExact = exactStructuredSurface(result.wire);
      if (stableJson(actualExact) !== stableJson(expectedExact)) {
        return {
          ok: false,
          diagnostics: [{
            code: "frozen-scenario",
            expected_sha256: sha(stableJson(expectedExact)),
            actual_sha256: sha(stableJson(actualExact)),
          }],
          wire: null,
          route_artifact: null,
          semantic_fingerprint: null,
        };
      }
    }
    const accessibility = validateStructuredAccessibility(result.wire, accessibilityContractForSurface(scenario.expected));
    if (!accessibility.passed) {
      return {
        ok: false,
        diagnostics: accessibility.diagnostics.map((diagnostic) => ({ code: "accessibility-contract", message: diagnostic.message, diagnostic })),
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
    const result = validateJsonRender(source, scenario.expected, {
      exact,
      contract: scenario.shared_contract,
      contractVersion,
    });
    const coverage = result.ok
      ? contractVersion === OBSERVABLE_CONTRACT_V2
        ? runtimeContractCoverageV2(result.observable, scenario.shared_contract)
        : !exact
          ? runtimeContractCoverage(result.observable, scenario.shared_contract)
          : { passed: true, diagnostics: [] }
      : { passed: false, diagnostics: [] };
    const accessibility = result.ok && coverage.passed
      ? validateStructuredAccessibility(result.observable, accessibilityContractForSurface(scenario.expected))
      : { passed: false, diagnostics: [] };
    return {
      ok: result.ok && coverage.passed && accessibility.passed,
      diagnostics: result.ok && !coverage.passed
        ? contractVersion === OBSERVABLE_CONTRACT_V2
          ? coverage.diagnostics
          : coverage.diagnostics.map((message) => ({ code: "semantic-coverage", message }))
        : result.ok && coverage.passed && !accessibility.passed
          ? accessibility.diagnostics.map((diagnostic) => ({ code: "accessibility-contract", message: diagnostic.message, diagnostic }))
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

export function runtimeContractCoverageV2(artifact, contract) {
  const diagnostics = [];
  const acceptance = contract?.acceptance ?? {};
  if (acceptance.version !== OBSERVABLE_CONTRACT_V2) {
    return {
      passed: false,
      diagnostics: [{
        code: "contract-version",
        expected: OBSERVABLE_CONTRACT_V2,
        actual: acceptance.version ?? null,
      }],
    };
  }
  const nodes = Array.isArray(artifact?.nodes) ? artifact.nodes : [];
  const expectedCounts = Object.fromEntries(
    [...acceptance.exact_component_multiset]
      .sort((left, right) => left.kind.localeCompare(right.kind))
      .map(({ kind, count }) => [kind, count]),
  );
  const actualCounts = countKinds(nodes);
  if (stableJson(actualCounts) !== stableJson(expectedCounts)) {
    const kinds = [...new Set([...Object.keys(expectedCounts), ...Object.keys(actualCounts)])].sort();
    const missingCounts = {};
    const unexpectedCounts = {};
    for (const kind of kinds) {
      const delta = (actualCounts[kind] ?? 0) - (expectedCounts[kind] ?? 0);
      if (delta < 0) missingCounts[kind] = -delta;
      if (delta > 0) unexpectedCounts[kind] = delta;
    }
    const unexpectedNodeIds = Object.entries(unexpectedCounts).flatMap(([kind, count]) =>
      nodes.filter((node) => node.kind === kind)
        .map((node) => node.id)
        .sort()
        .slice(expectedCounts[kind] ?? 0, (expectedCounts[kind] ?? 0) + count)
    ).sort();
    diagnostics.push({
      code: "component-multiset",
      acceptance_field: "exact_component_multiset",
      expected_counts: expectedCounts,
      actual_counts: actualCounts,
      missing_counts: missingCounts,
      unexpected_counts: unexpectedCounts,
      unexpected_node_ids: unexpectedNodeIds,
    });
  }

  const expectedState = acceptance.exact_host_semantic_state ?? {};
  const actualState = artifact?.state ?? {};
  if (stableJson(actualState) !== stableJson(expectedState)) {
    const expectedKeys = Object.keys(expectedState).sort();
    const actualKeys = Object.keys(actualState).sort();
    diagnostics.push({
      code: "host-semantic-state",
      acceptance_field: "exact_host_semantic_state",
      expected: expectedState,
      actual: actualState,
      missing_keys: expectedKeys.filter((key) => !actualKeys.includes(key)),
      unexpected_keys: actualKeys.filter((key) => !expectedKeys.includes(key)),
      changed_keys: expectedKeys.filter((key) => actualKeys.includes(key) && stableJson(actualState[key]) !== stableJson(expectedState[key])),
    });
  }

  const actualActions = nodes.filter((node) => node.kind === "Button").map((node) => {
    const props = node.props ?? node;
    return { name: props.action, target_id: props.target_id, node_id: node.id };
  }).sort((left, right) => stableJson(left).localeCompare(stableJson(right)));
  const expectedActions = [...acceptance.required_actions]
    .map(({ name, target_id }) => ({ name, target_id }))
    .sort((left, right) => stableJson(left).localeCompare(stableJson(right)));
  const comparableActions = actualActions.map(({ name, target_id }) => ({ name, target_id }))
    .sort((left, right) => stableJson(left).localeCompare(stableJson(right)));
  if (stableJson(comparableActions) !== stableJson(expectedActions)) {
    diagnostics.push({
      code: "actions",
      acceptance_field: "required_actions",
      expected: expectedActions,
      actual: actualActions,
      unexpected_node_ids: actualActions
        .filter(({ name, target_id }) => !expectedActions.some((expected) => expected.name === name && expected.target_id === target_id))
        .map(({ node_id }) => node_id)
        .sort(),
    });
  }

  const expectedBusinessProperties = acceptance.observable_business_properties ?? [];
  const actualBusinessProperties = observableBusinessProperties(nodes.map((node) => ({
    kind: node.kind,
    id: node.id,
    ...(node.props ?? Object.fromEntries(Object.entries(node).filter(([key]) => !["kind", "id"].includes(key)))),
  })), { root: artifact?.root ?? null });
  if (stableJson(actualBusinessProperties) !== stableJson(expectedBusinessProperties)) {
    diagnostics.push({
      code: "observable-business-properties",
      acceptance_field: "observable_business_properties",
      expected: expectedBusinessProperties,
      actual: actualBusinessProperties,
    });
  }

  const ids = nodes.map((node) => node.id);
  const invalidIds = ids.filter((id) => typeof id !== "string" || !id);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))].sort();
  if (invalidIds.length || duplicateIds.length || !ids.includes(artifact?.root)) {
    diagnostics.push({
      code: "stable-ids",
      acceptance_field: "stable_nonempty_ids",
      invalid_ids: invalidIds,
      duplicate_ids: duplicateIds,
      expected_root_to_resolve: artifact?.root ?? null,
      root_resolves: ids.includes(artifact?.root),
    });
  }

  const supplied = suppliedWorkflowValues(contract);
  const suppliedCounts = serializedCounts(supplied);
  const observableCounts = serializedCounts(flattenValues({ state: actualState, nodes }));
  const missingValues = [...suppliedCounts.entries()].flatMap(([serialized, count]) =>
    Array.from({ length: Math.max(0, count - (observableCounts.get(serialized) ?? 0)) }, () => JSON.parse(serialized))
  );
  if (missingValues.length) {
    diagnostics.push({
      code: "supplied-values",
      acceptance_field: "mcp_tool_result.workflow_data",
      expected: supplied,
      missing_values: missingValues,
    });
  }
  return { passed: diagnostics.length === 0, diagnostics };
}

function countKinds(nodes) {
  const counts = {};
  for (const node of [...nodes].sort((left, right) => left.kind.localeCompare(right.kind))) {
    counts[node.kind] = (counts[node.kind] ?? 0) + 1;
  }
  return counts;
}

function exactStructuredSurface(surface) {
  return {
    root: surface.root,
    nodes: [...surface.nodes].sort((left, right) => left.id.localeCompare(right.id)),
    state: surface.state,
  };
}

function serializedCounts(values) {
  const counts = new Map();
  for (const value of values) {
    const serialized = stableJson(value);
    counts.set(serialized, (counts.get(serialized) ?? 0) + 1);
  }
  return counts;
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

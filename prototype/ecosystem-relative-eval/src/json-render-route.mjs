import { compileSpecStream, parseSpecStreamLine } from "@json-render/core";

import {
  buildJsonRenderPrompt,
  jsonRenderActionNames,
  jsonRenderCatalog,
  jsonRenderManifest,
} from "./json-render-catalog.mjs";
import { stableJson } from "./hash.mjs";
import { OBSERVABLE_CONTRACT_V2 } from "./observable-contract-v2-scenarios.mjs";

const manifest = jsonRenderManifest;
const actionNames = jsonRenderActionNames;
const structuralProps = new Map([
  ["Toolbar", new Set(["children"])],
  ["Dialog", new Set(["children"])],
  ["Tabs", new Set(["items"])],
  ["Button", new Set(["action", "target_id"])],
]);

export { jsonRenderCatalog };

export function jsonRenderPrompt() {
  return buildJsonRenderPrompt();
}

export function encodeExpectedJsonRender(surface) {
  const spec = surfaceToJsonRenderSpec(surface);
  return [
    { op: "add", path: "/root", value: spec.root },
    { op: "add", path: "/elements", value: spec.elements },
    { op: "add", path: "/state", value: spec.state },
  ].map((patch) => JSON.stringify(patch)).join("\n");
}

export function validateJsonRender(source, expected, {
  exact = true,
  contract = null,
  contractVersion = null,
} = {}) {
  const diagnostics = [];
  if (Buffer.byteLength(source) > 256 * 1024) {
    diagnostics.push({ code: "output-too-large", message: "more than 262144 bytes" });
    return failure(diagnostics);
  }
  const lines = source.split("\n").map((line) => line.trim()).filter(Boolean);
  const patches = [];
  for (const [index, line] of lines.entries()) {
    const patch = parseSpecStreamLine(line);
    if (!patch || !["add", "remove", "replace", "move", "copy", "test"].includes(patch.op)) {
      diagnostics.push({ code: "invalid-stream-line", path: `line:${index + 1}`, message: "not one official JSON Patch operation" });
    } else {
      patches.push(patch);
    }
  }
  if (!patches.length) diagnostics.push({ code: "empty-stream", message: "no JSON Patch operation" });
  if (diagnostics.length) return failure(diagnostics);

  let spec;
  try {
    spec = compileSpecStream(source, {});
  } catch (error) {
    return failure([{ code: "official-compiler", message: String(error.message) }]);
  }
  const official = jsonRenderCatalog.validate(spec);
  if (!official.success) {
    return failure((official.error?.issues ?? []).map((issue) => ({
      code: "official-catalog",
      path: issue.path.join("/"),
      message: issue.message,
    })), spec);
  }
  const policy = validateSpecPolicy(spec);
  if (policy.length) return failure(policy, spec);

  let observable;
  try {
    observable = contractVersion === OBSERVABLE_CONTRACT_V2
      ? specToObservableV2(spec, contract)
      : specToObservable(spec);
  } catch (error) {
    const diagnostics = Array.isArray(error.diagnostics)
      ? error.diagnostics
      : [{ code: "observable-contract", message: String(error.message) }];
    return failure(diagnostics, spec);
  }
  const expectedObservable = surfaceToObservable(expected);
  const observableMatch = stableJson(observable) === stableJson(expectedObservable);
  if (exact && !observableMatch) {
    return {
      ok: false,
      diagnostics: [{ code: "semantic-coverage", message: "observable output differs from frozen scenario" }],
      spec,
      patches,
      observable,
      expected_observable: expectedObservable,
      observable_match: false,
    };
  }
  return { ok: true, diagnostics: [], spec, patches, observable, observable_match: true };
}

export function surfaceToJsonRenderSpec(surface) {
  const elements = {};
  for (const node of surface.nodes) {
    const props = Object.fromEntries(Object.entries(node).filter(([name]) => !["kind", ...structuralProps.get(node.kind) ?? []].includes(name)));
    const element = { type: node.kind, props, children: childIds(node) };
    for (const name of ["value", "checked"]) {
      if (["Input", "Select", "Checkbox", "Switch"].includes(node.kind) && name in props) {
        props[name] = { $bindState: `/${node.state_key}` };
      }
    }
    if (node.kind === "Tabs") {
      props.items = node.items.map(({ child: _child, ...item }) => item);
    }
    if (node.kind === "Button") {
      element.on = {
        press: { action: node.action, params: { target_id: node.target_id } },
      };
    }
    elements[node.id] = element;
  }
  return { root: surface.root, elements, state: structuredClone(surface.state) };
}

function validateSpecPolicy(spec) {
  const diagnostics = [];
  const entries = Object.entries(spec.elements ?? {});
  if (!spec.root || !spec.elements?.[spec.root]) diagnostics.push({ code: "broken-root", message: "root must resolve" });
  if (entries.length < 1 || entries.length > 64) diagnostics.push({ code: "resource-bound", message: "element count must be between 1 and 64" });
  const reachable = new Set();
  const visit = (id) => {
    if (reachable.has(id)) return;
    const element = spec.elements?.[id];
    if (!element) {
      diagnostics.push({ code: "broken-reference", message: id });
      return;
    }
    reachable.add(id);
    for (const child of element.children ?? []) visit(child);
  };
  if (spec.root) visit(spec.root);
  for (const [id, element] of entries) {
    if (!id || element.props?.id !== id) diagnostics.push({ code: "stable-id", message: id });
    if (!reachable.has(id)) diagnostics.push({ code: "orphaned", message: id });
    const bindings = Object.values(element.on ?? {}).flatMap((binding) => Array.isArray(binding) ? binding : [binding]);
    if (element.type !== "Button" && bindings.length) diagnostics.push({ code: "action-policy", message: `${id} is not a Button` });
    for (const binding of bindings) {
      if (!actionNames.has(binding.action)) diagnostics.push({ code: "action-policy", message: String(binding.action) });
      if (Object.keys(binding.params ?? {}).sort().join(",") !== "target_id") diagnostics.push({ code: "action-policy", message: `${id} params` });
    }
    if (element.type === "Button" && bindings.length !== 1) diagnostics.push({ code: "action-policy", message: `${id} requires one action` });
  }
  return diagnostics;
}

function specToObservable(spec) {
  const nodes = Object.entries(spec.elements).map(([id, element]) => {
    const props = structuredClone(element.props ?? {});
    delete props.id;
    for (const name of ["value", "checked"]) {
      if (props[name]?.$bindState) props[name] = stateAt(spec.state, props[name].$bindState);
    }
    if (element.type === "Toolbar" || element.type === "Dialog") props.children = [...(element.children ?? [])];
    if (element.type === "Tabs") {
      if ((props.items?.length ?? 0) !== (element.children?.length ?? 0)) throw new Error("Tabs item and child counts differ");
      props.items = props.items.map((item, index) => ({ ...item, child: element.children[index] }));
    }
    if (element.type === "Button") {
      const binding = Array.isArray(element.on?.press) ? element.on.press[0] : element.on?.press;
      props.action = binding.action;
      props.target_id = binding.params.target_id;
    }
    return { kind: element.type, id, props };
  });
  return { root: spec.root, nodes: nodes.sort(byId), state: spec.state ?? {} };
}

function specToObservableV2(spec, contract) {
  const acceptance = contract?.acceptance;
  if (acceptance?.version !== OBSERVABLE_CONTRACT_V2) {
    throw projectionError([{ code: "contract-version", expected: OBSERVABLE_CONTRACT_V2, actual: acceptance?.version ?? null }]);
  }
  const state = spec.state ?? {};
  const hostState = acceptance.exact_host_semantic_state ?? {};
  const diagnostics = [];
  const watcherIds = Object.entries(spec.elements ?? {})
    .filter(([, element]) => Object.keys(element.watch ?? {}).length > 0)
    .map(([id]) => id)
    .sort();
  if (watcherIds.length) diagnostics.push({ code: "watcher-policy", acceptance_field: "host_owns_effects", element_ids: watcherIds });
  const repeatIds = Object.entries(spec.elements ?? {})
    .filter(([, element]) => element.repeat !== undefined)
    .map(([id]) => id)
    .sort();
  if (repeatIds.length) diagnostics.push({ code: "repeat-policy", acceptance_field: "exact_component_multiset", element_ids: repeatIds });
  const dynamicVisibilityIds = Object.entries(spec.elements ?? {})
    .filter(([, element]) => element.visible !== undefined && element.visible !== true)
    .map(([id]) => id)
    .sort();
  if (dynamicVisibilityIds.length) diagnostics.push({ code: "visibility-policy", acceptance_field: "exact_component_multiset", element_ids: dynamicVisibilityIds });
  const hostKeys = Object.keys(hostState).sort();
  for (const key of hostKeys) {
    if (!(key in state) || stableJson(state[key]) !== stableJson(hostState[key])) {
      diagnostics.push({
        code: "host-semantic-state",
        acceptance_field: "exact_host_semantic_state",
        key,
        expected: hostState[key],
        actual: key in state ? state[key] : null,
      });
    }
  }

  const auxiliaryKeys = Object.keys(state).filter((key) => !hostKeys.includes(key)).sort();
  const auxiliaryPointers = auxiliaryKeys.map((key) => `/${escapePointerSegment(key)}`);
  const usages = stateUsages(spec.elements ?? {});
  const behaviorUsages = usages.filter((usage) => usage.location !== "props" && pointsIntoAny(usage.pointer, auxiliaryPointers));
  if (behaviorUsages.length) {
    diagnostics.push({
      code: "auxiliary-state-behavior",
      acceptance_field: "route_native_immutable_display_data.watchers_actions_effects_updates_replay",
      usages: behaviorUsages,
    });
  }
  const mutableUsages = usages.filter((usage) => usage.mode === "bind" && pointsIntoAny(usage.pointer, auxiliaryPointers));
  if (mutableUsages.length) {
    diagnostics.push({
      code: "auxiliary-state-mutable-binding",
      acceptance_field: "route_native_immutable_display_data.mutable_bindings",
      usages: mutableUsages,
    });
  }

  const auxiliaryLeaves = auxiliaryKeys.flatMap((key) => flattenLeaves(state[key], `/${escapePointerSegment(key)}`));
  const suppliedLeaves = flattenLeaves(workflowData(contract), "").map(({ value }) => stableJson(value));
  const foreignLeaves = auxiliaryLeaves.filter(({ value }) => !suppliedLeaves.includes(stableJson(value)));
  if (foreignLeaves.length) {
    diagnostics.push({
      code: "auxiliary-state-source",
      acceptance_field: "route_native_immutable_display_data.source",
      foreign_paths: foreignLeaves.map(({ pointer }) => pointer).sort(),
      foreign_values: foreignLeaves.map(({ value }) => value),
    });
  }
  const readOnlyPropPointers = usages
    .filter((usage) => usage.location === "props" && usage.mode === "read")
    .map((usage) => usage.pointer);
  const unreferencedLeaves = auxiliaryLeaves.filter(({ pointer }) =>
    !readOnlyPropPointers.some((reference) => pointer === reference || pointer.startsWith(`${reference}/`))
  );
  const emptyAuxiliaryRoots = auxiliaryPointers.filter((pointer) =>
    !auxiliaryLeaves.some((leaf) => leaf.pointer === pointer || leaf.pointer.startsWith(`${pointer}/`))
  );
  if (unreferencedLeaves.length || emptyAuxiliaryRoots.length) {
    diagnostics.push({
      code: "auxiliary-state-unreferenced",
      acceptance_field: "route_native_immutable_display_data.unreferenced_paths",
      paths: [...unreferencedLeaves.map(({ pointer }) => pointer), ...emptyAuxiliaryRoots].sort(),
    });
  }
  if (diagnostics.length) throw projectionError(diagnostics);

  const nodes = Object.entries(spec.elements).map(([id, element]) => {
    const props = resolveStateExpressions(structuredClone(element.props ?? {}), state);
    delete props.id;
    if (element.type === "Toolbar" || element.type === "Dialog") props.children = [...(element.children ?? [])];
    if (element.type === "Tabs") {
      if ((props.items?.length ?? 0) !== (element.children?.length ?? 0)) throw new Error("Tabs item and child counts differ");
      props.items = props.items.map((item, index) => ({ ...item, child: element.children[index] }));
    }
    if (element.type === "Button") {
      const binding = Array.isArray(element.on?.press) ? element.on.press[0] : element.on?.press;
      props.action = binding.action;
      props.target_id = binding.params.target_id;
    }
    return { kind: element.type, id, props };
  });
  return { root: spec.root, nodes: nodes.sort(byId), state: structuredClone(hostState) };
}

function surfaceToObservable(surface) {
  return {
    root: surface.root,
    nodes: surface.nodes.map((node) => ({
      kind: node.kind,
      id: node.id,
      props: Object.fromEntries(Object.entries(node).filter(([name]) => !["kind", "id"].includes(name))),
    })).sort(byId),
    state: surface.state,
  };
}

function childIds(node) {
  if (node.kind === "Toolbar" || node.kind === "Dialog") return [...node.children];
  if (node.kind === "Tabs") return node.items.map((item) => item.child);
  return [];
}

function stateAt(state, pointer) {
  const key = pointer.replace(/^\//, "").replaceAll("~1", "/").replaceAll("~0", "~");
  if (!(key in (state ?? {}))) throw new Error(`missing state binding: ${pointer}`);
  return state[key];
}

function stateAtPointer(state, pointer) {
  if (typeof pointer !== "string" || !pointer.startsWith("/")) throw new Error(`invalid state pointer: ${pointer}`);
  return pointer.split("/").slice(1).reduce((current, segment) => {
    const key = segment.replaceAll("~1", "/").replaceAll("~0", "~");
    if (!current || typeof current !== "object" || !(key in current)) throw new Error(`missing state binding: ${pointer}`);
    return current[key];
  }, state);
}

function resolveStateExpressions(value, state) {
  if (Array.isArray(value)) return value.map((entry) => resolveStateExpressions(entry, state));
  if (!value || typeof value !== "object") return value;
  const keys = Object.keys(value);
  if (keys.length === 1 && typeof value.$state === "string") return structuredClone(stateAtPointer(state, value.$state));
  if (keys.length === 1 && typeof value.$bindState === "string") return structuredClone(stateAtPointer(state, value.$bindState));
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, resolveStateExpressions(entry, state)]));
}

function stateUsages(elements) {
  const usages = [];
  for (const [id, element] of Object.entries(elements)) {
    collectExpressionPointers(element.props ?? {}, { id, location: "props" }, usages);
    collectExpressionPointers(element.visible, { id, location: "visible" }, usages);
    collectExpressionPointers(element.on, { id, location: "on" }, usages);
    collectExpressionPointers(element.watch, { id, location: "watch" }, usages);
    if (typeof element.repeat?.statePath === "string") usages.push({ id, location: "repeat", mode: "behavior", pointer: element.repeat.statePath });
    for (const [pointer, binding] of Object.entries(element.watch ?? {})) {
      usages.push({ id, location: "watch", mode: "behavior", pointer });
      collectExpressionPointers(binding, { id, location: "watch" }, usages);
    }
    collectStatePathParameters(element.on, id, usages);
    collectStatePathParameters(element.watch, id, usages);
  }
  return usages;
}

function collectExpressionPointers(value, context, usages) {
  if (Array.isArray(value)) {
    for (const entry of value) collectExpressionPointers(entry, context, usages);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (typeof value.$state === "string") usages.push({ ...context, mode: context.location === "props" ? "read" : "behavior", pointer: value.$state });
  if (typeof value.$bindState === "string") usages.push({ ...context, mode: "bind", pointer: value.$bindState });
  for (const entry of Object.values(value)) collectExpressionPointers(entry, context, usages);
}

function collectStatePathParameters(value, id, usages) {
  if (Array.isArray(value)) {
    for (const entry of value) collectStatePathParameters(entry, id, usages);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (key === "statePath" && typeof entry === "string") usages.push({ id, location: "action", mode: "behavior", pointer: entry });
    collectStatePathParameters(entry, id, usages);
  }
}

function pointsIntoAny(pointer, roots) {
  return roots.some((root) => pointer === root || pointer.startsWith(`${root}/`));
}

function workflowData(contract) {
  const text = contract?.mcp_tool_result?.content?.find((entry) => entry.type === "text")?.text;
  if (!text) return {};
  return JSON.parse(text).workflow_data ?? {};
}

function flattenLeaves(value, pointer) {
  if (Array.isArray(value)) return value.flatMap((entry, index) => flattenLeaves(entry, `${pointer}/${index}`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) => flattenLeaves(entry, `${pointer}/${escapePointerSegment(key)}`));
  }
  return [{ pointer, value }];
}

function escapePointerSegment(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function projectionError(diagnostics) {
  const error = new Error("observable-contract-v2 projection failed");
  error.diagnostics = diagnostics;
  return error;
}

function byId(left, right) {
  return left.id.localeCompare(right.id);
}

function failure(diagnostics, spec = null) {
  return { ok: false, diagnostics, spec, patches: [], observable: null, observable_match: false };
}

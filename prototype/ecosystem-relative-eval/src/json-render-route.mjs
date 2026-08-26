import { compileSpecStream, parseSpecStreamLine } from "@json-render/core";

import {
  buildJsonRenderPrompt,
  jsonRenderActionNames,
  jsonRenderCatalog,
  jsonRenderManifest,
} from "./json-render-catalog.mjs";
import { stableJson } from "./hash.mjs";

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

export function validateJsonRender(source, expected, { exact = true } = {}) {
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
    observable = specToObservable(spec);
  } catch (error) {
    return failure([{ code: "observable-contract", message: String(error.message) }], spec);
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

function byId(left, right) {
  return left.id.localeCompare(right.id);
}

function failure(diagnostics, spec = null) {
  return { ok: false, diagnostics, spec, patches: [], observable: null, observable_match: false };
}

import { buildScenarios } from "../../openui-typed-json-product-eval/src/scenarios.mjs";
import { sha, stableJson } from "./hash.mjs";

export const OBSERVABLE_CONTRACT_V2 = "observable-contract-v2";

const intents = new Map([
  ["validated-profile", "Build a validated profile form with a typed submit action."],
  ["preferences", "Build settings with independent immediate and confirmation controls."],
  ["filter-action", "Build a filter and typed action workflow."],
  ["status-dialog", "Build an incrementally updated status dashboard inside a dialog."],
  ["navigation-feedback", "Build local navigation with persistent feedback."],
]);

export async function buildEvaluationScenarios({ contractVersion = null } = {}) {
  const priorScenarios = await buildScenarios();
  if (contractVersion === null) return priorScenarios;
  if (contractVersion !== OBSERVABLE_CONTRACT_V2) throw new Error(`unknown scenario contract version: ${contractVersion}`);
  const bases = priorScenarios.filter((scenario) => scenario.variant === 1);
  const holdouts = bases.flatMap((base, familyIndex) =>
    Array.from({ length: 4 }, (_, variantIndex) => holdoutScenario(base, familyIndex, variantIndex + 1)),
  );
  const priorFingerprints = new Set(priorScenarios.map((scenario) => surfaceStructureFingerprint(scenario.expected)));
  if (holdouts.some((scenario) => priorFingerprints.has(scenario.structural_fingerprint))) throw new Error("holdout composition overlaps an observed v1 structure");
  if (new Set(holdouts.map((scenario) => scenario.structural_fingerprint)).size !== holdouts.length) throw new Error("holdout compositions are not structurally unique");
  return holdouts;
}

function holdoutScenario(base, familyIndex, holdoutVariant) {
  const variant = holdoutVariant + 4;
  const expected = varyHoldoutSurface(base.expected, holdoutVariant);
  const family = base.family;
  const id = `h${String(familyIndex + 1).padStart(2, "0")}-${family}-v${holdoutVariant}`;
  const shared_contract = sharedContractV2({ id, family, variant, expected });
  return {
    id,
    family,
    variant,
    holdout_variant: holdoutVariant,
    structural_fingerprint: surfaceStructureFingerprint(expected),
    expected,
    shared_contract,
    shared_prompt: sharedPromptV2({
      id,
      family,
      holdoutVariant,
      intent: intents.get(family),
      shared_contract,
    }),
  };
}

function varyHoldoutSurface(base, variant) {
  const surface = structuredClone(base);
  const suffix = ` · holdout ${variant}`;
  const idMap = new Map(surface.nodes.map((node) => [node.id, `${node.id}-h${variant}`]));
  surface.root = idMap.get(surface.root);
  for (const node of surface.nodes) {
    node.id = idMap.get(node.id);
    if (Array.isArray(node.children)) node.children = node.children.map((id) => idMap.get(id) ?? id);
    if (typeof node.for_id === "string") node.for_id = idMap.get(node.for_id) ?? node.for_id;
    if (Array.isArray(node.items)) {
      node.items = node.items.map((item) => ({ ...item, child: idMap.get(item.child) ?? item.child }));
    }
    for (const key of ["alt", "label", "message", "placeholder", "text", "title"]) {
      if (typeof node[key] === "string") node[key] += suffix;
    }
    if (node.kind === "Toolbar") {
      node.orientation = variant % 2 === 1
        ? node.orientation === "horizontal" ? "vertical" : "horizontal"
        : node.orientation;
    }
    if (node.kind === "Input") {
      node.value = `${node.value}-holdout-${variant}`;
      surface.state[node.state_key] = node.value;
    }
    if (node.kind === "Select") {
      node.value = node.options[(variant + 1) % node.options.length];
      surface.state[node.state_key] = node.value;
    }
    if (node.kind === "Checkbox" || node.kind === "Switch") {
      node.checked = variant % 2 === 1 ? !node.checked : node.checked;
      surface.state[node.state_key] = node.checked;
    }
    if (node.kind === "Dialog") surface.state[node.open_state_key] = variant % 2 === 0;
    if (node.kind === "Progress") node.value = Math.min(node.max, [15, 35, 55, 75][variant - 1]);
    if (node.kind === "Tabs") {
      node.items = node.items.map((item) => ({ ...item, label: `${item.label}${suffix}` }));
      node.value = node.items[(variant - 1) % node.items.length].value;
      surface.state[node.state_key] = node.value;
    }
  }
  varyLegalComposition(surface, variant);
  return surface;
}

function varyLegalComposition(surface, variant) {
  const parent = surface.nodes.find((node) => ["Toolbar", "Dialog"].includes(node.kind) && (node.children?.length ?? 0) >= 2);
  if (!parent) throw new Error("holdout composition requires a container with at least two children");
  const childCount = parent.children.length;
  const groups = variant === 1
    ? [[0]]
    : variant === 2
      ? [[childCount - 1]]
      : variant === 3
        ? [Array.from({ length: childCount }, (_, index) => index)]
        : [
          Array.from({ length: Math.ceil(childCount / 2) }, (_, index) => index),
          Array.from({ length: Math.floor(childCount / 2) }, (_, index) => index + Math.ceil(childCount / 2)),
        ];
  const groupByIndex = new Map();
  const nested = groups.filter((indices) => indices.length > 0).map((indices, groupIndex) => {
    const id = `${parent.id}-composition-${variant}-${groupIndex + 1}`;
    for (const index of indices) groupByIndex.set(index, id);
    return {
      kind: "Toolbar",
      id,
      orientation: (variant + groupIndex) % 2 === 0 ? "horizontal" : "vertical",
      children: indices.map((index) => parent.children[index]),
    };
  });
  const emitted = new Set();
  parent.children = parent.children.flatMap((child, index) => {
    const groupId = groupByIndex.get(index);
    if (!groupId) return [child];
    if (emitted.has(groupId)) return [];
    emitted.add(groupId);
    return [groupId];
  });
  surface.nodes.push(...nested);
}

function sharedContractV2({ id, family, variant, expected }) {
  const actions = expected.nodes
    .filter((node) => node.kind === "Button")
    .map((node) => ({ name: node.action, target_id: node.target_id }));
  return {
    contract_version: OBSERVABLE_CONTRACT_V2,
    mcp_tool_schema: {
      name: "load_workflow",
      input_schema: {
        type: "object",
        additionalProperties: false,
        required: ["family", "variant"],
        properties: { family: { const: family }, variant: { const: variant } },
      },
    },
    mcp_tool_result: {
      content: [{ type: "text", text: JSON.stringify({ id, workflow_data: domainData(family, expected) }) }],
      isError: false,
    },
    initial_state: expected.state,
    typed_actions: actions,
    accepted_update: {
      kind: "replace_surface",
      preserve_state_keys: Object.keys(expected.state).sort(),
      reject_partial_or_invalid_revision: true,
    },
    replay: { same_fingerprint: true, additional_host_effects: 0 },
    acceptance: {
      version: OBSERVABLE_CONTRACT_V2,
      exact_component_multiset: componentMultiset(expected.nodes),
      exact_host_semantic_state: expected.state,
      required_actions: actions,
      observable_business_properties: observableBusinessProperties(expected.nodes, { root: expected.root }),
      stable_nonempty_ids: true,
      route_native_immutable_display_data: {
        allowed: true,
        source: "mcp_tool_result.workflow_data",
        observable_props_only: true,
        mutable_bindings: "reject",
        watchers_actions_effects_updates_replay: "reject",
        unreferenced_paths: "reject",
        canonical_host_state_fingerprint: "exclude",
      },
      unknown_components_properties_state_actions: "reject",
    },
  };
}

function domainData(family, surface) {
  const byKind = new Map(surface.nodes.map((node) => [node.kind, node]));
  if (family === "validated-profile") {
    return {
      person: { name: byKind.get("Input").value, alt: byKind.get("Avatar").alt, fallback: byKind.get("Avatar").fallback },
      field: { label: byKind.get("Input").label, placeholder: byKind.get("Input").placeholder },
      submit: { label: byKind.get("Button").label, action: byKind.get("Button").action, target_id: byKind.get("Button").target_id },
    };
  }
  if (family === "preferences") {
    return { settings: ["Switch", "Checkbox"].map((kind) => ({ kind, label: byKind.get(kind).label, checked: byKind.get(kind).checked })) };
  }
  if (family === "filter-action") {
    return { filter: { label: byKind.get("Select").label, options: byKind.get("Select").options, value: byKind.get("Select").value }, action: { label: byKind.get("Button").label, name: byKind.get("Button").action, target_id: byKind.get("Button").target_id } };
  }
  if (family === "status-dialog") {
    return { dialog: { title: byKind.get("Dialog").title, open: surface.state.dialog_open }, progress: { label: byKind.get("Progress").label, value: byKind.get("Progress").value, max: byKind.get("Progress").max } };
  }
  return { tabs: { value: byKind.get("Tabs").value, items: byKind.get("Tabs").items.map(({ value, label }) => ({ value, label })) }, feedback: { tone: byKind.get("Toast").tone, title: byKind.get("Toast").title, message: byKind.get("Toast").message } };
}

function sharedPromptV2({ id, family, holdoutVariant, intent, shared_contract }) {
  return [
    `SCENARIO ${id}`,
    `FAMILY ${family}; deterministic holdout variant ${holdoutVariant} of 4.`,
    "INTENT",
    intent,
    "BYTE-IDENTICAL SHARED MCP, STATE, ACTION, UPDATE, REPLAY, AND OBSERVABLE-CONTRACT-V2 ACCEPTANCE CONTRACT",
    JSON.stringify(shared_contract),
    "Design one useful interface satisfying that contract. Component counts, host semantic state, supplied business values, state keys, action names, action targets, update rules, and feedback values are exact. Choose stable component ids and valid catalog composition yourself.",
    "The host owns semantic state, actions, updates, receipts, and inert replay. Route-native immutable display data is allowed only under the exact acceptance policy and never becomes host semantic state.",
    "Return only the requested protocol payload with no explanation or code fence.",
  ].join("\n\n");
}

function componentMultiset(nodes) {
  const counts = new Map();
  for (const node of nodes) counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1);
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([kind, count]) => ({ kind, count }));
}

export function observableBusinessProperties(nodes, { root = null } = {}) {
  const excluded = new Set(["action", "children", "for_id", "id", "kind", "orientation", "target_id"]);
  const normalized = nodes.map((node) => ({
    kind: node.kind,
    id: node.id,
    ...(node.props ?? Object.fromEntries(Object.entries(node).filter(([key]) => !["kind", "id"].includes(key)))),
  }));
  const byId = new Map(normalized.map((node) => [node.id, node]));
  const paths = structuralPaths(normalized, root);
  const kindCounts = new Map();
  for (const node of normalized) kindCounts.set(node.kind, (kindCounts.get(node.kind) ?? 0) + 1);
  const grouped = new Map();
  for (const node of normalized) {
    const role = semanticRole(node, { byId, kindCounts, paths });
    for (const [property, original] of Object.entries(node)) {
      if (excluded.has(property)) continue;
      const value = node.kind === "Tabs" && property === "items"
        ? original.map(({ child: _child, ...item }) => item)
        : original;
      const key = `${node.kind}\0${role}\0${property}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(value);
    }
  }
  return [...grouped.entries()].map(([key, values]) => {
    const [kind, role, property] = key.split("\0");
    return {
      kind,
      role,
      property,
      values: values.sort((left, right) => stableJson(left).localeCompare(stableJson(right))),
    };
  }).sort((left, right) => `${left.kind}\0${left.role}\0${left.property}`.localeCompare(`${right.kind}\0${right.role}\0${right.property}`));
}

function semanticRole(node, { byId, kindCounts, paths }) {
  if (node.kind === "Button") return `action:${node.action}:target:${node.target_id}`;
  if (typeof node.state_key === "string") return `state:${node.state_key}`;
  if (typeof node.open_state_key === "string") return `open-state:${node.open_state_key}`;
  if (node.kind === "Label") {
    const control = byId.get(node.for_id);
    if (control?.state_key) return `for-state:${control.state_key}`;
    if (control?.kind) return `for-kind:${control.kind}`;
  }
  if ((kindCounts.get(node.kind) ?? 0) === 1) return `kind:${node.kind}`;
  return `structure:${paths.get(node.id) ?? "unreachable"}`;
}

function structuralPaths(nodes, root) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const paths = new Map();
  const visit = (id, currentPath) => {
    if (paths.has(id)) return;
    paths.set(id, currentPath);
    const node = byId.get(id);
    if (!node) return;
    const children = node.kind === "Tabs" ? node.items?.map((item) => item.child) ?? [] : node.children ?? [];
    children.forEach((child, index) => visit(child, `${currentPath}/${node.kind}[${index}]`));
  };
  if (root !== null) visit(root, "root");
  return paths;
}

export function surfaceStructureFingerprint(surface) {
  const byId = new Map(surface.nodes.map((node) => [node.id, node]));
  const visit = (id) => {
    const node = byId.get(id);
    if (!node) throw new Error(`missing structural node: ${id}`);
    const children = node.kind === "Tabs" ? node.items.map((item) => item.child) : node.children ?? [];
    return {
      kind: node.kind,
      orientation: node.orientation ?? null,
      children: children.map(visit),
    };
  };
  return sha(stableJson(visit(surface.root)));
}

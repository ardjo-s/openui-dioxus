import { readFile } from "node:fs/promises";

const fixtureUrls = [
  "01-profile.json",
  "02-preferences.json",
  "03-filter.json",
  "04-progress-dialog.json",
  "05-tabs-feedback.json",
].map((name) => new URL(`../../dioxus-components-catalog-eval/fixtures/workflows/${name}`, import.meta.url));

const familyDefinitions = [
  ["validated-profile", "Build a validated profile form with a typed submit action."],
  ["preferences", "Build settings with independent immediate and confirmation controls."],
  ["filter-action", "Build a filter and typed action workflow."],
  ["status-dialog", "Build an incrementally updated status dashboard inside a dialog."],
  ["navigation-feedback", "Build local navigation with persistent feedback."],
];

export async function buildScenarios() {
  const bases = await Promise.all(fixtureUrls.map(async (url) => JSON.parse(await readFile(url, "utf8"))));
  return bases.flatMap((base, familyIndex) =>
    Array.from({ length: 4 }, (_, variantIndex) => {
      const variant = variantIndex + 1;
      const expected = varySurface(base, variant);
      const [family, intent] = familyDefinitions[familyIndex];
      const id = `${String(familyIndex + 1).padStart(2, "0")}-${family}-v${variant}`;
      const shared_contract = sharedContract({ id, family, variant, expected });
      return {
        id,
        family,
        variant,
        expected,
        shared_contract,
        shared_prompt: sharedPrompt({ id, family, variant, intent, shared_contract }),
      };
    }),
  );
}

function varySurface(base, variant) {
  const surface = structuredClone(base);
  const suffix = ` · variant ${variant}`;
  for (const node of surface.nodes) {
    for (const key of ["alt", "label", "message", "placeholder", "text", "title"]) {
      if (typeof node[key] === "string") node[key] += suffix;
    }
    if (node.kind === "Input") {
      node.value = `${node.value}-${variant}`;
      surface.state[node.state_key] = node.value;
    }
    if (node.kind === "Select") {
      node.value = node.options[(variant - 1) % node.options.length];
      surface.state[node.state_key] = node.value;
    }
    if (node.kind === "Checkbox" || node.kind === "Switch") {
      node.checked = variant % 2 === 1 ? node.checked : !node.checked;
      surface.state[node.state_key] = node.checked;
    }
    if (node.kind === "Dialog") {
      surface.state[node.open_state_key] = variant % 2 === 1;
    }
    if (node.kind === "Progress") node.value = variant * 20;
    if (node.kind === "Tabs") {
      node.items = node.items.map((item) => ({ ...item, label: `${item.label}${suffix}` }));
    }
  }
  return surface;
}

function sharedContract({ id, family, variant, expected }) {
  const actions = expected.nodes
    .filter((node) => node.kind === "Button")
    .map((node) => ({ name: node.action, target_id: node.target_id }));
  return {
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
      required_component_kinds: expected.nodes.map((node) => node.kind).sort(),
      required_state: expected.state,
      required_actions: actions,
      stable_nonempty_ids: true,
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

function sharedPrompt({ id, family, variant, intent, shared_contract }) {
  return [
    `SCENARIO ${id}`,
    `FAMILY ${family}; deterministic variant ${variant} of 4.`,
    "INTENT",
    intent,
    "BYTE-IDENTICAL SHARED MCP, STATE, ACTION, UPDATE, REPLAY, AND ACCEPTANCE CONTRACT",
    JSON.stringify(shared_contract),
    "Design one useful interface satisfying that contract. Preserve every supplied business value, state key, action name, action target, update rule, and feedback value. Choose stable component ids and valid catalog composition yourself.",
    "The host owns state, actions, updates, receipts, and inert replay. The generated payload cannot perform effects and must not encode those host operations as components.",
    "Return only the requested protocol payload with no explanation or code fence.",
  ].join("\n\n");
}

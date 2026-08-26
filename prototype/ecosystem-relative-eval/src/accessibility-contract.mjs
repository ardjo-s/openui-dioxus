const routes = ["openui", "typed-json", "json-render", "direct-rsx"];

const semantics = {
  Toolbar: { role: "toolbar", name: true, keyboard: "contained-controls", orientation: true, patterns: [{ id: "toolbar", role: "toolbar" }] },
  Avatar: { role: "img", name: true, keyboard: "not-focusable", patterns: [{ id: "image", role: "img" }] },
  Label: { role: "label", name: true, keyboard: "not-focusable", association: "declared-control", patterns: [{ id: "label", role: "label" }] },
  Input: { role: "textbox", name: true, keyboard: "native-control", patterns: [{ id: "textbox", role: "textbox" }] },
  Select: {
    role: "combobox",
    name: true,
    keyboard: "native-control",
    patterns: [
      { id: "native-combobox", role: "combobox" },
      {
        id: "popup-listbox",
        role: "button",
        attributes: {
          "aria-haspopup": "listbox",
          "aria-expanded": "boolean",
        },
        expanded_controls_role: "listbox",
      },
    ],
  },
  Checkbox: { role: "checkbox", name: true, keyboard: "native-control", patterns: [{ id: "checkbox", role: "checkbox" }] },
  Switch: { role: "switch", name: true, keyboard: "space-or-enter", patterns: [{ id: "switch", role: "switch", attributes: { "aria-checked": "boolean" } }] },
  Button: { role: "button", name: true, keyboard: "space-or-enter", patterns: [{ id: "button", role: "button" }] },
  Tabs: {
    role: "tablist",
    name: true,
    keyboard: "tab-and-arrow-keys",
    patterns: [{
      id: "tabset",
      role: "tablist",
      owned_requirements: [
        { role: "tab", minimum: 1, named: true, keyboard: true },
        { role: "tabpanel", minimum: 1 },
      ],
    }],
  },
  Dialog: { role: "dialog", name: true, keyboard: "focus-contained-while-open", patterns: [{ id: "dialog", role: "dialog" }] },
  Progress: { role: "progressbar", name: true, keyboard: "not-focusable", patterns: [{ id: "progressbar", role: "progressbar" }] },
  Toast: {
    role: "status",
    name: true,
    keyboard: "not-focusable",
    patterns: [
      { id: "polite-status", role: "status", announcement: "implicit-polite" },
      { id: "interactive-alert", role: "alertdialog", keyboard: true, announcement: "owned-alert", owned_requirements: [{ role: "alert", minimum: 1 }] },
    ],
  },
};

const interactiveRoles = new Set(["button", "checkbox", "combobox", "switch", "tab", "textbox"]);
const orientationRoles = new Set(["scrollbar", "select", "separator", "slider", "tablist", "toolbar", "treegrid"]);
const voidElements = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

export function accessibilityContractForSurface(surface) {
  const nodesByKind = new Map();
  for (const node of surface.nodes) nodesByKind.set(node.kind, [...(nodesByKind.get(node.kind) ?? []), node]);
  const surfaceFeedbackRequired = (nodesByKind.get("Toast")?.length ?? 0) > 0;
  return {
    version: "ope-15-route-neutral-patterns-v1",
    routes: [...routes],
    equivalence: "same observable requirement strength; route-native markup may differ",
    components: [...nodesByKind.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([kind, nodes]) => ({
      kind,
      count: nodes.length,
      ...semantics[kind],
      ...(kind === "Toolbar"
        ? { instances: nodes.map((node) => ({ id: node.id, orientation: node.orientation ?? node.props?.orientation })) }
        : kind === "Label"
          ? { instances: nodes.map((node) => ({ id: node.id, for_id: node.for_id ?? node.props?.for_id })) }
          : {}),
    })),
    focus: { keyboard_reachable: true, visible_indicator: true },
    surface_feedback: {
      owner: "surface",
      required: surfaceFeedbackRequired,
      component: surfaceFeedbackRequired ? "Toast" : null,
    },
    host_receipt: {
      owner: "host-harness",
      generated_component: false,
      role: "status",
      live: "polite",
      visible: true,
      exactly_once: true,
    },
    aria: { unknown_attributes: "reject", attributes_must_be_allowed_for_computed_role: true },
  };
}

export function validateStructuredAccessibility(surface, contract = accessibilityContractForSurface(surface)) {
  const diagnostics = [];
  const nodes = Array.isArray(surface?.nodes) ? surface.nodes : [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const allowed = new Set(contract.components.map((entry) => entry.kind));
  const counts = new Map();
  for (const node of nodes) {
    counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1);
    if (!allowed.has(node.kind)) diagnostic(diagnostics, "unknown-component", node.kind, node.id, "component is outside the accessibility contract");
    validateStructuredNode(node, byId, diagnostics);
  }
  for (const requirement of contract.components) {
    if ((counts.get(requirement.kind) ?? 0) !== requirement.count) {
      diagnostic(diagnostics, "component-count", requirement.kind, null, `expected ${requirement.count}, received ${counts.get(requirement.kind) ?? 0}`);
    }
  }
  return { passed: diagnostics.length === 0, diagnostics };
}

export function validateRenderedAccessibility(html, contract) {
  const diagnostics = [];
  const root = parseHtml(html);
  const elements = descendants(root);
  const byId = new Map();
  for (const element of elements) {
    const id = attribute(element, "id");
    if (!id) continue;
    if (byId.has(id)) diagnostic(diagnostics, "duplicate-id", null, id, "id must be unique in the rendered document");
    else byId.set(id, element);
  }

  for (const element of elements) {
    if (attribute(element, "aria-orientation") && !orientationRoles.has(computedRole(element))) {
      diagnostic(diagnostics, "aria-allowed-attr", attribute(element, "data-component"), attribute(element, "id"), "aria-orientation requires a compatible semantic role");
    }
  }

  const componentElements = elements.filter((element) => attribute(element, "data-component"));
  const allowed = new Set(contract.components.map((entry) => entry.kind));
  for (const element of componentElements) {
    const kind = attribute(element, "data-component");
    if (!allowed.has(kind)) diagnostic(diagnostics, "unknown-component", kind, attribute(element, "id"), "component is outside the accessibility contract");
  }
  for (const requirement of contract.components) {
    const matches = componentElements.filter((element) => attribute(element, "data-component") === requirement.kind);
    if (matches.length !== requirement.count) {
      diagnostic(diagnostics, "component-count", requirement.kind, null, `expected ${requirement.count}, received ${matches.length}`);
      continue;
    }
    for (const element of matches) {
      const instance = requirement.instances?.find(({ id }) => id === attribute(element, "id"));
      if (requirement.instances && !instance) {
        diagnostic(diagnostics, "component-instance", requirement.kind, attribute(element, "id"), "component id is outside the frozen accessibility contract");
      }
      validateRenderedComponent(element, requirement, instance, root, byId, diagnostics);
    }
  }

  const receipts = elements.filter((element) => attribute(element, "data-receipt") !== null);
  if (receipts.length !== 1 || computedRole(receipts[0]) !== contract.host_receipt.role || attribute(receipts[0], "aria-live") !== contract.host_receipt.live) {
    diagnostic(diagnostics, "host-receipt", null, null, "one visible host receipt must use role=status and aria-live=polite");
  }
  if (receipts.some((receipt) => attribute(receipt, "data-component") !== null)) {
    diagnostic(diagnostics, "host-receipt-ownership", null, null, "host receipt must remain outside generated component coverage");
  }
  return { passed: diagnostics.length === 0, diagnostics };
}

function validateStructuredNode(node, byId, diagnostics) {
  const requiredNameProp = {
    Avatar: "alt",
    Input: "label",
    Select: "label",
    Checkbox: "label",
    Switch: "label",
    Button: "label",
    Dialog: "title",
    Progress: "label",
  }[node.kind];
  if (requiredNameProp && !nonempty(node[requiredNameProp] ?? node.props?.[requiredNameProp])) {
    diagnostic(diagnostics, "accessible-name", node.kind, node.id, `${requiredNameProp} must be non-empty`);
  }
  if (node.kind === "Toolbar" && !["horizontal", "vertical"].includes(node.orientation ?? node.props?.orientation)) {
    diagnostic(diagnostics, "aria-orientation", node.kind, node.id, "orientation must be horizontal or vertical");
  }
  if (node.kind === "Label") {
    const target = node.for_id ?? node.props?.for_id;
    if (!nonempty(node.text ?? node.props?.text)) diagnostic(diagnostics, "accessible-name", node.kind, node.id, "label text must be non-empty");
    if (!byId.has(target)) diagnostic(diagnostics, "label-association", node.kind, node.id, "for_id must reference an existing control");
  }
  if (node.kind === "Tabs") {
    const items = node.items ?? node.props?.items ?? [];
    if (!items.length || items.some((item) => !nonempty(item.label))) diagnostic(diagnostics, "accessible-name", node.kind, node.id, "every tab must have a non-empty label");
  }
  if (node.kind === "Toast") {
    if (!nonempty(node.title ?? node.props?.title) || !nonempty(node.message ?? node.props?.message)) {
      diagnostic(diagnostics, "accessible-name", node.kind, node.id, "status title and message must be non-empty");
    }
  }
}

function validateRenderedComponent(element, requirement, instance, root, byId, diagnostics) {
  const owned = ownedSemanticElements(element);
  const patterns = requirement.patterns ?? [{ id: requirement.role, role: requirement.role }];
  const matches = patterns.flatMap((pattern) => owned
    .filter((candidate) => matchesPattern(candidate, pattern, owned, root, byId))
    .map((witness) => ({ pattern, witness })));
  const witness = matches[0]?.witness ?? element;
  if (matches.length === 0) {
    diagnostic(diagnostics, "semantic-role", requirement.kind, attribute(element, "id"), `expected an owned ${patterns.map((pattern) => pattern.id).join(" or ")} pattern, received ${computedRole(element) || "none"}`);
  }
  if (matches.length > 1) {
    diagnostic(diagnostics, "semantic-pattern-ambiguous", requirement.kind, attribute(element, "id"), `expected one owned semantic pattern, received ${matches.length}`);
  }
  if (requirement.name && !accessibleName(witness, root, byId)) {
    diagnostic(diagnostics, "accessible-name", requirement.kind, attribute(element, "id"), "component has no observable accessible name");
  }
  if (requirement.association === "declared-control" && !labelAssociated(witness, instance, byId)) {
    diagnostic(diagnostics, "label-association", requirement.kind, attribute(element, "id"), "label must reference or contain its declared control");
  }
  if (requirement.orientation) {
    const orientation = attribute(witness, "aria-orientation");
    const expected = instance?.orientation;
    const valid = expected === "horizontal"
      ? orientation === null || orientation === "horizontal"
      : expected === "vertical"
        ? orientation === "vertical"
        : ["horizontal", "vertical"].includes(orientation);
    if (!valid) {
      diagnostic(diagnostics, "aria-orientation", requirement.kind, attribute(element, "id"), `toolbar must expose its ${expected ?? "declared"} orientation; horizontal may use the ARIA default`);
    }
  }
  if (interactiveRoles.has(requirement.role) && !nativeInteractive(witness) && attribute(witness, "tabindex") !== "0") {
    diagnostic(diagnostics, "keyboard-reachable", requirement.kind, attribute(element, "id"), "custom interactive role must be in keyboard focus order");
  }
}

function matchesPattern(element, pattern, owned, root, byId) {
  if (computedRole(element) !== pattern.role) return false;
  if (pattern.keyboard && !keyboardReachable(element)) return false;
  for (const [name, expected] of Object.entries(pattern.attributes ?? {})) {
    const value = attribute(element, name);
    if (expected === "nonempty" && !nonempty(value)) return false;
    if (expected === "boolean" && !["true", "false"].includes(value)) return false;
    if (!["nonempty", "boolean"].includes(expected) && value !== expected) return false;
  }
  if (pattern.expanded_controls_role && attribute(element, "aria-expanded") === "true") {
    const controlled = byId.get(attribute(element, "aria-controls"));
    if (!controlled || !owned.includes(controlled) || computedRole(controlled) !== pattern.expanded_controls_role) return false;
  }
  for (const required of pattern.owned_requirements ?? []) {
    const candidates = owned.filter((candidate) => computedRole(candidate) === required.role);
    if (candidates.length < required.minimum) return false;
    if (required.named && candidates.slice(0, required.minimum).some((candidate) => !accessibleName(candidate, root, byId))) return false;
    if (required.keyboard && !candidates.some(keyboardReachable)) return false;
  }
  return true;
}

function labelAssociated(label, instance, byId) {
  const targetId = instance?.for_id;
  const target = byId.get(targetId);
  if (!target) return false;
  if (attribute(label, "for") === targetId) return true;
  if (descendants(label).includes(target)) return true;
  return (attribute(target, "aria-labelledby") ?? "").split(/\s+/).includes(attribute(label, "id"));
}

function keyboardReachable(element) {
  return nativeInteractive(element) || attribute(element, "tabindex") === "0";
}

function ownedSemanticElements(root) {
  const owned = [root];
  for (const child of root.children) {
    if (attribute(child, "data-component") !== null || attribute(child, "data-receipt") !== null) continue;
    owned.push(...ownedSemanticElements(child));
  }
  return owned;
}

function computedRole(element) {
  const explicit = attribute(element, "role");
  if (explicit) return explicit;
  if (element.tag === "button") return "button";
  if (element.tag === "select") return "combobox";
  if (element.tag === "textarea") return "textbox";
  if (element.tag === "dialog") return "dialog";
  if (element.tag === "progress") return "progressbar";
  if (element.tag === "label") return "label";
  if (element.tag === "input") {
    const type = attribute(element, "type") ?? "text";
    if (type === "checkbox") return "checkbox";
    if (!["hidden", "button", "submit", "reset", "image", "file", "color", "range"].includes(type)) return "textbox";
  }
  return null;
}

function nativeInteractive(element) {
  return ["button", "select", "textarea"].includes(element.tag)
    || (element.tag === "input" && attribute(element, "type") !== "hidden");
}

function accessibleName(element, root, byId) {
  const ariaLabel = attribute(element, "aria-label");
  if (nonempty(ariaLabel)) return ariaLabel.trim();
  const labelledBy = attribute(element, "aria-labelledby");
  if (labelledBy) {
    const label = labelledBy.split(/\s+/).map((id) => textContent(byId.get(id))).join(" ").trim();
    if (label) return label;
  }
  const id = attribute(element, "id");
  if (id) {
    const label = descendants(root).find((candidate) => candidate.tag === "label" && attribute(candidate, "for") === id);
    if (nonempty(textContent(label))) return textContent(label).trim();
  }
  let parent = element.parent;
  while (parent) {
    if (parent.tag === "label" && nonempty(textContent(parent))) return textContent(parent).trim();
    parent = parent.parent;
  }
  if (["button", "label", "dialog", "status", "switch", "tab", "tablist", "toolbar"].includes(computedRole(element))) {
    const text = textContent(element).trim();
    if (text) return text;
  }
  return "";
}

function parseHtml(html) {
  const root = { tag: "#document", attrs: new Map(), children: [], text: "", parent: null };
  const stack = [root];
  for (const token of String(html).match(/<!--[\s\S]*?-->|<![^>]*>|<\/?[^>]+>|[^<]+/g) ?? []) {
    if (token.startsWith("<!--") || token.startsWith("<!")) continue;
    if (token.startsWith("</")) {
      const tag = token.slice(2, -1).trim().toLowerCase();
      while (stack.length > 1) {
        const current = stack.pop();
        if (current.tag === tag) break;
      }
      continue;
    }
    if (token.startsWith("<")) {
      const match = token.match(/^<\s*([a-zA-Z0-9-]+)([\s\S]*?)\/?\s*>$/);
      if (!match) continue;
      const parent = stack.at(-1);
      const element = { tag: match[1].toLowerCase(), attrs: parseAttributes(match[2]), children: [], text: "", parent };
      parent.children.push(element);
      if (!token.endsWith("/>") && !voidElements.has(element.tag)) stack.push(element);
      continue;
    }
    stack.at(-1).text += decodeEntities(token);
  }
  return root;
}

function parseAttributes(source) {
  const attrs = new Map();
  const pattern = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of source.matchAll(pattern)) attrs.set(match[1].toLowerCase(), decodeEntities(match[2] ?? match[3] ?? match[4] ?? ""));
  return attrs;
}

function descendants(node) {
  return node.children.flatMap((child) => [child, ...descendants(child)]);
}

function textContent(node) {
  if (!node) return "";
  return `${node.text}${node.children.map(textContent).join("")}`;
}

function attribute(element, name) {
  return element?.attrs?.has(name) ? element.attrs.get(name) : null;
}

function nonempty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function diagnostic(diagnostics, code, component, id, message) {
  diagnostics.push({ code, component: component ?? null, id: id ?? null, message });
}

function decodeEntities(value) {
  return String(value)
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

const routes = ["openui", "typed-json", "json-render", "direct-rsx"];

const semantics = {
  Toolbar: { role: "toolbar", name: true, keyboard: "contained-controls", orientation: true },
  Avatar: { role: "img", name: true, keyboard: "not-focusable" },
  Label: { role: "label", name: true, keyboard: "not-focusable" },
  Input: { role: "textbox", name: true, keyboard: "native-control" },
  Select: { role: "combobox", name: true, keyboard: "native-control" },
  Checkbox: { role: "checkbox", name: true, keyboard: "native-control" },
  Switch: { role: "switch", name: true, keyboard: "space-or-enter" },
  Button: { role: "button", name: true, keyboard: "space-or-enter" },
  Tabs: { role: "tablist", name: true, keyboard: "tab-and-arrow-keys" },
  Dialog: { role: "dialog", name: true, keyboard: "focus-contained-while-open" },
  Progress: { role: "progressbar", name: true, keyboard: "not-focusable" },
  Toast: { role: "status", name: true, keyboard: "not-focusable", live: "polite" },
};

const interactiveRoles = new Set(["button", "checkbox", "combobox", "switch", "tab", "textbox"]);
const orientationRoles = new Set(["scrollbar", "select", "separator", "slider", "tablist", "toolbar", "treegrid"]);
const voidElements = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

export function accessibilityContractForSurface(surface) {
  const counts = new Map();
  for (const node of surface.nodes) counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1);
  const surfaceFeedbackRequired = (counts.get("Toast") ?? 0) > 0;
  return {
    version: "ope-14-feedback-ownership-v1",
    routes: [...routes],
    equivalence: "same observable requirement strength; route-native markup may differ",
    components: [...counts.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([kind, count]) => ({
      kind,
      count,
      ...semantics[kind],
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
    for (const element of matches) validateRenderedComponent(element, requirement, root, byId, diagnostics);
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

function validateRenderedComponent(element, requirement, root, byId, diagnostics) {
  const role = computedRole(element);
  if (role !== requirement.role) {
    diagnostic(diagnostics, "semantic-role", requirement.kind, attribute(element, "id"), `expected ${requirement.role}, received ${role || "none"}`);
  }
  if (requirement.name && !accessibleName(element, root, byId)) {
    diagnostic(diagnostics, "accessible-name", requirement.kind, attribute(element, "id"), "component has no observable accessible name");
  }
  if (requirement.orientation) {
    const orientation = attribute(element, "aria-orientation");
    if (!["horizontal", "vertical"].includes(orientation)) {
      diagnostic(diagnostics, "aria-orientation", requirement.kind, attribute(element, "id"), "toolbar must expose horizontal or vertical aria-orientation");
    }
  }
  if (interactiveRoles.has(requirement.role) && !nativeInteractive(element) && attribute(element, "tabindex") !== "0") {
    diagnostic(diagnostics, "keyboard-reachable", requirement.kind, attribute(element, "id"), "custom interactive role must be in keyboard focus order");
  }
  if (requirement.live && attribute(element, "aria-live") !== requirement.live) {
    diagnostic(diagnostics, "feedback-announcement", requirement.kind, attribute(element, "id"), `expected aria-live=${requirement.live}`);
  }
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
  if (["button", "label", "dialog", "status", "tablist", "toolbar"].includes(computedRole(element))) {
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

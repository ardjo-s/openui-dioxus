import { schema as reactSchema } from "@json-render/react/schema";
import { z } from "zod";

import jsonRenderManifest from "../../dioxus-components-catalog-eval/catalog/manifest.json" with { type: "json" };

const structuralProps = new Map([
  ["Toolbar", new Set(["children"])],
  ["Dialog", new Set(["children"])],
  ["Tabs", new Set(["items"])],
  ["Button", new Set(["action", "target_id"])],
]);

export { jsonRenderManifest };
export const jsonRenderActionNames = new Set(jsonRenderManifest.actions.map((action) => action.name));
export const jsonRenderCatalog = reactSchema.createCatalog({
  components: Object.fromEntries(jsonRenderManifest.components.map((component) => [component.name, {
    props: z.object(componentPropShape(component)).strict(),
    slots: hasChildren(component.name) ? ["default"] : [],
    description: [component.description, ...component.usage_rules].join(" "),
  }])),
  actions: Object.fromEntries(jsonRenderManifest.actions.map((action) => [action.name, {
    params: z.object({ target_id: z.string().min(1) }).strict(),
    description: `Invoke the allowlisted ${action.name} host action for one target_id.`,
  }])),
});

export function buildJsonRenderPrompt() {
  return jsonRenderCatalog.prompt({
    mode: "standalone",
    customRules: [
      "Use every element key as its stable id and copy that key into props.id.",
      "Use only the supplied state keys and preserve their supplied values in top-level state.",
      "For Input and Select value, or Checkbox and Switch checked, use a $bindState pointer to the declared state key.",
      "Put Button actions only in on.press. Use only catalog actions with exactly one target_id parameter.",
      "Use element children for Toolbar, Dialog, and Tabs relationships. Preserve declared order and make every element reachable from root.",
      "Return JSONL patch operations only. Do not return prose or a code fence.",
    ],
  });
}

function componentPropShape(component) {
  if (component.name === "Tabs") {
    const shape = baseComponentPropShape(component, new Set(["items"]));
    shape.items = z.array(z.object({ value: z.string(), label: z.string() }).strict());
    return shape;
  }
  return baseComponentPropShape(component, structuralProps.get(component.name) ?? new Set());
}

function baseComponentPropShape(component, omitted) {
  return Object.fromEntries(Object.entries(component.props)
    .filter(([name]) => !omitted.has(name))
    .map(([name, definition]) => [name, toZod(definition)]));
}

function toZod(definition) {
  let value;
  if (definition.enum) value = z.enum(definition.enum);
  else if (definition.type === "string") value = z.string();
  else if (definition.type === "number") value = z.number();
  else if (definition.type === "boolean") value = z.boolean();
  else if (definition.type === "array") value = z.array(toZod(definition.items));
  else if (definition.type === "object") value = z.object(Object.fromEntries(Object.entries(definition.properties ?? {}).map(([name, child]) => [name, toZod(child)]))).strict();
  else value = z.unknown();
  if (!definition.enum && (definition.format === "component-id-ref" || definition.format === "component-ref" || definition.required)) {
    if (definition.type === "string") value = value.min(1);
  }
  return definition.required === false ? value.optional() : value;
}

function hasChildren(name) {
  return ["Toolbar", "Dialog", "Tabs"].includes(name);
}

import {
  A2uiMessageListWrapperSchema,
  Catalog,
  MessageProcessor,
} from "@a2ui/web_core/v0_9";
import { readFileSync } from "node:fs";
import { z } from "zod3";

const components = [
  { name: "Text", schema: z.object({ text: z.string() }).strict() },
  { name: "Stack", schema: z.object({ children: z.array(z.string()) }).strict() },
  { name: "Card", schema: z.object({ title: z.string(), child: z.string() }).strict() },
  {
    name: "Table",
    schema: z
      .object({ columns: z.array(z.string()), rows: z.array(z.record(z.string())) })
      .strict(),
  },
  {
    name: "Input",
    schema: z
      .object({ label: z.string(), state_key: z.literal("review_note"), value: z.string() })
      .strict(),
  },
  {
    name: "Select",
    schema: z
      .object({
        label: z.string(),
        state_key: z.literal("status_filter"),
        options: z.array(z.string()),
        value: z.string(),
      })
      .strict(),
  },
  {
    name: "Button",
    schema: z
      .object({
        label: z.string(),
        action: z
          .object({ name: z.literal("ApproveExpense"), expense_id: z.string() })
          .strict(),
      })
      .strict(),
  },
  {
    name: "Alert",
    schema: z
      .object({
        tone: z.enum(["info", "success", "warning", "error"]),
        message: z.string(),
      })
      .strict(),
  },
];

export const a2uiCatalog = new Catalog(
  "openui-dioxus-expense-review@0.0.0",
  components,
);

const minimalEnvelope = JSON.parse(
  readFileSync(new URL("../../fixtures/minimal-envelope.a2ui.json", import.meta.url), "utf8"),
);

export function buildA2UiPrompt() {
  const processor = new MessageProcessor([a2uiCatalog], undefined, { version: "v0.9.1" });
  const capabilities = processor.getClientCapabilities({
    includeInlineCatalogs: true,
    version: "v0.9.1",
  });
  return [
    "Return only one A2UI v0.9.1 JSON object with a messages array.",
    "The messages array must contain, in order:",
    "1. A version v0.9.1 createSurface message with surfaceId, catalogId, and sendDataModel true.",
    "2. A version v0.9.1 updateComponents message with the same surfaceId and one components array.",
    "3. A version v0.9.1 updateDataModel message with the same surfaceId, path /, and the state object in value.",
    "Put id, component, and component props directly on each component object.",
    "Put version on every message and nowhere at the top level.",
    "Create exactly one surface with catalogId openui-dioxus-expense-review@0.0.0.",
    "Use every catalog component exactly once and stable ids for all components.",
    "Use only review_note and status_filter as state keys.",
    "Use only ApproveExpense with an expense_id as an action.",
    "Preserve both supplied expense rows exactly.",
    "The Card and Stack child values are component ids. Produce one unreferenced root.",
    "Client capabilities and inline catalog:",
    JSON.stringify(capabilities),
    "Minimal envelope example (syntax only; do not copy its content):",
    JSON.stringify(minimalEnvelope),
  ].join("\n");
}

function cleanJson(source) {
  const trimmed = source.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function diagnosticsFromZod(error) {
  return error.issues.map((issue) => ({
    code: issue.code,
    path: issue.path.join("/"),
    message: issue.message,
  }));
}

export function validateA2Ui(source) {
  try {
    const raw = JSON.parse(cleanJson(source));
    const parsed = A2uiMessageListWrapperSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        protocol: "a2ui",
        version: "v0.9.1/@a2ui/web_core@0.10.6",
        diagnostics: diagnosticsFromZod(parsed.error),
        resolved: null,
      };
    }

    const unknown = parsed.data.messages
      .flatMap((message) => message.updateComponents?.components ?? [])
      .find((component) => !a2uiCatalog.components.has(component.component));
    if (unknown) {
      return {
        ok: false,
        protocol: "a2ui",
        version: "v0.9.1/@a2ui/web_core@0.10.6",
        diagnostics: [
          { code: "unknown-component", message: `Unknown component: ${unknown.component}` },
        ],
        resolved: null,
      };
    }

    const processor = new MessageProcessor([a2uiCatalog], undefined, { version: "v0.9.1" });
    processor.processMessages(parsed.data);
    const surfaces = [...processor.model.surfacesMap.values()];
    if (surfaces.length !== 1) {
      throw new Error(`expected one A2UI surface, found ${surfaces.length}`);
    }
    const surface = surfaces[0];
    const resolved = {
      surface_id: surface.id,
      components: [...surface.componentsModel.entries].map(([id, component]) => ({
        id,
        component: component.type,
        properties: component.properties,
      })),
      data_model: surface.dataModel.get("/"),
    };
    return {
      ok: true,
      protocol: "a2ui",
      version: "v0.9.1/@a2ui/web_core@0.10.6",
      diagnostics: [],
      resolved,
    };
  } catch (error) {
    return {
      ok: false,
      protocol: "a2ui",
      version: "v0.9.1/@a2ui/web_core@0.10.6",
      diagnostics: [{ code: "processor-error", message: String(error?.message ?? error) }],
      resolved: null,
    };
  }
}

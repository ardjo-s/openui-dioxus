import { z } from "zod/v4";

const id = z.string().min(1);
const row = z
  .object({
    expense_id: z.string(),
    merchant: z.string(),
    amount: z.string(),
    status: z.string(),
  })
  .strict();
const action = z
  .object({ name: z.literal("ApproveExpense"), expense_id: z.string().min(1) })
  .strict();
const nodes = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("Text"), id, text: z.string() }).strict(),
  z.object({ kind: z.literal("Stack"), id, children: z.array(id) }).strict(),
  z.object({ kind: z.literal("Card"), id, title: z.string(), child: id }).strict(),
  z.object({ kind: z.literal("Table"), id, columns: z.array(z.string()), rows: z.array(row) }).strict(),
  z
    .object({
      kind: z.literal("Input"),
      id,
      label: z.string(),
      state_key: z.literal("review_note"),
      value: z.string(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("Select"),
      id,
      label: z.string(),
      state_key: z.literal("status_filter"),
      options: z.array(z.string()),
      value: z.string(),
    })
    .strict(),
  z.object({ kind: z.literal("Button"), id, label: z.string(), action }).strict(),
  z
    .object({
      kind: z.literal("Alert"),
      id,
      tone: z.enum(["info", "success", "warning", "error"]),
      message: z.string(),
    })
    .strict(),
]);
const programSchema = z.object({ root: id, nodes: z.array(nodes).min(1).max(64) }).strict();

export const typedJsonSchema = z.toJSONSchema(programSchema, {
  target: "draft-2020-12",
  reused: "ref",
});

export const typedJsonMinimalExample = {
  root: "example-card",
  nodes: [
    { kind: "Text", id: "example-text", text: "Example" },
    { kind: "Stack", id: "example-stack", children: ["example-text"] },
    { kind: "Card", id: "example-card", title: "Example", child: "example-stack" },
  ],
};

export function buildTypedJsonPrompt() {
  return [
    "Return only one strict typed-JSON object matching the supplied JSON Schema.",
    "Create exactly one Card root and an array of component nodes.",
    "Use every catalog component exactly once and stable non-empty ids for all nodes.",
    "Card.child and Stack.children contain component ids.",
    "Use only review_note and status_filter as state keys.",
    "Use only ApproveExpense with an expense_id as an action.",
    "Preserve both supplied expense rows exactly.",
    "Do not add properties absent from the schema.",
    "JSON Schema:",
    JSON.stringify(typedJsonSchema),
    "Minimal syntax example (do not copy its content):",
    JSON.stringify(typedJsonMinimalExample),
  ].join("\n");
}

export function validateTypedJson(source) {
  try {
    const raw = JSON.parse(cleanJson(source));
    const parsed = programSchema.safeParse(raw);
    if (!parsed.success) {
      return failure(
        parsed.error.issues.map((issue) => ({
          code: issue.code,
          path: issue.path.join("/"),
          message: issue.message,
        })),
      );
    }
    const diagnostics = semanticDiagnostics(parsed.data);
    return {
      ok: diagnostics.length === 0,
      protocol: "typed-json",
      version: "typed-json-v1",
      diagnostics,
      program: diagnostics.length === 0 ? parsed.data : null,
    };
  } catch (error) {
    return failure([{ code: "parse-exception", message: String(error?.message ?? error) }]);
  }
}

export function validateTypedJsonSyntax(value) {
  return programSchema.safeParse(value);
}

function semanticDiagnostics(program) {
  const diagnostics = [];
  const expectedKinds = ["Alert", "Button", "Card", "Input", "Select", "Stack", "Table", "Text"];
  const kindCounts = Object.fromEntries(expectedKinds.map((kind) => [kind, 0]));
  const byId = new Map();
  for (const node of program.nodes) {
    kindCounts[node.kind] += 1;
    if (byId.has(node.id)) {
      diagnostics.push({ code: "duplicate-id", message: `Duplicate component id: ${node.id}` });
    }
    byId.set(node.id, node);
  }
  for (const kind of expectedKinds) {
    if (kindCounts[kind] !== 1) {
      diagnostics.push({
        code: "catalog-cardinality",
        message: `Expected exactly one ${kind}; found ${kindCounts[kind]}`,
      });
    }
  }
  const root = byId.get(program.root);
  if (!root) diagnostics.push({ code: "broken-root", message: `Unknown root: ${program.root}` });
  if (root && root.kind !== "Card") {
    diagnostics.push({ code: "wrong-root", message: "The declared root must be a Card" });
  }
  const referenced = new Set();
  for (const node of program.nodes) {
    const references =
      node.kind === "Stack" ? node.children : node.kind === "Card" ? [node.child] : [];
    for (const reference of references) {
      if (!byId.has(reference)) {
        diagnostics.push({
          code: "broken-reference",
          message: `${node.id} references unknown component ${reference}`,
        });
      }
      referenced.add(reference);
    }
  }
  const roots = program.nodes.filter((node) => !referenced.has(node.id)).map((node) => node.id);
  if (roots.length !== 1 || roots[0] !== program.root) {
    diagnostics.push({
      code: "root-count",
      message: `Expected only declared root ${program.root}; found ${roots.join(", ")}`,
    });
  }
  return diagnostics;
}

function cleanJson(source) {
  const trimmed = source.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function failure(diagnostics) {
  return {
    ok: false,
    protocol: "typed-json",
    version: "typed-json-v1",
    diagnostics,
    program: null,
  };
}

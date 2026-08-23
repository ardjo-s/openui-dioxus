import {
  createLibrary,
  createParser,
  defineComponent,
  generateSystemPrompt,
} from "@openuidev/lang-core";
import { z } from "zod/v4";

const renderToken = Symbol("dioxus-adapter-owned");

const definitions = [
  defineComponent({
    name: "Text",
    props: z.object({ id: z.string(), text: z.string() }),
    description: "Static text with a stable id.",
    component: renderToken,
  }),
  defineComponent({
    name: "Stack",
    props: z.object({ id: z.string(), children: z.array(z.any()) }),
    description: "Ordered vertical children with a stable id.",
    component: renderToken,
  }),
  defineComponent({
    name: "Card",
    props: z.object({ id: z.string(), title: z.string(), child: z.any() }),
    description: "Titled container with one child and a stable id.",
    component: renderToken,
  }),
  defineComponent({
    name: "Table",
    props: z.object({
      id: z.string(),
      columns: z.array(z.string()),
      rows: z.array(z.record(z.string(), z.string())),
    }),
    description: "Expense rows. Keep both provided expenses unchanged.",
    component: renderToken,
  }),
  defineComponent({
    name: "Input",
    props: z.object({
      id: z.string(),
      label: z.string(),
      state_key: z.literal("review_note"),
      value: z.string(),
    }),
    description: "Reviewer note input bound to review_note.",
    component: renderToken,
  }),
  defineComponent({
    name: "Select",
    props: z.object({
      id: z.string(),
      label: z.string(),
      state_key: z.literal("status_filter"),
      options: z.array(z.string()),
      value: z.string(),
    }),
    description: "Status filter bound to status_filter.",
    component: renderToken,
  }),
  defineComponent({
    name: "Button",
    props: z.object({
      id: z.string(),
      label: z.string(),
      action: z.object({
        name: z.literal("ApproveExpense"),
        expense_id: z.string(),
      }),
    }),
    description: "Approval button. Only ApproveExpense with expense_id is allowed.",
    component: renderToken,
  }),
  defineComponent({
    name: "Alert",
    props: z.object({
      id: z.string(),
      tone: z.enum(["info", "success", "warning", "error"]),
      message: z.string(),
    }),
    description: "Result alert with a stable id.",
    component: renderToken,
  }),
];

export const openUiLibrary = createLibrary({
  id: "openui-dioxus-expense-review@0.0.0",
  components: definitions,
  root: "Card",
});

const parser = createParser(openUiLibrary.toJSONSchema(), openUiLibrary.root);

export function buildOpenUiPrompt() {
  return generateSystemPrompt({
    library: openUiLibrary.toSpec(),
    promptOptions: {
      preamble: "Return only one OpenUI Lang program for the supplied expense-review intent.",
      additionalRules: [
        "Use every catalog component exactly once.",
        "Use stable ids for every component.",
        "Use only review_note and status_filter as state keys.",
        "Use only ApproveExpense with an expense_id as an action.",
        "Preserve both expense rows exactly as supplied.",
      ],
    },
  });
}

export function validateOpenUi(source) {
  try {
    const parse = parser.parse(source);
    const diagnostics = [
      ...parse.meta.errors,
      ...parse.meta.unresolved.map((name) => ({ code: "unresolved", message: name })),
      ...parse.meta.orphaned.map((name) => ({ code: "orphaned", message: name })),
      ...(parse.meta.incomplete ? [{ code: "incomplete", message: "program is incomplete" }] : []),
      ...(!parse.root ? [{ code: "missing-root", message: "no root component" }] : []),
    ];
    return {
      ok: diagnostics.length === 0,
      protocol: "openui",
      version: "lang-v0.5/@openuidev/lang-core@0.2.15",
      diagnostics,
      parse,
    };
  } catch (error) {
    return {
      ok: false,
      protocol: "openui",
      version: "lang-v0.5/@openuidev/lang-core@0.2.15",
      diagnostics: [{ code: "parse-exception", message: String(error?.message ?? error) }],
      parse: null,
    };
  }
}

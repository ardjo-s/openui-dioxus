import { readFileSync } from "node:fs";

const manifest = JSON.parse(
  readFileSync(new URL("../../fixtures/controlled-scenarios.json", import.meta.url), "utf8"),
);

export const controlledScenarioManifest = manifest;

export const controlledScenarios = manifest.families.flatMap((family) =>
  family.variants.map((variant, index) => ({
    id: `${family.id}-${variant.id}`,
    family: family.id,
    variant: index + 1,
    intent: family.intent,
    rows: variant.rows,
    expected: {
      expense_ids: variant.rows.map((row) => row.expense_id),
      rows: variant.rows,
      action_expense_id: manifest.action.expense_id,
      state_keys: manifest.state_keys,
      filter_options: manifest.filter_options,
      required_components: manifest.required_components,
    },
  })),
);

export function buildSharedScenarioPrompt(scenario) {
  const result = {
    content: [
      {
        type: "text",
        text: JSON.stringify({ expenses: scenario.rows }),
      },
    ],
    isError: false,
  };
  return [
    `CONTROLLED SCENARIO — ${scenario.id}`,
    "INTENT",
    scenario.intent,
    "Build one expense-review interface for the two supplied expenses. The reviewer must enter a note, filter by status, approve expense exp-001, and see a result alert. Preserve every supplied value exactly.",
    "MCP TOOL SCHEMA — list_expenses",
    JSON.stringify(manifest.tool_schema),
    "MCP TOOL RESULT — list_expenses",
    JSON.stringify(result),
    "MCP ACTION SCHEMA — ApproveExpense",
    JSON.stringify(manifest.action_schema),
    "SHARED CATALOG SEMANTICS",
    "- Text renders static text.",
    "- Stack renders ordered child component ids.",
    "- Card renders one titled child.",
    "- Table renders the supplied expense rows.",
    "- Input binds review_note and starts empty.",
    "- Select binds status_filter, starts at pending, and uses exactly all, pending, approved.",
    "- Button emits only ApproveExpense with expense_id exp-001.",
    "- Alert presents the result state.",
    "REQUIRED SEMANTICS",
    "- Use exactly these state keys: review_note and status_filter.",
    "- The only action is ApproveExpense { expense_id } for exp-001.",
    "- Every component has a stable non-empty id.",
    "- Use all eight catalog components exactly once.",
    "- Produce exactly one unreferenced Card root.",
    "- Return only the protocol payload, with no explanation.",
  ].join("\n\n");
}


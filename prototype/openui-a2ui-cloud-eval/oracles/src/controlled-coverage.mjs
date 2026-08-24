export function coverageFor(surface, render, scenario) {
  const nodeCount = Object.keys(surface.nodes).length;
  const kinds = [...new Set(Object.values(surface.nodes).map((node) => node.kind))].sort();
  const expected = ["Alert", "Button", "Card", "Input", "Select", "Stack", "Table", "Text"];
  const table = Object.values(surface.nodes).find((node) => node.kind === "Table");
  const expenseIds = (table?.rows ?? []).map((row) => row.expense_id).sort();
  const expectedRows = scenario?.expected?.rows ?? null;
  const rowsMatch = expectedRows
    ? expectedRows.length === (table?.rows ?? []).length &&
      expectedRows.every((expectedRow, index) =>
        ["expense_id", "merchant", "amount", "status"].every(
          (key) => table.rows[index]?.[key] === expectedRow[key],
        ),
      )
    : JSON.stringify(expenseIds) === JSON.stringify(["exp-001", "exp-002"]);
  const passed =
    nodeCount === 8 &&
    JSON.stringify(kinds) === JSON.stringify(expected) &&
    rowsMatch &&
    surface.fields.review_note === "" &&
    surface.fields.status_filter === "pending" &&
    render.has_all_components === true;
  return {
    passed,
    kinds,
    expense_ids: expenseIds,
    expected_rows_match: rowsMatch,
    node_count: nodeCount,
  };
}

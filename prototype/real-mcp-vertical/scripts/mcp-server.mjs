import readline from "node:readline";

const expenses = [
  { id: "exp-001", merchant: "Acme Rail", amount_cents: 4280, currency: "EUR", status: "pending" },
  { id: "exp-002", merchant: "Cafe Compile", amount_cents: 1860, currency: "EUR", status: "pending" },
];

const tools = [
  {
    name: "list_pending_expenses",
    description: "List deterministic pending expenses",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "approve_expense",
    description: "Approve one expense",
    inputSchema: {
      type: "object",
      properties: { expense_id: { type: "string" } },
      required: ["expense_id"],
      additionalProperties: false,
    },
  },
];

function result(id, value) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result: value }) + "\n");
}

const lines = readline.createInterface({ input: process.stdin });
lines.on("line", (line) => {
  const message = JSON.parse(line);
  if (message.method === "initialize") {
    result(message.id, { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "expense-prototype", version: "0.0.0" } });
  } else if (message.method === "tools/list") {
    result(message.id, { tools });
  } else if (message.method === "tools/call" && message.params?.name === "list_pending_expenses") {
    result(message.id, { content: [{ type: "text", text: JSON.stringify({ expenses }) }], structuredContent: { expenses } });
  } else if (message.method === "tools/call" && message.params?.name === "approve_expense") {
    const expense = expenses.find((item) => item.id === message.params.arguments?.expense_id);
    if (!expense) result(message.id, { isError: true, content: [{ type: "text", text: "unknown expense" }] });
    else {
      expense.status = "approved";
      result(message.id, { content: [{ type: "text", text: `approved ${expense.id}` }], structuredContent: { expense_id: expense.id, status: expense.status } });
    }
  } else {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: message.id ?? null, error: { code: -32601, message: "Method not found" } }) + "\n");
  }
});

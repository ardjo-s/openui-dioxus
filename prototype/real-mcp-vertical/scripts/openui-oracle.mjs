import { parse } from "@openuidev/lang-core";

const params = new Map([
  ["ExpenseReview", { params: [
    { name: "title", required: true },
    { name: "expenses", required: true },
    { name: "actionLabel", required: true },
  ] }],
]);

let source = "";
for await (const chunk of process.stdin) source += chunk;
const result = parse(source, params, "root");
process.stdout.write(JSON.stringify({
  package: "@openuidev/lang-core",
  version: "0.2.15",
  accepted: Boolean(result.root) && result.meta.errors.length === 0 && result.meta.unresolved.length === 0,
  root: result.root,
  meta: result.meta,
}));

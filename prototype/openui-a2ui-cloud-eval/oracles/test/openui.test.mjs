import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildOpenUiPrompt, validateOpenUi } from "../src/openui.mjs";

const fixture = fileURLToPath(new URL("../../fixtures/reference.openui", import.meta.url));

test("official OpenUI library prompt and parser accept the reference surface", async () => {
  const source = await readFile(fixture, "utf8");
  const result = validateOpenUi(source);
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  assert.equal(result.parse.meta.statementCount, 8);
  assert.match(buildOpenUiPrompt(), /Text\(/);
  assert.match(buildOpenUiPrompt(), /ApproveExpense/);
});

test("official OpenUI parser reports an unknown component", () => {
  const result = validateOpenUi('root = Dangerous("root")');
  assert.equal(result.ok, false);
  assert.match(JSON.stringify(result.diagnostics), /unknown-component|root/i);
});

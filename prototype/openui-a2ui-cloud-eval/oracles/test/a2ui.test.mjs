import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildA2UiPrompt, validateA2Ui } from "../src/a2ui.mjs";

const fixture = fileURLToPath(new URL("../../fixtures/reference.a2ui.json", import.meta.url));

test("official A2UI MessageProcessor accepts and resolves the reference surface", async () => {
  const source = await readFile(fixture, "utf8");
  const result = validateA2Ui(source);
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  assert.equal(result.resolved.components.length, 8);
  assert.match(buildA2UiPrompt(), /v0\.9\.1/);
  assert.match(buildA2UiPrompt(), /ApproveExpense/);
});

test("A2UI catalog rejects an unknown component", async () => {
  const payload = JSON.parse(await readFile(fixture, "utf8"));
  payload.messages[1].updateComponents.components[0].component = "Dangerous";
  const result = validateA2Ui(JSON.stringify(payload));
  assert.equal(result.ok, false);
  assert.match(JSON.stringify(result.diagnostics), /unknown-component|Dangerous/i);
});

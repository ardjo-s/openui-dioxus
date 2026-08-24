import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSharedScenarioPrompt,
  controlledScenarios,
} from "../src/controlled-scenarios.mjs";

test("the controlled corpus expands to five families and twenty paired scenarios", () => {
  assert.equal(controlledScenarios.length, 20);
  assert.equal(new Set(controlledScenarios.map((scenario) => scenario.id)).size, 20);
  const familyCounts = Object.groupBy(controlledScenarios, (scenario) => scenario.family);
  assert.equal(Object.keys(familyCounts).length, 5);
  assert.deepEqual(
    Object.values(familyCounts).map((items) => items.length),
    [4, 4, 4, 4, 4],
  );
});

test("every scenario exposes deterministic shared semantics without protocol syntax", () => {
  for (const scenario of controlledScenarios) {
    assert.deepEqual(scenario.expected.expense_ids, ["exp-001", "exp-002"]);
    assert.equal(scenario.expected.action_expense_id, "exp-001");
    assert.deepEqual(scenario.expected.state_keys, ["review_note", "status_filter"]);
    assert.equal(scenario.expected.required_components.length, 8);
    const first = buildSharedScenarioPrompt(scenario);
    const second = buildSharedScenarioPrompt(scenario);
    assert.equal(first, second);
    assert.match(first, new RegExp(scenario.id));
    assert.match(first, /ApproveExpense/);
    assert.doesNotMatch(first, /OpenUI|A2UI|createSurface|updateComponents/);
  }
});


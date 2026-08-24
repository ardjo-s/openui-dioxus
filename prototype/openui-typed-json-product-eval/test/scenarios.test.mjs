import assert from "node:assert/strict";
import test from "node:test";

import { preregistration } from "../src/preregister.mjs";
import { buildScenarios } from "../src/scenarios.mjs";

test("five workflow families produce four deterministic variants each", async () => {
  const scenarios = await buildScenarios();
  assert.equal(scenarios.length, 20);
  assert.equal(new Set(scenarios.map((scenario) => scenario.family)).size, 5);
  for (const family of new Set(scenarios.map((scenario) => scenario.family))) {
    assert.deepEqual(scenarios.filter((scenario) => scenario.family === family).map((scenario) => scenario.variant), [1, 2, 3, 4]);
  }
  assert.equal(new Set(scenarios.map((scenario) => scenario.shared_prompt)).size, 20);
  for (const scenario of scenarios) {
    assert.deepEqual(scenario.shared_contract.initial_state, scenario.expected.state);
    assert.equal(scenario.shared_contract.replay.same_fingerprint, true);
    assert.equal(scenario.shared_contract.replay.additional_host_effects, 0);
    assert.deepEqual(scenario.shared_contract.acceptance.required_state, scenario.expected.state);
    assert.equal("exact_wire_surface" in scenario.shared_contract.acceptance, false);
    assert.equal(scenario.shared_prompt.includes(JSON.stringify(scenario.expected)), false);
    assert.ok(scenario.shared_prompt.includes(JSON.stringify(scenario.shared_contract)));
  }
});

test("preregistration freezes 20 paired schedules and Luna-low isolation", async () => {
  const first = await preregistration();
  const second = await preregistration();
  assert.equal(first.hash, second.hash);
  assert.equal(first.schedule.length, 20);
  assert.deepEqual(first.schedule[0].order, ["openui", "typed-json"]);
  assert.deepEqual(first.schedule[1].order, ["typed-json", "openui"]);
  assert.equal(first.model_configuration.model, "gpt-5.6-luna");
  assert.equal(first.model_configuration.reasoning_effort, "low");
  assert.equal(first.model_configuration.fresh_ephemeral_process_per_attempt, true);
  assert.equal(first.model_configuration.tools_disabled, true);
  assert.equal(first.model_configuration.output_executed, false);
});

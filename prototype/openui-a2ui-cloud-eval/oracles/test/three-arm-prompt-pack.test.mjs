import assert from "node:assert/strict";
import test from "node:test";

import { buildThreeArmPromptPack } from "../src/three-arm-prompt-pack.mjs";

test("OPE-3 preregistration freezes all three arms, model settings, and schedule", () => {
  const first = buildThreeArmPromptPack();
  const second = buildThreeArmPromptPack();
  assert.deepEqual(first, second);
  assert.equal(first.version, "ope-3-three-arm-v1");
  assert.equal(first.scenarios.length, 20);
  assert.equal(first.schedule.length, 20);
  assert.deepEqual(Object.keys(first.protocols).sort(), ["a2ui", "openui", "typed-json"]);
  assert.equal(first.model_configuration.model, "gpt-5.6-luna");
  assert.equal(first.model_configuration.reasoning_effort, "low");
  assert.equal(first.scoring.maximum_calls, 120);
  assert.match(first.hash, /^[a-f0-9]{64}$/);
  for (const required of [
    "openui_reference",
    "a2ui_reference",
    "typed_json_reference",
    "generation_driver",
    "three_arm_scorer",
    "openui_adapter",
    "a2ui_adapter",
    "typed_json_adapter",
    "runtime_probe",
    "desktop_runner",
    "web_runner",
    "historical_ope1_checksums",
  ]) {
    assert.match(first.input_hashes[required], /^[a-f0-9]{64}$/);
  }
});

test("shared scenario bytes stay representation-neutral", () => {
  const pack = buildThreeArmPromptPack();
  for (const scenario of pack.scenarios) {
    assert.doesNotMatch(
      scenario.shared_prompt,
      /OpenUI|A2UI|typed-JSON|createSurface|updateComponents|JSON Schema/,
    );
  }
  assert.match(pack.protocols.openui.instructions, /OpenUI/);
  assert.match(pack.protocols.a2ui.instructions, /createSurface/);
  assert.match(pack.protocols["typed-json"].instructions, /JSON Schema/);
});

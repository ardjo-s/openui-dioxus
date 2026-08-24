import assert from "node:assert/strict";
import test from "node:test";

import { buildControlledPromptPack } from "../src/controlled-prompt-pack.mjs";

test("the preregistered pack hashes shared scenarios and both protocol instructions", () => {
  const first = buildControlledPromptPack();
  const second = buildControlledPromptPack();
  assert.deepEqual(first, second);
  assert.equal(first.scenarios.length, 20);
  assert.match(first.hash, /^[a-f0-9]{64}$/);
  assert.match(first.protocols.openui.hash, /^[a-f0-9]{64}$/);
  assert.match(first.protocols.a2ui.hash, /^[a-f0-9]{64}$/);
  assert.notEqual(first.protocols.openui.hash, first.protocols.a2ui.hash);
  assert.equal(new Set(first.scenarios.map((item) => item.shared_prompt_hash)).size, 20);
  assert.deepEqual(Object.keys(first.input_hashes).sort(), [
    "a2ui_minimal_envelope",
    "controlled_scorer",
    "node_lock",
    "rust_lock",
    "scenario_manifest",
  ]);
  assert.equal(first.scoring.minimum_cumulative_raw_token_advantage, 0.3);
});

test("shared prompts contain no protocol syntax while arms contain their own syntax", () => {
  const pack = buildControlledPromptPack();
  assert.doesNotMatch(pack.scenarios[0].shared_prompt, /OpenUI|A2UI|createSurface|updateComponents/);
  assert.match(pack.protocols.openui.instructions, /OpenUI/);
  assert.match(pack.protocols.a2ui.instructions, /createSurface/);
});

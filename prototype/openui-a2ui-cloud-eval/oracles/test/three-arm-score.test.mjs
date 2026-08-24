import assert from "node:assert/strict";
import test from "node:test";

import { scoreThreeArmEvaluation } from "../src/three-arm-score.mjs";

function record(protocol, passage, rawTokens, latencyMs = 1_000) {
  return {
    protocol,
    passage,
    scenario_id: `scenario-${passage}`,
    attempt: 1,
    accepted: true,
    diagnostics: [],
    provider_error: null,
    response_bytes: rawTokens,
    tokens: { raw_prompt_tokens: rawTokens, raw_output_tokens: 0 },
    latency: { full_response_ms: latencyMs },
    coverage: { passed: true },
    runtime_probe: {
      state_preserved: true,
      action_exactly_once: true,
      replay_same_fingerprint: true,
      replay_effect_count: 0,
    },
  };
}

function input(tokens = { openui: 400, a2ui: 700, "typed-json": 800 }) {
  const records = Array.from({ length: 20 }, (_, index) =>
    Object.entries(tokens).map(([arm, raw]) => record(arm, index + 1, raw)),
  ).flat();
  return {
    records,
    generation: {
      calls: 60,
      provider_error: null,
      preregistration_verified: true,
      prompt_pack_hash: "a".repeat(64),
    },
    platform: {
      desktop: { passed: true, accepted_count: 60 },
      web: { passed: true, accepted_count: 60 },
    },
    loc: { openui: 100, a2ui: 100, "typed-json": 100 },
    runtimeDiff: 0,
  };
}

test("one evidence set emits both primary OpenUI wins", () => {
  const result = scoreThreeArmEvaluation(input());
  assert.equal(result.outcome, "VALID_EVAL");
  assert.equal(result.pairwise.openui_vs_a2ui.outcome, "OPENUI_WIN");
  assert.equal(result.pairwise.openui_vs_typed_json.outcome, "OPENUI_WIN");
  assert.equal(result.pairwise.openui_vs_a2ui.matched_scenarios, 20);
});

test("the same scorer allows the other side to win and reports ties", () => {
  const other = scoreThreeArmEvaluation(input({ openui: 800, a2ui: 400, "typed-json": 400 }));
  assert.equal(other.pairwise.openui_vs_a2ui.outcome, "OTHER_WIN");
  assert.equal(other.pairwise.openui_vs_typed_json.outcome, "OTHER_WIN");
  const tie = scoreThreeArmEvaluation(input({ openui: 700, a2ui: 800, "typed-json": 800 }));
  assert.equal(tie.pairwise.openui_vs_a2ui.outcome, "TIE");
  assert.equal(tie.pairwise.openui_vs_typed_json.outcome, "TIE");
});

test("shared missing evidence invalidates both primary comparisons", () => {
  const values = input();
  values.platform.web.passed = false;
  const result = scoreThreeArmEvaluation(values);
  assert.equal(result.outcome, "INVALID_EVAL");
  assert.equal(result.pairwise.openui_vs_a2ui.outcome, "INVALID_PAIR");
  assert.equal(result.pairwise.openui_vs_typed_json.outcome, "INVALID_PAIR");
});

test("fake provider or synthetic platform evidence can never become decision-grade", () => {
  const fake = input();
  fake.generation.fake_provider = true;
  assert.equal(scoreThreeArmEvaluation(fake).outcome, "INVALID_EVAL");

  const synthetic = input();
  synthetic.platform.desktop.synthetic = true;
  assert.equal(scoreThreeArmEvaluation(synthetic).outcome, "INVALID_EVAL");
});

test("failed first attempts remain in cumulative metrics", () => {
  const values = input();
  const first = values.records.find((item) => item.protocol === "typed-json" && item.passage === 1);
  first.accepted = false;
  first.diagnostics = [{ code: "invalid_type" }];
  first.coverage = null;
  first.runtime_probe = null;
  const repair = record("typed-json", 1, 200, 500);
  repair.attempt = 2;
  values.records.push(repair);
  values.generation.calls = 61;
  const result = scoreThreeArmEvaluation(values);
  assert.equal(result.arm_metrics["typed-json"].cumulative_raw_tokens, 16_200);
  assert.equal(result.arm_metrics["typed-json"].failure_classes.invalid_type, 1);
  assert.equal(result.arm_metrics["typed-json"].passage_latency_ms[0], 1_500);
});

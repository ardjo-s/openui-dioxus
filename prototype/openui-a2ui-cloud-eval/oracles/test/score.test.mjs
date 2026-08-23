import assert from "node:assert/strict";
import test from "node:test";

import { scoreEvaluation } from "../src/score.mjs";

function record(protocol, passage) {
  return {
    protocol,
    passage,
    attempt: 1,
    accepted: true,
    provider_error: null,
    tokens: {
      raw_prompt_tokens: protocol === "openui" ? 400 : 700,
      raw_output_tokens: protocol === "openui" ? 200 : 300,
    },
    latency: { full_response_ms: protocol === "openui" ? 900 : 1000 },
    coverage: { passed: true },
    runtime_probe: {
      state_preserved: true,
      action_exactly_once: true,
      replay_same_fingerprint: true,
      replay_effect_count: 0,
    },
  };
}

function input() {
  return {
    records: Array.from({ length: 20 }, (_, index) => [
      record("openui", index + 1),
      record("a2ui", index + 1),
    ]).flat(),
    generation: { calls: 40, estimated_cost_usd: 0.5, provider_error: null },
    platform: {
      desktop: { passed: true, accepted_count: 40 },
      web: { passed: true, accepted_count: 40 },
    },
    loc: { openui: 100, a2ui: 100 },
    runtimeDiff: 0,
  };
}

test("all explicit thresholds produce the mobile gate", () => {
  const result = scoreEvaluation(input());
  assert.equal(result.openui_wins, true);
  assert.equal(result.pre_mobile_outcome, "OPENUI_WIN_PENDING_MOBILE");
});

test("a shared runtime edit forces pivot", () => {
  const values = input();
  values.runtimeDiff = 1;
  assert.equal(scoreEvaluation(values).pre_mobile_outcome, "PIVOT_OR_STOP");
});

test("an incomplete pair set makes the evaluation invalid", () => {
  const values = input();
  values.records.pop();
  assert.equal(scoreEvaluation(values).pre_mobile_outcome, "INVALID_EVAL");
});

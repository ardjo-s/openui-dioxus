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

test("ChatGPT-plan usage does not invent API cost or invalidate a complete evaluation", () => {
  const values = input();
  values.generation.provider = "codex";
  values.generation.estimated_cost_usd = null;
  values.platform.desktop.evidence_complete = true;
  values.platform.web.evidence_complete = true;
  assert.equal(scoreEvaluation(values).pre_mobile_outcome, "OPENUI_WIN_PENDING_MOBILE");
  assert.equal(scoreEvaluation(values).estimated_cost_usd, null);
});

test("missing local platform evidence makes the evaluation invalid", () => {
  const values = input();
  values.generation.provider = "codex";
  values.generation.estimated_cost_usd = null;
  values.platform.desktop.evidence_complete = false;
  values.platform.web.evidence_complete = true;
  assert.equal(scoreEvaluation(values).pre_mobile_outcome, "INVALID_EVAL");
});

test("token and latency metrics include completed invalid generations", () => {
  const values = input();
  for (const item of values.records.filter((item) => item.protocol === "a2ui")) {
    item.accepted = false;
    item.coverage = { passed: false };
    item.runtime_probe = null;
  }
  values.platform.desktop.accepted_count = 20;
  values.platform.web.accepted_count = 20;
  const result = scoreEvaluation(values);
  assert.equal(result.protocol_metrics.a2ui.median_raw_tokens, 1000);
  assert.equal(result.protocol_metrics.a2ui.median_latency_ms, 1000);
  assert.equal(result.median_raw_token_advantage, 0.4);
});

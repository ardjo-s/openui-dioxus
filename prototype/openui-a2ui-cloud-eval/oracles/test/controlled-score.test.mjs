import assert from "node:assert/strict";
import test from "node:test";

import { scoreControlledEvaluation } from "../src/controlled-score.mjs";

function record(protocol, passage, { accepted = true, rawTokens, latencyMs } = {}) {
  const favored = protocol === "openui";
  return {
    protocol,
    passage,
    scenario_id: `scenario-${passage}`,
    attempt: 1,
    accepted,
    provider_error: null,
    tokens: {
      raw_prompt_tokens: rawTokens ?? (favored ? 400 : 700),
      raw_output_tokens: 0,
    },
    latency: { full_response_ms: latencyMs ?? (favored ? 900 : 1_000) },
    coverage: { passed: accepted },
    runtime_probe: accepted
      ? {
          state_preserved: true,
          action_exactly_once: true,
          replay_same_fingerprint: true,
          replay_effect_count: 0,
        }
      : null,
  };
}

function input() {
  return {
    records: Array.from({ length: 20 }, (_, index) => [
      record("openui", index + 1),
      record("a2ui", index + 1),
    ]).flat(),
    generation: {
      calls: 40,
      provider_error: null,
      preregistration_verified: true,
      prompt_pack_hash: "abc",
    },
    platform: {
      desktop: { passed: true, accepted_count: 40, evidence_complete: true },
      web: { passed: true, accepted_count: 40, evidence_complete: true },
    },
    loc: { openui: 100, a2ui: 100 },
    runtimeDiff: 0,
  };
}

test("OpenUI wins only when its cumulative token advantage clears 30 percent", () => {
  const result = scoreControlledEvaluation(input());
  assert.equal(result.outcome, "CONTROLLED_OPENUI_WIN");
  assert.equal(result.winner, "openui");
});

test("the same evidence mirrored produces an A2UI win", () => {
  const values = input();
  for (const item of values.records) {
    item.protocol = item.protocol === "openui" ? "a2ui" : "openui";
  }
  assert.equal(scoreControlledEvaluation(values).outcome, "CONTROLLED_A2UI_WIN");
});

test("valid evidence without a 30 percent advantage is a controlled tie", () => {
  const values = input();
  for (const item of values.records) {
    item.tokens.raw_prompt_tokens = item.protocol === "openui" ? 700 : 800;
  }
  assert.equal(scoreControlledEvaluation(values).outcome, "CONTROLLED_TIE");
});

test("missing pairs or preregistration makes the evaluation invalid", () => {
  const missingPair = input();
  missingPair.records.pop();
  assert.equal(scoreControlledEvaluation(missingPair).outcome, "INVALID_EVAL");

  const unregistered = input();
  unregistered.generation.preregistration_verified = false;
  assert.equal(scoreControlledEvaluation(unregistered).outcome, "INVALID_EVAL");
});

test("completed invalid attempts remain in cumulative token and latency metrics", () => {
  const values = input();
  const first = values.records.find((item) => item.protocol === "a2ui" && item.passage === 1);
  first.accepted = false;
  first.coverage = { passed: false };
  first.runtime_probe = null;
  values.records.push(record("a2ui", 1, { rawTokens: 300, latencyMs: 500 }));
  values.records.at(-1).attempt = 2;
  values.platform.desktop.accepted_count = 40;
  values.platform.web.accepted_count = 40;

  const result = scoreControlledEvaluation(values);
  assert.equal(result.protocol_metrics.a2ui.first_attempt_raw_tokens, 14_000);
  assert.equal(result.protocol_metrics.a2ui.cumulative_raw_tokens, 14_300);
  assert.equal(result.protocol_metrics.a2ui.passage_latency_ms[0], 1_500);
});

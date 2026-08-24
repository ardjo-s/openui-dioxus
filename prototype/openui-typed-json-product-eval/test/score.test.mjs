import assert from "node:assert/strict";
import test from "node:test";

import { scoreFinalEvaluation } from "../src/score.mjs";

test("final scorer distinguishes GO, PIVOT, NO_GO, and INVALID_EVAL", () => {
  const base = validEvidence();
  assert.equal(scoreFinalEvaluation(base), "GO_OPENUI_DIOXUS");
  assert.equal(scoreFinalEvaluation({
    ...base,
    median_cumulative_raw_tokens: { openui: 100, "typed-json": 100 },
  }), "PIVOT_TO_SURFACE_RUNTIME");
  assert.equal(scoreFinalEvaluation({
    ...base,
    accessibility_no_critical_failure: false,
  }), "NO_GO");
  assert.equal(scoreFinalEvaluation({
    ...base,
    human_time_complete: false,
  }), "INVALID_EVAL");
});

function validEvidence() {
  return {
    pairs_complete: 20,
    preregistration_verified: true,
    real_provider: true,
    evidence_hashes_verified: true,
    blinded_review_complete: true,
    human_time_complete: true,
    provider_error: null,
    platforms: Object.fromEntries(["web", "desktop", "ios", "android"].map((name) => [name, { complete: true, passed: true }])),
    runtime_diff_lines: 0,
    action_policy_pass: true,
    replay_inert_pass: true,
    state_update_pass: true,
    accessibility_no_critical_failure: true,
    maintenance_path_pass: true,
    first_pass_validity: { openui: 19, "typed-json": 19 },
    post_repair_validity: { openui: 20, "typed-json": 20 },
    openui_quality_mean: 4.2,
    typed_json_quality_mean: 4.2,
    openui_maintenance_lines: 10,
    typed_json_maintenance_lines: 10,
    median_cumulative_raw_tokens: { openui: 75, "typed-json": 100 },
    median_human_correction_ms: { openui: 100, "typed-json": 100 },
  };
}

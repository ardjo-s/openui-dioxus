import { median, percentile } from "./score.mjs";
import { THREE_ARMS } from "./three-arm-schedule.mjs";

export function scoreThreeArmEvaluation({ records, generation, platform, loc, runtimeDiff }) {
  const passages = aggregatePassages(records);
  const pairsComplete = Array.from({ length: 20 }, (_, index) => index + 1).filter((passage) => {
    const rows = passages.filter((item) => item.passage === passage);
    return (
      THREE_ARMS.every((arm) => rows.some((item) => item.protocol === arm)) &&
      new Set(rows.map((item) => item.scenario_id)).size === 1
    );
  }).length;
  const firstPassValidity = Object.fromEntries(
    THREE_ARMS.map((arm) => [
      arm,
      records.filter((record) => record.protocol === arm && record.attempt === 1 && record.accepted)
        .length,
    ]),
  );
  const postRepairValidity = Object.fromEntries(
    THREE_ARMS.map((arm) => [
      arm,
      passages.filter((item) => item.protocol === arm && item.accepted).length,
    ]),
  );
  const armMetrics = Object.fromEntries(
    THREE_ARMS.map((arm) => [arm, metricsForArm(arm, records, passages)]),
  );
  const accepted = passages.filter((item) => item.accepted);
  const runtimeSemantics =
    accepted.length > 0 &&
    accepted.every(
      (item) =>
        item.coverage?.passed === true &&
        item.runtime_probe?.state_preserved === true &&
        item.runtime_probe?.action_exactly_once === true &&
        item.runtime_probe?.replay_same_fingerprint === true &&
        item.runtime_probe?.replay_effect_count === 0,
    );
  const commonCriteria = {
    real_provider: generation.fake_provider !== true,
    pairs_complete: pairsComplete === 20,
    preregistration:
      generation.preregistration_verified === true &&
      typeof generation.prompt_pack_hash === "string" &&
      generation.prompt_pack_hash.length === 64,
    runtime_semantics: runtimeSemantics,
    desktop:
      platform.desktop?.passed === true &&
      platform.desktop.synthetic !== true &&
      platform.desktop.accepted_count === accepted.length,
    web:
      platform.web?.passed === true &&
      platform.web.synthetic !== true &&
      platform.web.accepted_count === accepted.length,
    shared_runtime_behavior_diff: runtimeDiff === 0,
  };
  const invalid =
    !Object.values(commonCriteria).every(Boolean) ||
    generation.calls < 60 ||
    generation.calls > 120 ||
    Boolean(generation.provider_error) ||
    records.some((record) => Boolean(record.provider_error));

  const openuiVsA2ui = scorePair({
    left: "openui",
    right: "a2ui",
    records,
    passages,
    firstPassValidity,
    postRepairValidity,
    armMetrics,
    loc,
    invalid,
    openuiPrimary: true,
  });
  const openuiVsTypedJson = scorePair({
    left: "openui",
    right: "typed-json",
    records,
    passages,
    firstPassValidity,
    postRepairValidity,
    armMetrics,
    loc,
    invalid,
    openuiPrimary: true,
  });
  const a2uiVsTypedJson = scorePair({
    left: "a2ui",
    right: "typed-json",
    records,
    passages,
    firstPassValidity,
    postRepairValidity,
    armMetrics,
    loc,
    invalid,
    openuiPrimary: false,
  });

  return {
    generated_at: new Date().toISOString(),
    outcome: invalid ? "INVALID_EVAL" : "VALID_EVAL",
    invalid,
    calls: generation.calls,
    estimated_cost_usd: generation.estimated_cost_usd,
    pairs_complete: pairsComplete,
    first_pass_validity: firstPassValidity,
    post_repair_validity: postRepairValidity,
    arm_metrics: armMetrics,
    accepted_surfaces: accepted.length,
    common_criteria: commonCriteria,
    pairwise: {
      openui_vs_a2ui: openuiVsA2ui,
      openui_vs_typed_json: openuiVsTypedJson,
      a2ui_vs_typed_json: a2uiVsTypedJson,
    },
    loc,
    shared_runtime_behavior_lines_modified: runtimeDiff,
    platform,
  };
}

function scorePair({
  left,
  right,
  records,
  passages,
  firstPassValidity,
  postRepairValidity,
  armMetrics,
  loc,
  invalid,
  openuiPrimary,
}) {
  const criteria = {};
  for (const [candidate, other] of [
    [left, right],
    [right, left],
  ]) {
    const own = armMetrics[candidate];
    const rival = armMetrics[other];
    criteria[candidate] = {
      cumulative_token_advantage:
        rival.cumulative_raw_tokens > 0 &&
        1 - own.cumulative_raw_tokens / rival.cumulative_raw_tokens >= 0.3,
      first_pass_validity:
        firstPassValidity[candidate] >= firstPassValidity[other] - 1,
      repaired_validity:
        postRepairValidity[candidate] >= 19 &&
        postRepairValidity[candidate] >= postRepairValidity[other] - 1,
      latency: own.median_latency_ms <= rival.median_latency_ms * 1.1,
      adapter_loc: loc[candidate] <= loc[other] * 1.25,
    };
  }
  const qualifies = Object.fromEntries(
    [left, right].map((arm) => [arm, !invalid && Object.values(criteria[arm]).every(Boolean)]),
  );
  const winner = qualifies[left] === qualifies[right] ? null : qualifies[left] ? left : right;
  const matched = passages.filter(
    (item) =>
      [left, right].includes(item.protocol) &&
      passages.some(
        (other) =>
          other.passage === item.passage &&
          other.protocol !== item.protocol &&
          [left, right].includes(other.protocol),
      ),
  );
  const deltas = pairedDeltas(passages, left, right);
  const outcome = invalid
    ? openuiPrimary
      ? "INVALID_PAIR"
      : "INVALID"
    : winner === null
      ? "TIE"
      : openuiPrimary
        ? winner === "openui"
          ? "OPENUI_WIN"
          : "OTHER_WIN"
        : winner === left
          ? "LEFT_WIN"
          : "RIGHT_WIN";
  return {
    left,
    right,
    outcome,
    winner,
    matched_scenarios: new Set(matched.map((item) => item.passage)).size,
    criteria,
    qualifies,
    cumulative_raw_token_ratio:
      armMetrics[right].cumulative_raw_tokens > 0
        ? armMetrics[left].cumulative_raw_tokens / armMetrics[right].cumulative_raw_tokens
        : null,
    median_latency_ratio:
      armMetrics[right].median_latency_ms > 0
        ? armMetrics[left].median_latency_ms / armMetrics[right].median_latency_ms
        : null,
    paired_intervals: {
      raw_tokens_left_minus_right: bootstrapInterval(deltas.rawTokens, 0x0e3a11),
      latency_ms_left_minus_right: bootstrapInterval(deltas.latency, 0x0e3a12),
    },
  };
}

function metricsForArm(arm, records, passages) {
  const completed = passages.filter((item) => item.protocol === arm);
  const firstAttempts = records.filter((item) => item.protocol === arm && item.attempt === 1);
  const allAttempts = records.filter((item) => item.protocol === arm);
  const passageLatency = completed.map((item) => item.latency_ms);
  const failureClasses = {};
  for (const record of allAttempts.filter((item) => !item.accepted)) {
    for (const diagnostic of record.diagnostics ?? []) {
      const code = diagnostic.code ?? "unknown";
      failureClasses[code] = (failureClasses[code] ?? 0) + 1;
    }
  }
  return {
    first_attempt_raw_tokens: sumTokens(firstAttempts),
    median_first_attempt_raw_tokens: median(firstAttempts.map(recordTokens)),
    cumulative_raw_tokens: completed.reduce((sum, item) => sum + item.raw_tokens, 0),
    median_passage_raw_tokens: median(completed.map((item) => item.raw_tokens)),
    median_first_attempt_latency_ms: median(
      firstAttempts.map((item) => item.latency.full_response_ms),
    ),
    median_latency_ms: median(passageLatency),
    p95_latency_ms: percentile(passageLatency, 0.95),
    passage_latency_ms: passageLatency,
    cumulative_response_bytes: allAttempts.reduce((sum, item) => sum + item.response_bytes, 0),
    median_response_bytes: median(allAttempts.map((item) => item.response_bytes)),
    failure_classes: failureClasses,
  };
}

function aggregatePassages(records) {
  const grouped = new Map();
  for (const record of records) {
    const key = `${record.passage}:${record.protocol}`;
    const attempts = grouped.get(key) ?? [];
    attempts.push(record);
    grouped.set(key, attempts);
  }
  return [...grouped.values()].map((attempts) => {
    attempts.sort((left, right) => left.attempt - right.attempt);
    const final = attempts.at(-1);
    return {
      protocol: final.protocol,
      passage: final.passage,
      scenario_id: final.scenario_id,
      accepted: final.accepted,
      raw_tokens: sumTokens(attempts),
      latency_ms: attempts.reduce((sum, item) => sum + item.latency.full_response_ms, 0),
      coverage: final.coverage,
      runtime_probe: final.runtime_probe,
    };
  });
}

function pairedDeltas(passages, left, right) {
  const rawTokens = [];
  const latency = [];
  for (let passage = 1; passage <= 20; passage += 1) {
    const a = passages.find((item) => item.passage === passage && item.protocol === left);
    const b = passages.find((item) => item.passage === passage && item.protocol === right);
    if (a && b) {
      rawTokens.push(a.raw_tokens - b.raw_tokens);
      latency.push(a.latency_ms - b.latency_ms);
    }
  }
  return { rawTokens, latency };
}

function bootstrapInterval(values, seed) {
  if (values.length === 0) return { mean_delta: null, low_95: null, high_95: null };
  const means = [];
  let state = seed >>> 0;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  for (let sample = 0; sample < 4000; sample += 1) {
    let sum = 0;
    for (let index = 0; index < values.length; index += 1) {
      sum += values[Math.floor(next() * values.length)];
    }
    means.push(sum / values.length);
  }
  means.sort((a, b) => a - b);
  return {
    mean_delta: values.reduce((sum, value) => sum + value, 0) / values.length,
    low_95: percentile(means, 0.025),
    high_95: percentile(means, 0.975),
  };
}

function recordTokens(record) {
  return record.tokens.raw_prompt_tokens + record.tokens.raw_output_tokens;
}

function sumTokens(records) {
  return records.reduce((sum, item) => sum + recordTokens(item), 0);
}

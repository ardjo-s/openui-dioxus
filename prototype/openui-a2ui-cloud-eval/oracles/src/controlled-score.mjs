import { median, percentile } from "./score.mjs";

const PROTOCOLS = ["openui", "a2ui"];

export function scoreControlledEvaluation({ records, generation, platform, loc, runtimeDiff }) {
  const passages = aggregatePassages(records);
  const pairsComplete = Array.from({ length: 20 }, (_, index) => index + 1).filter((passage) => {
    const pair = passages.filter((item) => item.passage === passage);
    return (
      PROTOCOLS.every((protocol) => pair.some((item) => item.protocol === protocol)) &&
      new Set(pair.map((item) => item.scenario_id)).size === 1
    );
  }).length;
  const firstPassValidity = Object.fromEntries(
    PROTOCOLS.map((protocol) => [
      protocol,
      records.filter(
        (record) => record.protocol === protocol && record.attempt === 1 && record.accepted,
      ).length,
    ]),
  );
  const postRepairValidity = Object.fromEntries(
    PROTOCOLS.map((protocol) => [
      protocol,
      passages.filter((item) => item.protocol === protocol && item.accepted).length,
    ]),
  );
  const protocolMetrics = Object.fromEntries(
    PROTOCOLS.map((protocol) => {
      const completed = passages.filter((item) => item.protocol === protocol);
      const passageLatency = completed.map((item) => item.latency_ms);
      const firstAttempts = records.filter(
        (item) => item.protocol === protocol && item.attempt === 1,
      );
      return [
        protocol,
        {
          first_attempt_raw_tokens: firstAttempts.reduce(
            (sum, item) => sum + item.tokens.raw_prompt_tokens + item.tokens.raw_output_tokens,
            0,
          ),
          median_first_attempt_raw_tokens: median(
            firstAttempts.map(
              (item) => item.tokens.raw_prompt_tokens + item.tokens.raw_output_tokens,
            ),
          ),
          median_first_attempt_latency_ms: median(
            firstAttempts.map((item) => item.latency.full_response_ms),
          ),
          cumulative_raw_tokens: completed.reduce((sum, item) => sum + item.raw_tokens, 0),
          median_passage_raw_tokens: median(completed.map((item) => item.raw_tokens)),
          median_latency_ms: median(passageLatency),
          p95_latency_ms: percentile(passageLatency, 0.95),
          passage_latency_ms: passageLatency,
        },
      ];
    }),
  );
  const accepted = passages.filter((item) => item.accepted);
  const runtimeSemantics = accepted.every(
    (item) =>
      item.coverage?.passed === true &&
      item.runtime_probe?.state_preserved === true &&
      item.runtime_probe?.action_exactly_once === true &&
      item.runtime_probe?.replay_same_fingerprint === true &&
      item.runtime_probe?.replay_effect_count === 0,
  );
  const commonCriteria = {
    pairs_complete: pairsComplete === 20,
    preregistration:
      generation.preregistration_verified === true &&
      typeof generation.prompt_pack_hash === "string" &&
      generation.prompt_pack_hash.length > 0,
    runtime_semantics: runtimeSemantics,
    desktop: platform.desktop?.passed === true && platform.desktop.accepted_count === accepted.length,
    web: platform.web?.passed === true && platform.web.accepted_count === accepted.length,
    shared_runtime_diff: runtimeDiff === 0,
  };
  const invalid =
    !commonCriteria.pairs_complete ||
    !commonCriteria.preregistration ||
    generation.calls > 80 ||
    Boolean(generation.provider_error) ||
    records.some((record) => Boolean(record.provider_error)) ||
    (Number.isFinite(generation.estimated_cost_usd) && generation.estimated_cost_usd > 2);

  const candidateCriteria = Object.fromEntries(
    PROTOCOLS.map((candidate) => {
      const other = candidate === "openui" ? "a2ui" : "openui";
      const own = protocolMetrics[candidate];
      const rival = protocolMetrics[other];
      return [
        candidate,
        {
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
        },
      ];
    }),
  );
  const qualifies = Object.fromEntries(
    PROTOCOLS.map((protocol) => [
      protocol,
      !invalid &&
        Object.values(commonCriteria).every(Boolean) &&
        Object.values(candidateCriteria[protocol]).every(Boolean),
    ]),
  );
  const winner = qualifies.openui === qualifies.a2ui ? null : qualifies.openui ? "openui" : "a2ui";

  return {
    generated_at: new Date().toISOString(),
    outcome: invalid
      ? "INVALID_EVAL"
      : winner === "openui"
        ? "CONTROLLED_OPENUI_WIN"
        : winner === "a2ui"
          ? "CONTROLLED_A2UI_WIN"
          : "CONTROLLED_TIE",
    winner,
    invalid,
    calls: generation.calls,
    estimated_cost_usd: generation.estimated_cost_usd,
    pairs_complete: pairsComplete,
    first_pass_validity: firstPassValidity,
    post_repair_validity: postRepairValidity,
    protocol_metrics: protocolMetrics,
    accepted_surfaces: accepted.length,
    common_criteria: commonCriteria,
    candidate_criteria: candidateCriteria,
    loc,
    shared_runtime_lines_modified: runtimeDiff,
    platform,
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
      raw_tokens: attempts.reduce(
        (sum, item) =>
          sum + item.tokens.raw_prompt_tokens + item.tokens.raw_output_tokens,
        0,
      ),
      latency_ms: attempts.reduce((sum, item) => sum + item.latency.full_response_ms, 0),
      coverage: final.coverage,
      runtime_probe: final.runtime_probe,
    };
  });
}

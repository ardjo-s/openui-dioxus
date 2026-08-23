export function scoreEvaluation({ records, generation, platform, loc, runtimeDiff }) {
  const grouped = new Map();
  for (const record of records) {
    const key = `${record.passage}:${record.protocol}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(record);
    grouped.set(key, bucket);
  }
  const aggregates = [...grouped.values()].map((attempts) => {
    attempts.sort((a, b) => a.attempt - b.attempt);
    const final = attempts.at(-1);
    return {
      protocol: final.protocol,
      passage: final.passage,
      accepted: final.accepted,
      provider_error: final.provider_error,
      raw_tokens: attempts.reduce(
        (sum, item) => sum + item.tokens.raw_prompt_tokens + item.tokens.raw_output_tokens,
        0,
      ),
      latency_ms: attempts.reduce((sum, item) => sum + item.latency.full_response_ms, 0),
      coverage: final.coverage,
      runtime_probe: final.runtime_probe,
    };
  });
  const pairsComplete = new Set(
    [...Array(20)].map((_, index) => index + 1).filter((passage) =>
      ["openui", "a2ui"].every((protocol) =>
        aggregates.some((item) => item.passage === passage && item.protocol === protocol),
      ),
    ),
  ).size;
  const firstPass = Object.fromEntries(
    ["openui", "a2ui"].map((protocol) => [
      protocol,
      records.filter((record) => record.protocol === protocol && record.attempt === 1 && record.accepted)
        .length,
    ]),
  );
  const postRepair = Object.fromEntries(
    ["openui", "a2ui"].map((protocol) => [
      protocol,
      aggregates.filter((item) => item.protocol === protocol && item.accepted).length,
    ]),
  );
  const protocolMetrics = Object.fromEntries(
    ["openui", "a2ui"].map((protocol) => {
      const accepted = aggregates.filter((item) => item.protocol === protocol && item.accepted);
      return [
        protocol,
        {
          median_raw_tokens: median(accepted.map((item) => item.raw_tokens)),
          median_latency_ms: median(accepted.map((item) => item.latency_ms)),
          p95_latency_ms: percentile(accepted.map((item) => item.latency_ms), 0.95),
        },
      ];
    }),
  );
  const tokenAdvantage =
    1 - protocolMetrics.openui.median_raw_tokens / protocolMetrics.a2ui.median_raw_tokens;
  const acceptedAllPass = aggregates
    .filter((item) => item.accepted)
    .every((item) =>
      item.coverage?.passed &&
      item.runtime_probe?.state_preserved &&
      item.runtime_probe?.action_exactly_once &&
      item.runtime_probe?.replay_same_fingerprint &&
      item.runtime_probe?.replay_effect_count === 0,
    );
  const acceptedCount = postRepair.openui + postRepair.a2ui;
  const invalid =
    pairsComplete < 20 ||
    Boolean(generation.provider_error) ||
    records.some((record) => record.provider_error) ||
    generation.calls > 80 ||
    generation.estimated_cost_usd > 2;
  const criteria = {
    pairs_complete: pairsComplete === 20,
    token_advantage: tokenAdvantage >= 0.3,
    first_pass_validity: firstPass.openui >= firstPass.a2ui - 1,
    repaired_validity:
      postRepair.openui >= 19 && postRepair.openui >= postRepair.a2ui - 1,
    latency:
      protocolMetrics.openui.median_latency_ms <= protocolMetrics.a2ui.median_latency_ms * 1.1,
    runtime_semantics: acceptedAllPass,
    desktop: platform.desktop?.passed === true && platform.desktop.accepted_count === acceptedCount,
    web: platform.web?.passed === true && platform.web.accepted_count === acceptedCount,
    shared_runtime_diff: runtimeDiff === 0,
    adapter_loc: loc.openui <= loc.a2ui * 1.25,
  };
  const openuiWins = !invalid && Object.values(criteria).every(Boolean);
  return {
    generated_at: new Date().toISOString(),
    invalid,
    openui_wins: openuiWins,
    pre_mobile_outcome: invalid
      ? "INVALID_EVAL"
      : openuiWins
        ? "OPENUI_WIN_PENDING_MOBILE"
        : "PIVOT_OR_STOP",
    pairs_complete: pairsComplete,
    calls: generation.calls,
    estimated_cost_usd: generation.estimated_cost_usd,
    first_pass_validity: firstPass,
    post_repair_validity: postRepair,
    protocol_metrics: protocolMetrics,
    median_raw_token_advantage: tokenAdvantage,
    accepted_surfaces: acceptedCount,
    loc,
    shared_runtime_lines_modified: runtimeDiff,
    criteria,
    platform,
  };
}

export function median(values) {
  return percentile(values, 0.5);
}

export function percentile(values, quantile) {
  if (!values.length) return Number.POSITIVE_INFINITY;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1);
  return sorted[index];
}

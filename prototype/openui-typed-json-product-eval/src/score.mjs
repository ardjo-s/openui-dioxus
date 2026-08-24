export function scoreFinalEvaluation(evidence) {
  const complete = [
    evidence.pairs_complete === 20,
    evidence.preregistration_verified,
    evidence.real_provider,
    evidence.evidence_hashes_verified,
    evidence.blinded_review_complete,
    evidence.human_time_complete,
    ...["web", "desktop", "ios", "android"].map((platform) => evidence.platforms?.[platform]?.complete === true),
  ].every(Boolean);
  if (!complete || evidence.provider_error) return "INVALID_EVAL";

  const architecturePass = [
    evidence.runtime_diff_lines === 0,
    evidence.action_policy_pass,
    evidence.replay_inert_pass,
    evidence.state_update_pass,
    evidence.accessibility_no_critical_failure,
    evidence.maintenance_path_pass,
    ...["web", "desktop", "ios", "android"].map((platform) => evidence.platforms[platform].passed === true),
  ].every(Boolean);
  if (!architecturePass) return "NO_GO";

  const openuiHardPass = [
    evidence.post_repair_validity.openui >= 19,
    evidence.first_pass_validity.openui >= evidence.first_pass_validity["typed-json"] - 1,
    evidence.post_repair_validity.openui >= evidence.post_repair_validity["typed-json"] - 1,
    evidence.openui_quality_mean >= evidence.typed_json_quality_mean - 0.5,
    evidence.openui_maintenance_lines <= evidence.typed_json_maintenance_lines * 1.25,
  ].every(Boolean);

  const materialAdvantage =
    advantage(evidence.median_cumulative_raw_tokens.openui, evidence.median_cumulative_raw_tokens["typed-json"]) >= 0.20 ||
    evidence.first_pass_validity.openui - evidence.first_pass_validity["typed-json"] >= 2 ||
    advantage(evidence.median_human_correction_ms.openui, evidence.median_human_correction_ms["typed-json"]) >= 0.25;

  return openuiHardPass && materialAdvantage
    ? "GO_OPENUI_DIOXUS"
    : "PIVOT_TO_SURFACE_RUNTIME";
}

export function summarizePreflight(records) {
  const protocols = ["openui", "typed-json"];
  const byPassage = new Map();
  for (const record of records) {
    const key = `${record.passage}:${record.protocol}`;
    const group = byPassage.get(key) ?? [];
    group.push(record);
    byPassage.set(key, group);
  }
  const finalRecords = [...byPassage.values()].map((group) => group.sort((a, b) => a.attempt - b.attempt).at(-1));
  const armRecords = Object.fromEntries(protocols.map((protocol) => [protocol, records.filter((record) => record.protocol === protocol)]));
  return {
    evidence_status: "FAKE_PREFLIGHT_NON_DECISION_GRADE",
    pairs_complete: Array.from({ length: 20 }, (_, index) => index + 1).filter((passage) =>
      protocols.every((protocol) => finalRecords.some((record) => record.passage === passage && record.protocol === protocol)),
    ).length,
    calls: records.length,
    first_pass_validity: Object.fromEntries(protocols.map((protocol) => [protocol, records.filter((record) => record.protocol === protocol && record.attempt === 1 && record.accepted).length])),
    post_repair_validity: Object.fromEntries(protocols.map((protocol) => [protocol, finalRecords.filter((record) => record.protocol === protocol && record.accepted).length])),
    cumulative_raw_tokens: Object.fromEntries(protocols.map((protocol) => [protocol, records.filter((record) => record.protocol === protocol).reduce((sum, record) => sum + record.tokens.raw_prompt_tokens + record.tokens.raw_output_tokens, 0)])),
    median_full_response_ms: Object.fromEntries(protocols.map((protocol) => [protocol, median(armRecords[protocol].map((record) => record.latency.full_response_ms))])),
    cumulative_response_bytes: Object.fromEntries(protocols.map((protocol) => [protocol, armRecords[protocol].reduce((sum, record) => sum + record.response_bytes, 0)])),
    mechanical_repair_count: Object.fromEntries(protocols.map((protocol) => [protocol, armRecords[protocol].filter((record) => record.attempt === 2).length])),
    human_correction_count: Object.fromEntries(protocols.map((protocol) => [protocol, armRecords[protocol].reduce((sum, record) => sum + record.human_correction_count, 0)])),
    human_correction_ms: Object.fromEntries(protocols.map((protocol) => [protocol, armRecords[protocol].reduce((sum, record) => sum + record.human_correction_ms, 0)])),
    semantic_coverage_passages: Object.fromEntries(protocols.map((protocol) => [protocol, finalRecords.filter((record) => record.protocol === protocol && record.semantic_coverage?.passed).length])),
    diagnostic_classes: Object.fromEntries(protocols.map((protocol) => [protocol, diagnostics(armRecords[protocol])])),
    identical_pair_fingerprints: Array.from({ length: 20 }, (_, index) => index + 1).every((passage) => {
      const pair = finalRecords.filter((record) => record.passage === passage);
      return pair.length === 2 && pair.every((record) => record.accepted) && pair[0].fingerprint === pair[1].fingerprint;
    }),
  };
}

function advantage(candidate, baseline) {
  if (!(baseline > 0)) return 0;
  return 1 - candidate / baseline;
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  if (!ordered.length) return null;
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function diagnostics(records) {
  const counts = {};
  for (const diagnostic of records.flatMap((record) => record.diagnostics ?? [])) {
    counts[diagnostic.code ?? "unknown"] = (counts[diagnostic.code ?? "unknown"] ?? 0) + 1;
  }
  return counts;
}

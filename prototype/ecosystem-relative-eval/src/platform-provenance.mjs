import { sha, stableJson } from "./hash.mjs";

export function buildPlatformProvenance(manifestHash, records) {
  const sourceRecords = records.map((record) => ({
    route: record.route,
    scenario_id: record.source_scenario_id ?? record.scenario_id,
    attempt: record.attempt ?? 0,
    raw_sha256: record.artifact_hashes?.raw_sha256 ?? null,
    platform_artifact_sha256: record.artifact_hashes?.platform_artifact_sha256
      ?? sha(stableJson(record.platform_artifact)),
  }));
  const binding = { manifest_hash: manifestHash, source_records: sourceRecords };
  return {
    ...binding,
    binding_sha256: sha(stableJson(binding)),
  };
}

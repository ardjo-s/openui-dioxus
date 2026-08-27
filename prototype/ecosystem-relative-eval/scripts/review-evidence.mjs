#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { verifySecondCatalogFixtures } from "../src/catalog-fixtures.mjs";
import { buildBlindedPackets, finalizeDecisionGrade, scanPacketLeaks } from "../src/complete-run-contract.mjs";
import { stableJson } from "../src/hash.mjs";
import { verifyProviderEventEvidence } from "../src/codex-provider.mjs";
import { verifyFrozenExecutionRecords } from "../src/evidence-publication.mjs";
import { buildCandidateManifest, hashManifest, serializeCandidateManifest } from "../src/manifest.mjs";
import { buildEvaluationScenarios, OBSERVABLE_CONTRACT_V2 } from "../src/observable-contract-v2-scenarios.mjs";
import { verifyOpe3Archive } from "../src/ope3.mjs";
import { verifyPlatformEvidence } from "../src/platform-evidence.mjs";
import { buildPlatformProvenance } from "../src/platform-provenance.mjs";
import { selectPlatformRecords } from "../src/platform-runner.mjs";
import { classifyCanaryOutcomeV2 } from "../src/run-canary.mjs";
import { scanEvidenceDirectory } from "../src/security.mjs";
import { DEFAULT_MINIMUM_FREE_BYTES } from "../src/storage-gate.mjs";
import {
  canonicalOneShotLedgerRoot,
  loadFrozenManifest,
  loadOneShotClaim,
  loadOneShotConsumption,
  loadReviewAttestation,
} from "../src/v2-execution-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = path.resolve(root, "../..");
const directory = path.resolve(process.argv[2] ?? "evidence/candidate-canary");
const candidate = await readJson("CANDIDATE.json");
const checksumBytes = await readFile(path.join(directory, "SHA256SUMS"));
if (digest(checksumBytes) !== candidate.checksum_manifest_sha256) throw new Error("candidate checksum manifest differs");
await verifyChecksums(checksumBytes);

const summary = await readJson("summary.json");
const manifest = await readJson("candidate-manifest.json");
const records = (await readFile(path.join(directory, "records.jsonl"), "utf8")).trim().split("\n").filter(Boolean).map(JSON.parse);
const contract = summary.run_contract === "complete_run.harness_canary"
  ? manifest.complete_run.harness_canary
  : summary.run_contract === "complete_run"
    ? manifest.complete_run
    : manifest.canary;
const promptPack = summary.run_contract === "complete_run.harness_canary"
  ? manifest.complete_run.prompt_pack
  : contract.prompt_pack;
const observableV2 = manifest.observable_contract?.version === "observable-contract-v2";
const findings = [];
let recomputedProviderEvents = { files: 0, thread_starts: 0, completed_turns: 0 };
let recomputedFrozenExecution = null;
let recomputedGates = null;
let recomputedReviewPacketsVerified = null;
const { hash: recordedManifestHash, ...manifestContent } = manifest;
check(summary.outcome === candidate.outcome, "candidate-outcome-mismatch");
const expectedCertificationStatus = observableV2 && summary.run_contract === "canary" && summary.provider !== "codex"
  ? "non-certifying-deterministic-preflight"
  : "candidate-awaiting-independent-review";
check(summary.certification_status === expectedCertificationStatus && summary.certified_outcome === null, "candidate-certification-state-mismatch");
check(summary.manifest_hash === candidate.manifest_hash && manifest.hash === candidate.manifest_hash, "candidate-manifest-mismatch");
check(hashManifest(manifestContent) === recordedManifestHash, "candidate-manifest-semantic-hash-mismatch");
check(records.length === summary.calls, "record-count-mismatch");
check(records.filter((record) => record.provider_invocation_attempted === true).length === summary.provider_invocation_attempts, "provider-invocation-attempt-count-mismatch");
check(records.filter((record) => record.provider_process_started === true).length === summary.provider_process_starts, "provider-process-start-count-mismatch");
check(records.filter((record) => record.provider_thread_started === true).length === summary.external_provider_calls, "external-provider-call-count-mismatch");
check(records.filter((record) => record.provider_completed === true).length === summary.provider_completed_calls, "provider-completed-call-count-mismatch");
check(records.length <= contract.maximum_provider_calls, "provider-call-ceiling-exceeded");
check(summary.final_product_scorer_access_count === 0, "product-scorer-accessed");
check(summary.route_aggregates_comparable === false, "route-aggregates-mislabelled");
check(contract.allowed_outcomes.includes(summary.outcome), "invalid-canary-outcome");
try {
  recomputedFrozenExecution = await verifyFrozenExecutionRecords({
    directory,
    records,
    contract,
    cohorts: manifest.cohorts,
    promptPack,
    contractVersion: manifest.observable_contract?.version ?? null,
  });
} catch (error) {
  findings.push({ code: "frozen-execution-recomputation-error", message: String(error.message).slice(0, 1000) });
}
if (observableV2) {
  try {
    recomputedGates = await recomputeV2Gates({ summary, manifest, records, recomputedFrozenExecution });
  } catch (error) {
    findings.push({ code: "retained-gate-recomputation-error", message: String(error.message).slice(0, 1000) });
  }
  if (summary.run_contract === "canary" && summary.provider === "codex") {
    try {
      const frozenPath = path.join(directory, "frozen-reviewed-manifest.json");
      const frozen = await loadFrozenManifest(frozenPath);
      const rebuiltManifest = await buildCandidateManifest({ contractVersion: OBSERVABLE_CONTRACT_V2 });
      const oneShotClaim = await readJson("one-shot-claim.json");
      const oneShotConsumption = await readJson("one-shot-consumption.json");
      const reviewAttestation = await readJson("ope23-review-attestation.json");
      const providerBuildCacheCleanup = await readJson("pre-provider-build-cache-cleanup.json");
      const liveReviewAttestation = loadReviewAttestation({ repoRoot: repo, manifestAttestation: frozen });
      const ledgerRoot = canonicalOneShotLedgerRoot(repo);
      const canonicalClaimPath = path.join(ledgerRoot, `${OBSERVABLE_CONTRACT_V2}-${frozen.raw_sha256}.json`);
      const canonicalClaim = await loadOneShotClaim(canonicalClaimPath, {
        ledgerRoot,
        manifestRawSha256: frozen.raw_sha256,
        outputDirectory: directory,
        reviewAttestation: liveReviewAttestation,
      });
      const canonicalConsumption = await loadOneShotConsumption(`${canonicalClaimPath}.consumed`, { claim: canonicalClaim });
      recomputedProviderEvents = await recomputeProviderEventCounts();

      check(summary.frozen_manifest?.verified === true, "frozen-manifest-not-verified");
      check(summary.frozen_manifest?.one_shot_claimed === true, "one-shot-claim-not-verified");
      check(summary.frozen_manifest?.one_shot_consumed === true, "one-shot-consumption-not-verified");
      check(frozen.raw_sha256 === summary.frozen_manifest?.raw_sha256, "frozen-manifest-raw-hash-mismatch");
      check(frozen.semantic_sha256 === summary.frozen_manifest?.semantic_sha256, "frozen-manifest-semantic-hash-mismatch");
      check(Buffer.compare(serializeCandidateManifest(manifestContent), frozen.raw_bytes) === 0, "candidate-frozen-manifest-byte-mismatch");
      check(Buffer.compare(serializeCandidateManifest(rebuiltManifest), frozen.raw_bytes) === 0, "current-implementation-frozen-manifest-byte-mismatch");
      check(hashManifest(manifestContent) === frozen.semantic_sha256, "candidate-frozen-manifest-semantic-mismatch");
      check(stableJson(oneShotClaim) === stableJson(omit(canonicalClaim, ["ledger_path"])), "one-shot-canonical-claim-mismatch");
      check(stableJson(oneShotConsumption) === stableJson(omit(canonicalConsumption, ["consumption_path", "verified"])), "one-shot-canonical-consumption-mismatch");
      check(stableJson(reviewAttestation) === stableJson(liveReviewAttestation), "review-attestation-live-git-mismatch");
      check(oneShotClaim.reviewed_commit === summary.frozen_manifest?.reviewed_commit, "one-shot-commit-mismatch");
      check(oneShotClaim.review_attestation_object === summary.frozen_manifest?.review_attestation_object, "one-shot-review-attestation-mismatch");
      check(reviewAttestation.tag_object === summary.frozen_manifest?.review_attestation_object, "review-attestation-object-mismatch");
      check(reviewAttestation.reviewed_commit === summary.frozen_manifest?.reviewed_commit, "review-attestation-commit-mismatch");
      check(providerBuildCacheCleanup.required === true && providerBuildCacheCleanup.passed === true, "provider-build-cache-cleanup-failed");
      check(stableJson(providerBuildCacheCleanup) === stableJson(summary.provider_build_cache_cleanup), "provider-build-cache-cleanup-mismatch");
      check(isWithinEvaluationCache(providerBuildCacheCleanup.target_directory), "provider-build-cache-cleanup-target-invalid");
      check(summary.pre_provider_storage?.passed === true, "pre-provider-storage-gate-failed");
      check(recomputedProviderEvents.thread_starts === summary.external_provider_calls, "provider-thread-start-events-mismatch");
      check(recomputedProviderEvents.completed_turns === summary.provider_completed_calls, "provider-completed-events-mismatch");
      check(summary.provider_event_evidence?.verified === true
        && stableJson(omit(summary.provider_event_evidence, ["verified"])) === stableJson(recomputedProviderEvents), "provider-event-preclassification-audit-mismatch");
      check(summary.reviewed_state_verifications_before_provider_calls === summary.provider_invocation_attempts, "reviewed-state-not-verified-before-every-provider-invocation");
    } catch (error) {
      findings.push({ code: "v2-attestation-recomputation-error", message: String(error.message).slice(0, 1000) });
    }
  }
  const finalRecords = latest(records);
  const allAccepted = finalRecords.length === contract.schedule.length
    && finalRecords.every((record) => record.accepted);
  const completeStage = ["complete_run", "complete_run.harness_canary"].includes(summary.run_contract);
  let reviewPackets = null;
  let reviewPacketEvidenceVerified = !completeStage;
  if (completeStage) {
    try {
      reviewPackets = await readJson("review-packets.json");
      const reviewAssets = await readJson("review-assets.json");
      const leakFindings = reviewPackets.flatMap((packet) => scanPacketLeaks(packet).map((finding) => ({ ...finding, packet_id: packet.packet_id })));
      const scenarios = await buildEvaluationScenarios({ contractVersion: OBSERVABLE_CONTRACT_V2 });
      const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
      const expectedPacketRecords = finalRecords.map((record) => {
        const scenario = scenarioById.get(record.source_scenario_id);
        const artifactSha256 = record.artifact_hashes?.platform_artifact_sha256;
        if (!scenario || typeof artifactSha256 !== "string") throw new Error(`cannot reconstruct review packet: ${record.scenario_id}:${record.route}`);
        return {
          scenario_id: record.source_scenario_id,
          artifact_sha256: artifactSha256,
          source_identity_sha256: digest(`${record.cohort}:${record.scenario_id}:${record.route}:${record.attempt}:${artifactSha256}`),
          task_contract: {
            family: scenario.family,
            required_behavior: Object.keys(scenario.shared_contract.acceptance).sort(),
            workflow_fixture_sha256: digest(stableJson(scenario.shared_contract.mcp_tool_result)),
          },
          screenshots: [`asset-${artifactSha256}`],
          behavior_recording: `recording-${artifactSha256}`,
        };
      });
      const reconstructedPackets = buildBlindedPackets(expectedPacketRecords, "ope-12-anonymous-review-packets-v1");
      recomputedReviewPacketsVerified = summary.provider === "fake"
        && summary.platform_proof_mode === "reference"
        && summary.review_packets?.asset_mode === "reference-preflight-placeholders"
        && reviewAssets.length === 0
        && stableJson(reviewPackets) === stableJson(reconstructedPackets);
      reviewPacketEvidenceVerified = Array.isArray(reviewPackets)
        && reviewPackets.length === finalRecords.length
        && leakFindings.length === 0
        && recomputedReviewPacketsVerified
        && summary.review_packets?.count === reviewPackets.length
        && summary.review_packets?.sha256 === digest(stableJson(reviewPackets))
        && stableJson(summary.review_packets?.leak_findings) === stableJson(leakFindings)
        && summary.review_packets?.immutable_after_opening === true
        && Array.isArray(reviewAssets)
        && summary.review_packets?.asset_index_count === reviewAssets.length
        && summary.review_packets?.asset_index_sha256 === digest(stableJson(reviewAssets))
        && summary.review_packets?.error === null;
      check(reviewPacketEvidenceVerified, "review-packet-recomputation-mismatch");
    } catch (error) {
      findings.push({ code: "review-packet-recomputation-error", message: String(error.message).slice(0, 1000) });
    }
  }
  const recomputedGenerationComplete = summary.provider_error === null
    && allAccepted
    && records.length <= contract.maximum_provider_calls
    && summary.wall_time_ms <= contract.maximum_wall_time_ms
    && recomputedFrozenExecution?.verified === true
    && recomputedGates?.ope3_verified === true
    && recomputedGates?.second_catalog_verified === true
    && recomputedGates?.runtime_diff_lines === 0
    && recomputedFrozenExecution?.pre_provider_scan_findings === 0
    && recomputedGates?.credential_scan_findings === 0
    && recomputedGates?.storage_verified === true
    && summary.final_product_scorer_access_count === 0
    && reviewPacketEvidenceVerified;
  const recomputedOperationalPreflight = recomputedGenerationComplete
    && recomputedGates?.platform_verified === true;
  check(summary.operational_preflight_passed === recomputedOperationalPreflight, "operational-preflight-recomputation-mismatch");
  if (summary.run_contract === "canary") {
    const recomputedOutcome = classifyCanaryOutcomeV2({
      provider: summary.provider,
      providerError: summary.provider_error,
      allAccepted,
      operationalPreflightPassed: recomputedOperationalPreflight,
    });
    check(summary.outcome === recomputedOutcome, "canary-outcome-recomputation-mismatch");
    if (summary.outcome === "CANARY_PASS") {
      check(summary.provider === "codex", "passing-canary-provider-invalid");
      check(summary.provider_error === null && recomputedOperationalPreflight === true, "passing-canary-operational-preflight-invalid");
      check(contract.schedule.length === summary.route_cells, "route-cell-count-mismatch");
      check(recomputedFrozenExecution?.covered_cells === contract.schedule.length
        && finalRecords.length === contract.schedule.length, "incomplete-passing-schedule");
      check(finalRecords.every((record) => record.accepted), "passing-canary-has-rejected-cell");
      check(summary.platform_evidence?.verified === true, "platform-evidence-invalid");
    } else if (summary.outcome === "CANARY_FAIL") {
      check(contract.schedule.length === summary.route_cells, "route-cell-count-mismatch");
      check(finalRecords.some((record) => !record.accepted), "failed-canary-has-no-rejected-cell");
      check(summary.provider_error === null, "failed-canary-has-provider-error");
    } else if (summary.outcome === "CANARY_INVALID") {
      check(summary.provider !== "codex"
        || summary.provider_error !== null
        || recomputedOperationalPreflight === false
        || recomputedGates?.platform_verified !== true
        || summary.route_cells !== contract.schedule.length, "invalid-canary-has-no-invalidity-witness");
    }
  } else {
    check(contract.schedule.length === summary.route_cells, "route-cell-count-mismatch");
    check(summary.platform_evidence?.verified === true, "platform-evidence-invalid");
    const recomputedFinalization = finalizeDecisionGrade({
      generationComplete: recomputedGenerationComplete,
      platformComplete: recomputedGates?.platform_verified === true,
      humanEvidence: null,
      manifest,
      packets: reviewPackets,
    });
    check(stableJson(summary.finalization) === stableJson(recomputedFinalization), "complete-finalization-recomputation-mismatch");
    if (summary.run_contract === "complete_run") {
      check(summary.outcome === recomputedFinalization.outcome, "complete-outcome-recomputation-mismatch");
    } else {
      const humanBlockProved = recomputedFinalization.outcome === contract.expected_human_finalization
        && contract.required_missing_evidence_witnesses.every((field) => recomputedFinalization.diagnostics.some((diagnostic) => diagnostic.field === field && diagnostic.code === "missing-evidence"));
      const recomputedOutcome = recomputedOperationalPreflight && humanBlockProved ? "PASS" : "CANARY_INVALID";
      check(summary.complete_canary_human_block_proved === humanBlockProved, "human-block-recomputation-mismatch");
      check(summary.outcome === recomputedOutcome, "complete-canary-outcome-recomputation-mismatch");
    }
  }
} else {
  check(contract.schedule.length === summary.route_cells, "route-cell-count-mismatch");
  check(summary.platform_evidence?.verified === true, "platform-evidence-invalid");
}
if (summary.run_contract === "complete_run.harness_canary") {
  check(summary.complete_canary_human_block_proved === true, "human-block-not-proved");
  check(summary.finalization?.outcome === contract.expected_human_finalization, "unexpected-human-finalization");
  check(contract.required_missing_evidence_witnesses.every((field) => summary.finalization?.diagnostics?.some((diagnostic) => diagnostic.field === field && diagnostic.code === "missing-evidence")), "missing-human-evidence-witness");
  check(summary.review_packets?.count === summary.route_cells, "review-packet-count-mismatch");
  check(summary.review_packets?.leak_findings?.length === 0, "review-packet-leak");
}

const review = {
  version: summary.run_contract === "complete_run.harness_canary"
    ? "ope-20-independent-recomputation-v1"
    : "ope-11-independent-recomputation-v1",
  reviewer: "separate deterministic recomputation process",
  passed: findings.length === 0,
  candidate_checksum_manifest_sha256: candidate.checksum_manifest_sha256,
  manifest_hash: candidate.manifest_hash,
  outcome: candidate.outcome,
  findings,
  recomputed: {
    records: records.length,
    route_cells: contract.schedule.length,
    accepted_final_cells: latest(records).filter((record) => record.accepted).length,
    platform_verified: recomputedGates?.platform_verified ?? summary.platform_evidence?.verified === true,
    product_scorer_access_count: summary.final_product_scorer_access_count,
    frozen_execution: recomputedFrozenExecution,
    provider_events: recomputedProviderEvents,
    retained_gates: recomputedGates,
    review_packets_verified: recomputedReviewPacketsVerified,
  },
};
await writeFile(path.join(directory, "INDEPENDENT_REVIEW.json"), `${JSON.stringify(review, null, 2)}\n`, { flag: "wx", mode: 0o600 });
if (!review.passed) process.exitCode = 1;

function check(condition, code) {
  if (!condition) findings.push({ code });
}

function latest(records) {
  const values = new Map();
  for (const record of records) {
    const key = `${record.scenario_id}:${record.route}`;
    const current = values.get(key);
    if (!current || record.attempt > current.attempt) values.set(key, record);
  }
  return [...values.values()];
}

async function verifyChecksums(bytes) {
  const entries = bytes.toString("utf8").trim().split("\n").filter(Boolean).map(parseChecksum);
  const listed = new Set(entries.map((entry) => entry.relative));
  if (listed.size !== entries.length) throw new Error("duplicate candidate checksum entry");
  const actual = (await filesBelow(directory)).filter((relative) => !["SHA256SUMS", "CANDIDATE.json", "PUBLICATION.json", "INDEPENDENT_REVIEW.json"].includes(relative)).sort();
  if (JSON.stringify([...listed].sort()) !== JSON.stringify(actual)) throw new Error("candidate file inventory differs");
  for (const entry of entries) {
    if (digest(await readFile(path.join(directory, entry.relative))) !== entry.expected) throw new Error(`candidate checksum differs: ${entry.relative}`);
  }
}

function parseChecksum(line) {
  const match = line.match(/^([a-f0-9]{64})  (.+)$/);
  if (!match || path.isAbsolute(match[2]) || match[2].split(path.sep).includes("..")) throw new Error(`invalid checksum entry: ${line}`);
  return { expected: match[1], relative: match[2] };
}

async function readJson(relative) {
  return JSON.parse(await readFile(path.join(directory, relative), "utf8"));
}

async function filesBelow(root, prefix = "") {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const relative = prefix ? path.join(prefix, entry.name) : entry.name;
    if (entry.isDirectory()) files.push(...await filesBelow(path.join(root, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`non-regular evidence path: ${relative}`);
  }
  return files;
}

async function recomputeProviderEventCounts() {
  const eventDirectory = path.join(directory, "provider-events");
  const entries = await readdir(eventDirectory, { withFileTypes: true });
  const eventSources = new Map();
  for (const entry of entries) {
    if (!entry.isFile()) throw new Error(`non-regular provider event path: ${entry.name}`);
    eventSources.set(entry.name, await readFile(path.join(eventDirectory, entry.name), "utf8"));
  }
  return verifyProviderEventEvidence({ records, eventSources });
}

async function recomputeV2Gates({ summary, manifest, records, recomputedFrozenExecution }) {
  const ope3 = await verifyOpe3Archive();
  const secondCatalog = await verifySecondCatalogFixtures({ execute: false });
  const secondCatalogFields = [
    "files_verified",
    "catalog_release_hash",
    "adapter_build_id",
    "source_commit",
    "implementation_commit",
  ];
  const runtimeDiffLines = recomputeCanonicalRuntimeDiffLines();
  const credentialFindings = await scanEvidenceDirectory(directory);
  const storage = await recomputeStorageEvidence(summary);
  const platform = await recomputePlatformGate({ summary, manifest, records });
  const result = {
    ope3_verified: ope3.verified === true && stableJson(ope3) === stableJson(summary.ope3_import),
    second_catalog_verified: secondCatalog.verified === true
      && summary.second_catalog?.verified === true
      && summary.second_catalog?.executable_fixtures === true
      && summary.second_catalog?.inert_replay === true
      && summary.second_catalog?.copy_on_write_migration === true
      && secondCatalogFields.every((field) => secondCatalog[field] === summary.second_catalog?.[field]),
    runtime_diff_lines: runtimeDiffLines,
    runtime_diff_binding_verified: runtimeDiffLines === summary.canonical_runtime_behavior_diff_lines,
    pre_provider_scan_findings: recomputedFrozenExecution?.pre_provider_scan_findings ?? null,
    pre_provider_scan_binding_verified: recomputedFrozenExecution?.pre_provider_scan_findings
      === summary.trust_controls?.pre_provider_scan_findings,
    credential_scan_findings: credentialFindings.length,
    credential_scan_binding_verified: credentialFindings.length
      === summary.trust_controls?.publication_credential_scan_findings,
    storage_verified: storage.evidence_verified && storage.passed,
    storage_evidence_verified: storage.evidence_verified,
    storage_record_count: storage.record_count,
    platform_verified: platform.passed,
    platform_evidence_verified: platform.evidence_verified,
  };
  check(result.ope3_verified, "ope3-recomputation-mismatch");
  check(result.second_catalog_verified, "second-catalog-recomputation-mismatch");
  check(result.runtime_diff_binding_verified, "runtime-diff-recomputation-mismatch");
  check(result.pre_provider_scan_binding_verified, "pre-provider-scan-recomputation-mismatch");
  check(result.credential_scan_binding_verified, "credential-scan-recomputation-mismatch");
  check(result.credential_scan_findings === 0, "credential-scan-failed");
  check(result.storage_evidence_verified, "storage-evidence-recomputation-mismatch");
  check(result.platform_evidence_verified, "platform-evidence-recomputation-mismatch");
  return result;
}

async function recomputeStorageEvidence(summary) {
  if (summary.provider !== "codex") {
    return {
      evidence_verified: summary.pre_provider_storage?.required === false
        && summary.pre_provider_storage?.passed === true,
      passed: true,
      record_count: 0,
    };
  }
  const source = await readFile(path.join(directory, "pre-provider-storage-gates.jsonl"), "utf8");
  const checks = source.trim().split("\n").filter(Boolean).map(JSON.parse);
  const requiredStages = [
    "post-bootstrap",
    "post-tests",
    "post-typecheck",
    "post-dioxus-contract",
    "post-shell-syntax",
    "post-authentication-check",
    "pre-first-provider-call",
  ];
  const validChecks = checks.length >= requiredStages.length
    && requiredStages.every((stage) => checks.some((entry) => entry.stage === stage))
    && checks.every((entry) => entry.contract_version === "ope-21-storage-gate-v1"
      && entry.passed === true
      && entry.code === "storage-capacity-sufficient"
      && entry.provider_attempts === 0
      && Number.isSafeInteger(entry.minimum_free_bytes)
      && entry.minimum_free_bytes >= DEFAULT_MINIMUM_FREE_BYTES
      && Array.isArray(entry.probes)
      && entry.probes.length > 0
      && entry.probes.every((probe) => probe.passed === true
        && probe.available_bytes >= probe.required_bytes
        && probe.required_bytes === entry.minimum_free_bytes));
  return {
    evidence_verified: validChecks
      && summary.pre_provider_storage?.required === true
      && summary.pre_provider_storage?.passed === true
      && summary.pre_provider_storage?.record_count === checks.length
      && summary.pre_provider_storage?.records_sha256 === digest(source)
      && stableJson(summary.pre_provider_storage?.checks) === stableJson(checks),
    passed: validChecks,
    record_count: checks.length,
  };
}

async function recomputePlatformGate({ summary, manifest, records }) {
  const recorded = summary.platform_evidence ?? {};
  if (summary.provider !== "codex") {
    const proof = await verifyPlatformEvidence();
    return {
      evidence_verified: summary.platform_proof_mode === "reference"
        && recorded.source === "frozen-reference-preflight"
        && stableJson(omit(recorded, ["source"])) === stableJson(proof),
      passed: proof.verified === true,
    };
  }
  const finalRecords = latest(records);
  const allAccepted = finalRecords.length === manifest.canary.schedule.length
    && finalRecords.every((record) => record.accepted);
  if (!allAccepted || summary.provider_error !== null) {
    return {
      evidence_verified: recorded.source === "not-executed-after-generation-failure"
        && recorded.verified === false,
      passed: false,
    };
  }
  const { dioxusRecords, jsonRenderRecords, directRsxRecords } = selectPlatformRecords(records, { scope: "canary" });
  const dioxus = buildPlatformProvenance(summary.manifest_hash, dioxusRecords);
  const react = buildPlatformProvenance(summary.manifest_hash, jsonRenderRecords);
  const direct = buildPlatformProvenance(summary.manifest_hash, directRsxRecords);
  const proof = await verifyPlatformEvidence({
    evidenceRoot: path.join(directory, "platform-evidence"),
    expected: {
      manifest_hash: summary.manifest_hash,
      dioxus_binding_sha256: dioxus.binding_sha256,
      react_binding_sha256: react.binding_sha256,
      direct_rsx_binding_sha256: direct.binding_sha256,
      dioxus_surface_count: dioxusRecords.length,
      react_surface_count: jsonRenderRecords.length,
      direct_rsx_surface_count: directRsxRecords.length,
    },
  });
  const expectedTree = manifest.input_hashes?.implementation_tree?.sha256;
  const stability = recorded.implementation_tree_stability;
  const executionsVerified = await verifyPlatformExecutionLogs(recorded.executions);
  return {
    evidence_verified: recorded.source === "generated-canary-outputs"
      && stableJson(recorded.fixture_provenance) === stableJson({ dioxus, react, direct_rsx: direct })
      && recorded.artifact_count === proof.artifact_count
      && recorded.recursive_sha256 === proof.recursive_sha256
      && stableJson(recorded.proofs) === stableJson(proof.proofs)
      && executionsVerified
      && stability?.verified === true
      && stability?.root_target_present === false
      && stability?.before?.sha256 === expectedTree
      && stability?.after?.sha256 === expectedTree,
    passed: proof.verified === true
      && recorded.verified === true
      && executionsVerified
      && stability?.verified === true,
  };
}

async function verifyPlatformExecutionLogs(executions) {
  const expected = ["react-web", "direct-rsx-web", "dioxus-web", "dioxus-desktop"];
  if (!Array.isArray(executions)
    || executions.length !== expected.length
    || executions.some((entry, index) => entry.id !== expected[index])) return false;
  for (const execution of executions) {
    const stdout = await readFile(path.join(directory, "platform-run-logs", `${execution.id}.stdout.log`));
    const stderr = await readFile(path.join(directory, "platform-run-logs", `${execution.id}.stderr.log`));
    if (execution.passed !== true
      || execution.exit_code !== 0
      || execution.error !== null
      || execution.stdout_sha256 !== digest(stdout)
      || execution.stderr_sha256 !== digest(stderr)) return false;
  }
  return true;
}

function recomputeCanonicalRuntimeDiffLines() {
  const result = spawnSync("git", [
    "diff",
    "--numstat",
    "codex/ope-10-rust-ui-catalog",
    "--",
    "prototype/openui-dioxus-preview",
    "prototype/openui-typed-json-product-eval",
    "prototype/openui-a2ui-cloud-eval/src/domain.rs",
    "prototype/openui-a2ui-cloud-eval/src/runtime.rs",
  ], { cwd: repo, encoding: "utf8" });
  if (result.error || result.status !== 0) throw new Error(String(result.error?.message ?? result.stderr));
  return result.stdout.split("\n").filter(Boolean).reduce((total, line) => {
    const [added, removed] = line.split("\t");
    return total + Number(added) + Number(removed);
  }, 0);
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function omit(value, fields) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !fields.includes(key)));
}

function isWithinEvaluationCache(candidate) {
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  const cacheRoot = path.resolve(repo, "../..", ".cache", "openui-dioxus-eval");
  const relative = path.relative(cacheRoot, path.resolve(candidate));
  return relative !== ""
    && relative !== ".."
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}

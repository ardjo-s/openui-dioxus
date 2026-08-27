#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, mkdirSync, openSync, readFileSync, readSync, statSync, unlinkSync } from "node:fs";
import { lstat, mkdir, open, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { get_encoding } from "tiktoken";

import {
  buildCodexArgs,
  buildProviderEnvironment,
  CodexProviderError,
  inspectCodexEvents,
  parseCodexEvents,
  verifyProviderEventEvidence,
} from "./codex-provider.mjs";
import { verifySecondCatalogFixtures } from "./catalog-fixtures.mjs";
import { assertDedicatedEvaluationCargoTarget, resolveSharedCargoTarget } from "./build-isolation.mjs";
import { buildBlindedPackets, finalizeDecisionGrade, scanPacketLeaks } from "./complete-run-contract.mjs";
import { boundedTimeout } from "./deadline.mjs";
import { CANDIDATE_MARKER, PUBLICATION_MARKER } from "./evidence-publication.mjs";
import { measureImplementationFootprint } from "./footprint.mjs";
import { sha, stableJson } from "./hash.mjs";
import { buildCandidateManifest, hashManifest, serializeCandidateManifest } from "./manifest.mjs";
import { normalizeWire } from "./normalizer.mjs";
import { verifyOpe3Archive } from "./ope3.mjs";
import { verifyPlatformEvidence } from "./platform-evidence.mjs";
import { executeGeneratedPlatformProofs } from "./platform-runner.mjs";
import { fakeGenerate, repairPrompt } from "./provider.mjs";
import { routeExtension, validateRoute } from "./routes.mjs";
import { assertDecisionNeutral, createForbiddenProductScorer, scanEvidenceDirectory, scanProviderPayload, scanPublicationPayloads } from "./security.mjs";
import { minimumFreeBytesFromEnvironment, recordStorageGate } from "./storage-gate.mjs";
import { runBoundedProcess } from "./subprocess.mjs";
import { buildEvaluationScenarios, OBSERVABLE_CONTRACT_V2 } from "./observable-contract-v2-scenarios.mjs";
import {
  assertExternalEvidenceDirectory,
  assertV2ProviderBoundary,
  canonicalOneShotLedgerRoot,
  consumeOneShotClaim,
  loadFrozenManifest,
  loadReviewAttestation,
} from "./v2-execution-guard.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const repo = path.resolve(root, "../..");
const maximumResponseBytes = 256 * 1024;
const reviewedCliProviderCapability = Symbol("reviewed-cli-provider-capability");
const sha256Pattern = /^[a-f0-9]{64}$/u;
const commitPattern = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;

export async function runCanary(options) {
  return runEvaluation({ ...options, contractKey: "canary" });
}

export async function runCompleteEvaluation(options) {
  return runEvaluation({ ...options, contractKey: "complete_run" });
}

export async function runCompleteCanary(options) {
  return runEvaluation({ ...options, contractKey: "complete_canary" });
}

async function runEvaluation({
  provider,
  outputDirectory,
  platformProof = provider === "codex" ? "generated" : "reference",
  productScorer = createForbiddenProductScorer(),
  contractKey,
  humanEvidence = null,
  contractVersion = null,
  frozenManifest = null,
  frozenManifestAttestation = null,
  oneShotClaimPath = null,
  reviewAttestation = null,
  providerExecutionCapability = null,
}) {
  if (!["fake", "codex"].includes(provider)) throw new Error(`unknown provider: ${provider}`);
  if (!["canary", "complete_run", "complete_canary"].includes(contractKey)) throw new Error(`unknown run contract: ${contractKey}`);
  if (contractKey !== "canary" && humanEvidence !== null) throw new Error("human evidence must finalize the frozen generation archive without another provider run");
  if (!["generated", "reference"].includes(platformProof)) throw new Error(`unknown platform proof mode: ${platformProof}`);
  if (provider === "codex" && platformProof !== "generated") throw new Error("real provider run requires generated-output platform proof");
  if (provider === "codex" && providerExecutionCapability !== reviewedCliProviderCapability) {
    throw new Error("real provider execution is available only through the reviewed CLI entrypoint");
  }
  if (provider === "codex" && contractVersion === OBSERVABLE_CONTRACT_V2) {
    await assertExternalEvidenceDirectory({ repoRoot: repo, outputDirectory });
  }
  await prepareOutputDirectory(outputDirectory);
  for (const directory of ["raw", "diagnostics", "native", "canonical", "provider-events", "provider-stderr", "traces"]) {
    await mkdir(path.join(outputDirectory, directory), { recursive: true });
  }
  const started = performance.now();
  const rebuiltManifest = await buildCandidateManifest({ contractVersion });
  const rebuiltManifestBytes = serializeCandidateManifest(rebuiltManifest);
  const frozenManifestMatches = frozenManifestAttestation?.verified
    ? Buffer.compare(rebuiltManifestBytes, frozenManifestAttestation.raw_bytes) === 0
    : frozenManifest !== null && stableJson(frozenManifest) === stableJson(rebuiltManifest);
  if ((frozenManifest !== null || frozenManifestAttestation?.verified) && !frozenManifestMatches) {
    throw new Error("frozen candidate manifest differs from the current reviewed implementation");
  }
  let oneShotClaim = null;
  const manifest = frozenManifestAttestation?.manifest ?? frozenManifest ?? rebuiltManifest;
  const completeStage = contractKey !== "canary";
  const runContract = contractKey === "complete_canary"
    ? { ...manifest.complete_run.harness_canary, prompt_pack: manifest.complete_run.prompt_pack }
    : manifest[contractKey];
  const contractLabel = contractKey === "complete_canary" ? "complete_run.harness_canary" : contractKey;
  const manifestHash = hashManifest(manifest);
  const deadlineMs = started + runContract.maximum_wall_time_ms;
  const sharedCargoTarget = resolveSharedCargoTarget({ ambient: process.env, repoRoot: repo, implementationRoot: root });
  await writeJson(path.join(outputDirectory, "candidate-manifest.json"), { ...manifest, hash: manifestHash });
  await writeFile(path.join(outputDirectory, "candidate-manifest.sha256"), `${manifestHash}\n`, { flag: "wx", mode: 0o600 });
  if (frozenManifestAttestation?.verified) {
    await writeFile(path.join(outputDirectory, "frozen-reviewed-manifest.json"), await readFile(frozenManifestAttestation.manifest_path), { flag: "wx", mode: 0o600 });
    await writeFile(path.join(outputDirectory, "frozen-reviewed-manifest.json.sha256"), await readFile(frozenManifestAttestation.sidecar_path), { flag: "wx", mode: 0o600 });
  }
  if (reviewAttestation?.verified) {
    await writeJson(path.join(outputDirectory, "ope23-review-attestation.json"), reviewAttestation);
  }
  const ope3Import = await verifyOpe3Archive();
  const secondCatalog = await verifySecondCatalogFixtures({ execute: true, deadlineMs });
  const providerBuildCacheCleanup = provider === "codex"
    ? await cleanProviderBuildCache({ sharedCargoTarget, deadlineMs })
    : {
      required: false,
      passed: true,
      target_directory: sharedCargoTarget,
      reason: "fake provider performs no external call or generated platform proof",
    };
  await writeJson(path.join(outputDirectory, "pre-provider-build-cache-cleanup.json"), providerBuildCacheCleanup);
  const scenarios = await buildEvaluationScenarios({ contractVersion });
  const byId = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  const records = [];
  const scanFindings = [];
  let reviewedStateVerifications = 0;
  let providerError = null;
  const preProviderStorage = provider === "codex"
    ? await capturePreProviderStorage({ outputDirectory, sharedCargoTarget })
    : {
      required: false,
      passed: true,
      provider_attempts: 0,
      reason: "fake provider performs no external call or generated platform proof",
      checks: [],
    };
  if (!preProviderStorage.passed) providerError = "pre-provider storage gate failed before the first provider call";
  if (provider === "codex" && contractVersion === OBSERVABLE_CONTRACT_V2 && preProviderStorage.passed) {
    oneShotClaim = await consumeOneShotClaim({
      claimPath: oneShotClaimPath ?? "",
      ledgerRoot: canonicalOneShotLedgerRoot(repo),
      manifestRawSha256: frozenManifestAttestation?.raw_sha256 ?? "",
      outputDirectory,
      reviewAttestation,
    });
    assertV2ProviderBoundary({ provider, contractVersion, contractKey, frozenManifestAttestation, oneShotClaim, reviewAttestation });
    await writeFile(path.join(outputDirectory, "one-shot-claim.json"), await readFile(oneShotClaim.ledger_path), { flag: "wx", mode: 0o600 });
    await writeFile(path.join(outputDirectory, "one-shot-consumption.json"), await readFile(oneShotClaim.consumption_path), { flag: "wx", mode: 0o600 });
  }
  const encoding = get_encoding("o200k_base");
  try {
    for (const cell of providerError ? [] : runContract.schedule) {
      if (performance.now() - started > runContract.maximum_wall_time_ms) {
        providerError = "run wall-time ceiling reached before next call";
        break;
      }
      const scenario = byId.get(cell.scenario_id.replace(/^compile-/, ""));
      if (!scenario) throw new Error(`missing scenario: ${cell.scenario_id}`);
      const prompt = runContract.prompt_pack.find((entry) => entry.prompt_id === cell.prompt_id);
      if (!prompt) throw new Error(`missing frozen prompt: ${cell.prompt_id}`);
      const instructions = prompt.instructions;
      const initialUserPrompt = prompt.user_prompt;
      const initialScan = scanProviderPayload({ instructions, user_prompt: initialUserPrompt });
      scanFindings.push(...initialScan.map((finding) => ({ ...finding, scenario_id: cell.scenario_id, route: cell.route, attempt: 1 })));
      if (initialScan.length) {
        providerError = `pre-provider scan rejected ${cell.scenario_id}:${cell.route}`;
        break;
      }
      let prior = null;
      for (let attempt = 1; attempt <= runContract.maximum_repairs_per_route + 1; attempt += 1) {
        const remainingProviderMs = remainingTime(deadlineMs);
        if (remainingProviderMs <= 0) {
          providerError = "run wall-time ceiling reached before provider call";
          break;
        }
        if (records.length >= runContract.maximum_provider_calls) {
          providerError = "maximum provider calls reached";
          break;
        }
        const userPrompt = attempt === 1
          ? initialUserPrompt
          : repairPrompt(initialUserPrompt, prior.output, prior.diagnostics, { contractVersion });
        const payloadScan = scanProviderPayload({ instructions, user_prompt: userPrompt });
        scanFindings.push(...payloadScan.map((finding) => ({ ...finding, scenario_id: cell.scenario_id, route: cell.route, attempt })));
        if (payloadScan.length) {
          providerError = `repair payload scan rejected ${cell.scenario_id}:${cell.route}`;
          break;
        }
        const stem = `${String(records.length + 1).padStart(2, "0")}-${slug(cell.scenario_id)}-${cell.route}-attempt-${attempt}`;
        const rawPath = path.join(outputDirectory, "raw", `${stem}.${routeExtension(cell.route)}`);
        try {
          if (provider === "codex" && contractVersion === OBSERVABLE_CONTRACT_V2) {
            await verifyReviewedV2State({ frozenManifestAttestation, reviewAttestation });
            reviewedStateVerifications += 1;
          }
        } catch (error) {
          providerError = `reviewed v2 state check failed before provider call: ${error.message}`;
          break;
        }
        let generated;
        const providerInvocationAttempted = provider === "codex";
        try {
          generated = await generateRouteOutput({
            provider,
            route: cell.route,
            scheduleScenarioId: cell.scenario_id,
            attempt,
            scenario,
            instructions,
            userPrompt,
            rawPath,
            maximumResponseBytes,
            timeoutMs: remainingProviderMs,
            providerExecutionCapability,
          });
        } catch (error) {
          providerError = String(error.message);
          const failureOutput = typeof error.output === "string" ? error.output : "";
          const diagnosticsPath = path.join(outputDirectory, "diagnostics", `${stem}.json`);
          const eventsPath = path.join(outputDirectory, "provider-events", `${stem}.jsonl`);
          const stderrPath = path.join(outputDirectory, "provider-stderr", `${stem}.log`);
          await writeFile(rawPath, failureOutput, { flag: "wx", mode: 0o600 });
          await writeFile(eventsPath, error.eventsRaw ?? "", { flag: "wx", mode: 0o600 });
          await writeFile(stderrPath, error.stderr ?? "", { flag: "wx", mode: 0o600 });
          await writeJson(diagnosticsPath, {
            ok: false,
            diagnostics: [{ code: "provider-error", message: providerError, tool_activity: error.toolActivity ?? [] }],
          });
          records.push(providerFailureRecord({
            cell,
            scenario,
            attempt,
            instructions,
            userPrompt,
            message: providerError,
            encoding,
            output: failureOutput,
            responseBytes: error.outputBytes ?? Buffer.byteLength(failureOutput),
            providerMs: error.elapsedMs ?? 0,
            providerUsage: error.usage ?? null,
            rawSha256: sha(await readFile(rawPath)),
            diagnosticsSha256: sha(await readFile(diagnosticsPath)),
            evidenceStem: stem,
            providerInvocationAttempted,
            providerProcessStarted: error.processStarted === true,
            providerThreadStarted: error.threadStarted === true,
            providerCompleted: error.turnCompleted === true,
          }));
          break;
        }
        await writeFile(rawPath, generated.output, { flag: "wx", mode: 0o600 });
        if (generated.events_raw !== undefined) await writeFile(path.join(outputDirectory, "provider-events", `${stem}.jsonl`), generated.events_raw, { flag: "wx", mode: 0o600 });
        if (generated.stderr !== undefined) await writeFile(path.join(outputDirectory, "provider-stderr", `${stem}.log`), generated.stderr, { flag: "wx", mode: 0o600 });
        const responseBytes = generated.response_bytes ?? Buffer.byteLength(generated.output);
        const validationStarted = performance.now();
        let validation = responseBytes <= maximumResponseBytes
          ? await validateRoute(cell.route, generated.output, scenario, { deadlineMs, cohort: cell.cohort, contractVersion })
          : { ok: false, diagnostics: [{ code: "output-too-large", message: `more than ${maximumResponseBytes} bytes` }] };
        let canonical = null;
        let oracleFingerprint = null;
        let normalizationMs = 0;
        if (validation.ok && validation.wire) {
          try {
            const normalized = await normalizeWire(validation.wire, path.join(outputDirectory, "canonical"), stem, deadlineMs);
            const oracle = await normalizeWire(scenario.expected, path.join(outputDirectory, "canonical"), `${stem}-oracle`, deadlineMs);
            canonical = normalized.canonical;
            validation.semantic_fingerprint = normalized.fingerprint;
            oracleFingerprint = oracle.fingerprint;
            normalizationMs = normalized.normalization_ms + oracle.normalization_ms;
            if (cell.cohort === "compile-known" && normalized.fingerprint !== oracle.fingerprint) {
              validation = { ok: false, diagnostics: [{ code: "canonical-fingerprint", message: "generated and oracle fingerprints differ" }] };
            }
          } catch (error) {
            validation = { ok: false, diagnostics: [{ code: "catalog-adapter", message: String(error.message) }] };
          }
        }
        const validationMs = performance.now() - validationStarted;
        const diagnosticsPath = path.join(outputDirectory, "diagnostics", `${stem}.json`);
        await writeJson(diagnosticsPath, { ok: validation.ok, diagnostics: validation.diagnostics });
        let nativePath = null;
        if (validation.ok && validation.route_artifact !== null && validation.route_artifact !== undefined && !validation.wire) {
          nativePath = path.join(outputDirectory, "native", `${stem}.${cell.route === "direct-rsx" ? "html" : "json"}`);
          await writeFile(nativePath, typeof validation.route_artifact === "string" ? validation.route_artifact : `${JSON.stringify(validation.route_artifact, null, 2)}\n`);
        }
        const record = {
          route: cell.route,
          evidence_stem: stem,
          prompt_id: cell.prompt_id,
          cohort: cell.cohort,
          scenario_id: cell.scenario_id,
          source_scenario_id: scenario.id,
          family: scenario.family,
          order_position: cell.order_position,
          attempt,
          repaired: attempt === 2,
          accepted: validation.ok,
          diagnostics: validation.diagnostics,
          tokens: {
            raw_prompt_tokens: tokenCount(encoding, instructions) + tokenCount(encoding, userPrompt),
            raw_output_tokens: tokenCount(encoding, generated.output),
            usage_source: generated.usage_source,
            provider_usage: generated.provider_usage ?? null,
          },
          latency: {
            provider_ms: generated.provider_ms,
            validation_ms: validationMs,
            normalization_ms: normalizationMs,
            compile_ms: validation.compile_ms ?? 0,
            sandbox_run_ms: validation.run_ms ?? 0,
            full_response_ms: generated.provider_ms + validationMs,
          },
          response_bytes: responseBytes,
          semantic_fingerprint: validation.semantic_fingerprint ?? null,
          oracle_fingerprint: oracleFingerprint,
          canonical_surface: canonical,
          platform_artifact: validation.ok
            ? (cell.route === "direct-rsx" ? generated.output : (validation.wire ?? validation.route_artifact))
            : null,
          provider_invocation_attempted: providerInvocationAttempted,
          provider_process_started: generated.provider_process_started === true,
          provider_thread_started: generated.provider_thread_started === true,
          provider_completed: generated.provider_completed === true,
          prompt_hashes: {
            instructions_sha256: sha(instructions),
            user_prompt_sha256: sha(userPrompt),
          },
          artifact_hashes: {
            raw_sha256: sha(await readFile(rawPath)),
            diagnostics_sha256: sha(await readFile(diagnosticsPath)),
            native_sha256: nativePath ? sha(await readFile(nativePath)) : null,
            canonical_sha256: canonical ? sha(JSON.stringify(canonical)) : null,
            platform_artifact_sha256: validation.ok
              ? sha(stableJson(cell.route === "direct-rsx" ? generated.output : (validation.wire ?? validation.route_artifact)))
              : null,
          },
        };
        records.push(record);
        if (record.accepted) break;
        prior = { output: generated.output, diagnostics: validation.diagnostics };
      }
      if (providerError) break;
    }
  } finally {
    encoding.free();
  }

  await writeFile(path.join(outputDirectory, "records.jsonl"), `${records.map((record) => JSON.stringify(record)).join("\n")}\n`, { flag: "wx", mode: 0o600 });
  let providerEventEvidence = null;
  if (provider === "codex") {
    try {
      providerEventEvidence = { verified: true, ...await verifyProviderEventDirectory({ records, outputDirectory }) };
    } catch (error) {
      providerEventEvidence = { verified: false, error: String(error.message).slice(0, 1000) };
      providerError ??= `provider event evidence invalid: ${error.message}`;
    }
  }
  const finalRecords = finalRecordsByCell(records);
  const routeCells = finalRecords.length;
  const allAccepted = routeCells === runContract.schedule.length && finalRecords.every((record) => record.accepted);
  let platformEvidence;
  if (platformProof === "reference") {
    platformEvidence = { ...await verifyPlatformEvidence(), source: "frozen-reference-preflight" };
  } else if (!providerError && allAccepted) {
    try {
      platformEvidence = await executeGeneratedPlatformProofs({ records, outputDirectory, manifestHash, deadlineMs, scope: completeStage ? "complete" : "canary" });
    } catch (error) {
      platformEvidence = {
        verified: false,
        source: "generated-canary-outputs",
        diagnostics: [{ code: "platform-runner", message: String(error.message) }],
        proofs: {},
        artifact_count: 0,
        recursive_sha256: null,
        executions: [],
      };
    }
  } else {
    platformEvidence = {
      verified: false,
      source: "not-executed-after-generation-failure",
      diagnostics: [{ code: "platform-runner", message: "provider outputs were not all accepted" }],
      proofs: {},
      artifact_count: 0,
      recursive_sha256: null,
      executions: [],
    };
  }
  let reviewPacketError = null;
  let reviewPacketPlan = { records: [], assets: [], mode: "not-generated" };
  if (completeStage && allAccepted) {
    try {
      reviewPacketPlan = await buildReviewPacketRecords({ records: finalRecords, byId, platformEvidence, outputDirectory });
    } catch (error) {
      reviewPacketError = String(error.message);
      reviewPacketPlan = { records: [], assets: [], mode: "asset-binding-failed" };
    }
  }
  const reviewPackets = completeStage && reviewPacketPlan.records.length > 0
    ? buildBlindedPackets(reviewPacketPlan.records, "ope-12-anonymous-review-packets-v1")
    : [];
  if (completeStage) {
    await writeJson(path.join(outputDirectory, "review-packets.json"), reviewPackets);
    await writeJson(path.join(outputDirectory, "review-assets.json"), reviewPacketPlan.assets);
  }
  const packetLeakFindings = reviewPackets.flatMap((packet) => scanPacketLeaks(packet).map((finding) => ({ ...finding, packet_id: packet.packet_id })));
  const wallTimeMs = performance.now() - started;
  const treeScanFindings = await scanEvidenceDirectory(outputDirectory);
  const runtimeDiffLines = canonicalRuntimeDiffLines();
  const implementationFootprint = await measureImplementationFootprint();
  const productScorerAccessCount = productScorer.accessCount();
  const generationComplete = !providerError
    && allAccepted
    && records.length <= runContract.maximum_provider_calls
    && wallTimeMs <= runContract.maximum_wall_time_ms
    && ope3Import.verified
    && secondCatalog.verified
    && runtimeDiffLines === 0
    && scanFindings.length === 0
    && treeScanFindings.length === 0
    && preProviderStorage.passed
    && reviewPacketError === null
    && (!completeStage || (reviewPackets.length === finalRecords.length && packetLeakFindings.length === 0))
    && productScorerAccessCount === 0;
  const operationalPreflightPassed = generationComplete && platformEvidence.verified;
  const finalization = completeStage
    ? finalizeDecisionGrade({
      generationComplete,
      platformComplete: platformEvidence.verified,
      humanEvidence,
      manifest,
      packets: reviewPackets,
    })
    : null;
  const completeCanaryHumanBlockProved = contractKey === "complete_canary"
    && finalization.outcome === manifest.complete_run.harness_canary.expected_human_finalization
    && manifest.complete_run.harness_canary.required_missing_evidence_witnesses.every((field) => finalization.diagnostics.some((diagnostic) => diagnostic.field === field && diagnostic.code === "missing-evidence"));
  let outcome = initialOutcome({
    allAccepted,
    completeCanaryHumanBlockProved,
    contractKey,
    contractVersion,
    finalization,
    operationalPreflightPassed,
    provider,
    providerError,
  });
  const preProviderInfrastructureAbort = provider === "codex" && !preProviderStorage.passed && records.length === 0;
  const nonCertifyingV2Preflight = contractVersion === OBSERVABLE_CONTRACT_V2
    && contractKey === "canary"
    && provider !== "codex";
  const summary = {
    outcome,
    certification_status: nonCertifyingV2Preflight
      ? "non-certifying-deterministic-preflight"
      : "candidate-awaiting-independent-review",
    certified_outcome: null,
    execution_kind: preProviderInfrastructureAbort
      ? "pre-provider-infrastructure-abort"
      : completeStage
      ? contractKey === "complete_canary"
        ? provider === "fake" ? "deterministic-complete-canary" : "real-complete-canary"
        : provider === "fake" ? "deterministic-complete-preflight" : "real-complete-run"
      : provider === "fake" ? "deterministic-preflight" : "real-provider-canary",
    run_contract: contractLabel,
    provider,
    model: manifest.provider.model,
    reasoning_effort: manifest.provider.reasoning_effort,
    observable_contract_version: manifest.observable_contract?.version ?? null,
    provider_build_cache_cleanup: providerBuildCacheCleanup,
    pre_provider_storage: preProviderStorage,
    pre_provider_infrastructure_abort: preProviderInfrastructureAbort,
    manifest_hash: manifestHash,
    manifest_promoted: contractVersion === OBSERVABLE_CONTRACT_V2
      ? canPromoteV2Manifest({
        outcome,
        provider,
        platformProof,
        frozenManifestVerified: frozenManifestMatches && frozenManifestAttestation?.verified === true && reviewAttestation?.verified === true,
      })
      : contractKey !== "complete_run" && outcome === "PASS" && provider === "codex" && platformProof === "generated",
    frozen_manifest: contractVersion === OBSERVABLE_CONTRACT_V2 ? {
      verified: frozenManifestMatches && frozenManifestAttestation?.verified === true && reviewAttestation?.verified === true,
      raw_sha256: frozenManifestAttestation?.raw_sha256 ?? null,
      semantic_sha256: frozenManifestAttestation?.semantic_sha256 ?? null,
      one_shot_claimed: oneShotClaim !== null
        && oneShotClaim !== undefined
        && frozenManifestAttestation !== null
        && frozenManifestAttestation !== undefined
        && oneShotClaim.manifest_raw_sha256 === frozenManifestAttestation.raw_sha256,
      one_shot_consumed: oneShotClaim?.consumed === true,
      reviewed_commit: oneShotClaim?.reviewed_commit ?? null,
      review_attestation_tag: reviewAttestation?.tag_name ?? null,
      review_attestation_object: reviewAttestation?.tag_object ?? null,
    } : null,
    operational_preflight_passed: operationalPreflightPassed,
    finalization,
    complete_canary_human_block_proved: contractKey === "complete_canary" ? completeCanaryHumanBlockProved : null,
    route_cells: routeCells,
    expected_route_cells: runContract.schedule.length,
    route_aggregates_comparable: false,
    route_aggregate_scope: "operational diagnostics only; route totals cover different scenario and cohort mixes and must not be ranked across routes",
    calls: records.length,
    provider_invocation_attempts: records.filter((record) => record.provider_invocation_attempted === true).length,
    provider_process_starts: records.filter((record) => record.provider_process_started === true).length,
    external_provider_calls: records.filter((record) => record.provider_thread_started === true).length,
    provider_completed_calls: records.filter((record) => record.provider_completed === true).length,
    provider_event_evidence: providerEventEvidence,
    reviewed_state_verifications_before_provider_calls: reviewedStateVerifications,
    maximum_calls: runContract.maximum_provider_calls,
    wall_time_ms: wallTimeMs,
    maximum_wall_time_ms: runContract.maximum_wall_time_ms,
    first_pass_validity: validity(records, 1),
    post_repair_validity: validity(finalRecords),
    cumulative_raw_tokens: cumulativeTokens(records),
    balanced_order: balancedOrder(runContract.schedule),
    rejected_attempts_retained_and_charged: records.filter((record) => !record.accepted).every((record) => record.tokens.raw_prompt_tokens > 0 && record.tokens.raw_output_tokens > 0),
    ope3_import: ope3Import,
    second_catalog: secondCatalog,
    platform_evidence: platformEvidence,
    platform_proof_mode: platformProof,
    review_packets: completeStage ? {
      count: reviewPackets.length,
      sha256: sha(stableJson(reviewPackets)),
      leak_findings: packetLeakFindings,
      immutable_after_opening: reviewPackets.every((packet) => packet.immutable_after_opening === true),
      asset_mode: reviewPacketPlan.mode,
      asset_index_count: reviewPacketPlan.assets.length,
      asset_index_sha256: sha(stableJson(reviewPacketPlan.assets)),
      error: reviewPacketError,
    } : null,
    human_evidence: completeStage ? { provided: false, sha256: null, finalization_stage: "src/finalize-complete.mjs" } : null,
    canonical_runtime_behavior_diff_lines: runtimeDiffLines,
    trust_controls: {
      pre_provider_scan_findings: scanFindings.length,
      pre_provider_storage_passed: preProviderStorage.passed,
      publication_credential_scan_findings: treeScanFindings.length,
      generated_output_execution: {
        openui: "validated-data-only",
        "typed-json": "validated-data-only",
        "json-render": "validated-data-rendered-by-official-react-runtime",
        "direct-rsx": "allowlisted source, sandboxed SSR, and externally blocked Web requests",
      },
      direct_rsx_sandbox: "SSR compile and execution use the macOS deny-network sandbox; interactive Web uses an explicit non-secret environment, rejects direct access to the web-sys feature shim, and blocks external browser requests",
      effect_policy: "deny-by-default",
    },
    implementation_footprint: implementationFootprint,
    cost: {
      billing_basis: provider === "codex"
        ? "ChatGPT plan, no per-run API invoice or incremental dollar charge is available"
        : contractKey === "canary"
          ? "ChatGPT plan is reserved for the real canary; deterministic fake provider uses no model calls"
          : "Deterministic fake provider uses no model calls",
      incremental_api_cost_usd: null,
      provider_usage: aggregateProviderUsage(records),
    },
    provider_error: providerError,
    final_product_scorer_accessed: productScorerAccessCount > 0,
    final_product_scorer_access_count: productScorerAccessCount,
  };
  let reportText = report(summary);
  const finalPayloadFindings = scanPublicationPayloads({ "summary.json": summary, "REPORT.md": reportText });
  const publicationScanFindings = [...treeScanFindings, ...finalPayloadFindings];
  if (finalPayloadFindings.length > 0) {
    outcome = contractKey === "complete_run" ? "INVALID_EVAL" : "CANARY_INVALID";
    summary.outcome = outcome;
    summary.manifest_promoted = false;
    summary.trust_controls.publication_credential_scan_findings = publicationScanFindings.length;
    if (summary.finalization) summary.finalization.diagnostics.push({ field: "publication", code: "credential-scan-failed" });
    reportText = report(summary);
  }
  if (contractKey === "canary") assertDecisionNeutral(summary);
  else if (contractKey === "complete_canary") assertCompleteCanary(summary);
  else assertCompleteStage(summary);
  await writeJson(path.join(outputDirectory, "summary.json"), summary);
  await writeJson(path.join(outputDirectory, "credential-scan.json"), {
    passed: scanFindings.length === 0 && publicationScanFindings.length === 0,
    pre_provider_findings: scanFindings,
    publication_findings: publicationScanFindings,
  });
  await writeFile(path.join(outputDirectory, "REPORT.md"), reportText, { flag: "wx", mode: 0o600 });
  const checksumManifestSha256 = await writeChecksums(outputDirectory);
  await writeJson(path.join(outputDirectory, CANDIDATE_MARKER), {
    status: preProviderInfrastructureAbort
      ? "pre-provider-infrastructure-failure"
      : nonCertifyingV2Preflight
      ? "deterministic-preflight-only"
      : contractKey === "complete_run"
      ? outcome === "READY_FOR_REVIEW" ? "ready-for-independent-review" : "awaiting-human-evidence"
      : "awaiting-independent-review",
    outcome,
    manifest_hash: manifestHash,
    checksum_manifest_sha256: checksumManifestSha256,
  });
  if (contractKey !== "complete_run" && !preProviderInfrastructureAbort) {
    await runPublicationStep("review-evidence.mjs", outputDirectory, deadlineMs);
    if (!nonCertifyingV2Preflight) {
      await runPublicationStep("finalize-evidence.mjs", outputDirectory, deadlineMs);
    }
  }
  return summary;
}

async function cleanProviderBuildCache({ sharedCargoTarget, deadlineMs }) {
  const evaluationCacheRoot = path.resolve(repo, "../..", ".cache", "openui-dioxus-eval");
  const cleanupBoundary = await assertDedicatedEvaluationCargoTarget({
    cacheRoot: evaluationCacheRoot,
    targetDirectory: sharedCargoTarget,
  });
  const targetDirectory = cleanupBoundary.target_directory;
  const result = await runBoundedProcess({
    command: "cargo",
    args: [
      "clean",
      "--manifest-path",
      path.join(root, "platform", "dioxus", "Cargo.toml"),
      "--target-dir",
      targetDirectory,
    ],
    cwd: root,
    env: Object.fromEntries(
      ["PATH", "HOME", "TMPDIR", "CARGO_HOME", "RUSTUP_HOME", "CARGO_NET_OFFLINE"]
        .filter((name) => process.env[name] !== undefined)
        .map((name) => [name, process.env[name]]),
    ),
    timeoutMs: boundedTimeout(deadlineMs, 60_000, "pre-provider Cargo cache cleanup"),
    maximumBytes: 64 * 1024,
  });
  if (result.error || result.exitCode !== 0 || !result.process_group_reaped) {
    throw new Error(`pre-provider Cargo cache cleanup failed: ${result.error ?? result.stderr ?? result.stdout ?? result.exitCode}`);
  }
  return {
    required: true,
    passed: true,
    target_directory: targetDirectory,
    evaluation_cache_root: cleanupBoundary.cache_root,
    process_started: result.process_started,
    exit_code: result.exitCode,
    process_group_reaped: result.process_group_reaped,
    stdout_sha256: sha(result.stdout),
    stderr_sha256: sha(result.stderr),
  };
}

async function capturePreProviderStorage({ outputDirectory, sharedCargoTarget }) {
  const externalRecordPath = process.env.EVAL_PRE_PROVIDER_GATE_LOG
    ? path.resolve(process.env.EVAL_PRE_PROVIDER_GATE_LOG)
    : null;
  const archivedRecordPath = path.join(outputDirectory, "pre-provider-storage-gates.jsonl");
  const recordPath = externalRecordPath ?? archivedRecordPath;
  const latest = await recordStorageGate({
    evidenceDirectory: outputDirectory,
    targetDirectory: sharedCargoTarget,
    stage: "pre-first-provider-call",
    minimumFreeBytes: minimumFreeBytesFromEnvironment(),
    recordPath,
    failurePath: path.join(outputDirectory, "pre-provider-infrastructure.json"),
  });
  const source = await readFile(recordPath, "utf8");
  if (externalRecordPath) {
    await writeFile(archivedRecordPath, source, { flag: "wx", mode: 0o600 });
    await rm(externalRecordPath);
  }
  const checks = source.trim().split("\n").filter(Boolean).map(JSON.parse);
  return {
    required: true,
    passed: latest.passed && checks.every((check) => check.passed),
    provider_attempts: 0,
    minimum_free_bytes: latest.minimum_free_bytes,
    shared_cargo_target: sharedCargoTarget,
    record_count: checks.length,
    records_sha256: sha(source),
    checks,
  };
}

async function runPublicationStep(script, outputDirectory, deadlineMs) {
  const result = await runBoundedProcess({
    command: process.execPath,
    args: [path.join(root, "scripts", script), outputDirectory],
    cwd: root,
    env: Object.fromEntries(["PATH", "HOME", "TMPDIR"].filter((name) => process.env[name] !== undefined).map((name) => [name, process.env[name]])),
    timeoutMs: boundedTimeout(deadlineMs, 60_000, script),
    maximumBytes: 2 * 1024 * 1024,
  });
  if (result.error || result.exitCode !== 0 || !result.process_group_reaped) {
    throw new Error(`${script} failed: ${result.error ?? result.stderr ?? result.stdout ?? result.exitCode}`);
  }
}

async function generateRouteOutput({
  provider,
  route,
  scheduleScenarioId,
  attempt,
  scenario,
  instructions,
  userPrompt,
  rawPath,
  maximumResponseBytes: responseLimit,
  timeoutMs,
  providerExecutionCapability,
}) {
  if (provider === "fake") return fakeGenerate({ route, scheduleScenarioId, attempt, scenario });
  if (provider !== "codex") throw new Error(`unknown provider: ${provider}`);
  if (providerExecutionCapability !== reviewedCliProviderCapability) {
    throw new Error("real provider execution is available only through the reviewed CLI entrypoint");
  }
  const codexHome = process.env.EVAL_CODEX_HOME;
  const cwd = process.env.EVAL_CODEX_WORKDIR;
  if (!codexHome || !cwd) throw new Error("EVAL_CODEX_HOME and EVAL_CODEX_WORKDIR are required for provider=codex");
  const result = await generateWithCodex({
    prompt: ["SYSTEM INSTRUCTIONS", instructions, "USER REQUEST", userPrompt].join("\n\n"),
    outputPath: rawPath,
    codexHome,
    cwd,
    command: process.env.EVAL_CODEX_BIN ?? "codex",
    model: "gpt-5.6-luna",
    reasoningEffort: "low",
    maxResponseBytes: responseLimit,
    timeoutMs: Math.min(Number(process.env.EVAL_CODEX_TIMEOUT_MS ?? 180_000), timeoutMs),
  });
  return {
    output: result.output,
    provider_ms: result.elapsedMs,
    usage_source: result.usage.usage_source,
    provider_usage: result.usage,
    response_bytes: result.outputBytes,
    events_raw: result.eventsRaw,
    stderr: result.stderr,
    provider_process_started: result.processStarted,
    provider_thread_started: result.threadStarted,
    provider_completed: result.turnCompleted,
  };
}

async function generateWithCodex({
  prompt,
  outputPath,
  codexHome,
  cwd,
  command,
  model,
  reasoningEffort,
  maxResponseBytes: responseLimit,
  timeoutMs,
}) {
  const temporaryOutput = `${outputPath}.provider-${randomUUID()}`;
  closeSync(openSync(temporaryOutput, "wx", 0o600));
  const environment = buildProviderEnvironment({ codexHome, cwd });
  mkdirSync(environment.TMPDIR, { recursive: true, mode: 0o700 });
  const started = performance.now();
  try {
    const result = await runBoundedProcess({
      command,
      args: buildCodexArgs({ outputPath: temporaryOutput, model, reasoningEffort }),
      cwd,
      env: environment,
      input: prompt,
      maximumBytes: 2 * 1024 * 1024,
      timeoutMs,
    });
    const elapsedMs = performance.now() - started;
    const eventsRaw = result.stdout ?? "";
    const stderr = result.stderr ?? "";
    const outputBytes = statSync(temporaryOutput).size;
    const output = outputBytes > responseLimit
      ? readPrefix(temporaryOutput, responseLimit)
      : readFileSync(temporaryOutput, "utf8");
    const parsed = safeParseProviderEvents(eventsRaw);
    const eventState = safeInspectProviderEvents(eventsRaw);
    const processStarted = result.process_started === true;
    if (result.error || result.exitCode !== 0 || !result.process_group_reaped) {
      const detail = String(result.error ?? stderr ?? `exit ${result.exitCode}`).slice(0, 2000);
      throw new CodexProviderError(`Codex provider failed: ${detail}`, {
        eventsRaw,
        stderr,
        elapsedMs,
        output,
        outputBytes,
        usage: parsed?.usage ?? null,
        toolActivity: parsed?.toolActivity ?? [],
        processStarted,
        threadStarted: eventState.thread_started,
        turnCompleted: eventState.turn_completed,
      });
    }
    if (!parsed) {
      throw new CodexProviderError("Codex event parsing failed: no completed usage event", {
        eventsRaw,
        stderr,
        elapsedMs,
        output,
        outputBytes,
        processStarted,
        threadStarted: eventState.thread_started,
        turnCompleted: eventState.turn_completed,
      });
    }
    if (parsed.toolActivity.length) {
      throw new CodexProviderError(`Codex tool activity is forbidden: ${parsed.toolActivity.join(", ")}`, {
        eventsRaw,
        stderr,
        toolActivity: parsed.toolActivity,
        elapsedMs,
        output,
        outputBytes,
        usage: parsed.usage,
        processStarted,
        threadStarted: eventState.thread_started,
        turnCompleted: eventState.turn_completed,
      });
    }
    return {
      output,
      outputBytes,
      elapsedMs,
      stderr,
      eventsRaw,
      processStarted,
      threadStarted: eventState.thread_started,
      turnCompleted: eventState.turn_completed,
      ...parsed,
    };
  } finally {
    try {
      unlinkSync(temporaryOutput);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

function safeParseProviderEvents(source) {
  try {
    return parseCodexEvents(source);
  } catch {
    return null;
  }
}

function safeInspectProviderEvents(source) {
  try {
    return inspectCodexEvents(source);
  } catch {
    return { thread_started: false, turn_completed: false };
  }
}

function readPrefix(filePath, maxBytes) {
  const descriptor = openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(maxBytes);
    const bytesRead = readSync(descriptor, buffer, 0, maxBytes, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    closeSync(descriptor);
  }
}

function providerFailureRecord({
  cell,
  scenario,
  attempt,
  instructions,
  userPrompt,
  message,
  encoding,
  output,
  responseBytes,
  providerMs,
  providerUsage,
  rawSha256,
  diagnosticsSha256,
  evidenceStem,
  providerInvocationAttempted,
  providerProcessStarted,
  providerThreadStarted,
  providerCompleted,
}) {
  return {
    route: cell.route,
    evidence_stem: evidenceStem,
    prompt_id: cell.prompt_id,
    cohort: cell.cohort,
    scenario_id: cell.scenario_id,
    source_scenario_id: scenario.id,
    family: scenario.family,
    order_position: cell.order_position,
    attempt,
    repaired: attempt === 2,
    accepted: false,
    diagnostics: [{ code: "provider-error", message }],
    tokens: {
      raw_prompt_tokens: tokenCount(encoding, instructions) + tokenCount(encoding, userPrompt),
      raw_output_tokens: tokenCount(encoding, output),
      usage_source: providerUsage?.usage_source ?? "provider-error-without-completed-usage",
      provider_usage: providerUsage,
    },
    latency: { provider_ms: providerMs, validation_ms: 0, normalization_ms: 0, compile_ms: 0, sandbox_run_ms: 0, full_response_ms: providerMs },
    response_bytes: responseBytes,
    semantic_fingerprint: null,
    oracle_fingerprint: null,
    canonical_surface: null,
    platform_artifact: null,
    provider_invocation_attempted: providerInvocationAttempted,
    provider_process_started: providerProcessStarted,
    provider_thread_started: providerThreadStarted,
    provider_completed: providerCompleted,
    prompt_hashes: { instructions_sha256: sha(instructions), user_prompt_sha256: sha(userPrompt) },
    artifact_hashes: { raw_sha256: rawSha256, diagnostics_sha256: diagnosticsSha256, native_sha256: null, canonical_sha256: null, platform_artifact_sha256: null },
  };
}

async function verifyReviewedV2State({ frozenManifestAttestation, reviewAttestation }) {
  const refreshedReview = loadReviewAttestation({ repoRoot: repo, manifestAttestation: frozenManifestAttestation });
  if (refreshedReview.tag_object !== reviewAttestation?.tag_object
    || refreshedReview.reviewed_commit !== reviewAttestation?.reviewed_commit) {
    throw new Error("Git review attestation changed");
  }
  const refreshedManifest = await buildCandidateManifest({ contractVersion: OBSERVABLE_CONTRACT_V2 });
  if (Buffer.compare(serializeCandidateManifest(refreshedManifest), frozenManifestAttestation.raw_bytes) !== 0) {
    throw new Error("reviewed manifest bytes changed");
  }
}

async function verifyProviderEventDirectory({ records, outputDirectory }) {
  const directory = path.join(outputDirectory, "provider-events");
  const entries = await readdir(directory, { withFileTypes: true });
  const eventSources = new Map();
  for (const entry of entries) {
    if (!entry.isFile()) throw new Error(`non-regular provider event path: ${entry.name}`);
    eventSources.set(entry.name, await readFile(path.join(directory, entry.name), "utf8"));
  }
  return verifyProviderEventEvidence({ records, eventSources });
}

function remainingTime(deadlineMs) {
  return Math.max(0, Math.floor(deadlineMs - performance.now()));
}

function finalRecordsByCell(records) {
  const groups = new Map();
  for (const record of records) {
    const key = `${record.cohort}:${record.scenario_id}:${record.route}`;
    const current = groups.get(key);
    if (!current || record.attempt > current.attempt) groups.set(key, record);
  }
  return [...groups.values()];
}

function validity(records, attempt = null) {
  const selected = attempt === null ? records : records.filter((record) => record.attempt === attempt);
  return Object.fromEntries(["openui", "typed-json", "json-render", "direct-rsx"].map((route) => [route, selected.filter((record) => record.route === route && record.accepted).length]));
}

function cumulativeTokens(records) {
  return Object.fromEntries(["openui", "typed-json", "json-render", "direct-rsx"].map((route) => [route, records.filter((record) => record.route === route).reduce((total, record) => total + record.tokens.raw_prompt_tokens + record.tokens.raw_output_tokens, 0)]));
}

function aggregateProviderUsage(records) {
  const totals = {
    input_tokens: 0,
    cached_input_tokens: 0,
    cache_write_input_tokens: 0,
    output_tokens: 0,
    reasoning_tokens: 0,
    total_tokens: 0,
  };
  let measuredRecords = 0;
  for (const record of records) {
    const usage = record.tokens.provider_usage;
    if (!usage) continue;
    measuredRecords += 1;
    for (const key of Object.keys(totals)) totals[key] += Number(usage[key] ?? 0);
  }
  return { measured_records: measuredRecords, ...totals };
}

function balancedOrder(schedule) {
  const scenarioGroups = new Map();
  for (const cell of schedule) {
    const key = `${cell.cohort}:${cell.scenario_id}`;
    if (!scenarioGroups.has(key)) scenarioGroups.set(key, []);
    scenarioGroups.get(key).push(cell);
  }
  if (![...scenarioGroups.values()].every((cells) => {
    const positions = cells.map((cell) => cell.order_position).sort((left, right) => left - right);
    return JSON.stringify(positions) === JSON.stringify(cells.map((_, index) => index));
  })) return false;

  for (const cohort of new Set(schedule.map((cell) => cell.cohort))) {
    const cells = schedule.filter((cell) => cell.cohort === cohort);
    const positionCount = Math.max(...cells.map((cell) => cell.order_position)) + 1;
    for (const route of new Set(cells.map((cell) => cell.route))) {
      const counts = Array.from({ length: positionCount }, (_, position) => cells.filter((cell) => cell.route === route && cell.order_position === position).length);
      if (Math.max(...counts) - Math.min(...counts) > 1) return false;
    }
  }
  return true;
}

function canonicalRuntimeDiffLines() {
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

function initialOutcome({
  allAccepted,
  completeCanaryHumanBlockProved,
  contractKey,
  contractVersion,
  finalization,
  operationalPreflightPassed,
  provider,
  providerError,
}) {
  if (contractKey === "complete_run") return finalization.outcome;
  if (contractVersion === OBSERVABLE_CONTRACT_V2 && contractKey === "canary") {
    return classifyCanaryOutcomeV2({ provider, providerError, allAccepted, operationalPreflightPassed });
  }
  return operationalPreflightPassed && (contractKey !== "complete_canary" || completeCanaryHumanBlockProved)
    ? "PASS"
    : "CANARY_INVALID";
}

export function classifyCanaryOutcomeV2({ provider, providerError, allAccepted, operationalPreflightPassed }) {
  if (provider !== "codex") return "CANARY_INVALID";
  if (providerError) return "CANARY_INVALID";
  if (!allAccepted) return "CANARY_FAIL";
  return operationalPreflightPassed ? "CANARY_PASS" : "CANARY_INVALID";
}

export function canPromoteV2Manifest({ outcome, provider, platformProof, frozenManifestVerified }) {
  return outcome === "CANARY_PASS"
    && provider === "codex"
    && platformProof === "generated"
    && frozenManifestVerified === true;
}

function tokenCount(encoding, source) {
  return encoding.encode(source).length;
}

function slug(value) {
  return value.replace(/[^a-zA-Z0-9-]+/g, "-");
}

async function buildReviewPacketRecords({ records, byId, platformEvidence, outputDirectory }) {
  const generated = platformEvidence.source === "generated-canary-outputs";
  const assets = new Map();
  const traceByEvidenceDirectory = new Map();
  const proofByRoute = {
    openui: [platformEvidence.proofs?.dioxus_web, "dioxus-web-local"],
    "typed-json": [platformEvidence.proofs?.dioxus_web, "dioxus-web-local"],
    "json-render": [platformEvidence.proofs?.react_web, "react-web-local"],
    "direct-rsx": [platformEvidence.proofs?.direct_rsx_web, "direct-rsx-web-local"],
  };
  const addAsset = async (kind, relativePath) => {
    const bytes = await readFile(path.join(outputDirectory, relativePath));
    const digest = sha(bytes);
    const assetId = `${kind}-${digest}`;
    assets.set(assetId, { asset_id: assetId, kind, relative_path: relativePath, sha256: digest });
    return assetId;
  };
  const traceAsset = async (evidenceDirectory) => {
    if (traceByEvidenceDirectory.has(evidenceDirectory)) return traceByEvidenceDirectory.get(evidenceDirectory);
    const traceRoot = path.join(outputDirectory, "platform-evidence", evidenceDirectory, "traces");
    const trace = (await filesBelow(traceRoot)).find((relative) => relative.endsWith("trace.zip"));
    if (!trace) throw new Error(`missing generated behavior recording: ${evidenceDirectory}`);
    const assetId = await addAsset("recording", path.join("platform-evidence", evidenceDirectory, "traces", trace));
    traceByEvidenceDirectory.set(evidenceDirectory, assetId);
    return assetId;
  };
  const packetRecords = await Promise.all(records.map(async (record) => {
    const scenario = byId.get(record.source_scenario_id);
    const artifactSha = record.artifact_hashes.platform_artifact_sha256;
    let screenshots = [`asset-${artifactSha}`];
    let behaviorRecording = `recording-${artifactSha}`;
    if (generated) {
      const [proof, evidenceDirectory] = proofByRoute[record.route] ?? [];
      const artifactIndex = proof?.artifacts?.findIndex((entry) => entry.route === record.route
        && entry.cohort === record.cohort
        && entry.schedule_scenario_id === record.scenario_id);
      const artifact = artifactIndex >= 0 ? proof.artifacts[artifactIndex] : null;
      if (!artifact?.screenshot) throw new Error(`missing generated screenshot binding: ${record.cohort}:${record.scenario_id}:${record.route}`);
      screenshots = [await addAsset("asset", path.join("platform-evidence", evidenceDirectory, "screenshots", artifact.screenshot))];
      if (["openui", "typed-json"].includes(record.route)) {
        const desktopScreenshot = platformEvidence.proofs?.dioxus_desktop?.screenshots?.[artifactIndex]?.file;
        if (!desktopScreenshot) throw new Error(`missing generated Desktop screenshot binding: ${record.cohort}:${record.scenario_id}:${record.route}`);
        screenshots.push(await addAsset("asset", path.join("platform-evidence", "dioxus-desktop-local", "screenshots", desktopScreenshot)));
      }
      behaviorRecording = await traceAsset(evidenceDirectory);
    }
    return {
      scenario_id: record.source_scenario_id,
      artifact_sha256: artifactSha,
      source_identity_sha256: sha(`${record.cohort}:${record.scenario_id}:${record.route}:${record.attempt}:${artifactSha}`),
      task_contract: {
        family: scenario.family,
        required_behavior: Object.keys(scenario.shared_contract.acceptance).sort(),
        workflow_fixture_sha256: sha(stableJson(scenario.shared_contract.mcp_tool_result)),
      },
      screenshots,
      behavior_recording: behaviorRecording,
    };
  }));
  return {
    records: packetRecords,
    assets: [...assets.values()].sort((left, right) => left.asset_id.localeCompare(right.asset_id)),
    mode: generated ? "generated-content-addressed-evidence" : "reference-preflight-placeholders",
  };
}

function report(summary) {
  const complete = summary.run_contract.startsWith("complete_run");
  return [
    complete ? "# OPE-19 complete-runner evidence" : "# OPE-11 ecosystem canary",
    "",
    `Outcome: ${summary.outcome}`,
    `Execution: ${summary.execution_kind}`,
    `Route cells: ${summary.route_cells}/${summary.expected_route_cells}`,
    `Provider calls: ${summary.calls}/${summary.maximum_calls}`,
    `Pre-provider build cache cleanup: ${summary.provider_build_cache_cleanup.passed ? "passed" : "failed"}`,
    `Pre-provider storage: ${summary.pre_provider_storage.passed ? "passed" : "failed"}`,
    `Manifest: ${summary.manifest_hash}`,
    `Frozen OPE-3 import: ${summary.ope3_import.verified ? "verified" : "failed"}`,
    `Second catalog fixtures: ${summary.second_catalog.verified ? "verified" : "failed"}`,
    `Platform evidence: ${summary.platform_evidence.verified ? "verified" : "failed"}`,
    `Canonical runtime behavior diff: ${summary.canonical_runtime_behavior_diff_lines} lines`,
    `Implementation footprint: ${summary.implementation_footprint.total.file_count} files, ${summary.implementation_footprint.total.nonblank_lines} nonblank lines`,
    `Version-control numstat: ${summary.implementation_footprint.version_control.added_lines} added, ${summary.implementation_footprint.version_control.removed_lines} removed`,
    `Untracked source files: ${summary.implementation_footprint.version_control.untracked_source_files.length}`,
    "",
    "| Category | Files | Nonblank lines |",
    "| --- | ---: | ---: |",
    ...Object.entries(summary.implementation_footprint.required_categories).map(([name, value]) => `| ${name} | ${value.file_count} | ${value.nonblank_lines} |`),
    "",
    `Cost basis: ${summary.cost.billing_basis}`,
    "",
    complete
      ? "This runner can emit only READY_FOR_REVIEW or INVALID_EVAL. OPE-7 owns every product verdict."
      : "This operational canary is decision-neutral. It can only permit or block the complete evidence run.",
    "",
  ].join("\n");
}

function assertCompleteStage(summary) {
  if (!["READY_FOR_REVIEW", "INVALID_EVAL"].includes(summary.outcome)) throw new Error(`invalid complete-run outcome: ${summary.outcome}`);
  if (summary.finalization?.outcome !== summary.outcome) throw new Error("complete-run outcome differs from finalization");
  if (summary.final_product_scorer_access_count !== 0) throw new Error("product scorer accessed during complete run");
  const serialized = JSON.stringify(summary);
  for (const verdict of ["GO_OPENUI_DIOXUS", "PIVOT_TO_SURFACE_RUNTIME", "NO_GO"]) {
    if (serialized.includes(verdict)) throw new Error(`product verdict leaked into complete-run evidence: ${verdict}`);
  }
}

function assertCompleteCanary(summary) {
  if (!["PASS", "CANARY_INVALID"].includes(summary.outcome)) throw new Error(`invalid complete-canary outcome: ${summary.outcome}`);
  if (!["READY_FOR_REVIEW", "INVALID_EVAL"].includes(summary.finalization?.outcome)) throw new Error("invalid nested complete-run finalization");
  if (summary.final_product_scorer_access_count !== 0) throw new Error("product scorer accessed during complete canary");
  const serialized = JSON.stringify(summary);
  for (const verdict of ["GO_OPENUI_DIOXUS", "PIVOT_TO_SURFACE_RUNTIME", "NO_GO"]) {
    if (serialized.includes(verdict)) throw new Error(`product verdict leaked into complete-canary evidence: ${verdict}`);
  }
}

async function writeJson(destination, value) {
  await writeFile(destination, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
}

async function writeChecksums(directory) {
  const files = (await filesBelow(directory)).filter((relative) => !["SHA256SUMS", CANDIDATE_MARKER, PUBLICATION_MARKER].includes(relative)).sort();
  const lines = await Promise.all(files.map(async (relative) => `${sha(await readFile(path.join(directory, relative)))}  ${relative}`));
  const contents = `${lines.join("\n")}\n`;
  await writeFile(path.join(directory, "SHA256SUMS"), contents, { flag: "wx", mode: 0o600 });
  return sha(contents);
}

async function prepareOutputDirectory(directory) {
  try {
    const metadata = await lstat(directory);
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) throw new Error(`unsafe canary output directory: ${directory}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await mkdir(directory, { mode: 0o700 });
  }
  if ((await readdir(directory)).length) throw new Error(`refusing to overwrite non-empty output directory: ${directory}`);
  const lock = await open(path.join(directory, ".ope11-write-lock"), "wx", 0o600);
  try {
    await lock.writeFile(`${JSON.stringify({ pid: process.pid, created_at: new Date().toISOString() })}\n`);
  } finally {
    await lock.close();
  }
}

async function filesBelow(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(path.join(directory, entry.name), relative));
    else files.push(relative);
  }
  return files;
}

function parseCli(argv) {
  const options = {
    provider: null,
    outputDirectory: null,
    platformProof: null,
    runContract: "canary",
    contractVersion: process.env.EVAL_CONTRACT_VERSION || null,
    frozenManifestPath: process.env.EVAL_FROZEN_MANIFEST ? path.resolve(process.env.EVAL_FROZEN_MANIFEST) : null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    const value = argv[index + 1];
    if (name === "--provider") options.provider = value;
    else if (name === "--output") options.outputDirectory = path.resolve(value);
    else if (name === "--platform-proof") options.platformProof = value;
    else if (name === "--run") options.runContract = value;
    else if (name === "--contract-version") options.contractVersion = value;
    else if (name === "--manifest") options.frozenManifestPath = path.resolve(value);
    else throw new Error(`unknown argument: ${name}`);
    index += 1;
  }
  options.provider ??= "fake";
  if (!["canary", "complete", "complete-canary"].includes(options.runContract)) throw new Error(`unknown run: ${options.runContract}`);
  options.platformProof ??= options.provider === "codex" ? "generated" : "reference";
  options.outputDirectory ??= options.provider === "codex"
    ? path.resolve(repo, "../..", ".cache", "openui-dioxus-eval", "evidence", `candidate-${options.runContract}`)
    : path.join(root, "evidence", `fake-${options.runContract}`);
  if (options.provider === "codex" && isWithinPath(repo, options.outputDirectory)) {
    throw new Error("observable-contract-v2 evidence must remain outside the reviewed repository");
  }
  return options;
}

function isWithinPath(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

async function runMandatoryProviderPreflight(options) {
  const inheritedNames = [
    "PATH",
    "HOME",
    "TMPDIR",
    "LANG",
    "LC_ALL",
    "CODEX_HOME",
    "CARGO_HOME",
    "RUSTUP_HOME",
    "CARGO_TARGET_DIR",
    "EVAL_CODEX_BIN",
    "EVAL_CODEX_HOME",
    "EVAL_MINIMUM_FREE_BYTES",
    "EVAL_PRE_PROVIDER_GATE_LOG",
    "EVAL_SHARED_CARGO_TARGET_DIR",
    "EVAL_SOURCE_CODEX_HOME",
  ];
  const env = Object.fromEntries(
    inheritedNames
      .filter((name) => process.env[name] !== undefined)
      .map((name) => [name, process.env[name]]),
  );
  env.EVAL_PREFLIGHT_ONLY = "1";
  env.EVAL_CONTRACT_VERSION = options.contractVersion;
  env.EVAL_FROZEN_MANIFEST = options.frozenManifestPath;
  env.EVAL_OUTPUT_DIR = options.outputDirectory;
  env.EVAL_RUN = "canary";
  env.EVAL_SOURCE_CODEX_HOME ??= process.env.EVAL_CODEX_HOME;
  const result = await runBoundedProcess({
    command: "bash",
    args: [path.join(root, "scripts", "run-canary.sh")],
    cwd: root,
    env,
    timeoutMs: 20 * 60 * 1000,
    maximumBytes: 4 * 1024 * 1024,
  });
  if (result.error || result.exitCode !== 0 || !result.process_group_reaped) {
    throw new Error(`mandatory reviewed provider preflight failed: ${result.error ?? result.stderr ?? result.stdout ?? result.exitCode}`);
  }
}

async function claimCanaryOnce({
  ledgerRoot,
  manifestRawSha256,
  reviewedCommit,
  outputDirectory,
  reviewAttestation,
}) {
  if (!sha256Pattern.test(manifestRawSha256)) throw new Error("invalid manifest raw SHA-256 for one-shot claim");
  if (!commitPattern.test(reviewedCommit)) throw new Error("invalid reviewed commit for one-shot claim");
  const absoluteRoot = path.resolve(ledgerRoot);
  await mkdir(absoluteRoot, { recursive: true, mode: 0o700 });
  const rootMetadata = await lstat(absoluteRoot);
  if (rootMetadata.isSymbolicLink() || !rootMetadata.isDirectory()) throw new Error("unsafe one-shot ledger root");
  const ledgerPath = path.join(absoluteRoot, `${OBSERVABLE_CONTRACT_V2}-${manifestRawSha256}.json`);
  const claim = {
    version: "ope-24-one-shot-claim-v1",
    ticket: "OPE-24",
    status: "started",
    manifest_raw_sha256: manifestRawSha256,
    reviewed_commit: reviewedCommit,
    review_attestation_tag: reviewAttestation.tag_name,
    review_attestation_object: reviewAttestation.tag_object,
    output_directory_sha256: sha(path.resolve(outputDirectory)),
    claimed_at: new Date().toISOString(),
  };
  try {
    await writeFile(ledgerPath, `${JSON.stringify(claim, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error.code === "EEXIST") throw new Error(`observable-contract-v2 canary already consumed for manifest ${manifestRawSha256}`);
    throw error;
  }
  return { ...claim, ledger_path: ledgerPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseCli(process.argv.slice(2));
  if (options.provider === "codex") {
    await assertExternalEvidenceDirectory({ repoRoot: repo, outputDirectory: options.outputDirectory });
  }
  await mkdir(options.outputDirectory, { recursive: true });
  try {
    const frozenManifestAttestation = options.frozenManifestPath
      ? await loadFrozenManifest(options.frozenManifestPath)
      : null;
    const frozenManifest = frozenManifestAttestation?.manifest ?? null;
    const manifestContractVersion = frozenManifest?.observable_contract?.version ?? null;
    if (frozenManifest && manifestContractVersion !== options.contractVersion) {
      throw new Error("frozen manifest contract version differs from the requested contract version");
    }
    if (options.provider === "codex" && options.contractVersion !== OBSERVABLE_CONTRACT_V2) {
      throw new Error("real provider execution requires observable-contract-v2");
    }
    if (options.provider === "codex" && frozenManifestAttestation?.verified !== true) {
      throw new Error("real provider execution requires a verified frozen manifest");
    }
    if (options.provider === "codex") await runMandatoryProviderPreflight(options);
    const reviewAttestation = frozenManifestAttestation && options.provider === "codex"
      ? loadReviewAttestation({ repoRoot: repo, manifestAttestation: frozenManifestAttestation })
      : null;
    const oneShotClaim = options.provider === "codex"
      ? await claimCanaryOnce({
        ledgerRoot: canonicalOneShotLedgerRoot(repo),
        manifestRawSha256: frozenManifestAttestation.raw_sha256,
        reviewedCommit: reviewAttestation.reviewed_commit,
        outputDirectory: options.outputDirectory,
        reviewAttestation,
      })
      : null;
    const runnerOptions = {
      provider: options.provider,
      outputDirectory: options.outputDirectory,
      platformProof: options.platformProof,
      contractVersion: options.contractVersion,
      frozenManifest,
      frozenManifestAttestation,
      oneShotClaimPath: oneShotClaim?.ledger_path ?? null,
      reviewAttestation,
      providerExecutionCapability: options.provider === "codex" ? reviewedCliProviderCapability : null,
    };
    const summary = options.runContract === "complete"
      ? await runCompleteEvaluation(runnerOptions)
      : options.runContract === "complete-canary"
        ? await runCompleteCanary(runnerOptions)
        : await runCanary(runnerOptions);
    process.stdout.write(`${summary.outcome}\n`);
  } catch (error) {
    const emergency = {
      outcome: options.runContract === "complete" ? "INVALID_EVAL" : "CANARY_INVALID",
      certification_status: "terminal-invalid",
      certified_outcome: options.runContract === "complete" ? "INVALID_EVAL" : "CANARY_INVALID",
      execution_kind: options.runContract === "complete"
        ? options.provider === "codex" ? "real-complete-run" : "deterministic-complete-preflight"
        : options.runContract === "complete-canary"
          ? options.provider === "codex" ? "real-complete-canary" : "deterministic-complete-canary"
        : options.provider === "codex" ? "real-provider-canary" : "deterministic-preflight",
      provider: options.provider,
      infrastructure_error: String(error.message).slice(0, 2000),
      product_outcome_forbidden: true,
    };
    let candidateOutcome = null;
    try {
      await writeFile(path.join(options.outputDirectory, "summary.json"), `${JSON.stringify(emergency, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    } catch (writeError) {
      if (writeError.code !== "EEXIST") throw writeError;
      const candidateSummary = JSON.parse(await readFile(path.join(options.outputDirectory, "summary.json"), "utf8"));
      candidateOutcome = candidateSummary.outcome ?? null;
    }
    const terminal = {
      ...emergency,
      certification_status: candidateOutcome === null ? "terminal-invalid" : "invalidated-after-candidate-summary",
      candidate_outcome: candidateOutcome,
    };
    try {
      await writeFile(path.join(options.outputDirectory, "TERMINAL_STATUS.json"), `${JSON.stringify(terminal, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    } catch (terminalError) {
      if (terminalError.code !== "EEXIST") throw terminalError;
    }
    process.stdout.write(`${emergency.outcome}\n`);
    process.exitCode = 1;
  }
}

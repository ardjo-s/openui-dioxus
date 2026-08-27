import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { buildCandidateManifest, hashManifest } from "../src/manifest.mjs";
import {
  buildBlindedPackets,
  buildCompleteSchedule,
  completeHumanEvidenceFixture,
  finalizeDecisionGrade,
  scanPacketLeaks,
  validateHumanEvidence,
  validatePacketOpening,
} from "../src/complete-run-contract.mjs";
import { finalizeCompleteEvidence, verifyCompleteEvidence } from "../src/finalize-complete.mjs";
import { runCompleteCanary, runCompleteEvaluation } from "../src/run-canary.mjs";

const temporaryRoot = new URL("../.tmp/", import.meta.url);

test("complete schedule freezes all eighty balanced route cells", async () => {
  const manifest = await buildCandidateManifest();
  const schedule = buildCompleteSchedule(manifest.cohorts);

  assert.equal(schedule.length, 80);
  assert.equal(schedule.filter((cell) => cell.cohort === "runtime-uncertain").length, 60);
  assert.equal(schedule.filter((cell) => cell.cohort === "compile-known").length, 20);
  assert.equal(new Set(schedule.map((cell) => `${cell.cohort}:${cell.scenario_id}:${cell.route}`)).size, 80);
  assert.deepEqual(schedule, buildCompleteSchedule(manifest.cohorts));
  for (const route of ["openui", "typed-json", "json-render"]) {
    assert.equal(schedule.filter((cell) => cell.cohort === "runtime-uncertain" && cell.route === route).length, 20);
  }
  for (const route of ["openui", "typed-json", "json-render", "direct-rsx"]) {
    assert.equal(schedule.filter((cell) => cell.cohort === "compile-known" && cell.route === route).length, 5);
  }
  assert.deepEqual(manifest.complete_run.schedule, schedule);
  assert.equal(manifest.complete_run.prompt_pack.length, 80);
  assert.equal(hashManifest(manifest), hashManifest(await buildCandidateManifest()));
});

test("complete human evidence fixture satisfies every registered class", async () => {
  const manifest = await buildCandidateManifest();
  const evidence = completeHumanEvidenceFixture(manifest);
  assert.deepEqual(validateHumanEvidence(manifest, evidence), { passed: true, diagnostics: [] });
  assert.ok(evidence.corrections.every((operator) => operator.measurements.length >= operator.assigned_routes.length));
  assert.equal(evidence.corrections.flatMap((operator) => operator.measurements).length, manifest.complete_run.schedule.length);
  assert.deepEqual(
    new Set(evidence.corrections.flatMap((operator) => operator.measurements.map((measurement) => measurement.cell_id))),
    new Set(manifest.complete_run.schedule.map((cell) => cell.prompt_id)),
  );
  assert.ok(evidence.reviews.every((review) => review.scores.length === review.scored_packet_ids.length));
  assert.ok(evidence.reviews.every((review) => review.scores.every((score) => manifest.review_plan.ui_quality_rubric.dimensions.every((dimension) => score[dimension] === 3))));
  assert.deepEqual(finalizeDecisionGrade({ generationComplete: true, platformComplete: true, humanEvidence: evidence, manifest }), {
    outcome: "READY_FOR_REVIEW",
    diagnostics: [],
  });
});

test("every missing human evidence class blocks finalization", async () => {
  const manifest = await buildCandidateManifest();
  const fixture = completeHumanEvidenceFixture(manifest);
  for (const field of ["corrections", "reviews", "keyboard", "voiceover", "talkback", "mobile", "replay", "migration", "drills", "costs", "applicability"]) {
    const evidence = structuredClone(fixture);
    delete evidence[field];
    const result = validateHumanEvidence(manifest, evidence);
    assert.equal(result.passed, false, field);
    assert.ok(result.diagnostics.some((item) => item.field === field), field);
  }
});

test("estimated, duplicated, conflicted, and unblinded records are rejected", async () => {
  const manifest = await buildCandidateManifest();
  for (const mutate of [
    (e) => { e.corrections[0].estimated = true; },
    (e) => { e.corrections[1].operator_id = e.corrections[0].operator_id; },
    (e) => { e.reviews[0].conflict_attested = false; },
    (e) => { e.reviews[0].route_labels_seen = true; },
    (e) => { e.reviews[0].packet_openings[0].packet_sha256 = "bad"; },
    (e) => { e.voiceover[0].performed = false; },
    (e) => { e.talkback[0].performed = false; },
  ]) {
    const evidence = completeHumanEvidenceFixture(manifest);
    mutate(evidence);
    assert.equal(validateHumanEvidence(manifest, evidence).passed, false);
  }
});

test("every malformed human evidence class is rejected independently", async () => {
  const manifest = await buildCandidateManifest();
  const cases = {
    corrections: (e) => { e.corrections[0].measurements[0].cell_id = "unregistered-cell"; },
    reviews: (e) => { e.reviews[0].scores[0].accessibility = 6; },
    keyboard: (e) => { e.keyboard[0].artifact_sha256 = "bad"; },
    voiceover: (e) => { e.voiceover[0].platform = "macos"; },
    talkback: (e) => { e.talkback[0].platform = "ios"; },
    mobile: (e) => { e.mobile[1].id = e.mobile[0].id; },
    replay: (e) => { e.replay[0].passed = false; },
    migration: (e) => { e.migration[0].estimated = true; },
    drills: (e) => { e.drills.pop(); },
    costs: (e) => { e.costs[0].basis = "estimated"; },
    applicability: (e) => { e.applicability[0].performed = false; },
  };
  for (const [field, mutate] of Object.entries(cases)) {
    const evidence = completeHumanEvidenceFixture(manifest);
    mutate(evidence);
    const result = validateHumanEvidence(manifest, evidence);
    assert.equal(result.passed, false, field);
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.field === field), field);
  }
});

test("blinded packets are deterministic, immutable, and route neutral", () => {
  const records = [
    packetRecord("scenario-b", "b".repeat(64)),
    packetRecord("scenario-a", "a".repeat(64)),
    packetRecord("scenario-c", "c".repeat(64)),
  ];
  const packets = buildBlindedPackets(records, "registered-seed");

  assert.deepEqual(packets, buildBlindedPackets(records, "registered-seed"));
  assert.equal(packets.length, 3);
  assert.ok(packets.every((packet) => Object.isFrozen(packet)));
  assert.ok(packets.every((packet) => scanPacketLeaks(packet).length === 0));
  assert.ok(packets.every((packet) => !Object.hasOwn(packet, "route")));
  const opening = {
    packet_id: packets[0].packet_id,
    packet_sha256: packets[0].packet_sha256,
    reviewer_id: "reviewer-a",
    opened_at: "2026-08-27T10:00:00.000Z",
    route_labels_seen: false,
  };
  assert.deepEqual(validatePacketOpening(packets[0], opening), { passed: true, diagnostics: [] });
  assert.equal(validatePacketOpening({ ...packets[0], task_contract: { title: "changed" } }, opening).passed, false);
});

test("packet leakage scanner rejects route, syntax, path, metric, and technology hints", () => {
  for (const [className, value] of [
    ["route", "typed-json"],
    ["syntax", "defineComponent({})"],
    ["path", "/Users/example/source.rs"],
    ["metric", "provider latency tokens"],
    ["technology", "Dioxus React Rust"],
  ]) {
    assert.ok(scanPacketLeaks({ value }).some((finding) => finding.class === className), className);
  }
});

test("complete fake-provider preflight executes all 80 cells and cannot finalize without real human evidence", { timeout: 180_000 }, async () => {
  const output = await mkdtemp(path.join(temporaryRoot.pathname, "complete-runner-"));
  try {
    const summary = await runCompleteEvaluation({ provider: "fake", outputDirectory: output, platformProof: "reference" });
    const records = (await readFile(path.join(output, "records.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);

    assert.equal(summary.outcome, "INVALID_EVAL");
    assert.equal(summary.operational_preflight_passed, true);
    assert.equal(summary.route_cells, 80);
    assert.equal(summary.external_provider_calls, 0);
    assert.equal(summary.calls, 84);
    assert.equal(summary.review_packets.count, 80);
    assert.equal(summary.review_packets.leak_findings.length, 0);
    assert.equal(summary.review_packets.immutable_after_opening, true);
    assert.equal(summary.review_packets.asset_mode, "reference-preflight-placeholders");
    assert.equal(records.length, 84);
    assert.equal(records.filter((record) => record.attempt === 1 && !record.accepted).length, 4);
    assert.equal(records.filter((record) => record.attempt === 2 && record.accepted).length, 4);
    assert.ok(summary.finalization.diagnostics.every((diagnostic) => diagnostic.code === "missing-evidence"));
    assert.deepEqual(new Set(summary.finalization.diagnostics.map((diagnostic) => diagnostic.field)), new Set([
      "corrections", "reviews", "keyboard", "voiceover", "talkback", "mobile", "replay", "migration", "drills", "costs", "applicability",
    ]));
    assert.equal(summary.final_product_scorer_access_count, 0);
    assert.match(await readFile(path.join(output, "SHA256SUMS"), "utf8"), /records\.jsonl/);

    const manifest = JSON.parse(await readFile(path.join(output, "candidate-manifest.json"), "utf8"));
    const packets = JSON.parse(await readFile(path.join(output, "review-packets.json"), "utf8"));
    const humanAssetDirectory = path.join(output, "..", `${path.basename(output)}-human-assets`);
    await mkdir(humanAssetDirectory);
    const assetBytes = Buffer.from("synthetic human evidence asset\n");
    const artifactSha = createHash("sha256").update(assetBytes).digest("hex");
    await writeFile(path.join(humanAssetDirectory, "evidence.bin"), assetBytes);
    const humanEvidence = completeHumanEvidenceFixture(manifest, { packets, artifactSha });
    await assert.rejects(
      () => finalizeCompleteEvidence({ outputDirectory: output, humanEvidence }),
      /human asset directory is required/,
    );
    const finalization = await finalizeCompleteEvidence({ outputDirectory: output, humanEvidence, humanAssetDirectory });
    assert.equal(finalization.outcome, "INVALID_EVAL");
    assert.ok(finalization.diagnostics.some((diagnostic) => diagnostic.code === "placeholder-assets-forbidden"));
    assert.equal(finalization.human_assets_verified, true);
    assert.equal(finalization.external_provider_calls, 0);
    assert.equal((await verifyCompleteEvidence(output)).verified, true);
    await assert.rejects(() => finalizeCompleteEvidence({ outputDirectory: output, humanEvidence }), /already finalized/);
    await rm(humanAssetDirectory, { recursive: true, force: true });
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("complete harness canary spans both cohorts and all routes while real human evidence stays blocked", { timeout: 60_000 }, async () => {
  const output = await mkdtemp(path.join(temporaryRoot.pathname, "complete-canary-"));
  try {
    const summary = await runCompleteCanary({ provider: "fake", outputDirectory: output, platformProof: "reference" });
    assert.equal(summary.outcome, "PASS");
    assert.equal(summary.run_contract, "complete_run.harness_canary");
    assert.equal(summary.route_cells, 8);
    assert.equal(summary.external_provider_calls, 0);
    assert.equal(summary.operational_preflight_passed, true);
    assert.equal(summary.finalization.outcome, "INVALID_EVAL");
    assert.ok(summary.finalization.diagnostics.some((diagnostic) => diagnostic.field === "corrections"));
    assert.ok(summary.finalization.diagnostics.some((diagnostic) => diagnostic.field === "reviews"));
    assert.ok(summary.finalization.diagnostics.some((diagnostic) => diagnostic.field === "voiceover"));
    assert.ok(summary.finalization.diagnostics.some((diagnostic) => diagnostic.field === "talkback"));
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("finalizer cannot serialize an OPE-7 product verdict", async () => {
  const manifest = await buildCandidateManifest();
  const result = finalizeDecisionGrade({
    generationComplete: false,
    platformComplete: false,
    humanEvidence: {},
    manifest,
    requestedOutcome: "GO_OPENUI_DIOXUS",
  });
  assert.equal(result.outcome, "INVALID_EVAL");
  assert.notEqual(result.outcome, "GO_OPENUI_DIOXUS");
});

function packetRecord(scenario_id, artifact_sha256) {
  return {
    scenario_id,
    artifact_sha256,
    task_contract: { title: "Review the generated interface", required_behavior: ["submit", "confirm"] },
    screenshots: [`asset-${artifact_sha256.slice(0, 8)}`],
    behavior_recording: `recording-${artifact_sha256.slice(0, 8)}`,
  };
}

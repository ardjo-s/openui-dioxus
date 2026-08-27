import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildScenarios } from "../../openui-typed-json-product-eval/src/scenarios.mjs";
import { buildCandidateManifest, hashManifest } from "../src/manifest.mjs";

const priorEvidence = new URL("../evidence/ope16-canary-9572c9b-final/", import.meta.url);
const promotedOpe18Evidence = new URL("../evidence/ope18-canary-a3f895f-final/", import.meta.url);

test("OPE-19 preserves the promoted OPE-18 evidence byte for byte", async () => {
  assert.equal((await readFile(new URL("candidate-manifest.sha256", promotedOpe18Evidence), "utf8")).trim(), "9623a1457dee64555a2595cd878ddf7a7d13187747206a0ad7c1554b1208190e");
  assert.equal(await fileSha(new URL("SHA256SUMS", promotedOpe18Evidence)), "9c0a378af9203cea0f2769dae84255900397aeed280c5f18f2f4e22900ffa098");
  assert.equal(await fileSha(new URL("INDEPENDENT_REVIEW.json", promotedOpe18Evidence)), "ebcfe05d6e9b67b8f1f61f04cd7f20cb56cf794577d78bcd475b8bf3ce9e0dbd");
});

test("OPE-17 preserves the registered invalid OPE-16 evidence byte for byte", async () => {
  assert.equal((await readFile(new URL("candidate-manifest.sha256", priorEvidence), "utf8")).trim(), "49b71bd46638f1301c59fa345204d12896d0c2175197ec8df4563c2092ad9cf0");
  assert.equal(await fileSha(new URL("SHA256SUMS", priorEvidence)), "144d0a4a197fc6e70798ec79e8321a0048c381657d08af5b381ab9f9e6c22c5c");
  assert.equal(await fileSha(new URL("INDEPENDENT_REVIEW.json", priorEvidence)), "6a02786b744974b94b1ecc52d481b3f8f31bb940ce85bd8ec25a8f6676845079");
});

test("OPE-17 changes only the preregistered rendered-receipt methodology", async () => {
  const prior = JSON.parse(await readFile(new URL("candidate-manifest.json", priorEvidence), "utf8"));
  const current = await buildCandidateManifest();
  for (const key of [
    "cohorts",
    "evidence_schema",
    "measurement_policy",
    "product_outcome_forbidden",
    "provider",
    "purpose",
    "rates",
    "review_plan",
    "scoring_thresholds",
    "source_pins",
    "stage_scope",
    "trust_controls",
  ]) assert.deepEqual(current[key], prior[key], key);
  for (const key of [
    "allowed_outcomes",
    "maximum_provider_calls",
    "maximum_repairs_per_route",
    "maximum_wall_time_ms",
    "promotion",
    "repair_policy",
    "schedule",
  ]) assert.deepEqual(current.canary[key], prior.canary[key], `canary.${key}`);
});

test("candidate manifest preserves the OPE-18 canary and freezes the OPE-19 complete runner", async () => {
  const manifest = await buildCandidateManifest();

  assert.equal(manifest.version, "ope-19-complete-runner-v1");
  assert.equal(manifest.preregistration.ticket, "OPE-19");
  assert.equal(manifest.preregistration.prepared_by, "OPE-18");
  assert.equal(manifest.preregistration.prior_candidate.outcome, "PASS");
  assert.equal(manifest.preregistration.prior_candidate.source_commit, "a3f895f");
  assert.equal(manifest.preregistration.prior_candidate.evidence_commit, "6681f02");
  assert.equal(manifest.preregistration.prior_candidate.manifest_sha256, "9623a1457dee64555a2595cd878ddf7a7d13187747206a0ad7c1554b1208190e");
  assert.equal(manifest.accessibility_contract.version, "ope-15-route-neutral-patterns-v1");
  assert.equal(manifest.accessibility_contract.ownership.nested_component_roots_excluded, true);
  assert.equal(manifest.accessibility_contract.ownership.host_receipts_excluded, true);
  assert.deepEqual(manifest.accessibility_contract.routes, ["openui", "typed-json", "json-render", "direct-rsx"]);
  assert.equal(manifest.accessibility_contract.scenarios.length, 20);
  assert.ok(manifest.accessibility_contract.scenarios.every((entry) => /^[a-f0-9]{64}$/.test(entry.sha256)));
  assert.equal(manifest.cohorts.runtime_uncertain.length, 20);
  assert.equal(manifest.cohorts.compile_known.length, 5);
  assert.equal(manifest.canary.schedule.length, 8);
  assert.equal(manifest.canary.prompt_pack.length, 8);
  assert.ok(manifest.canary.prompt_pack.every((entry) => entry.instructions && entry.user_prompt));
  assert.ok(manifest.canary.prompt_pack.every((entry) => entry.user_prompt.includes("BYTE-IDENTICAL OBSERVABLE ACCESSIBILITY CONTRACT")));
  assert.ok(manifest.canary.prompt_pack.every((entry) => entry.user_prompt.includes("HOST RECEIPT OWNERSHIP")));
  assert.ok(manifest.canary.prompt_pack.every((entry) => /^[a-f0-9]{64}$/.test(entry.instructions_sha256)));
  const compileFilter = manifest.canary.prompt_pack.filter((entry) => entry.scenario_id === "compile-03-filter-action-v1");
  const compileStatus = manifest.canary.prompt_pack.filter((entry) => entry.scenario_id === "compile-04-status-dialog-v1");
  assert.equal(new Set(compileFilter.map((entry) => entry.user_prompt_sha256)).size, 1);
  assert.equal(new Set(compileStatus.map((entry) => entry.user_prompt_sha256)).size, 1);
  assert.equal(manifest.canary.repair_policy.maximum_repairs_per_route, 1);
  assert.equal(manifest.canary.maximum_provider_calls, 16);
  assert.equal(manifest.canary.maximum_repairs_per_route, 1);
  assert.equal(manifest.complete_run.schedule.length, 80);
  assert.equal(manifest.complete_run.prompt_pack.length, 80);
  assert.equal(manifest.complete_run.maximum_provider_calls, 160);
  assert.equal(manifest.complete_run.maximum_repairs_per_route, 1);
  assert.equal(manifest.complete_run.maximum_wall_time_ms, 4 * 60 * 60 * 1000);
  assert.deepEqual(manifest.complete_run.allowed_outcomes, ["READY_FOR_REVIEW", "INVALID_EVAL"]);
  assert.equal(manifest.complete_run.product_outcome_forbidden, true);
  assert.equal(manifest.complete_run.provider_isolation.external_calls_during_preflight, 0);
  assert.equal(manifest.complete_run.evidence_contract.version, "ope-19-human-evidence-v1");
  assert.equal(manifest.complete_run.evidence_contract.required_classes.length, 11);
  const correctionAssignments = Object.values(manifest.complete_run.evidence_contract.correction_cell_assignment).flat();
  assert.equal(correctionAssignments.length, 80);
  assert.deepEqual(new Set(correctionAssignments), new Set(manifest.complete_run.schedule.map((cell) => cell.prompt_id)));
  assert.match(manifest.complete_run.review_packet_contract.seed_sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.complete_run.finalization_contract.provider_rerun_forbidden, true);
  assert.equal(manifest.complete_run.finalization_contract.generation_archive_mutation_forbidden, true);
  assert.equal(manifest.complete_run.finalization_contract.human_asset_index_file, "human-assets.json");
  assert.equal(manifest.complete_run.platform_scope.all_accepted_dioxus_surfaces_on_web_and_desktop, true);
  assert.deepEqual(manifest.complete_run.platform_scope.human_collected, ["ios", "android", "voiceover-ios", "talkback-android"]);
  assert.equal(manifest.complete_run.harness_canary.schedule.length, 8);
  assert.equal(manifest.complete_run.harness_canary.maximum_provider_calls, 16);
  assert.equal(manifest.complete_run.harness_canary.maximum_wall_time_ms, 30 * 60 * 1000);
  assert.deepEqual(manifest.complete_run.harness_canary.allowed_outcomes, ["PASS", "CANARY_INVALID"]);
  const completePairs = new Set(manifest.complete_run.schedule.map((entry) => `${entry.cohort}:${entry.scenario_id}:${entry.route}:${entry.prompt_id}`));
  assert.ok(manifest.complete_run.harness_canary.schedule.every((entry) => completePairs.has(`${entry.cohort}:${entry.scenario_id}:${entry.route}:${entry.prompt_id}`)));
  assert.match(manifest.input_hashes.ope19_preregistration.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(
    [...new Set(manifest.canary.schedule.map((entry) => entry.route))].sort(),
    ["direct-rsx", "json-render", "openui", "typed-json"],
  );
  assert.equal(manifest.provider.model, "gpt-5.6-luna");
  assert.equal(manifest.provider.reasoning_effort, "low");
  assert.deepEqual(manifest.provider.generated_output_execution, {
    "direct-rsx": "source-allowlisted; SSR compiled and executed in a deny-network sandbox; Web rendered with external requests blocked",
    "json-render": "validated-data-rendered-by-official-react-runtime",
    openui: "validated-data-rendered-by-dioxus-runtime",
    "typed-json": "validated-data-rendered-by-dioxus-runtime",
  });
  assert.equal(manifest.product_outcome_forbidden, true);
  assert.deepEqual(manifest.review_plan.blind_reviewer_slots.map((slot) => slot.specialty), [
    "product-design",
    "frontend-maintenance",
    "accessibility",
  ]);
  assert.equal(manifest.rates.normalized_labor_usd_per_hour, 100);
  assert.equal(manifest.rates.provider_subscription_allocation_usd, null);
  assert.equal(manifest.source_pins.json_render.package_version, "0.19.0");
  assert.equal(manifest.source_pins.json_render.upstream_reference_commit, "0bbe6ed6394b23b5aee25320d03c9b7ac717e5b7");
  assert.equal(manifest.source_pins.json_render.package_to_upstream_commit_verified, false);
  assert.ok(manifest.source_pins.json_render.authoritative_identities.every((identity) => identity.integrity.startsWith("sha512-")));
  assert.ok(manifest.source_pins.dioxus.authoritative_identities.every((identity) => /^[a-f0-9]{64}$/.test(identity.checksum)));
  assert.ok(Object.values(manifest.input_hashes.installed_registry_packages).every((entry) => /^[a-f0-9]{64}$/.test(entry.sha256)));
  assert.ok(manifest.input_hashes.implementation_tree.file_count >= 20);
  assert.ok(manifest.input_hashes.implementation_tree.nonblank_lines >= 500);
  assert.match(manifest.input_hashes.implementation_tree.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(manifest.input_hashes.platform_evidence).sort(), [
    "dioxus_desktop",
    "dioxus_web",
    "react_web",
  ]);
  assert.ok(Object.values(manifest.input_hashes.platform_evidence).every((entry) => /^[a-f0-9]{64}$/.test(entry.sha256)));
  assert.match(hashManifest(manifest), /^[a-f0-9]{64}$/);
});

async function fileSha(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

test("pairwise applicability excludes route-specific requirements", async () => {
  const manifest = await buildCandidateManifest();
  const rows = manifest.requirement_applicability;
  const scenarios = await buildScenarios();
  const scenarioRows = rows.filter((row) => row.scenario_id);
  const expected = scenarios.flatMap((scenario) => {
    const paths = Object.keys(scenario.shared_contract.acceptance).map((key) => `acceptance.${key}`);
    const cohorts = scenario.variant === 1 ? ["runtime-uncertain", "compile-known"] : ["runtime-uncertain"];
    return cohorts.flatMap((cohort) => paths.map((requirementPath) => `${cohort}:${scenario.id}:${requirementPath}`));
  }).sort();

  assert.ok(rows.length >= 8);
  assert.deepEqual(scenarioRows.map((row) => row.id).sort(), expected);
  assert.equal(new Set(scenarioRows.map((row) => row.id)).size, expected.length);
  assert.ok(rows.some((row) => row.classification === "dioxus-specific"));
  assert.ok(rows.some((row) => row.classification === "react-supported"));
  const accessibilityRows = rows.filter((row) => row.classification === "accessibility-shared");
  assert.deepEqual(accessibilityRows.map((row) => row.id).sort(), [
    "accessible-component-pattern",
    "accessible-name",
    "allowed-aria",
    "focus-visible",
    "host-receipt-announcement",
    "host-receipt-ownership",
    "keyboard-operation",
    "surface-feedback-applicability",
  ]);
  assert.ok(accessibilityRows.every((row) => Object.values(row.routes).every(Boolean)));
  for (const row of rows) {
    for (const pair of row.pairwise) {
      assert.equal(pair.included, pair.routes.every((route) => row.routes[route] === true));
    }
  }
});

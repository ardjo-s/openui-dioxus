import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildScenarios } from "../../openui-typed-json-product-eval/src/scenarios.mjs";
import { buildCandidateManifest, hashManifest } from "../src/manifest.mjs";

const priorEvidence = new URL("../evidence/candidate-canary-edafbb1-final/", import.meta.url);

test("OPE-13 preserves the registered invalid OPE-11 evidence byte for byte", async () => {
  assert.equal((await readFile(new URL("candidate-manifest.sha256", priorEvidence), "utf8")).trim(), "eac280627d3042ef777d01142408661659aede6c16ca50cb8bd28120a9c3dd2c");
  assert.equal(await fileSha(new URL("SHA256SUMS", priorEvidence)), "cab4a27ee5c199f4462c47a29a2ed726f3b9c16247defc7d6e6452bb63d9e553");
  assert.equal(await fileSha(new URL("INDEPENDENT_REVIEW.json", priorEvidence)), "33d1da72f69bf8e9cc8c41fc89e78170a8265a1a1f36ee09c7204f2ba28911be");
});

test("OPE-13 changes only the preregistered accessibility methodology", async () => {
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

test("candidate manifest freezes the decision-neutral OPE-11 canary", async () => {
  const manifest = await buildCandidateManifest();

  assert.equal(manifest.version, "ope-13-ecosystem-canary-v2");
  assert.equal(manifest.preregistration.ticket, "OPE-13");
  assert.equal(manifest.preregistration.prior_candidate.outcome, "CANARY_INVALID");
  assert.equal(manifest.preregistration.prior_candidate.source_commit, "edafbb1");
  assert.equal(manifest.accessibility_contract.version, "ope-13-observable-accessibility-v1");
  assert.deepEqual(manifest.accessibility_contract.routes, ["openui", "typed-json", "json-render", "direct-rsx"]);
  assert.equal(manifest.accessibility_contract.scenarios.length, 20);
  assert.ok(manifest.accessibility_contract.scenarios.every((entry) => /^[a-f0-9]{64}$/.test(entry.sha256)));
  assert.equal(manifest.cohorts.runtime_uncertain.length, 20);
  assert.equal(manifest.cohorts.compile_known.length, 5);
  assert.equal(manifest.canary.schedule.length, 8);
  assert.equal(manifest.canary.prompt_pack.length, 8);
  assert.ok(manifest.canary.prompt_pack.every((entry) => entry.instructions && entry.user_prompt));
  assert.ok(manifest.canary.prompt_pack.every((entry) => entry.user_prompt.includes("BYTE-IDENTICAL OBSERVABLE ACCESSIBILITY CONTRACT")));
  assert.ok(manifest.canary.prompt_pack.every((entry) => /^[a-f0-9]{64}$/.test(entry.instructions_sha256)));
  const compileFilter = manifest.canary.prompt_pack.filter((entry) => entry.scenario_id === "compile-03-filter-action-v1");
  const compileStatus = manifest.canary.prompt_pack.filter((entry) => entry.scenario_id === "compile-04-status-dialog-v1");
  assert.equal(new Set(compileFilter.map((entry) => entry.user_prompt_sha256)).size, 1);
  assert.equal(new Set(compileStatus.map((entry) => entry.user_prompt_sha256)).size, 1);
  assert.equal(manifest.canary.repair_policy.maximum_repairs_per_route, 1);
  assert.equal(manifest.canary.maximum_provider_calls, 16);
  assert.equal(manifest.canary.maximum_repairs_per_route, 1);
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
    "accessible-name",
    "allowed-aria",
    "feedback-announcement",
    "focus-visible",
    "keyboard-operation",
    "semantic-role",
  ]);
  assert.ok(accessibilityRows.every((row) => Object.values(row.routes).every(Boolean)));
  for (const row of rows) {
    for (const pair of row.pairwise) {
      assert.equal(pair.included, pair.routes.every((route) => row.routes[route] === true));
    }
  }
});

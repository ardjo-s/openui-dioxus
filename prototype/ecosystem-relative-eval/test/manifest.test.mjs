import assert from "node:assert/strict";
import test from "node:test";

import { buildScenarios } from "../../openui-typed-json-product-eval/src/scenarios.mjs";
import { buildCandidateManifest, hashManifest } from "../src/manifest.mjs";

test("candidate manifest freezes the decision-neutral OPE-11 canary", async () => {
  const manifest = await buildCandidateManifest();

  assert.equal(manifest.version, "ope-11-ecosystem-canary-v1");
  assert.equal(manifest.cohorts.runtime_uncertain.length, 20);
  assert.equal(manifest.cohorts.compile_known.length, 5);
  assert.equal(manifest.canary.schedule.length, 8);
  assert.equal(manifest.canary.prompt_pack.length, 8);
  assert.ok(manifest.canary.prompt_pack.every((entry) => entry.instructions && entry.user_prompt));
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
  for (const row of rows) {
    for (const pair of row.pairwise) {
      assert.equal(pair.included, pair.routes.every((route) => row.routes[route] === true));
    }
  }
});

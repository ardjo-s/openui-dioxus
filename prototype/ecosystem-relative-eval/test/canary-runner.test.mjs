import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { runCanary, runCompleteCanary } from "../src/run-canary.mjs";
import { verifyEvidencePublication, verifyFrozenExecutionRecords } from "../src/evidence-publication.mjs";
import { verifyOpe3Archive } from "../src/ope3.mjs";
import { assertDecisionNeutral, createForbiddenProductScorer, evaluateEcosystemSignals, scanEvidenceDirectory, scanProviderPayload, scanPublicationPayloads } from "../src/security.mjs";

const temporaryRoot = new URL("../.tmp/", import.meta.url);

test("frozen OPE-3 evidence is verified without a provider rerun", async () => {
  const result = await verifyOpe3Archive();

  assert.equal(result.verified, true);
  assert.equal(result.summary.outcome, "VALID_EVAL");
  assert.equal(result.summary.pairs_complete, 20);
  assert.equal(result.provider_calls, 0);
});

test("pre-provider scanner rejects credential-shaped payloads", () => {
  assert.deepEqual(scanProviderPayload("synthetic profile Ada"), []);
  assert.ok(scanProviderPayload("token sk-test-abcdefghijklmnopqrstuvwxyz").length > 0);
});

test("publication scanner covers final values and relative filenames", async () => {
  const output = await mkdtemp(path.join(temporaryRoot.pathname, "publication-scan-"));
  try {
    await writeFile(path.join(output, "ghp_abcdefghijklmnopqrstuvwxyz.txt"), "safe");
    assert.ok((await scanEvidenceDirectory(output)).some((finding) => finding.location === "filename"));
    assert.ok(scanPublicationPayloads({ "summary.json": { note: "sk-test-abcdefghijklmnopqrstuvwxyz" } }).some((finding) => finding.path === "summary.json"));
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("deterministic canary records every rejected attempt and remains decision-neutral", async () => {
  const output = await mkdtemp(path.join(temporaryRoot.pathname, "runner-"));
  try {
    const summary = await runCanary({ provider: "fake", outputDirectory: output, platformProof: "reference" });
    const records = (await readFile(path.join(output, "records.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);
    const manifest = JSON.parse(await readFile(path.join(output, "candidate-manifest.json"), "utf8"));

    assert.equal(summary.outcome, "PASS");
    assert.equal(summary.certification_status, "candidate-awaiting-independent-review");
    assert.equal(summary.certified_outcome, null);
    assert.equal(summary.manifest_promoted, false);
    assert.equal(summary.execution_kind, "deterministic-preflight");
    assert.equal(summary.route_cells, 8);
    assert.equal(summary.route_aggregates_comparable, false);
    assert.match(summary.route_aggregate_scope, /operational diagnostics/i);
    assert.equal(summary.calls, 12);
    assert.equal(records.length, 12);
    assert.equal(records.filter((record) => record.attempt === 1 && !record.accepted).length, 4);
    assert.equal(records.filter((record) => record.attempt === 2 && record.accepted).length, 4);
    assert.ok(records.every((record) => record.tokens.raw_prompt_tokens > 0 && record.tokens.raw_output_tokens > 0));
    assert.equal(summary.ope3_import.verified, true);
    assert.equal(summary.platform_evidence.verified, true);
    assert.equal(summary.platform_evidence.source, "frozen-reference-preflight");
    assert.equal(summary.platform_proof_mode, "reference");
    assert.match(summary.trust_controls.generated_output_execution["direct-rsx"], /allowlisted source/);
    assert.equal(summary.trust_controls.publication_credential_scan_findings, 0);
    assert.equal(summary.cost.incremental_api_cost_usd, null);
    assert.match(summary.cost.billing_basis, /ChatGPT plan/);
    assert.ok(summary.implementation_footprint.total.nonblank_lines >= 500);
    assert.equal(summary.final_product_scorer_accessed, false);
    assert.equal(summary.final_product_scorer_access_count, 0);
    assert.equal((await verifyFrozenExecutionRecords({
      directory: output,
      records,
      contract: manifest.canary,
      cohorts: manifest.cohorts,
      contractVersion: manifest.observable_contract?.version ?? null,
    })).verified, true);
    const substituted = structuredClone(records);
    substituted[0].prompt_id = substituted.find((record) => record.prompt_id !== substituted[0].prompt_id).prompt_id;
    await assert.rejects(
      () => verifyFrozenExecutionRecords({ directory: output, records: substituted, contract: manifest.canary, cohorts: manifest.cohorts }),
      /record schedule differs/u,
    );
    const extraRepair = structuredClone(records);
    extraRepair.find((record) => record.attempt === 2).attempt = 3;
    await assert.rejects(
      () => verifyFrozenExecutionRecords({ directory: output, records: extraRepair, contract: manifest.canary, cohorts: manifest.cohorts }),
      /attempt sequence differs/u,
    );
    const reboundPrompt = structuredClone(records);
    reboundPrompt[0].prompt_hashes.user_prompt_sha256 = "0".repeat(64);
    await assert.rejects(
      () => verifyFrozenExecutionRecords({ directory: output, records: reboundPrompt, contract: manifest.canary, cohorts: manifest.cohorts }),
      /prompt hash differs/u,
    );
    const reboundArtifact = structuredClone(records);
    reboundArtifact[0].artifact_hashes.raw_sha256 = "0".repeat(64);
    await assert.rejects(
      () => verifyFrozenExecutionRecords({ directory: output, records: reboundArtifact, contract: manifest.canary, cohorts: manifest.cohorts }),
      /artifact hash differs/u,
    );
    const reboundScenario = structuredClone(records);
    reboundScenario[0].source_scenario_id = "another-scenario";
    await assert.rejects(
      () => verifyFrozenExecutionRecords({ directory: output, records: reboundScenario, contract: manifest.canary, cohorts: manifest.cohorts }),
      /source scenario binding differs/u,
    );
    for (const field of ["native_sha256", "canonical_sha256", "platform_artifact_sha256"]) {
      const rebound = structuredClone(records);
      const record = rebound.find((entry) => entry.artifact_hashes[field] !== null);
      record.artifact_hashes[field] = "0".repeat(64);
      await assert.rejects(
        () => verifyFrozenExecutionRecords({ directory: output, records: rebound, contract: manifest.canary, cohorts: manifest.cohorts }),
        /artifact hash differs/u,
      );
    }
    const missingDerivedField = structuredClone(records);
    delete missingDerivedField.find((record) => record.accepted).platform_artifact;
    await assert.rejects(
      () => verifyFrozenExecutionRecords({ directory: output, records: missingDerivedField, contract: manifest.canary, cohorts: manifest.cohorts }),
      /artifact field is missing/u,
    );
    assertDecisionNeutral(summary);
    assert.match(await readFile(path.join(output, "SHA256SUMS"), "utf8"), /records\.jsonl/);
    assert.deepEqual((await verifyEvidencePublication(output)).verified, true);
    const publicationPath = path.join(output, "PUBLICATION.json");
    const publication = JSON.parse(await readFile(publicationPath, "utf8"));
    await writeFile(publicationPath, `${JSON.stringify({ ...publication, manifest_hash: "0".repeat(64) }, null, 2)}\n`);
    await assert.rejects(() => verifyEvidencePublication(output), /manifest hash differs/);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("exported runner blocks direct real-provider execution before any provider attempt", { timeout: 60_000 }, async () => {
  await mkdir(temporaryRoot, { recursive: true });
  const output = await mkdtemp(path.join(temporaryRoot.pathname, "provider-storage-stop-"));
  const priorMinimum = process.env.EVAL_MINIMUM_FREE_BYTES;
  process.env.EVAL_MINIMUM_FREE_BYTES = String(8 * 1024 ** 4);
  try {
    await assert.rejects(
      () => runCompleteCanary({ provider: "codex", outputDirectory: output, platformProof: "generated" }),
      /real provider execution is available only through the reviewed CLI entrypoint/u,
    );
    assert.deepEqual(await readdir(output), []);
  } finally {
    if (priorMinimum === undefined) delete process.env.EVAL_MINIMUM_FREE_BYTES;
    else process.env.EVAL_MINIMUM_FREE_BYTES = priorMinimum;
    await rm(output, { recursive: true, force: true });
  }
});

test("canary serialization vetoes final product outcomes", () => {
  assert.throws(
    () => assertDecisionNeutral({ outcome: "GO_OPENUI_DIOXUS" }),
    /decision-stage value/,
  );
});

test("canary stage denies scorer access and exercises every ecosystem signal fixture", () => {
  const scorer = createForbiddenProductScorer();
  assert.equal(scorer.accessCount(), 0);
  assert.throws(() => scorer.score({}), /forbidden during OPE-11/);
  assert.equal(scorer.accessCount(), 1);

  const fixtures = [
    [{ external_route_dominates: true }, "external-route-dominates"],
    [{ runtime_passes_without_openui_advantage: true }, "no-openui-material-advantage"],
    [{ second_catalog_hard_gate_failed: true }, "second-catalog-hard-gate-failed"],
    [{ direct_rsx_wins_compile_known_without_runtime_requirement: true }, "exclude-compile-known-scope"],
    [{ direct_rsx_reproduces_platform_advantage: true }, "credit-platform-to-dioxus-only"],
  ];
  for (const [facts, expected] of fixtures) {
    assert.deepEqual(evaluateEcosystemSignals(facts), [expected]);
    assertDecisionNeutral(evaluateEcosystemSignals(facts));
  }
});

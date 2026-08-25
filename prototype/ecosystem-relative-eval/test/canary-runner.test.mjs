import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { runCanary } from "../src/run-canary.mjs";
import { verifyEvidencePublication } from "../src/evidence-publication.mjs";
import { verifyOpe3Archive } from "../src/ope3.mjs";
import { assertDecisionNeutral, scanProviderPayload } from "../src/security.mjs";

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

test("deterministic canary records every rejected attempt and remains decision-neutral", async () => {
  const output = await mkdtemp(path.join(temporaryRoot.pathname, "runner-"));
  try {
    const summary = await runCanary({ provider: "fake", outputDirectory: output, platformProof: "reference" });
    const records = (await readFile(path.join(output, "records.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);

    assert.equal(summary.outcome, "PASS");
    assert.equal(summary.manifest_promoted, false);
    assert.equal(summary.execution_kind, "deterministic-preflight");
    assert.equal(summary.route_cells, 8);
    assert.equal(summary.calls, 12);
    assert.equal(records.length, 12);
    assert.equal(records.filter((record) => record.attempt === 1 && !record.accepted).length, 4);
    assert.equal(records.filter((record) => record.attempt === 2 && record.accepted).length, 4);
    assert.ok(records.every((record) => record.tokens.raw_prompt_tokens > 0 && record.tokens.raw_output_tokens > 0));
    assert.equal(summary.ope3_import.verified, true);
    assert.equal(summary.platform_evidence.verified, true);
    assert.equal(summary.platform_evidence.source, "frozen-reference-preflight");
    assert.equal(summary.platform_proof_mode, "reference");
    assert.equal(summary.trust_controls.generated_output_execution["direct-rsx"], "sandboxed");
    assert.equal(summary.trust_controls.publication_credential_scan_findings, 0);
    assert.equal(summary.cost.incremental_api_cost_usd, null);
    assert.match(summary.cost.billing_basis, /ChatGPT plan/);
    assert.ok(summary.implementation_footprint.total.nonblank_lines >= 500);
    assert.equal(summary.final_product_scorer_accessed, false);
    assertDecisionNeutral(summary);
    assert.match(await readFile(path.join(output, "SHA256SUMS"), "utf8"), /records\.jsonl/);
    assert.deepEqual((await verifyEvidencePublication(output)).verified, true);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("canary serialization vetoes final product outcomes", () => {
  assert.throws(
    () => assertDecisionNeutral({ outcome: "GO_OPENUI_DIOXUS" }),
    /decision-stage value/,
  );
});

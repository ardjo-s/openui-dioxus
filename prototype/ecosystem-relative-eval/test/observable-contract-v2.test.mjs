import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { buildScenarios } from "../../openui-typed-json-product-eval/src/scenarios.mjs";
import { encodeExpectedJsonRender } from "../src/json-render-route.mjs";
import { buildCandidateManifest, sha } from "../src/manifest.mjs";
import { buildEvaluationScenarios } from "../src/observable-contract-v2-scenarios.mjs";
import { repairPrompt } from "../src/provider.mjs";
import { routeUserPrompt, validateRoute } from "../src/routes.mjs";
import { runCanary, runCompleteEvaluation } from "../src/run-canary.mjs";

const contractVersion = "observable-contract-v2";
const temporaryRoot = new URL("../.tmp/", import.meta.url);

test("v1 replay keeps all eleven archived final rejections immutable", () => {
  const result = spawnSync(process.execPath, ["scripts/replay-final-invalid.mjs"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });
  const replay = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(replay.archived_final_failures, 11);
  assert.equal(replay.reproduced_failures, 11);
  assert.ok(replay.failures.every((failure) => failure.reproduced));
});

test("v2 reports exact component counts and unexpected node ids", async () => {
  const [scenario] = await buildEvaluationScenarios({ contractVersion });
  const artifact = structuredClone(scenario.expected);
  const root = artifact.nodes.find((node) => node.id === artifact.root);
  artifact.nodes.push({
    kind: "Toast",
    id: "invented-feedback",
    tone: "info",
    title: "Invented",
    message: "Not in the requested Surface",
  });
  root.children.push("invented-feedback");

  const result = await validateRoute("typed-json", JSON.stringify(artifact), scenario, {
    cohort: "runtime-uncertain",
    contractVersion,
  });
  const diagnostic = result.diagnostics.find((entry) => entry.code === "component-multiset");

  assert.equal(result.ok, false);
  assert.deepEqual(diagnostic.unexpected_node_ids, ["invented-feedback"]);
  assert.equal(diagnostic.expected_counts.Toast ?? 0, 0);
  assert.equal(diagnostic.actual_counts.Toast, 1);
});

test("v2 resolves json-render read-only display state but rejects behavioral or unused auxiliary state", async () => {
  const scenarios = await buildEvaluationScenarios({ contractVersion });
  const scenario = scenarios.find((entry) => entry.family === "status-dialog");
  const acceptedSource = jsonRenderWithAuxiliaryProgress(scenario);
  const accepted = await validateRoute("json-render", acceptedSource, scenario, {
    cohort: "runtime-uncertain",
    contractVersion,
  });

  assert.equal(accepted.ok, true, JSON.stringify(accepted.diagnostics));
  assert.deepEqual(accepted.observable.state, scenario.expected.state);
  const progress = accepted.observable.nodes.find((node) => node.kind === "Progress");
  const expectedProgress = scenario.expected.nodes.find((node) => node.kind === "Progress");
  assert.equal(progress.props.label, expectedProgress.label);
  assert.equal(progress.props.value, expectedProgress.value);
  assert.equal(progress.props.max, expectedProgress.max);

  const behavioral = mutateJsonRender(acceptedSource, (spec) => {
    const progressEntry = Object.values(spec.elements).find((element) => element.type === "Progress");
    progressEntry.watch = {
      "/display_progress/value": {
        action: "setState",
        params: { statePath: "/dialog_open", value: false },
      },
    };
  });
  const behavioralResult = await validateRoute("json-render", behavioral, scenario, {
    cohort: "runtime-uncertain",
    contractVersion,
  });
  assert.equal(behavioralResult.ok, false);
  assert.ok(behavioralResult.diagnostics.some((entry) => entry.code === "auxiliary-state-behavior"));
  assert.ok(behavioralResult.diagnostics.some((entry) => entry.code === "watcher-policy"));

  const mutable = mutateJsonRender(acceptedSource, (spec) => {
    const progressEntry = Object.values(spec.elements).find((element) => element.type === "Progress");
    progressEntry.props.value = { $bindState: "/display_progress/value" };
  });
  const mutableResult = await validateRoute("json-render", mutable, scenario, {
    cohort: "runtime-uncertain",
    contractVersion,
  });
  assert.equal(mutableResult.ok, false);
  assert.ok(mutableResult.diagnostics.some((entry) => entry.code === "auxiliary-state-mutable-binding"));

  const foreign = mutateJsonRender(acceptedSource, (spec) => {
    spec.state.display_progress.value = 999_999;
  });
  const foreignResult = await validateRoute("json-render", foreign, scenario, {
    cohort: "runtime-uncertain",
    contractVersion,
  });
  assert.equal(foreignResult.ok, false);
  assert.ok(foreignResult.diagnostics.some((entry) => entry.code === "auxiliary-state-source"));

  const unused = appendPatch(acceptedSource, {
    op: "add",
    path: "/state/unused_display_value",
    value: expectedProgress.label,
  });
  const unusedResult = await validateRoute("json-render", unused, scenario, {
    cohort: "runtime-uncertain",
    contractVersion,
  });
  assert.equal(unusedResult.ok, false);
  assert.ok(unusedResult.diagnostics.some((entry) => entry.code === "auxiliary-state-unreferenced"));

  const empty = appendPatch(acceptedSource, { op: "add", path: "/state/empty_display_data", value: {} });
  const emptyResult = await validateRoute("json-render", empty, scenario, {
    cohort: "runtime-uncertain",
    contractVersion,
  });
  assert.equal(emptyResult.ok, false);
  assert.ok(emptyResult.diagnostics.some((entry) => entry.code === "auxiliary-state-unreferenced"));
});

test("v2 route-neutral checklist and structured repair payload are symmetric", async () => {
  const [scenario] = await buildEvaluationScenarios({ contractVersion });
  const diagnostics = [{
    code: "component-multiset",
    expected_counts: { Toolbar: 1 },
    actual_counts: { Toolbar: 2 },
    unexpected_node_ids: ["extra-toolbar"],
  }];
  const routes = ["openui", "typed-json", "json-render"];
  const prompts = routes.map((route) => routeUserPrompt(route, scenario, "runtime-uncertain", { contractVersion }));
  const repairs = prompts.map((prompt) => repairPrompt(prompt, "invalid output", diagnostics, { contractVersion }));

  assert.ok(prompts.every((prompt) => prompt.includes("OBSERVABLE-CONTRACT-V2 FINAL CHECKLIST")));
  assert.deepEqual(repairs, Array.from({ length: routes.length }, () => repairs[0]));
  assert.match(repairs[0], /"contract_version":"observable-contract-v2"/u);
  assert.match(repairs[0], /"unexpected_node_ids":\["extra-toolbar"\]/u);
  assert.ok(repairs[0].lastIndexOf("Return one complete corrected output only.") > repairs[0].lastIndexOf("VALIDATOR DIAGNOSTICS"));
});

test("v2 holdout and manifest are fresh, deterministic, valid, and frozen at eighty cells", async () => {
  const v1 = await buildScenarios();
  const v2 = await buildEvaluationScenarios({ contractVersion });
  const repeat = await buildEvaluationScenarios({ contractVersion });

  assert.deepEqual(v2, repeat);
  assert.equal(v2.length, 20);
  assert.equal(new Set(v2.map((scenario) => scenario.id)).size, 20);
  assert.equal(v2.some((scenario) => v1.some((prior) => prior.id === scenario.id)), false);
  assert.ok(v2.every((scenario) => scenario.shared_contract.acceptance.version === contractVersion));
  assert.ok(v2.every((scenario) => Array.isArray(scenario.shared_contract.acceptance.exact_component_multiset)));
  assert.ok(v2.flatMap((scenario) => scenario.expected.nodes).filter((node) => node.kind === "Progress").every((node) => node.value >= 0 && node.value <= node.max));

  const manifest = await buildCandidateManifest({ contractVersion });
  assert.equal(manifest.version, "ope-23-observable-contract-v2-candidate-v1");
  assert.equal(manifest.observable_contract.version, contractVersion);
  assert.equal(manifest.preregistration.ticket, "OPE-23");
  assert.equal(manifest.evidence_schema.version, "ope-23-record-v2");
  assert.ok(["evidence_stem", "provider_invocation_attempted", "provider_process_started", "provider_thread_started", "provider_completed"]
    .every((field) => manifest.evidence_schema.required_record_fields.includes(field)));
  assert.equal(manifest.complete_run.schedule.length, 80);
  assert.equal(manifest.complete_run.prompt_pack.length, 80);
  assert.equal(manifest.complete_run.deterministic_preflight.expected_route_cells, 80);
  assert.equal(
    manifest.complete_run.review_packet_contract.seed_sha256,
    sha("ope-12-anonymous-review-packets-v1"),
  );
  assert.ok(manifest.complete_run.prompt_pack.every((entry) => entry.user_prompt.includes("OBSERVABLE-CONTRACT-V2 FINAL CHECKLIST")));
  assert.deepEqual(manifest, await buildCandidateManifest({ contractVersion }));
});

test("v2 complete fake-provider preflight executes the frozen eighty-cell matrix", { timeout: 180_000 }, async () => {
  await mkdir(temporaryRoot, { recursive: true });
  const output = await mkdtemp(path.join(temporaryRoot.pathname, "observable-contract-v2-"));
  try {
    const summary = await runCompleteEvaluation({
      provider: "fake",
      outputDirectory: output,
      platformProof: "reference",
      contractVersion,
    });
    const manifest = JSON.parse(await readFile(path.join(output, "candidate-manifest.json"), "utf8"));

    assert.equal(summary.outcome, "INVALID_EVAL");
    assert.equal(summary.observable_contract_version, contractVersion);
    assert.equal(summary.operational_preflight_passed, true);
    assert.equal(summary.route_cells, 80);
    assert.equal(summary.external_provider_calls, 0);
    assert.equal(summary.frozen_manifest.one_shot_claimed, false);
    assert.equal(summary.frozen_manifest.one_shot_consumed, false);
    assert.equal(manifest.observable_contract.version, contractVersion);

    const reviewResult = spawnSync(process.execPath, ["scripts/review-evidence.mjs", output], {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8",
    });
    assert.equal(reviewResult.status, 0, reviewResult.stderr);
    const review = JSON.parse(await readFile(path.join(output, "INDEPENDENT_REVIEW.json"), "utf8"));
    assert.equal(review.passed, true);
    assert.equal(review.outcome, "INVALID_EVAL");
    assert.equal(review.recomputed.retained_gates.ope3_verified, true);
    assert.equal(review.recomputed.retained_gates.second_catalog_verified, true);
    assert.equal(review.recomputed.retained_gates.credential_scan_findings, 0);
    assert.equal(review.recomputed.retained_gates.platform_verified, true);
    assert.equal(review.recomputed.review_packets_verified, true);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("v2 canary consumes an exact frozen manifest and emits only a canary result", { timeout: 120_000 }, async () => {
  await mkdir(temporaryRoot, { recursive: true });
  const manifest = await buildCandidateManifest({ contractVersion });
  const output = await mkdtemp(path.join(temporaryRoot.pathname, "observable-contract-v2-canary-"));
  try {
    const summary = await runCanary({
      provider: "fake",
      outputDirectory: output,
      platformProof: "reference",
      contractVersion,
      frozenManifest: manifest,
    });
    assert.equal(summary.outcome, "CANARY_INVALID");
    assert.equal(summary.certification_status, "non-certifying-deterministic-preflight");
    assert.equal(summary.route_cells, 8);
    assert.equal(summary.calls, 12);
    assert.equal(summary.external_provider_calls, 0);
    assert.equal(summary.observable_contract_version, contractVersion);
    assert.equal(summary.frozen_manifest.one_shot_claimed, false);
    assert.equal(summary.frozen_manifest.one_shot_consumed, false);
    await assert.rejects(
      readFile(path.join(output, "PUBLICATION.json"), "utf8"),
      /ENOENT/u,
    );
  } finally {
    await rm(output, { recursive: true, force: true });
  }

  const changed = structuredClone(manifest);
  changed.canary.maximum_provider_calls += 1;
  const rejectedOutput = await mkdtemp(path.join(temporaryRoot.pathname, "observable-contract-v2-manifest-reject-"));
  try {
    await assert.rejects(
      () => runCanary({
        provider: "fake",
        outputDirectory: rejectedOutput,
        platformProof: "reference",
        contractVersion,
        frozenManifest: changed,
      }),
      /frozen candidate manifest differs/u,
    );
  } finally {
    await rm(rejectedOutput, { recursive: true, force: true });
  }

  const reformattedOutput = await mkdtemp(path.join(temporaryRoot.pathname, "observable-contract-v2-format-reject-"));
  try {
    await assert.rejects(
      () => runCanary({
        provider: "fake",
        outputDirectory: reformattedOutput,
        platformProof: "reference",
        contractVersion,
        frozenManifest: manifest,
        frozenManifestAttestation: {
          verified: true,
          raw_bytes: Buffer.from(JSON.stringify(manifest)),
        },
      }),
      /frozen candidate manifest differs/u,
    );
  } finally {
    await rm(reformattedOutput, { recursive: true, force: true });
  }
});

function jsonRenderWithAuxiliaryProgress(scenario) {
  return mutateJsonRender(encodeExpectedJsonRender(scenario.expected), (spec) => {
    const progress = Object.values(spec.elements).find((element) => element.type === "Progress");
    const display = {
      label: progress.props.label,
      value: progress.props.value,
      max: progress.props.max,
    };
    progress.props.label = { $state: "/display_progress/label" };
    progress.props.value = { $state: "/display_progress/value" };
    progress.props.max = { $state: "/display_progress/max" };
    spec.state.display_progress = display;
  });
}

function mutateJsonRender(source, mutate) {
  const patches = source.split("\n").filter(Boolean).map(JSON.parse);
  const spec = {
    root: patches.find((patch) => patch.path === "/root").value,
    elements: structuredClone(patches.find((patch) => patch.path === "/elements").value),
    state: structuredClone(patches.find((patch) => patch.path === "/state").value),
  };
  mutate(spec);
  return [
    { op: "add", path: "/root", value: spec.root },
    { op: "add", path: "/elements", value: spec.elements },
    { op: "add", path: "/state", value: spec.state },
  ].map(JSON.stringify).join("\n");
}

function appendPatch(source, patch) {
  return `${source}\n${JSON.stringify(patch)}`;
}

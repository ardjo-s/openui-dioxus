#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildScenarios } from "../../openui-typed-json-product-eval/src/scenarios.mjs";
import { validateProtocol } from "../../openui-typed-json-product-eval/src/protocols.mjs";
import { validateJsonRender } from "../src/json-render-route.mjs";
import { routeExtension, runtimeContractCoverage, validateRoute } from "../src/routes.mjs";
import { verifyChecksumArchive } from "../src/archive-integrity.mjs";

const evalRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDirectory = path.join(
  evalRoot,
  "evidence",
  "ope12-decision-grade-a84beb0-generation",
);
const repoRoot = path.resolve(evalRoot, "../..");
const evidenceRelativePath = path.relative(repoRoot, evidenceDirectory);
const archiveIntegrity = await verifyChecksumArchive({
  directory: evidenceDirectory,
  expectedChecksumManifestSha256: "5e04615ca018d822db6cbd54845b5eb5363f7f23f08c8dde2afcef06a15c4c79",
  evidenceCommit: "5454b37",
  repoRoot,
  relativePath: evidenceRelativePath,
});

const records = (await readFile(path.join(evidenceDirectory, "records.jsonl"), "utf8"))
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const scenarios = new Map((await buildScenarios()).map((scenario) => [scenario.id, scenario]));
const rawDirectory = path.join(evidenceDirectory, "raw");
const rawFiles = await readdir(rawDirectory);
const rawArtifacts = new Map();

for (const filename of rawFiles) {
  const source = await readFile(path.join(rawDirectory, filename), "utf8");
  const hash = createHash("sha256").update(source).digest("hex");
  rawArtifacts.set(filename, { filename, source, hash });
}

const finalRecords = [...Map.groupBy(records, (record) => `${record.route}\0${record.scenario_id}`)]
  .map(([, attempts]) => attempts.toSorted((left, right) => left.attempt - right.attempt).at(-1));
const archivedFailures = finalRecords.filter((record) => !record.accepted);
const replay = [];

for (const record of archivedFailures) {
  const scenario = scenarios.get(record.source_scenario_id);
  assert.ok(scenario, `missing scenario ${record.source_scenario_id}`);
  const suffix = `${record.scenario_id}-${record.route}-attempt-${record.attempt}.${routeExtension(record.route)}`;
  const artifact = [...rawArtifacts.values()].find(({ filename }) => filename.endsWith(suffix));
  assert.ok(artifact, `missing raw artifact ending in ${suffix}`);
  assert.equal(artifact.hash, record.artifact_hashes.raw_sha256, `raw hash mismatch for ${suffix}`);
  const prior = records.find((candidate) =>
    candidate.route === record.route
    && candidate.scenario_id === record.scenario_id
    && candidate.attempt === record.attempt - 1
  );
  const result = await validateRoute(record.route, artifact.source, scenario, {
    cohort: record.cohort,
  });
  const parsed = record.route === "json-render"
    ? validateJsonRender(artifact.source, scenario.expected, { exact: false })
    : validateProtocol(record.route, artifact.source, scenario.expected.state);
  assert.equal(parsed.ok, true, `final failure for ${suffix} did not reach semantic coverage`);
  const observable = record.route === "json-render" ? parsed.observable : parsed.wire;
  const requiredKinds = [...scenario.shared_contract.acceptance.required_component_kinds].sort();
  const actualKinds = observable.nodes.map((node) => node.kind).sort();
  const minimalProjection = findMinimalCoverageProjection(observable, scenario.shared_contract);
  const semanticProjection = findMinimalCoverageProjection(observable, scenario.shared_contract, {
    resolveStateReferences: true,
  });
  replay.push({
    route: record.route,
    scenario_id: record.scenario_id,
    attempt: record.attempt,
    raw_file: artifact.filename,
    repair_changed_output: prior ? prior.artifact_hashes.raw_sha256 !== record.artifact_hashes.raw_sha256 : null,
    component_kind_delta: multisetDelta(actualKinds, requiredKinds),
    state_delta: objectDelta(observable.state ?? {}, scenario.shared_contract.acceptance.required_state),
    minimal_coverage_projection: minimalProjection,
    exploratory_semantic_projection: semanticProjection,
    archived_diagnostics: record.diagnostics,
    replay_diagnostics: result.diagnostics,
    reproduced: !result.ok && JSON.stringify(result.diagnostics) === JSON.stringify(record.diagnostics),
  });
}

const summary = {
  archive_integrity: archiveIntegrity,
  archived_final_failures: archivedFailures.length,
  reproduced_failures: replay.filter((entry) => entry.reproduced).length,
  failures: replay,
};

console.log(JSON.stringify(summary, null, 2));

assert.equal(archivedFailures.length, 11, "unexpected archived final-failure count");
assert.equal(summary.reproduced_failures, 11, "not every archived failure reproduced exactly");
process.exitCode = archivedFailures.length === 0 ? 0 : 1;

function multisetDelta(actual, required) {
  const actualCounts = counts(actual);
  const requiredCounts = counts(required);
  return {
    missing: expandCountDelta(requiredCounts, actualCounts),
    unexpected: expandCountDelta(actualCounts, requiredCounts),
  };
}

function counts(values) {
  const result = new Map();
  for (const value of values) result.set(value, (result.get(value) ?? 0) + 1);
  return result;
}

function expandCountDelta(primary, comparison) {
  return [...primary.entries()].flatMap(([value, count]) =>
    Array.from({ length: Math.max(0, count - (comparison.get(value) ?? 0)) }, () => value)
  );
}

function objectDelta(actual, required) {
  const keys = [...new Set([...Object.keys(actual), ...Object.keys(required)])].sort();
  return keys.flatMap((key) => {
    if (JSON.stringify(actual[key]) === JSON.stringify(required[key])) return [];
    return [{ key, required: required[key] ?? null, actual: actual[key] ?? null }];
  });
}

function findMinimalCoverageProjection(observable, contract, { resolveStateReferences = false } = {}) {
  const requiredCounts = counts(contract.acceptance.required_component_kinds);
  const candidatesByKind = [...counts(observable.nodes.map((node) => node.kind)).entries()]
    .map(([kind, count]) => ({
      kind,
      remove: Math.max(0, count - (requiredCounts.get(kind) ?? 0)),
      nodes: observable.nodes.filter((node) => node.kind === kind),
    }))
    .filter(({ remove }) => remove > 0);
  const removalSets = candidatesByKind.reduce(
    (sets, { remove, nodes }) => sets.flatMap((set) =>
      combinations(nodes, remove).map((selection) => new Set([...set, ...selection.map((node) => node.id)]))
    ),
    [new Set()],
  );
  const extraStateKeys = Object.keys(observable.state ?? {})
    .filter((key) => !(key in contract.acceptance.required_state));

  for (const removedIds of removalSets) {
    const projected = structuredClone(observable);
    projected.nodes = projected.nodes.filter((node) => !removedIds.has(node.id));
    if (resolveStateReferences) {
      projected.nodes = projected.nodes.map((node) => "props" in node
        ? { ...node, props: resolveReferences(node.props, projected.state ?? {}) }
        : resolveReferences(node, projected.state ?? {}));
    }
    for (const key of extraStateKeys) delete projected.state[key];
    const coverage = runtimeContractCoverage(projected, contract);
    if (coverage.passed) {
      return {
        passed: true,
        removed_nodes: observable.nodes
          .filter((node) => removedIds.has(node.id))
          .map(({ id, kind }) => ({ id, kind })),
        removed_state_keys: extraStateKeys,
        resolved_state_references: resolveStateReferences,
      };
    }
  }
  return {
    passed: false,
    removed_nodes: [],
    removed_state_keys: extraStateKeys,
    resolved_state_references: resolveStateReferences,
  };
}

function combinations(values, size) {
  if (size === 0) return [[]];
  if (values.length < size) return [];
  return values.flatMap((value, index) =>
    combinations(values.slice(index + 1), size - 1).map((tail) => [value, ...tail])
  );
}

function resolveReferences(value, state) {
  if (Array.isArray(value)) return value.map((entry) => resolveReferences(entry, state));
  if (!value || typeof value !== "object") return value;
  if (Object.keys(value).length === 1 && typeof value.$state === "string") {
    return stateAtPointer(state, value.$state);
  }
  if (Object.keys(value).length === 1 && typeof value.$bindState === "string") {
    return stateAtPointer(state, value.$bindState);
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, resolveReferences(entry, state)]));
}

function stateAtPointer(state, pointer) {
  return pointer.split("/").slice(1).reduce((current, segment) => {
    const key = segment.replaceAll("~1", "/").replaceAll("~0", "~");
    assert.ok(current && typeof current === "object" && key in current, `missing state path ${pointer}`);
    return current[key];
  }, state);
}

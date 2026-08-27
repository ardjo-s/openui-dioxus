#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

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
  : manifest.canary;
const findings = [];
check(summary.outcome === candidate.outcome, "candidate-outcome-mismatch");
check(summary.manifest_hash === candidate.manifest_hash && manifest.hash === candidate.manifest_hash, "candidate-manifest-mismatch");
check(records.length === summary.calls, "record-count-mismatch");
check(contract.schedule.length === summary.route_cells, "route-cell-count-mismatch");
check(records.length <= contract.maximum_provider_calls, "provider-call-ceiling-exceeded");
check(summary.final_product_scorer_access_count === 0, "product-scorer-accessed");
check(summary.route_aggregates_comparable === false, "route-aggregates-mislabelled");
check(summary.platform_evidence?.verified === true, "platform-evidence-invalid");
check(contract.allowed_outcomes.includes(summary.outcome), "invalid-canary-outcome");
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
    platform_verified: summary.platform_evidence?.verified === true,
    product_scorer_access_count: summary.final_product_scorer_access_count,
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

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

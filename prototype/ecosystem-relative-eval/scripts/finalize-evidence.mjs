#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { scanEvidenceDirectory } from "../src/security.mjs";

const directory = path.resolve(process.argv[2] ?? "evidence/candidate-canary");
const candidate = await readJson("CANDIDATE.json");
const review = await readJson("INDEPENDENT_REVIEW.json");
const summary = await readJson("summary.json");
const manifest = await readJson("candidate-manifest.json");
if (manifest.observable_contract?.version === "observable-contract-v2") {
  if (summary.provider !== "codex") {
    throw new Error("observable-contract-v2 publication requires provider=codex");
  }
  if (summary.certification_status !== "candidate-awaiting-independent-review"
    || summary.frozen_manifest?.verified !== true
    || summary.frozen_manifest?.one_shot_claimed !== true
    || summary.frozen_manifest?.one_shot_consumed !== true
    || summary.provider_event_evidence?.verified !== true) {
    throw new Error("observable-contract-v2 publication requires complete reviewed execution attestations");
  }
}
if (!review.passed) throw new Error("independent review did not pass");
if (review.candidate_checksum_manifest_sha256 !== candidate.checksum_manifest_sha256) throw new Error("independent review differs from candidate");
if (review.manifest_hash !== candidate.manifest_hash || summary.manifest_hash !== candidate.manifest_hash || manifest.hash !== candidate.manifest_hash) throw new Error("manifest hash differs before finalization");
if (review.outcome !== candidate.outcome || summary.outcome !== candidate.outcome) throw new Error("outcome differs before finalization");
if ((await scanEvidenceDirectory(directory)).length > 0) throw new Error("final evidence credential scan failed");

const files = (await filesBelow(directory)).filter((relative) => !["SHA256SUMS", "PUBLICATION.json"].includes(relative)).sort();
const lines = await Promise.all(files.map(async (relative) => `${digest(await readFile(path.join(directory, relative)))}  ${relative}`));
const checksumContents = `${lines.join("\n")}\n`;
await writeFile(path.join(directory, "SHA256SUMS"), checksumContents, { mode: 0o600 });
await writeFile(path.join(directory, "PUBLICATION.json"), `${JSON.stringify({
  status: "complete",
  outcome: candidate.outcome,
  manifest_hash: candidate.manifest_hash,
  checksum_manifest_sha256: digest(checksumContents),
  independent_review_sha256: digest(await readFile(path.join(directory, "INDEPENDENT_REVIEW.json"))),
}, null, 2)}\n`, { flag: "wx", mode: 0o600 });

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

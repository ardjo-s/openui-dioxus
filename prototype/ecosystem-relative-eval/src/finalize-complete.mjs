#!/usr/bin/env node
import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { finalizeDecisionGrade } from "./complete-run-contract.mjs";
import { sha, stableJson } from "./hash.mjs";
import { scanEvidenceDirectory, scanProviderPayload } from "./security.mjs";

const generationChecksums = "SHA256SUMS";
const candidateMarker = "CANDIDATE.json";
const humanEvidenceFile = "human-evidence.json";
const humanAssetIndexFile = "human-assets.json";
const humanAssetDirectoryName = "human-assets";
const finalizationFile = "FINALIZATION.json";
const finalChecksums = "FINAL_SHA256SUMS";
const completeMarker = "COMPLETE_EVIDENCE.json";

export async function finalizeCompleteEvidence({ outputDirectory, humanEvidence, humanAssetDirectory }) {
  await assertSafeDirectory(outputDirectory);
  for (const relative of [humanEvidenceFile, humanAssetIndexFile, humanAssetDirectoryName, finalizationFile, finalChecksums, completeMarker]) {
    if (await exists(path.join(outputDirectory, relative))) throw new Error(`complete evidence is already finalized: ${relative}`);
  }
  if (!humanAssetDirectory) throw new Error("human asset directory is required");

  const generation = await verifyGenerationArchive(outputDirectory);
  if (generation.summary.run_contract !== "complete_run") throw new Error("only the full complete-run archive can receive human evidence");
  if (generation.summary.operational_preflight_passed !== true) throw new Error("generation archive did not pass its operational preflight");
  const packets = await readJson(path.join(outputDirectory, "review-packets.json"));
  const reviewAssets = await verifyReviewAssets(outputDirectory, generation.summary, packets);
  const humanAssetPlan = await prepareHumanAssets(humanAssetDirectory, humanEvidence);
  await writeJson(path.join(outputDirectory, humanEvidenceFile), humanEvidence);
  await writeHumanAssets(outputDirectory, humanAssetPlan);
  const humanAssets = await verifyHumanAssets(outputDirectory, humanEvidence);

  const result = finalizeDecisionGrade({
    generationComplete: generation.summary.operational_preflight_passed && reviewAssets.verified && humanAssets.verified,
    platformComplete: generation.summary.platform_evidence?.verified === true,
    humanEvidence,
    manifest: generation.manifest,
    packets,
  });
  if (!reviewAssets.verified) result.diagnostics.push(...reviewAssets.diagnostics);
  if (!humanAssets.verified) result.diagnostics.push(...humanAssets.diagnostics);
  const credentialFindings = await scanEvidenceDirectory(outputDirectory);
  if (credentialFindings.length) {
    result.outcome = "INVALID_EVAL";
    result.diagnostics.push({ field: "human-evidence", code: "credential-scan-failed" });
  }
  const finalization = {
    version: "ope-19-complete-finalization-v1",
    outcome: result.outcome,
    diagnostics: result.diagnostics,
    manifest_hash: generation.summary.manifest_hash,
    generation_checksum_manifest_sha256: sha(generation.checksumBytes),
    human_evidence_sha256: sha(stableJson(humanEvidence)),
    review_packets_sha256: sha(stableJson(packets)),
    review_assets_sha256: reviewAssets.sha256,
    review_assets_verified: reviewAssets.verified,
    human_assets_sha256: humanAssets.sha256,
    human_assets_verified: humanAssets.verified,
    generation_external_provider_calls: generation.summary.external_provider_calls,
    external_provider_calls: 0,
    credential_scan_findings: credentialFindings.length,
    product_outcome_forbidden: true,
  };
  await writeJson(path.join(outputDirectory, finalizationFile), finalization);
  const finalChecksumBytes = await writeFinalChecksums(outputDirectory);
  await writeJson(path.join(outputDirectory, completeMarker), {
    status: "complete",
    outcome: finalization.outcome,
    manifest_hash: finalization.manifest_hash,
    generation_checksum_manifest_sha256: finalization.generation_checksum_manifest_sha256,
    final_checksum_manifest_sha256: sha(finalChecksumBytes),
    finalization_sha256: sha(await readFile(path.join(outputDirectory, finalizationFile))),
  });
  return finalization;
}

export async function verifyCompleteEvidence(outputDirectory) {
  await assertSafeDirectory(outputDirectory);
  const generation = await verifyGenerationArchive(outputDirectory, { allowFinalFiles: true });
  const marker = await readJson(path.join(outputDirectory, completeMarker));
  const checksumBytes = await readFile(path.join(outputDirectory, finalChecksums));
  if (marker.status !== "complete" || sha(checksumBytes) !== marker.final_checksum_manifest_sha256) throw new Error("complete evidence marker differs from final checksums");
  await verifyChecksumInventory(outputDirectory, checksumBytes, new Set([finalChecksums, completeMarker]));
  const finalizationBytes = await readFile(path.join(outputDirectory, finalizationFile));
  const finalization = JSON.parse(finalizationBytes);
  if (sha(finalizationBytes) !== marker.finalization_sha256) throw new Error("finalization differs from complete evidence marker");
  if (finalization.outcome !== marker.outcome || finalization.manifest_hash !== marker.manifest_hash) throw new Error("finalization outcome or manifest differs");
  if (finalization.generation_checksum_manifest_sha256 !== sha(generation.checksumBytes)) throw new Error("finalization differs from generation archive");
  const packets = await readJson(path.join(outputDirectory, "review-packets.json"));
  const reviewAssets = await verifyReviewAssets(outputDirectory, generation.summary, packets);
  const humanEvidence = await readJson(path.join(outputDirectory, humanEvidenceFile));
  const humanAssets = await verifyHumanAssets(outputDirectory, humanEvidence);
  if (finalization.review_assets_verified !== reviewAssets.verified || finalization.review_assets_sha256 !== reviewAssets.sha256) throw new Error("finalization review assets differ");
  if (finalization.human_assets_verified !== humanAssets.verified || finalization.human_assets_sha256 !== humanAssets.sha256) throw new Error("finalization human assets differ");
  if (finalization.outcome === "READY_FOR_REVIEW" && !reviewAssets.verified) throw new Error("ready evidence uses invalid review assets");
  if (finalization.outcome === "READY_FOR_REVIEW" && !humanAssets.verified) throw new Error("ready evidence uses invalid human assets");
  const credentialFindings = await scanEvidenceDirectory(outputDirectory);
  if (credentialFindings.length > 0) throw new Error("complete evidence credential scan failed");
  const recomputed = finalizeDecisionGrade({
    generationComplete: generation.summary.operational_preflight_passed && reviewAssets.verified && humanAssets.verified,
    platformComplete: generation.summary.platform_evidence?.verified === true,
    humanEvidence,
    manifest: generation.manifest,
    packets,
  });
  if (!reviewAssets.verified) recomputed.diagnostics.push(...reviewAssets.diagnostics);
  if (!humanAssets.verified) recomputed.diagnostics.push(...humanAssets.diagnostics);
  if (recomputed.outcome !== finalization.outcome || stableJson(recomputed.diagnostics) !== stableJson(finalization.diagnostics)) throw new Error("complete finalization does not recompute");
  return {
    verified: true,
    outcome: finalization.outcome,
    manifest_hash: finalization.manifest_hash,
    final_checksum_manifest_sha256: marker.final_checksum_manifest_sha256,
  };
}

async function verifyGenerationArchive(outputDirectory, { allowFinalFiles = false } = {}) {
  const checksumBytes = await readFile(path.join(outputDirectory, generationChecksums));
  const ignored = new Set([generationChecksums, candidateMarker]);
  if (allowFinalFiles) for (const relative of [humanEvidenceFile, humanAssetIndexFile, `${humanAssetDirectoryName}/`, finalizationFile, finalChecksums, completeMarker]) ignored.add(relative);
  await verifyChecksumInventory(outputDirectory, checksumBytes, ignored);
  const summary = await readJson(path.join(outputDirectory, "summary.json"));
  const manifest = await readJson(path.join(outputDirectory, "candidate-manifest.json"));
  const candidate = await readJson(path.join(outputDirectory, candidateMarker));
  if (candidate.status !== "awaiting-human-evidence") throw new Error("generation candidate is not awaiting human evidence");
  if (sha(checksumBytes) !== candidate.checksum_manifest_sha256) throw new Error("generation checksums differ from candidate marker");
  if (summary.manifest_hash !== candidate.manifest_hash || manifest.hash !== candidate.manifest_hash) throw new Error("generation manifest differs from candidate marker");
  return { checksumBytes, summary, manifest, candidate };
}

async function verifyReviewAssets(outputDirectory, summary, packets) {
  const diagnostics = [];
  const assets = await readJson(path.join(outputDirectory, "review-assets.json"));
  const assetList = Array.isArray(assets) ? assets : [];
  if (summary.review_packets?.asset_mode !== "generated-content-addressed-evidence") diagnostics.push({ field: "review-assets", code: "placeholder-assets-forbidden" });
  if (assetList.length === 0) diagnostics.push({ field: "review-assets", code: "missing-asset-index" });
  const byId = new Map(assetList.map((asset) => [asset.asset_id, asset]));
  if (byId.size !== assetList.length) diagnostics.push({ field: "review-assets", code: "duplicate-asset-id" });
  const referenced = new Set((Array.isArray(packets) ? packets : []).flatMap((packet) => [...packet.screenshots, packet.behavior_recording]));
  for (const assetId of referenced) if (!byId.has(assetId)) diagnostics.push({ field: "review-assets", code: "unresolved-packet-asset" });
  for (const asset of assetList) {
    const safePath = typeof asset.relative_path === "string" && !path.isAbsolute(asset.relative_path) && !asset.relative_path.split(path.sep).includes("..");
    if (!safePath || !["asset", "recording"].includes(asset.kind) || asset.asset_id !== `${asset.kind}-${asset.sha256}` || !/^[a-f0-9]{64}$/u.test(asset.sha256 ?? "")) {
      diagnostics.push({ field: "review-assets", code: "malformed-asset-index" });
      continue;
    }
    try {
      if (sha(await readFile(path.join(outputDirectory, asset.relative_path))) !== asset.sha256) diagnostics.push({ field: "review-assets", code: "asset-hash-mismatch" });
    } catch {
      diagnostics.push({ field: "review-assets", code: "asset-missing" });
    }
  }
  return { verified: diagnostics.length === 0, diagnostics, sha256: sha(stableJson(assets)) };
}

async function prepareHumanAssets(sourceDirectory, humanEvidence) {
  await assertSafeDirectory(sourceDirectory);
  const expected = humanArtifactHashes(humanEvidence);
  if (expected.size === 0) throw new Error("human evidence references no artifacts");
  const files = await strictFilesBelow(sourceDirectory);
  const assets = [];
  for (const relative of files) {
    const bytes = await readFile(path.join(sourceDirectory, relative));
    if (scanProviderPayload(bytes.toString("utf8")).length) throw new Error(`human asset credential scan failed: ${relative}`);
    const digest = sha(bytes);
    if (assets.some((asset) => asset.sha256 === digest)) throw new Error(`duplicate human asset content: ${relative}`);
    assets.push({ sha256: digest, bytes });
  }
  if (!sameStringSet(assets.map((asset) => asset.sha256), [...expected])) throw new Error("human asset inventory differs from evidence references");
  return assets.sort((left, right) => left.sha256.localeCompare(right.sha256));
}

async function writeHumanAssets(outputDirectory, assets) {
  const directory = path.join(outputDirectory, humanAssetDirectoryName);
  await mkdir(directory, { mode: 0o700 });
  for (const asset of assets) await writeFile(path.join(directory, asset.sha256), asset.bytes, { flag: "wx", mode: 0o600 });
  await writeJson(path.join(outputDirectory, humanAssetIndexFile), assets.map((asset) => ({
    sha256: asset.sha256,
    relative_path: `${humanAssetDirectoryName}/${asset.sha256}`,
  })));
}

async function verifyHumanAssets(outputDirectory, humanEvidence) {
  const diagnostics = [];
  const expected = humanArtifactHashes(humanEvidence);
  let index = [];
  try {
    const value = await readJson(path.join(outputDirectory, humanAssetIndexFile));
    index = Array.isArray(value) ? value : [];
  } catch {
    diagnostics.push({ field: "human-assets", code: "missing-asset-index" });
  }
  if (!sameStringSet(index.map((asset) => asset?.sha256), [...expected])) diagnostics.push({ field: "human-assets", code: "asset-index-roster-mismatch" });
  const files = await strictFilesBelow(path.join(outputDirectory, humanAssetDirectoryName)).catch(() => []);
  if (!sameStringSet(files, [...expected])) diagnostics.push({ field: "human-assets", code: "asset-file-roster-mismatch" });
  for (const asset of index) {
    const valid = /^[a-f0-9]{64}$/u.test(asset?.sha256 ?? "")
      && asset?.relative_path === `${humanAssetDirectoryName}/${asset.sha256}`;
    if (!valid) {
      diagnostics.push({ field: "human-assets", code: "malformed-asset-index" });
      continue;
    }
    try {
      const bytes = await readFile(path.join(outputDirectory, asset.relative_path));
      if (sha(bytes) !== asset.sha256) diagnostics.push({ field: "human-assets", code: "asset-hash-mismatch" });
      if (scanProviderPayload(bytes.toString("utf8")).length) diagnostics.push({ field: "human-assets", code: "credential-scan-failed" });
    } catch {
      diagnostics.push({ field: "human-assets", code: "asset-missing" });
    }
  }
  return { verified: diagnostics.length === 0, diagnostics, sha256: sha(stableJson(index)) };
}

function humanArtifactHashes(value, hashes = new Set()) {
  if (Array.isArray(value)) for (const child of value) humanArtifactHashes(child, hashes);
  else if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) {
    if (key === "artifact_sha256" && /^[a-f0-9]{64}$/u.test(child ?? "")) hashes.add(child);
    else humanArtifactHashes(child, hashes);
  }
  return hashes;
}

async function strictFilesBelow(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? path.join(prefix, entry.name) : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`human asset symlink is forbidden: ${relative}`);
    if (entry.isDirectory()) files.push(...await strictFilesBelow(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`non-regular human asset path: ${relative}`);
  }
  return files.sort();
}

function sameStringSet(actual, expected) {
  return actual.length === expected.length && new Set(actual).size === actual.length && actual.every((value) => expected.includes(value));
}

async function verifyChecksumInventory(directory, bytes, ignored) {
  const entries = bytes.toString("utf8").trim().split("\n").filter(Boolean).map(parseChecksum);
  const listed = new Set(entries.map((entry) => entry.relative));
  if (listed.size !== entries.length) throw new Error("duplicate checksum entry");
  const actual = (await filesBelow(directory)).filter((relative) => !isIgnored(relative, ignored)).sort();
  if (JSON.stringify([...listed].sort()) !== JSON.stringify(actual)) throw new Error("checksum inventory differs from evidence directory");
  for (const entry of entries) {
    if (sha(await readFile(path.join(directory, entry.relative))) !== entry.expected) throw new Error(`checksum differs: ${entry.relative}`);
  }
}

function isIgnored(relative, ignored) {
  return [...ignored].some((candidate) => candidate.endsWith("/") ? relative.startsWith(candidate) : relative === candidate);
}

async function writeFinalChecksums(directory) {
  const files = (await filesBelow(directory)).filter((relative) => ![finalChecksums, completeMarker].includes(relative)).sort();
  const contents = `${(await Promise.all(files.map(async (relative) => `${sha(await readFile(path.join(directory, relative)))}  ${relative}`))).join("\n")}\n`;
  await writeFile(path.join(directory, finalChecksums), contents, { flag: "wx", mode: 0o600 });
  return Buffer.from(contents);
}

function parseChecksum(line) {
  const match = line.match(/^([a-f0-9]{64})  (.+)$/u);
  if (!match || path.isAbsolute(match[2]) || match[2].split(path.sep).includes("..")) throw new Error(`invalid checksum entry: ${line}`);
  return { expected: match[1], relative: match[2] };
}

async function assertSafeDirectory(directory) {
  const metadata = await lstat(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error(`unsafe evidence directory: ${directory}`);
}

async function filesBelow(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? path.join(prefix, entry.name) : entry.name;
    if (entry.isDirectory()) files.push(...await filesBelow(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`non-regular evidence path: ${relative}`);
  }
  return files;
}

async function readJson(destination) {
  return JSON.parse(await readFile(destination, "utf8"));
}

async function writeJson(destination, value) {
  await writeFile(destination, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
}

async function exists(destination) {
  try {
    await lstat(destination);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function parseCli(argv) {
  const options = { outputDirectory: null, humanEvidencePath: null, humanAssetDirectory: null };
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!value) throw new Error(`missing value for ${name}`);
    if (name === "--evidence-dir") options.outputDirectory = path.resolve(value);
    else if (name === "--human-evidence") options.humanEvidencePath = path.resolve(value);
    else if (name === "--human-assets") options.humanAssetDirectory = path.resolve(value);
    else throw new Error(`unknown argument: ${name}`);
  }
  if (!options.outputDirectory || !options.humanEvidencePath || !options.humanAssetDirectory) throw new Error("--evidence-dir, --human-evidence, and --human-assets are required");
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseCli(process.argv.slice(2));
  const humanEvidence = JSON.parse(await readFile(options.humanEvidencePath, "utf8"));
  const result = await finalizeCompleteEvidence({ outputDirectory: options.outputDirectory, humanEvidence, humanAssetDirectory: options.humanAssetDirectory });
  process.stdout.write(`${result.outcome}\n`);
}

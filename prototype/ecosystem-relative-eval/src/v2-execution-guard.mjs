import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readlinkSync, realpathSync, statSync } from "node:fs";
import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

import { stableJson } from "./hash.mjs";
import { OBSERVABLE_CONTRACT_V2 } from "./observable-contract-v2-scenarios.mjs";

const sha256Pattern = /^[a-f0-9]{64}$/u;
const commitPattern = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const maximumManifestBytes = 4 * 1024 * 1024;
const approvedDependencyLinks = [
  "prototype/dioxus-components-catalog-eval/generator/node_modules",
  "prototype/ecosystem-relative-eval/node_modules",
  "prototype/openui-typed-json-product-eval/node_modules",
];

export async function loadFrozenManifest(manifestPath) {
  const absoluteManifest = path.resolve(manifestPath);
  await assertRegularFile(absoluteManifest, "frozen manifest");
  await assertRegularFile(`${absoluteManifest}.sha256`, "frozen manifest sidecar");
  const [bytes, sidecar] = await Promise.all([
    readFile(absoluteManifest),
    readFile(`${absoluteManifest}.sha256`, "utf8"),
  ]);
  if (bytes.length > maximumManifestBytes) throw new Error("frozen manifest exceeds the size limit");
  const expectedRawSha256 = sidecar.trim();
  if (!sha256Pattern.test(expectedRawSha256) || sidecar !== `${expectedRawSha256}\n`) throw new Error("invalid frozen manifest SHA-256 sidecar");
  const rawSha256 = digest(bytes);
  if (rawSha256 !== expectedRawSha256) throw new Error("frozen manifest raw SHA-256 mismatch");
  const manifest = JSON.parse(bytes.toString("utf8"));
  if (manifest?.observable_contract?.version !== OBSERVABLE_CONTRACT_V2) throw new Error("frozen manifest is not observable-contract-v2");
  if (Object.hasOwn(manifest, "hash")) throw new Error("frozen manifest must not contain a derived hash field");
  return {
    verified: true,
    manifest,
    manifest_path: absoluteManifest,
    sidecar_path: `${absoluteManifest}.sha256`,
    raw_bytes: bytes,
    raw_sha256: rawSha256,
    semantic_sha256: digest(stableJson(manifest)),
  };
}

export function assertV2ProviderBoundary({
  provider,
  contractVersion,
  contractKey,
  frozenManifestAttestation,
  oneShotClaim,
  reviewAttestation,
}) {
  if (provider !== "codex" || contractVersion !== OBSERVABLE_CONTRACT_V2) return;
  if (contractKey !== "canary") throw new Error("v2 provider execution is canary-only");
  if (frozenManifestAttestation?.verified !== true) throw new Error("v2 provider execution requires a verified frozen manifest");
  if (reviewAttestation?.verified !== true) throw new Error("v2 provider execution requires the OPE-23 Git review attestation");
  if (oneShotClaim?.consumed !== true || oneShotClaim?.manifest_raw_sha256 !== frozenManifestAttestation.raw_sha256) throw new Error("v2 provider execution requires the consumed matching one-shot claim");
  if (oneShotClaim?.review_attestation_object !== reviewAttestation.tag_object) throw new Error("v2 one-shot claim differs from the Git review attestation");
}

export async function assertExternalEvidenceDirectory({ repoRoot, outputDirectory }) {
  const absoluteRepo = path.resolve(repoRoot);
  const absoluteOutput = path.resolve(outputDirectory);
  const repoMetadata = await lstat(absoluteRepo);
  if (repoMetadata.isSymbolicLink() || !repoMetadata.isDirectory()) throw new Error("unsafe reviewed repository");
  const { existingPath, metadata: outputMetadata } = await nearestExistingPath(absoluteOutput);
  if (existingPath === absoluteOutput && (outputMetadata.isSymbolicLink() || !outputMetadata.isDirectory())) {
    throw new Error("unsafe canary evidence directory");
  }
  if (outputMetadata.isSymbolicLink() || !outputMetadata.isDirectory()) throw new Error("unsafe canary evidence ancestor");
  const [canonicalRepo, canonicalAncestor] = await Promise.all([
    realpath(absoluteRepo),
    realpath(existingPath),
  ]);
  const canonicalOutput = path.resolve(canonicalAncestor, path.relative(existingPath, absoluteOutput));
  if (isWithin(canonicalRepo, canonicalOutput)) {
    throw new Error("observable-contract-v2 evidence must remain outside the reviewed repository");
  }
  return {
    verified: true,
    repository: canonicalRepo,
    output_directory: canonicalOutput,
  };
}

async function nearestExistingPath(candidate) {
  let current = candidate;
  while (true) {
    try {
      return { existingPath: current, metadata: await lstat(current) };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      current = parent;
    }
  }
}

export async function loadOneShotClaim(claimPath, {
  ledgerRoot = null,
  manifestRawSha256 = null,
  outputDirectory = null,
  reviewAttestation = null,
} = {}) {
  const absoluteClaim = path.resolve(claimPath);
  await assertRegularFile(absoluteClaim, "one-shot claim");
  if (ledgerRoot !== null && path.dirname(absoluteClaim) !== path.resolve(ledgerRoot)) throw new Error("one-shot claim is outside the canonical ledger");
  const claim = JSON.parse(await readFile(absoluteClaim, "utf8"));
  if (claim.version !== "ope-24-one-shot-claim-v1" || claim.ticket !== "OPE-24" || claim.status !== "started") throw new Error("invalid one-shot claim");
  if (!sha256Pattern.test(claim.manifest_raw_sha256) || !commitPattern.test(claim.reviewed_commit)) throw new Error("malformed one-shot claim identity");
  const expectedFilename = `${OBSERVABLE_CONTRACT_V2}-${claim.manifest_raw_sha256}.json`;
  if (path.basename(absoluteClaim) !== expectedFilename) throw new Error("one-shot claim path is not canonical for its manifest");
  if (manifestRawSha256 !== null && claim.manifest_raw_sha256 !== manifestRawSha256) throw new Error("one-shot claim manifest differs");
  if (outputDirectory !== null && claim.output_directory_sha256 !== digest(path.resolve(outputDirectory))) throw new Error("one-shot claim output directory differs");
  if (reviewAttestation !== null && (
    claim.reviewed_commit !== reviewAttestation.reviewed_commit
    || claim.review_attestation_tag !== reviewAttestation.tag_name
    || claim.review_attestation_object !== reviewAttestation.tag_object
  )) throw new Error("one-shot claim differs from the review attestation");
  return { ...claim, ledger_path: absoluteClaim };
}

export async function consumeOneShotClaim({
  claimPath,
  ledgerRoot,
  manifestRawSha256,
  outputDirectory,
  reviewAttestation,
}) {
  const claim = await loadOneShotClaim(claimPath, {
    ledgerRoot,
    manifestRawSha256,
    outputDirectory,
    reviewAttestation,
  });
  const consumptionPath = `${claim.ledger_path}.consumed`;
  const consumption = {
    version: "ope-24-one-shot-consumption-v1",
    ticket: "OPE-24",
    status: "consumed",
    manifest_raw_sha256: claim.manifest_raw_sha256,
    reviewed_commit: claim.reviewed_commit,
    review_attestation_object: claim.review_attestation_object,
    output_directory_sha256: claim.output_directory_sha256,
    consumed_at: new Date().toISOString(),
  };
  try {
    await writeFile(consumptionPath, `${JSON.stringify(consumption, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error.code === "EEXIST") throw new Error(`observable-contract-v2 canary claim already consumed for manifest ${manifestRawSha256}`);
    throw error;
  }
  return {
    ...claim,
    consumed: true,
    consumption_path: consumptionPath,
    consumption,
  };
}

export async function loadOneShotConsumption(consumptionPath, {
  claim,
} = {}) {
  const absoluteConsumption = path.resolve(consumptionPath);
  await assertRegularFile(absoluteConsumption, "one-shot consumption");
  if (claim?.ledger_path && absoluteConsumption !== `${claim.ledger_path}.consumed`) {
    throw new Error("one-shot consumption path differs from its canonical claim");
  }
  const consumption = JSON.parse(await readFile(absoluteConsumption, "utf8"));
  if (consumption.version !== "ope-24-one-shot-consumption-v1"
    || consumption.ticket !== "OPE-24"
    || consumption.status !== "consumed") {
    throw new Error("invalid one-shot consumption");
  }
  const matchingFields = [
    "manifest_raw_sha256",
    "reviewed_commit",
    "review_attestation_object",
    "output_directory_sha256",
  ];
  if (claim && matchingFields.some((field) => consumption[field] !== claim[field])) {
    throw new Error("one-shot consumption differs from its claim");
  }
  return { ...consumption, consumption_path: absoluteConsumption, verified: true };
}

export function canonicalOneShotLedgerRoot(repoRoot) {
  const gitCommonDirectory = execFileSync("git", ["rev-parse", "--git-common-dir"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  return path.resolve(repoRoot, gitCommonDirectory, "openui-dioxus-eval-ledgers", "ope-24");
}

export function reviewAttestationName(manifestRawSha256) {
  if (!sha256Pattern.test(manifestRawSha256)) throw new Error("invalid manifest raw SHA-256 for review attestation");
  return `ope-23-observable-contract-v2-reviewed-${manifestRawSha256.slice(0, 16)}`;
}

export function loadReviewAttestation({ repoRoot, manifestAttestation }) {
  const tagName = reviewAttestationName(manifestAttestation.raw_sha256);
  const tagRef = `refs/tags/${tagName}`;
  const tagType = git(["cat-file", "-t", tagRef], repoRoot);
  if (tagType !== "tag") throw new Error("OPE-23 review attestation must be an annotated Git tag");
  const tagObject = git(["rev-parse", `${tagRef}^{tag}`], repoRoot);
  const reviewedCommit = git(["rev-parse", `${tagRef}^{commit}`], repoRoot);
  const head = git(["rev-parse", "HEAD"], repoRoot);
  if (reviewedCommit !== head) throw new Error("current HEAD differs from the Git-attested OPE-23 commit");
  assertCleanTrackedTree(repoRoot);
  const annotation = JSON.parse(git(["for-each-ref", "--format=%(contents)", tagRef], repoRoot));
  const expected = {
    version: "ope-23-review-attestation-v1",
    ticket: "OPE-23",
    status: "approved",
    manifest_raw_sha256: manifestAttestation.raw_sha256,
    manifest_semantic_sha256: manifestAttestation.semantic_sha256,
    implementation_tree_sha256: manifestAttestation.manifest.input_hashes.implementation_tree.sha256,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (annotation[key] !== value) throw new Error(`OPE-23 review attestation differs at ${key}`);
  }
  return {
    verified: true,
    tag_name: tagName,
    tag_object: tagObject,
    reviewed_commit: reviewedCommit,
    ...expected,
  };
}

export function assertCleanTrackedTree(repoRoot) {
  for (const args of [["diff", "--quiet", "HEAD", "--"], ["diff", "--cached", "--quiet", "HEAD", "--"]]) {
    const result = spawnGit(args, repoRoot);
    if (result.status !== 0) throw new Error("tracked worktree or index differs from the reviewed OPE-23 commit");
  }
  const untracked = spawnGit(["ls-files", "--others", "--exclude-standard", "-z"], repoRoot);
  if (untracked.status !== 0) throw new Error("cannot inspect untracked worktree paths");
  if (untracked.stdout.split("\0").some(Boolean)) throw new Error("untracked worktree paths differ from the reviewed OPE-23 commit");
  assertApprovedDependencyLinks(repoRoot);
}

function assertApprovedDependencyLinks(repoRoot) {
  const workspaceRoot = path.resolve(repoRoot, "../..");
  for (const relative of approvedDependencyLinks) {
    const linkPath = path.join(repoRoot, relative);
    let metadata;
    try {
      metadata = lstatSync(linkPath);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    if (!metadata.isSymbolicLink()) throw new Error(`approved dependency path must be a symbolic link: ${relative}`);
    const declaredTarget = readlinkSync(linkPath);
    if (!path.isAbsolute(declaredTarget)) throw new Error(`approved dependency link must use an absolute target: ${relative}`);
    const target = realpathSync(linkPath);
    if (!statSync(target).isDirectory()
      || !isWithin(workspaceRoot, target)
      || isWithin(repoRoot, target)
      || !target.endsWith(`${path.sep}${relative}`)) {
      throw new Error(`approved dependency link has an unsafe target: ${relative}`);
    }
  }
  const ignored = spawnGit([
    "ls-files",
    "--others",
    "--ignored",
    "--exclude-standard",
    "-z",
    "--",
    ":(glob)**/node_modules",
    ":(glob)**/node_modules/**",
  ], repoRoot);
  if (ignored.status !== 0) throw new Error("cannot inspect ignored dependency paths");
  const approved = new Set(approvedDependencyLinks);
  const unexpected = ignored.stdout.split("\0").filter(Boolean).filter((relative) => !approved.has(relative));
  if (unexpected.length > 0) throw new Error(`unapproved ignored node_modules path: ${unexpected[0]}`);
}

async function assertRegularFile(filePath, label) {
  const metadata = await lstat(filePath);
  if (metadata.isSymbolicLink() || !metadata.isFile()) throw new Error(`unsafe ${label}`);
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function git(args, cwd) {
  const result = spawnGit(args, cwd);
  if (result.status !== 0) throw new Error(String(result.stderr || `git ${args[0]} failed`));
  return result.stdout.trim();
}

function spawnGit(args, cwd) {
  return spawnSync("git", args, { cwd, encoding: "utf8" });
}

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const checksumLine = /^([a-f0-9]{64})  (.+)$/u;

export async function verifyChecksumArchive({
  directory,
  expectedChecksumManifestSha256,
  evidenceCommit = null,
  repoRoot = null,
  relativePath = null,
  excluded = ["CANDIDATE.json", "SHA256SUMS"],
}) {
  const checksumBytes = await readFile(path.join(directory, "SHA256SUMS"));
  const checksumManifestSha256 = digest(checksumBytes);
  if (checksumManifestSha256 !== expectedChecksumManifestSha256) throw new Error("archive checksum-manifest digest differs from the registered value");
  const entries = checksumBytes.toString("utf8").trim().split("\n").filter(Boolean).map(parseChecksum);
  const listed = new Set(entries.map((entry) => entry.relative));
  if (listed.size !== entries.length) throw new Error("archive checksum manifest contains duplicate paths");
  const actual = (await filesBelow(directory)).filter((relative) => !excluded.includes(relative)).sort();
  if (JSON.stringify([...listed].sort()) !== JSON.stringify(actual)) throw new Error("archive file inventory differs from the checksum manifest");
  for (const entry of entries) {
    if (digest(await readFile(path.join(directory, entry.relative))) !== entry.sha256) throw new Error(`archive file checksum differs: ${entry.relative}`);
  }
  if (evidenceCommit !== null) {
    if (!repoRoot || !relativePath) throw new Error("archive commit verification requires repoRoot and relativePath");
    const commit = spawnSync("git", ["cat-file", "-e", `${evidenceCommit}^{commit}`], { cwd: repoRoot, encoding: "utf8" });
    if (commit.status !== 0) throw new Error("registered evidence commit does not resolve");
    const diff = spawnSync("git", ["diff", "--quiet", evidenceCommit, "--", relativePath], { cwd: repoRoot, encoding: "utf8" });
    if (diff.status !== 0) throw new Error("archive differs from the registered evidence commit");
  }
  return {
    verified: true,
    evidence_commit: evidenceCommit,
    files_verified: entries.length,
    checksum_manifest_sha256: checksumManifestSha256,
  };
}

function parseChecksum(line) {
  const match = line.match(checksumLine);
  if (!match || path.isAbsolute(match[2]) || match[2].split(path.sep).includes("..")) throw new Error(`invalid archive checksum entry: ${line}`);
  return { sha256: match[1], relative: match[2] };
}

async function filesBelow(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? path.join(prefix, entry.name) : entry.name;
    if (entry.isDirectory()) files.push(...await filesBelow(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`archive contains a non-regular path: ${relative}`);
  }
  return files;
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

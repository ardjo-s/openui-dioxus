import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { sha } from "./hash.mjs";

export const PUBLICATION_MARKER = "PUBLICATION.json";

export async function verifyEvidencePublication(directory) {
  const marker = JSON.parse(await readFile(path.join(directory, PUBLICATION_MARKER), "utf8"));
  if (marker.status !== "complete") throw new Error("evidence publication marker is not complete");
  const checksumBytes = await readFile(path.join(directory, "SHA256SUMS"));
  if (sha(checksumBytes) !== marker.checksum_manifest_sha256) throw new Error("evidence checksum manifest differs from publication marker");
  const entries = checksumBytes.toString("utf8").trim().split("\n").filter(Boolean).map((line) => {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match || path.isAbsolute(match[2]) || match[2].split(path.sep).includes("..")) throw new Error(`invalid checksum entry: ${line}`);
    return { expected: match[1], relative: match[2] };
  });
  const listed = new Set(entries.map((entry) => entry.relative));
  if (listed.size !== entries.length) throw new Error("duplicate evidence checksum entry");
  const actual = (await filesBelow(directory))
    .filter((relative) => !["SHA256SUMS", PUBLICATION_MARKER].includes(relative))
    .sort();
  if (JSON.stringify([...listed].sort()) !== JSON.stringify(actual)) throw new Error("evidence file inventory differs from checksum manifest");
  for (const entry of entries) {
    if (sha(await readFile(path.join(directory, entry.relative))) !== entry.expected) {
      throw new Error(`evidence checksum differs: ${entry.relative}`);
    }
  }
  return {
    verified: true,
    outcome: marker.outcome,
    manifest_hash: marker.manifest_hash,
    checksum_manifest_sha256: marker.checksum_manifest_sha256,
    file_count: entries.length,
  };
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

#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

import { buildCandidateManifest, hashManifest, serializeCandidateManifest } from "../src/manifest.mjs";

const destination = destinationFrom(process.argv.slice(2));
await mkdir(path.dirname(destination), { recursive: true });
const manifest = await buildCandidateManifest({ contractVersion: "observable-contract-v2" });
const bytes = serializeCandidateManifest(manifest);
const rawDigest = createHash("sha256").update(bytes).digest("hex");
const semanticDigest = hashManifest(manifest);
await writeFile(destination, bytes, { flag: "wx", mode: 0o600 });
await writeFile(`${destination}.sha256`, `${rawDigest}\n`, { flag: "wx", mode: 0o600 });
process.stdout.write(`${JSON.stringify({ destination, raw_manifest_sha256: rawDigest, semantic_manifest_sha256: semanticDigest, implementation_tree_sha256: manifest.input_hashes.implementation_tree.sha256 })}\n`);

function destinationFrom(argv) {
  if (argv.length !== 2 || argv[0] !== "--output") throw new Error("usage: freeze-observable-contract-v2.mjs --output <path>");
  return path.resolve(argv[1]);
}

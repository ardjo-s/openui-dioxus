import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const archive = path.resolve(here, "../../openui-a2ui-cloud-eval/evidence/three-arm-controlled-run-2026-08-24");

export async function verifyOpe3Archive() {
  const checksumSource = await readFile(path.join(archive, "SHA256SUMS"), "utf8");
  const entries = checksumSource.split("\n").filter(Boolean).map((line) => {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match) throw new Error(`invalid OPE-3 checksum line: ${line}`);
    return { expected: match[1], relative: match[2].replace(/^\.\//, "") };
  });
  for (const entry of entries) {
    if (entry.relative.includes("..") || path.isAbsolute(entry.relative)) throw new Error(`unsafe OPE-3 checksum path: ${entry.relative}`);
    const actual = createHash("sha256").update(await readFile(path.join(archive, entry.relative))).digest("hex");
    if (actual !== entry.expected) throw new Error(`OPE-3 checksum mismatch: ${entry.relative}`);
  }
  const summary = JSON.parse(await readFile(path.join(archive, "summary.json"), "utf8"));
  return {
    verified: true,
    files_verified: entries.length,
    checksum_manifest_sha256: createHash("sha256").update(checksumSource).digest("hex"),
    summary: {
      outcome: summary.outcome,
      pairs_complete: summary.pairs_complete,
      calls: summary.calls,
      first_pass_validity: summary.first_pass_validity,
      post_repair_validity: summary.post_repair_validity,
    },
    provider_calls: 0,
  };
}

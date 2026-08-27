import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { boundedTimeout } from "./deadline.mjs";
import { buildCargoEnvironment, resolveSharedCargoTarget } from "./build-isolation.mjs";
import { runBoundedProcess } from "./subprocess.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const repo = path.resolve(here, "../../..");
const catalog = path.join(repo, "prototype/dioxus-components-catalog-eval");
const sharedTarget = resolveSharedCargoTarget({ ambient: process.env, repoRoot: repo, implementationRoot: root });
let executableVerified = false;

export async function verifySecondCatalogFixtures({ execute = true, deadlineMs = Number.POSITIVE_INFINITY } = {}) {
  const checksumPath = path.join(catalog, "evidence/OPE10-SHA256SUMS");
  const source = await readFile(checksumPath, "utf8");
  const entries = source.split("\n").filter(Boolean).map((line) => {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match) throw new Error(`invalid OPE-10 checksum line: ${line}`);
    return { expected: match[1], relative: match[2] };
  });
  for (const entry of entries) {
    if (entry.relative.includes("..") || path.isAbsolute(entry.relative)) throw new Error(`unsafe OPE-10 checksum path: ${entry.relative}`);
    const actual = createHash("sha256").update(await readFile(path.join(repo, entry.relative))).digest("hex");
    if (actual !== entry.expected) throw new Error(`OPE-10 checksum mismatch: ${entry.relative}`);
  }
  if (execute && !executableVerified) {
    const result = await runBoundedProcess({
      command: "cargo",
      args: [
        "test",
        "--quiet",
        "--manifest-path",
        path.join(catalog, "Cargo.toml"),
        "--features",
        "ssr",
        "--test",
        "rust_ui_catalog",
      ],
      cwd: repo,
      env: buildCargoEnvironment(process.env, sharedTarget),
      timeoutMs: boundedTimeout(deadlineMs, 240_000, "second-catalog fixture execution"),
      maximumBytes: 4 * 1024 * 1024,
    });
    if (result.error || result.exitCode !== 0 || !result.process_group_reaped) throw new Error(String(result.error ?? result.stderr ?? `Rust/UI fixtures exited ${result.exitCode}`));
    executableVerified = true;
  }
  const release = JSON.parse(await readFile(path.join(catalog, "generated-rust-ui/release.json"), "utf8"));
  return {
    verified: true,
    files_verified: entries.length,
    executable_fixtures: execute,
    inert_replay: execute,
    copy_on_write_migration: execute,
    catalog_release_hash: release.catalog_release_hash,
    adapter_build_id: release.adapter_build_id,
    source_commit: release.source.commit,
    implementation_commit: release.source.implementation_commit,
  };
}

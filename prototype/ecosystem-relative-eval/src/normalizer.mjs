import { mkdir, readFile, writeFile } from "node:fs/promises";
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
const binary = path.join(sharedTarget, "debug/catalog-normalize");
let ready = false;

export async function ensureNormalizer(deadlineMs = Number.POSITIVE_INFINITY) {
  if (ready) return;
  const result = await runBoundedProcess({
    command: "cargo",
    args: ["build", "--quiet", "--manifest-path", path.join(catalog, "Cargo.toml"), "--bin", "catalog-normalize"],
    cwd: repo,
    env: buildCargoEnvironment(process.env, sharedTarget),
    timeoutMs: boundedTimeout(deadlineMs, 180_000, "catalog normalizer build"),
    maximumBytes: 4 * 1024 * 1024,
  });
  if (result.error || result.exitCode !== 0 || !result.process_group_reaped) throw new Error(String(result.error ?? result.stderr ?? `normalizer build exited ${result.exitCode}`));
  ready = true;
}

export async function normalizeWire(wire, directory, stem, deadlineMs = Number.POSITIVE_INFINITY) {
  await ensureNormalizer(deadlineMs);
  await mkdir(directory, { recursive: true });
  const input = path.join(directory, `${stem}.wire.json`);
  const output = path.join(directory, `${stem}.canonical.json`);
  await writeFile(input, `${JSON.stringify(wire)}\n`);
  const started = performance.now();
  const result = await runBoundedProcess({
    command: binary,
    args: [input, output],
    cwd: repo,
    env: {},
    timeoutMs: boundedTimeout(deadlineMs, 30_000, "catalog normalization"),
    maximumBytes: 1024 * 1024,
  });
  const elapsedMs = performance.now() - started;
  if (result.error || result.exitCode !== 0 || !result.process_group_reaped) throw new Error(String(result.error ?? result.stderr ?? `normalizer exited ${result.exitCode}`));
  return {
    fingerprint: result.stdout.trim(),
    canonical: JSON.parse(await readFile(output, "utf8")),
    normalization_ms: elapsedMs,
    input_path: input,
    output_path: output,
  };
}

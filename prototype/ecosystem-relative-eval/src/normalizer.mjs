import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { boundedTimeout } from "./deadline.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const catalog = path.join(repo, "prototype/dioxus-components-catalog-eval");
const binary = path.join(catalog, "target/debug/catalog-normalize");
let ready = false;

export function ensureNormalizer(deadlineMs = Number.POSITIVE_INFINITY) {
  if (ready) return;
  const result = spawnSync("cargo", ["build", "--quiet", "--manifest-path", path.join(catalog, "Cargo.toml"), "--bin", "catalog-normalize"], {
    cwd: repo,
    encoding: "utf8",
    timeout: boundedTimeout(deadlineMs, 180_000, "catalog normalizer build"),
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error(String(result.error?.message ?? result.stderr ?? `normalizer build exited ${result.status}`));
  ready = true;
}

export async function normalizeWire(wire, directory, stem, deadlineMs = Number.POSITIVE_INFINITY) {
  ensureNormalizer(deadlineMs);
  await mkdir(directory, { recursive: true });
  const input = path.join(directory, `${stem}.wire.json`);
  const output = path.join(directory, `${stem}.canonical.json`);
  await writeFile(input, `${JSON.stringify(wire)}\n`);
  const started = performance.now();
  const result = spawnSync(binary, [input, output], { cwd: repo, encoding: "utf8", timeout: boundedTimeout(deadlineMs, 30_000, "catalog normalization"), maxBuffer: 1024 * 1024 });
  const elapsedMs = performance.now() - started;
  if (result.error || result.status !== 0) throw new Error(String(result.error?.message ?? result.stderr ?? `normalizer exited ${result.status}`));
  return {
    fingerprint: result.stdout.trim(),
    canonical: JSON.parse(await readFile(output, "utf8")),
    normalization_ms: elapsedMs,
    input_path: input,
    output_path: output,
  };
}

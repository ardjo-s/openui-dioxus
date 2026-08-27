import { appendFile, mkdir, statfs as nodeStatfs, writeFile } from "node:fs/promises";
import path from "node:path";

const gibibyte = 1024 ** 3;

export const DEFAULT_MINIMUM_FREE_BYTES = 4 * gibibyte;

export async function evaluateStorageGate({
  evidenceDirectory,
  targetDirectory,
  stage,
  minimumFreeBytes = DEFAULT_MINIMUM_FREE_BYTES,
  statfs = nodeStatfs,
}) {
  if (!stage) throw new Error("storage gate stage is required");
  if (!Number.isSafeInteger(minimumFreeBytes) || minimumFreeBytes <= 0) {
    throw new Error(`invalid minimum free bytes: ${minimumFreeBytes}`);
  }
  const paths = [...new Set([evidenceDirectory, targetDirectory].map((value) => path.resolve(value)))];
  const probes = await Promise.all(paths.map(async (probePath) => {
    const facts = await statfs(probePath, { bigint: true });
    const availableBytes = Number(BigInt(facts.bsize) * BigInt(facts.bavail));
    if (!Number.isSafeInteger(availableBytes)) throw new Error(`free-space value exceeds safe integer range: ${probePath}`);
    return {
      path: probePath,
      available_bytes: availableBytes,
      required_bytes: minimumFreeBytes,
      passed: availableBytes >= minimumFreeBytes,
    };
  }));
  const passed = probes.every((probe) => probe.passed);
  return {
    contract_version: "ope-21-storage-gate-v1",
    stage,
    checked_at: new Date().toISOString(),
    passed,
    code: passed ? "storage-capacity-sufficient" : "insufficient-free-space",
    provider_attempts: 0,
    minimum_free_bytes: minimumFreeBytes,
    minimum_free_gib: minimumFreeBytes / gibibyte,
    probes,
  };
}

export async function recordStorageGate({
  evidenceDirectory,
  targetDirectory,
  stage,
  minimumFreeBytes = DEFAULT_MINIMUM_FREE_BYTES,
  recordPath,
  failurePath = null,
  statfs = nodeStatfs,
}) {
  await mkdir(evidenceDirectory, { recursive: true, mode: 0o700 });
  await mkdir(targetDirectory, { recursive: true, mode: 0o700 });
  await mkdir(path.dirname(recordPath), { recursive: true, mode: 0o700 });
  const result = await evaluateStorageGate({ evidenceDirectory, targetDirectory, stage, minimumFreeBytes, statfs });
  await appendFile(recordPath, `${JSON.stringify(result)}\n`, { mode: 0o600 });
  if (!result.passed && failurePath) {
    await mkdir(path.dirname(failurePath), { recursive: true, mode: 0o700 });
    await writeFile(failurePath, `${JSON.stringify({
      classification: "PRE_PROVIDER_INFRASTRUCTURE_FAILURE",
      provider_attempts: 0,
      storage_gate: result,
    }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  }
  return result;
}

export function minimumFreeBytesFromEnvironment(ambient = process.env) {
  const configured = ambient.EVAL_MINIMUM_FREE_BYTES;
  if (configured === undefined || configured === "") return DEFAULT_MINIMUM_FREE_BYTES;
  const value = Number(configured);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`invalid EVAL_MINIMUM_FREE_BYTES: ${configured}`);
  if (value < DEFAULT_MINIMUM_FREE_BYTES) {
    throw new Error(`EVAL_MINIMUM_FREE_BYTES cannot be lower than the registered minimum: ${DEFAULT_MINIMUM_FREE_BYTES}`);
  }
  return value;
}

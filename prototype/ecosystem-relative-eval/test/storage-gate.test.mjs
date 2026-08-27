import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  DEFAULT_MINIMUM_FREE_BYTES,
  evaluateStorageGate,
  minimumFreeBytesFromEnvironment,
  recordStorageGate,
} from "../src/storage-gate.mjs";

const temporaryRoot = new URL("../.tmp/", import.meta.url);
const gibibyte = 1024 ** 3;

test("storage gate rejects insufficient capacity before any provider attempt", async () => {
  const result = await evaluateStorageGate({
    evidenceDirectory: "/evidence",
    targetDirectory: "/target",
    stage: "pre-first-provider-call",
    minimumFreeBytes: 4 * gibibyte,
    statfs: fakeStatfs(2 * gibibyte),
  });

  assert.equal(DEFAULT_MINIMUM_FREE_BYTES, 4 * gibibyte);
  assert.equal(result.passed, false);
  assert.equal(result.code, "insufficient-free-space");
  assert.equal(result.provider_attempts, 0);
  assert.deepEqual(result.probes.map((probe) => probe.path), ["/evidence", "/target"]);
  assert.ok(result.probes.every((probe) => probe.available_bytes === 2 * gibibyte));
});

test("configured storage threshold may increase but never weaken the registered minimum", () => {
  assert.equal(minimumFreeBytesFromEnvironment({}), DEFAULT_MINIMUM_FREE_BYTES);
  assert.equal(minimumFreeBytesFromEnvironment({ EVAL_MINIMUM_FREE_BYTES: String(8 * gibibyte) }), 8 * gibibyte);
  assert.throws(
    () => minimumFreeBytesFromEnvironment({ EVAL_MINIMUM_FREE_BYTES: String(2 * gibibyte) }),
    /cannot be lower than the registered minimum/,
  );
  const cli = spawnSync(process.execPath, [
    new URL("../scripts/check-storage.mjs", import.meta.url).pathname,
    "--evidence", "/tmp/ope21-storage-test",
    "--target", "/tmp/ope21-storage-target",
    "--stage", "test",
    "--record", "/tmp/ope21-storage-test.jsonl",
    "--failure", "/tmp/ope21-storage-failure.json",
    "--minimum", String(2 * gibibyte),
  ], { encoding: "utf8" });
  assert.notEqual(cli.status, 0);
  assert.match(cli.stderr, /cannot be lower than the registered minimum/);
});

test("storage gate accepts every configured filesystem with sufficient capacity", async () => {
  const result = await evaluateStorageGate({
    evidenceDirectory: "/evidence",
    targetDirectory: "/target",
    stage: "post-typecheck",
    minimumFreeBytes: 4 * gibibyte,
    statfs: fakeStatfs(8 * gibibyte),
  });

  assert.equal(result.passed, true);
  assert.equal(result.code, "storage-capacity-sufficient");
  assert.equal(result.provider_attempts, 0);
});

test("failed storage gate retains JSONL history and a machine-readable infrastructure failure", async () => {
  await mkdir(temporaryRoot, { recursive: true });
  const directory = await mkdtemp(path.join(temporaryRoot.pathname, "storage-gate-"));
  const recordPath = path.join(directory, "pre-provider-storage-gates.jsonl");
  const failurePath = path.join(directory, "pre-provider-infrastructure.json");
  try {
    const result = await recordStorageGate({
      evidenceDirectory: directory,
      targetDirectory: path.join(directory, "target"),
      stage: "post-deterministic-tests",
      minimumFreeBytes: 4 * gibibyte,
      recordPath,
      failurePath,
      statfs: fakeStatfs(gibibyte),
    });

    assert.equal(result.passed, false);
    const records = (await readFile(recordPath, "utf8")).trim().split("\n").map(JSON.parse);
    const failure = JSON.parse(await readFile(failurePath, "utf8"));
    assert.equal(records.length, 1);
    assert.equal(records[0].stage, "post-deterministic-tests");
    assert.equal(failure.classification, "PRE_PROVIDER_INFRASTRUCTURE_FAILURE");
    assert.equal(failure.provider_attempts, 0);
    assert.equal(failure.storage_gate.code, "insufficient-free-space");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function fakeStatfs(availableBytes) {
  return async () => ({ bsize: 4096n, bavail: BigInt(availableBytes) / 4096n });
}

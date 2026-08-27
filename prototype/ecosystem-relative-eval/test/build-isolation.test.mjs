import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildCargoEnvironment,
  assertDedicatedEvaluationCargoTarget,
  resolveSharedCargoTarget,
  verifyImplementationTreeStability,
} from "../src/build-isolation.mjs";
import { hashImplementationTree } from "../src/manifest.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const implementationRoot = path.resolve(here, "..");
const repoRoot = path.resolve(implementationRoot, "../..");
const temporaryRoot = new URL("../.tmp/", import.meta.url);

test("shared Cargo target resolves outside the frozen implementation tree", () => {
  const target = resolveSharedCargoTarget({ ambient: {}, repoRoot, implementationRoot });

  assert.equal(path.isAbsolute(target), true);
  assert.equal(target.startsWith(`${implementationRoot}${path.sep}`), false);
  assert.match(target, /\.cache\/openui-dioxus-eval\/cargo-target$/);
  assert.throws(
    () => resolveSharedCargoTarget({
      ambient: { EVAL_SHARED_CARGO_TARGET_DIR: path.join(implementationRoot, "target") },
      repoRoot,
      implementationRoot,
    }),
    /outside the frozen implementation tree/,
  );
});

test("all generated Rust routes receive the same explicit Cargo target", () => {
  const target = "/workspace/.cache/openui-dioxus-eval/cargo-target";
  const environment = buildCargoEnvironment({ BASE: "preserved" }, target);

  assert.deepEqual(environment, {
    BASE: "preserved",
    CARGO_TARGET_DIR: target,
    EVAL_SHARED_CARGO_TARGET_DIR: target,
    EVAL_DIRECT_RSX_TARGET_DIR: target,
    OPE11_DIRECT_RSX_TARGET_DIR: target,
    OPE11_DIOXUS_TARGET_DIR: target,
  });
});

test("evaluation Cargo cleanup rejects symlinked targets", async () => {
  await mkdir(temporaryRoot, { recursive: true });
  const fixtureRoot = await mkdtemp(path.join(temporaryRoot.pathname, "cargo-clean-boundary-"));
  const cacheRoot = path.join(fixtureRoot, "evaluation-cache");
  const targetDirectory = path.join(cacheRoot, "cargo-target");
  const outsideTarget = path.join(fixtureRoot, "outside-target");
  try {
    await mkdir(targetDirectory, { recursive: true });
    assert.equal((await assertDedicatedEvaluationCargoTarget({ cacheRoot, targetDirectory })).verified, true);
    await rm(targetDirectory, { recursive: true });
    await mkdir(outsideTarget);
    await symlink(outsideTarget, targetDirectory);
    await assert.rejects(
      () => assertDedicatedEvaluationCargoTarget({ cacheRoot, targetDirectory }),
      /must not be a symbolic link/u,
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("manifest-stability seam detects an injected root build artifact", async () => {
  await mkdir(temporaryRoot, { recursive: true });
  const fixtureRoot = await mkdtemp(path.join(temporaryRoot.pathname, "build-isolation-"));
  const rootTarget = path.join(fixtureRoot, "target");
  await writeFile(path.join(fixtureRoot, "runner.mjs"), "export const frozen = true;\n");
  const before = await hashImplementationTree(fixtureRoot);
  try {
    await mkdir(rootTarget);
    await writeFile(path.join(rootTarget, "ope21-tdd-marker.txt"), "generated build artifact\n");
    const afterInjection = await hashImplementationTree(fixtureRoot);
    const rejected = verifyImplementationTreeStability({
      before,
      after: afterInjection,
      rootTargetExists: true,
    });

    assert.equal(rejected.verified, false);
    assert.ok(rejected.diagnostics.some((item) => item.code === "implementation-manifest-drift"));
    assert.ok(rejected.diagnostics.some((item) => item.code === "root-build-target-present"));
  } finally {
    await rm(rootTarget, { recursive: true, force: true });
  }

  const restored = await hashImplementationTree(fixtureRoot);
  assert.deepEqual(restored, before);
  assert.deepEqual(verifyImplementationTreeStability({ before, after: restored, rootTargetExists: false }), {
    verified: true,
    before,
    after: restored,
    root_target_present: false,
    diagnostics: [],
  });
  await rm(fixtureRoot, { recursive: true, force: true });
});

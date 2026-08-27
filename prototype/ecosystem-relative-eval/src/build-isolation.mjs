import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

export function resolveSharedCargoTarget({ ambient = process.env, repoRoot, implementationRoot }) {
  const workspaceRoot = path.resolve(repoRoot, "../..");
  const target = path.resolve(
    ambient.EVAL_SHARED_CARGO_TARGET_DIR
      ?? path.join(workspaceRoot, ".cache", "openui-dioxus-eval", "cargo-target"),
  );
  if (isWithin(repoRoot, target) || isWithin(implementationRoot, target)) {
    throw new Error(`shared Cargo target must stay outside the frozen implementation tree and repository: ${target}`);
  }
  return target;
}

export function buildCargoEnvironment(ambient, targetDirectory) {
  return {
    ...ambient,
    CARGO_TARGET_DIR: targetDirectory,
    EVAL_SHARED_CARGO_TARGET_DIR: targetDirectory,
    EVAL_DIRECT_RSX_TARGET_DIR: targetDirectory,
    OPE11_DIRECT_RSX_TARGET_DIR: targetDirectory,
    OPE11_DIOXUS_TARGET_DIR: targetDirectory,
  };
}

export async function assertDedicatedEvaluationCargoTarget({ cacheRoot, targetDirectory }) {
  const absoluteCacheRoot = path.resolve(cacheRoot);
  const absoluteTarget = path.resolve(targetDirectory);
  const [cacheMetadata, targetMetadata] = await Promise.all([
    lstat(absoluteCacheRoot),
    lstat(absoluteTarget),
  ]);
  if (cacheMetadata.isSymbolicLink() || !cacheMetadata.isDirectory()) {
    throw new Error("evaluation Cargo cache root must be a real directory");
  }
  if (targetMetadata.isSymbolicLink()) throw new Error("evaluation Cargo target must not be a symbolic link");
  if (!targetMetadata.isDirectory()) throw new Error("evaluation Cargo target must be a directory");
  const [canonicalCacheRoot, canonicalTarget] = await Promise.all([
    realpath(absoluteCacheRoot),
    realpath(absoluteTarget),
  ]);
  if (!isWithin(canonicalCacheRoot, canonicalTarget) || canonicalCacheRoot === canonicalTarget) {
    throw new Error("evaluation Cargo target must remain below the dedicated cache root");
  }
  return {
    verified: true,
    cache_root: canonicalCacheRoot,
    target_directory: canonicalTarget,
  };
}

export function verifyImplementationTreeStability({ before, after, rootTargetExists }) {
  const diagnostics = [];
  if (before.sha256 !== after.sha256
    || before.file_count !== after.file_count
    || before.bytes !== after.bytes
    || before.nonblank_lines !== after.nonblank_lines) {
    diagnostics.push({
      code: "implementation-manifest-drift",
      message: `implementation tree changed from ${before.sha256} to ${after.sha256}`,
    });
  }
  if (rootTargetExists) {
    diagnostics.push({
      code: "root-build-target-present",
      message: "generated root target directory exists inside the frozen implementation tree",
    });
  }
  return {
    verified: diagnostics.length === 0,
    before,
    after,
    root_target_present: rootTargetExists,
    diagnostics,
  };
}

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

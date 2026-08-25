import { execFileSync } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const repo = path.resolve(root, "../..");
const projectPath = "prototype/ecosystem-relative-eval";
const excludedPrefixes = [
  ".tmp",
  "evidence",
  "node_modules",
  "prototype",
  "platform/dioxus/target",
  "platform/react/dist",
];

export const IMPLEMENTATION_FOOTPRINT_POLICY = Object.freeze({
  version: "ope-11-footprint-v1",
  base_ref: "codex/ope-10-rust-ui-catalog",
  counting: "nonblank physical lines and regular files",
  dimensions: {
    authorship: ["handwritten", "generated"],
    role: ["test", "catalog", "adapter", "runtime", "platform", "baseline", "support"],
  },
  generated_files: ["dependency lockfiles", "frozen platform fixture JSON"],
  version_control_method: "git diff --numstat against the frozen base plus an untracked-source check",
});

export async function measureImplementationFootprint() {
  const files = await filesBelow(root);
  const entries = await Promise.all(files.map(async (relative) => {
    const absolute = path.join(root, relative);
    const contents = await readFile(absolute);
    return {
      path: relative,
      bytes: (await stat(absolute)).size,
      nonblank_lines: isText(contents)
        ? contents.toString("utf8").split(/\r?\n/).filter((line) => line.trim()).length
        : 0,
      authorship: authorship(relative),
      role: role(relative),
    };
  }));
  const authorshipSummary = summarize(entries, "authorship", IMPLEMENTATION_FOOTPRINT_POLICY.dimensions.authorship);
  const roleSummary = summarize(entries, "role", IMPLEMENTATION_FOOTPRINT_POLICY.dimensions.role);
  const versionControl = versionControlNumstat(entries);
  const requiredCategories = {
    handwritten: authorshipSummary.handwritten,
    generated: authorshipSummary.generated,
    test: roleSummary.test,
    catalog: roleSummary.catalog,
    adapter: roleSummary.adapter,
    runtime: roleSummary.runtime,
    platform: roleSummary.platform,
    baseline: roleSummary.baseline,
  };
  return {
    policy: IMPLEMENTATION_FOOTPRINT_POLICY,
    total: metric(entries),
    authorship: authorshipSummary,
    role: roleSummary,
    required_categories: requiredCategories,
    version_control: versionControl,
  };
}

function versionControlNumstat(entries) {
  const output = git([
    "diff",
    "--numstat",
    IMPLEMENTATION_FOOTPRINT_POLICY.base_ref,
    "HEAD",
    "--",
    projectPath,
  ]);
  const changes = output.trim().split("\n").filter(Boolean).map((line) => {
    const [added, removed, repositoryPath] = line.split("\t");
    const relative = repositoryPath.slice(projectPath.length + 1);
    return {
      path: relative,
      added_lines: added === "-" ? null : Number(added),
      removed_lines: removed === "-" ? null : Number(removed),
      authorship: authorship(relative),
      role: role(relative),
    };
  });
  const untracked = git(["ls-files", "--others", "--exclude-standard", "--", projectPath])
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((repositoryPath) => repositoryPath.slice(projectPath.length + 1))
    .filter((relative) => !isExcluded(relative));
  return {
    base_ref: IMPLEMENTATION_FOOTPRINT_POLICY.base_ref,
    head_commit: git(["rev-parse", "HEAD"]).trim(),
    tracked_changed_files: changes.length,
    added_lines: sumChanges(changes, "added_lines"),
    removed_lines: sumChanges(changes, "removed_lines"),
    binary_files: changes.filter((change) => change.added_lines === null || change.removed_lines === null).length,
    authorship: summarizeChanges(changes, "authorship", IMPLEMENTATION_FOOTPRINT_POLICY.dimensions.authorship),
    role: summarizeChanges(changes, "role", IMPLEMENTATION_FOOTPRINT_POLICY.dimensions.role),
    untracked_source_files: untracked,
    source_entries_measured: entries.length,
  };
}

function summarize(entries, field, names) {
  return Object.fromEntries(names.map((name) => [name, metric(entries.filter((entry) => entry[field] === name))]));
}

function summarizeChanges(changes, field, names) {
  return Object.fromEntries(names.map((name) => {
    const matching = changes.filter((change) => change[field] === name);
    return [name, {
      files: matching.length,
      added_lines: sumChanges(matching, "added_lines"),
      removed_lines: sumChanges(matching, "removed_lines"),
    }];
  }));
}

function metric(entries) {
  return {
    file_count: entries.length,
    nonblank_lines: entries.reduce((total, entry) => total + entry.nonblank_lines, 0),
    bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
  };
}

function sumChanges(changes, field) {
  return changes.reduce((total, change) => total + (change[field] ?? 0), 0);
}

function authorship(relative) {
  return relative.endsWith("Cargo.lock")
    || relative.endsWith("package-lock.json")
    || relative.startsWith("platform/fixtures/")
    ? "generated"
    : "handwritten";
}

function role(relative) {
  if (relative.startsWith("test/")
    || relative.includes("/tests/")
    || relative.endsWith(".spec.mjs")) return "test";
  if (relative === "src/ope3.mjs"
    || relative.startsWith("fixtures/direct-rsx-probe/")
    || relative.startsWith("platform/direct-rsx/")
    || relative.startsWith("platform/react/")
    || ["src/direct-rsx-route.mjs", "src/json-render-catalog.mjs", "src/json-render-route.mjs"].includes(relative)) return "baseline";
  if (relative === "src/catalog-fixtures.mjs") return "catalog";
  if (["src/normalizer.mjs", "src/routes.mjs"].includes(relative)) return "adapter";
  if (relative.startsWith("src/platform-") || relative.startsWith("platform/")) return "platform";
  if (relative.startsWith("src/")) return "runtime";
  return "support";
}

async function filesBelow(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (isExcluded(relative)) continue;
    if (entry.isDirectory()) files.push(...await filesBelow(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`non-regular implementation input: ${relative}`);
  }
  return files.sort();
}

function isExcluded(relative) {
  return excludedPrefixes.some((prefix) => relative === prefix || relative.startsWith(`${prefix}/`));
}

function isText(contents) {
  return !contents.subarray(0, Math.min(contents.length, 8192)).includes(0);
}

function git(args) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8", timeout: 30_000, maxBuffer: 8 * 1024 * 1024 });
}

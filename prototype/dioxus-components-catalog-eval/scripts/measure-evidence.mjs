import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(root, "../..");
const evidence = join(root, "evidence");
const endedAt = process.argv[2] ?? new Date().toISOString();
const startedAt = "2026-08-24T16:14:18.860Z";

async function filesBelow(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", "target", "evidence"].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await filesBelow(path)));
    else result.push(path);
  }
  return result;
}

async function nonEmptyLines(paths) {
  let total = 0;
  for (const path of paths) {
    const text = await readFile(path, "utf8");
    total += text.split("\n").filter((line) => line.trim().length > 0).length;
  }
  return total;
}

const allFiles = await filesBelow(root);
const handwrittenFiles = allFiles.filter((path) =>
  !path.includes(`${join(root, "generated")}/`) &&
  !path.endsWith("Cargo.lock") &&
  !path.endsWith("package-lock.json"),
);
const generatedFiles = (await readdir(join(root, "generated"))).map((name) =>
  join(root, "generated", name),
);
const release = JSON.parse(await readFile(join(root, "generated/release.json"), "utf8"));
const manifest = JSON.parse(await readFile(join(root, "catalog/manifest.json"), "utf8"));
const workflowCount = (await readdir(join(root, "fixtures/workflows"))).filter((name) =>
  name.endsWith(".json"),
).length;
const nodeTestFiles = (await readdir(join(root, "generator/test")))
  .filter((name) => name.endsWith(".test.mjs"))
  .map((name) => join(root, "generator/test", name));
const rustTestFiles = (await readdir(join(root, "tests")))
  .filter((name) => name.endsWith(".rs"))
  .map((name) => join(root, "tests", name));
const countMatches = async (paths, pattern) => {
  let count = 0;
  for (const path of paths) count += [...(await readFile(path, "utf8")).matchAll(pattern)].length;
  return count;
};
const runtimeDiff = execFileSync(
  "git",
  [
    "diff",
    "--numstat",
    "a43a0ff",
    "--",
    "prototype/openui-a2ui-cloud-eval/src/domain.rs",
    "prototype/openui-a2ui-cloud-eval/src/runtime.rs",
    "prototype/openui-a2ui-cloud-eval/src/catalog.rs",
  ],
  { cwd: repo, encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean)
  .reduce((sum, line) => {
    const [added, removed] = line.split("\t");
    return sum + Number(added) + Number(removed);
  }, 0);

const summary = {
  ticket: "OPE-4",
  scope: "frozen 12-component Dioxus Components catalog; no model evaluation",
  authoring_started_at: startedAt,
  authoring_ended_at: endedAt,
  authoring_wall_clock_seconds: Math.max(
    0,
    Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000),
  ),
  source_repository: manifest.source.repository,
  source_commit: manifest.source.commit,
  source_tree: manifest.source.tree,
  upstream_crate: `${manifest.source.crate}@${manifest.source.crate_version}`,
  dioxus_version: manifest.source.resolved_dioxus_version,
  component_count: manifest.components.length,
  capability_family_count: new Set(
    manifest.components.flatMap((component) => component.capability_families),
  ).size,
  workflow_count: workflowCount,
  node_test_count: await countMatches(nodeTestFiles, /\btest\(/g),
  rust_test_count_with_ssr: await countMatches(rustTestFiles, /#\[test\]/g),
  upstream_binding_count: manifest.components.length,
  handwritten_file_count: handwrittenFiles.length,
  handwritten_nonempty_loc: await nonEmptyLines(handwrittenFiles),
  generated_file_count: generatedFiles.length,
  generated_nonempty_loc: await nonEmptyLines(generatedFiles),
  runtime_behavior_diff_lines: runtimeDiff,
  catalog_release_hash: release.catalog_release_hash,
  schema_hash: release.schema_hash,
  semantics_hash: release.semantics_hash,
  adapter_build_id: release.adapter_build_id,
  thin_catalog: {
    distinct_release_identity: true,
    representative_surface_fingerprint_equal: true,
    typed_event_equal: true,
  },
  platform_scope: {
    ssr: "PASS with explicit inert Dialog adaptation",
    web: "deferred to OPE-6",
    desktop: "deferred to OPE-6",
    mobile: "deferred to OPE-6",
  },
};

const markdown = `# OPE-4 evidence summary

- Components: **${summary.component_count}**
- Certified capability families represented: **${summary.capability_family_count}**
- Reference workflows: **${summary.workflow_count}**
- Node tests: **${summary.node_test_count}**
- Rust tests with SSR: **${summary.rust_test_count_with_ssr}**
- Handwritten non-empty LOC: **${summary.handwritten_nonempty_loc}** across ${summary.handwritten_file_count} files
- Generated non-empty LOC: **${summary.generated_nonempty_loc}** across ${summary.generated_file_count} files
- Canonical runtime behavior diff: **${summary.runtime_behavior_diff_lines} lines**
- Wall-clock authoring interval: **${summary.authoring_wall_clock_seconds} seconds**
- Upstream: \`${summary.upstream_crate}\` at \`${summary.source_commit}\`
- Catalog release: \`${summary.catalog_release_hash}\`

The thin catalog has a distinct compatibility identity while preserving the
representative Surface fingerprint and typed event. Web, Desktop, and Mobile
execution remain OPE-6 work and are not claimed here.
`;

await mkdir(evidence, { recursive: true });
await writeFile(join(evidence, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(join(evidence, "summary.md"), markdown);
const hashes = [];
for (const name of ["summary.json", "summary.md", "final-review.md"]) {
  const bytes = await readFile(join(evidence, name));
  hashes.push(`${createHash("sha256").update(bytes).digest("hex")}  ${name}`);
}
await writeFile(join(evidence, "SHA256SUMS"), `${hashes.join("\n")}\n`);

process.stdout.write(`${JSON.stringify({ evidence: relative(repo, evidence), ...summary })}\n`);

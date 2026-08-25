import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { deriveArtifacts, loadManifest, writeArtifacts } from "../src/catalog-generator.mjs";

const manifestUrl = new URL("../../catalog/rust-ui-manifest.json", import.meta.url);
const options = { manifestUrl, adapterSource: "../../src/rust_ui.rs", buildPrefix: "ope10" };
const sha = (value) => createHash("sha256").update(value).digest("hex");

test("Rust/UI source certifies eight components, six families, and two workflows", async () => {
  const manifest = await loadManifest(manifestUrl);
  const families = new Set(manifest.components.flatMap((component) => component.capability_families));
  assert.equal(manifest.components.length, 8);
  assert.ok(families.size >= 6);
  assert.equal(Object.keys(manifest.workflow_fixtures).length, 2);
  assert.ok(manifest.components.some((component) => component.name === "Checkbox"));
  assert.deepEqual(manifest.actions.map((action) => action.name), ["submit_profile"]);
  for (const fixture of Object.values(manifest.workflow_fixtures)) {
    assert.equal(fixture.nodes.length, 8);
    assert.ok(fixture.nodes.some((node) => node.kind === "Button"));
  }
});

test("one source deterministically generates all reviewed catalog artifacts", async () => {
  const first = await mkdtemp(join(tmpdir(), "ope10-rust-ui-a-"));
  const second = await mkdtemp(join(tmpdir(), "ope10-rust-ui-b-"));
  await writeArtifacts(first, options);
  await writeArtifacts(second, options);
  const expected = ["CATALOG.md", "SHA256SUMS", "catalog-prompt.md", "openui-library.json", "registry.rs", "release.json", "typed-json-schema.json", "workflow-fixtures.json"];
  assert.deepEqual(await readdir(first), expected);
  assert.deepEqual(await readdir(second), expected);
  for (const file of expected) assert.deepEqual(await readFile(join(first, file)), await readFile(join(second, file)), file);
  const release = JSON.parse(await readFile(join(first, "release.json"), "utf8"));
  assert.equal(release.source.commit, "7fd792520ba5e3ad5354c26ac4e6816c2d156b7c");
  assert.equal(release.source.implementation_commit, "2f87a8d0531d483d5b32df6f89b7979ceb4beb74");
});

test("six frozen maintenance drills are isolated and reproducible", async () => {
  const source = await loadManifest(manifestUrl);
  const sourceHash = sha(JSON.stringify(source));
  const drills = [
    ["component-prop", (next) => { const button = next.components.find((component) => component.name === "Button"); button.prop_order.push("disabled"); button.props.disabled = { type: "boolean", required: false }; }],
    ["component-schema", (next) => { next.components.push({ ...structuredClone(next.components.find((component) => component.name === "Alert")), name: "Callout", implementation: { module: "rust_ui::alert", component: "Alert", source_kind: "copied_upstream_component" } }); }],
    ["action-policy", (next) => { next.actions.push({ name: "archive_profile", input: { target_id: "string" } }); }],
    ["dtcg-token", (next) => { next.tokens.color.accent.$value = "#7c3aed"; }],
    ["catalog-release", (next) => { next.release_version = "0.0.2-ope10"; }],
    ["copy-on-write-migration", (next) => { next.catalog_contract_version = "0.1.1"; next.workflow_fixtures["01-profile-submit"].migration = { from: sourceHash, mode: "copy_on_write" }; }],
  ];
  const run = () => drills.map(([name, mutate]) => { const next = structuredClone(source); mutate(next); return { name, source_hash: sourceHash, result_hash: sha(JSON.stringify(next)) }; });
  const first = run();
  assert.equal(new Set(first.map((result) => result.name)).size, 6);
  assert.ok(first.every((result) => result.result_hash !== sourceHash));
  assert.equal(sha(JSON.stringify(source)), sourceHash, "copy-on-write drills preserve source");
  assert.deepEqual(first, run());
  assert.equal(Object.keys(deriveArtifacts(source).librarySpec.components).length, 8);
});

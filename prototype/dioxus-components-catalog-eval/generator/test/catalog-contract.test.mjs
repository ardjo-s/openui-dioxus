import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { deriveArtifacts, loadManifest, writeArtifacts } from "../src/catalog-generator.mjs";

test("manifest derives exactly 12 OpenUI components without losing prop order", async () => {
  const manifest = await loadManifest();
  const artifacts = deriveArtifacts(manifest);

  assert.equal(manifest.components.length, 12);
  assert.equal(Object.keys(artifacts.librarySpec.components).length, 12);

  for (const component of manifest.components) {
    assert.deepEqual(
      artifacts.registry.find((entry) => entry.name === component.name)?.prop_order,
      component.prop_order,
    );

    const signature = artifacts.librarySpec.components[component.name]?.signature;
    let cursor = -1;
    for (const prop of component.prop_order) {
      const next = signature.indexOf(prop);
      assert.ok(next > cursor, `${component.name}.${prop} is out of order in ${signature}`);
      cursor = next;
    }
  }
});

test("generated contracts cover every family and reject undeclared JSON", async () => {
  const manifest = await loadManifest();
  const artifacts = deriveArtifacts(manifest);
  const expectedFamilies = [
    "action",
    "boolean_input",
    "content",
    "data_display",
    "feedback",
    "layout",
    "navigation_or_overlay",
    "selection",
    "status",
    "text_input",
  ];
  const actualFamilies = [
    ...new Set(manifest.components.flatMap((component) => component.capability_families)),
  ].sort();

  assert.deepEqual(actualFamilies, expectedFamilies);
  assert.equal(artifacts.typedJsonSchema.additionalProperties, false);
  assert.equal(artifacts.typedJsonSchema.properties.state.additionalProperties, false);
  assert.equal(artifacts.typedJsonSchema.properties.nodes.items.oneOf.length, 12);

  for (const component of manifest.components) {
    const nodeSchema = artifacts.typedJsonSchema.$defs[component.name];
    assert.equal(nodeSchema.additionalProperties, false);
    assert.deepEqual(nodeSchema.required, ["kind", ...component.prop_order]);
    const openUiSchema = artifacts.librarySpec.schema.$defs[component.name];
    assert.equal("kind" in openUiSchema.properties, false);
    assert.deepEqual(openUiSchema.required, component.prop_order);
    assert.match(artifacts.prompt, new RegExp(`^${component.name}\\(`, "m"));
    for (const rule of component.usage_rules) assert.ok(artifacts.prompt.includes(rule));
  }
  const tabItemSchema = artifacts.typedJsonSchema.$defs.Tabs.properties.items.items;
  assert.equal(tabItemSchema.additionalProperties, false);
  assert.deepEqual(tabItemSchema.required, ["value", "label", "child"]);
});

test("catalog release artifacts are deterministic and hash verified", async () => {
  const first = await mkdtemp(join(tmpdir(), "ope4-catalog-a-"));
  const second = await mkdtemp(join(tmpdir(), "ope4-catalog-b-"));

  await writeArtifacts(first);
  await writeArtifacts(second);

  const expectedFiles = [
    "CATALOG.md",
    "SHA256SUMS",
    "catalog-prompt.md",
    "openui-library.json",
    "registry.rs",
    "release.json",
    "typed-json-schema.json",
  ];
  assert.deepEqual(await readdir(first), expectedFiles);
  assert.deepEqual(await readdir(second), expectedFiles);

  for (const file of expectedFiles) {
    assert.deepEqual(await readFile(join(first, file)), await readFile(join(second, file)));
  }

  const checksumLines = (await readFile(join(first, "SHA256SUMS"), "utf8"))
    .trim()
    .split("\n");
  assert.equal(checksumLines.length, expectedFiles.length - 1);
  for (const line of checksumLines) {
    const [expected, file] = line.split("  ");
    const actual = createHash("sha256").update(await readFile(join(first, file))).digest("hex");
    assert.equal(actual, expected, file);
  }

  const release = JSON.parse(await readFile(join(first, "release.json"), "utf8"));
  const adapterSource = Buffer.concat([
    await readFile(new URL("../../Cargo.toml", import.meta.url)),
    await readFile(new URL("../../Cargo.lock", import.meta.url)),
    await readFile(new URL("../../src/lib.rs", import.meta.url)),
    await readFile(new URL("../../src/ui.rs", import.meta.url)),
  ]);
  assert.equal(
    release.adapter_source_hash,
    createHash("sha256").update(adapterSource).digest("hex"),
  );
  assert.ok(release.adapter_build_id.includes(release.adapter_source_hash.slice(0, 16)));
});

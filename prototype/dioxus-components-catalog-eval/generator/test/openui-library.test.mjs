import assert from "node:assert/strict";
import test from "node:test";

import { createParser, generateSystemPrompt } from "@openuidev/lang-core";

import { deriveArtifacts, loadManifest } from "../src/catalog-generator.mjs";

test("official OpenUI tooling accepts the generated LibrarySpec and positional order", async () => {
  const artifacts = deriveArtifacts(await loadManifest());
  const prompt = generateSystemPrompt({
    library: artifacts.librarySpec,
    promptOptions: { additionalRules: ["Use only the certified catalog."] },
  });
  assert.ok(prompt.includes(artifacts.librarySpec.components.Toolbar.signature));

  const parser = createParser(artifacts.librarySpec.schema, artifacts.librarySpec.root);
  const result = parser.parse('root = Toolbar("root", "vertical", [])');
  assert.deepEqual(result.meta.errors, []);
  assert.equal(result.root?.props.id, "root");
  assert.equal(result.root?.props.orientation, "vertical");
  assert.deepEqual(result.root?.props.children, []);
});

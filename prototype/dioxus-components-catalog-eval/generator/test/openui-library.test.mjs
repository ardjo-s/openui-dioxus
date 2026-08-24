import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createParser, generateSystemPrompt } from "@openuidev/lang-core";

import {
  deriveArtifacts,
  flattenOpenUiTree,
  loadManifest,
} from "../src/catalog-generator.mjs";

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

test("a composed OpenUI tree flattens to the canonical profile Surface", async () => {
  const artifacts = deriveArtifacts(await loadManifest());
  const parser = createParser(artifacts.librarySpec.schema, artifacts.librarySpec.root);
  const result = parser.parse([
    'avatar = Avatar("profile_avatar", "Ada Lovelace", "AL")',
    'label = Label("name_label", "name_input", "Profile name")',
    'input = Input("name_input", "Profile name", "profile_name", "Ada", "Enter a name")',
    'button = Button("submit_button", "Save profile", "SubmitProfile", "profile")',
    'root = Toolbar("profile_toolbar", "vertical", [avatar, label, input, button])',
  ].join("\n"));

  assert.deepEqual(result.meta.errors, []);
  assert.deepEqual(result.meta.unresolved, []);
  assert.deepEqual(result.meta.orphaned, []);
  assert.equal(result.meta.incomplete, false);

  const expected = JSON.parse(
    await readFile(new URL("../../fixtures/workflows/01-profile.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(flattenOpenUiTree(result.root, expected.state), expected);
});

test("nested component refs inside object arrays flatten to stable ids", async () => {
  const artifacts = deriveArtifacts(await loadManifest());
  const parser = createParser(artifacts.librarySpec.schema, artifacts.librarySpec.root);
  const result = parser.parse([
    'toast = Toast("saved_toast", "success", "Saved", "Your activity view is current.")',
    'tabs = Tabs("account_tabs", "active_tab", "activity", [{value: "activity", label: "Activity", child: toast}])',
    'root = Toolbar("navigation_toolbar", "vertical", [tabs])',
  ].join("\n"));

  assert.deepEqual(result.meta.errors, []);
  assert.deepEqual(result.meta.orphaned, []);
  const expected = JSON.parse(
    await readFile(
      new URL("../../fixtures/workflows/05-tabs-feedback.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(flattenOpenUiTree(result.root, expected.state), expected);
});

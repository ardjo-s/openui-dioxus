import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildTypedJsonPrompt,
  typedJsonMinimalExample,
  typedJsonSchema,
  validateTypedJson,
  validateTypedJsonSyntax,
} from "../src/typed-json.mjs";

const fixture = fileURLToPath(new URL("../../fixtures/reference.typed-json.json", import.meta.url));

test("strict typed JSON accepts the reference and syntax-only example", async () => {
  assert.equal(validateTypedJson(await readFile(fixture, "utf8")).ok, true);
  assert.equal(validateTypedJsonSyntax(typedJsonMinimalExample).success, true);
  assert.equal(typedJsonSchema.additionalProperties, false);
  assert.match(buildTypedJsonPrompt(), /JSON Schema/);
  assert.match(buildTypedJsonPrompt(), /ApproveExpense/);
});

test("semantic acceptance requires exactly one node of every catalog kind", async () => {
  const value = JSON.parse(await readFile(fixture, "utf8"));
  value.nodes.push({ kind: "Text", id: "extra-text", text: "extra" });
  assert.equal(validateTypedJson(JSON.stringify(value)).ok, false);
  assert.match(JSON.stringify(validateTypedJson(JSON.stringify(value)).diagnostics), /catalog-cardinality/);
});

test("strict typed JSON rejects unknown data at every catalog level", async () => {
  const value = JSON.parse(await readFile(fixture, "utf8"));
  value.unknown = true;
  assert.equal(validateTypedJson(JSON.stringify(value)).ok, false);
  delete value.unknown;
  value.nodes[0].unknown = true;
  assert.equal(validateTypedJson(JSON.stringify(value)).ok, false);
  delete value.nodes[0].unknown;
  value.nodes.find((node) => node.kind === "Table").rows[0].unknown = "bad";
  assert.equal(validateTypedJson(JSON.stringify(value)).ok, false);
});

test("strict typed JSON rejects unknown catalog capabilities", async () => {
  const source = await readFile(fixture, "utf8");
  const cases = [
    (value) => (value.nodes[0].kind = "Dangerous"),
    (value) => (value.nodes.find((node) => node.kind === "Button").action.name = "DeleteAll"),
    (value) => (value.nodes.find((node) => node.kind === "Input").state_key = "secret"),
    (value) => value.nodes.push({ ...value.nodes[0] }),
    (value) => (value.nodes.find((node) => node.kind === "Card").child = "missing"),
    (value) => (value.root = "title"),
  ];
  for (const mutate of cases) {
    const value = JSON.parse(source);
    mutate(value);
    assert.equal(validateTypedJson(JSON.stringify(value)).ok, false);
  }
});

test("strict typed JSON rejects node overflow", async () => {
  const value = JSON.parse(await readFile(fixture, "utf8"));
  value.nodes = Array.from({ length: 65 }, (_, index) => ({
    kind: "Text",
    id: `node-${index}`,
    text: "bounded",
  }));
  value.root = "node-0";
  assert.equal(validateTypedJson(JSON.stringify(value)).ok, false);
});

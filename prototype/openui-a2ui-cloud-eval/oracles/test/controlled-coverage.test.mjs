import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { coverageFor } from "../src/controlled-coverage.mjs";

test("all arms require exactly eight nodes, not merely all eight distinct kinds", async () => {
  const fixture = JSON.parse(
    await readFile(new URL("../../fixtures/reference.typed-json.json", import.meta.url), "utf8"),
  );
  const nodes = Object.fromEntries(fixture.nodes.map((node) => [node.id, node]));
  const surface = {
    nodes,
    fields: { review_note: "", status_filter: "pending" },
  };
  const accepted = coverageFor(surface, { has_all_components: true }, null);
  assert.equal(accepted.passed, true);
  surface.nodes.extra = { kind: "Text", id: "extra", text: "extra" };
  const rejected = coverageFor(surface, { has_all_components: true }, null);
  assert.equal(rejected.passed, false);
  assert.equal(rejected.node_count, 9);
});

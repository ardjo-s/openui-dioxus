import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildReactApp } from "../platform/react/build.mjs";

test("official json-render React app bundles the frozen canary fixture", async () => {
  const result = await buildReactApp();
  const html = await readFile(result.index, "utf8");
  const bundle = await readFile(result.bundle, "utf8");

  assert.match(html, /id="app"/);
  assert.ok(bundle.length > 10_000);
  assert.match(bundle, /official-react-web/);
  assert.equal(result.component_count, 12);
});

import assert from "node:assert/strict";
import test from "node:test";

import { measureImplementationFootprint } from "../src/footprint.mjs";

test("implementation footprint separates authorship, roles, and version-control numstat", async () => {
  const footprint = await measureImplementationFootprint();
  const authorshipFiles = Object.values(footprint.authorship).reduce((total, value) => total + value.file_count, 0);
  const roleFiles = Object.values(footprint.role).reduce((total, value) => total + value.file_count, 0);

  assert.equal(authorshipFiles, footprint.total.file_count);
  assert.equal(roleFiles, footprint.total.file_count);
  assert.deepEqual(Object.keys(footprint.required_categories), [
    "handwritten",
    "generated",
    "test",
    "catalog",
    "adapter",
    "runtime",
    "platform",
    "baseline",
  ]);
  for (const value of Object.values(footprint.required_categories)) {
    assert.ok(value.file_count > 0);
    assert.ok(value.nonblank_lines > 0);
  }
  assert.equal(footprint.version_control.base_ref, "codex/ope-10-rust-ui-catalog");
  assert.equal(footprint.version_control.source_entries_measured, footprint.total.file_count);
});

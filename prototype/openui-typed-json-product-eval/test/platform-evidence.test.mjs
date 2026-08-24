import assert from "node:assert/strict";
import test from "node:test";

import { evidenceStatus } from "../platform/evidence-status.mjs";

const pass = (platform) => ({ platform, status: "PASS", passed: true, evidence_complete: true });

test("platform evidence distinguishes infrastructure gaps from product failures", () => {
  const complete = Object.fromEntries(["web", "desktop", "ios", "android"].map((name) => [name, pass(name)]));
  assert.equal(evidenceStatus(complete), "PASS");
  assert.equal(evidenceStatus({ ...complete, ios: { ...complete.ios, status: "FAIL", passed: false } }), "FAIL");
  assert.equal(evidenceStatus({ ...complete, android: { platform: "android", status: "INVALID_EVAL", passed: false, evidence_complete: false } }), "INVALID_EVAL");
});

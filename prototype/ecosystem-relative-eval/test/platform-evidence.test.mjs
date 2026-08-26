import assert from "node:assert/strict";
import test from "node:test";

import { verifyPlatformEvidence } from "../src/platform-evidence.mjs";

test("accepted platform evidence proves the Dioxus and official React routes", async () => {
  const result = await verifyPlatformEvidence();

  assert.equal(result.verified, true, JSON.stringify(result.diagnostics));
  assert.deepEqual(Object.keys(result.proofs).sort(), ["dioxus_desktop", "dioxus_web", "react_web"]);
  assert.equal(result.proofs.dioxus_desktop.routes.join(","), "openui,typed-json");
  assert.equal(result.proofs.dioxus_web.state_action_update_replay, true);
  assert.equal(result.proofs.react_web.official_runtime, "@json-render/react@0.19.0");
  assert.ok(result.artifact_count >= 9);
  assert.match(result.recursive_sha256, /^[a-f0-9]{64}$/);
});

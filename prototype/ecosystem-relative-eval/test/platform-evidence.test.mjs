import assert from "node:assert/strict";
import test from "node:test";

import { validateObservableAccessibilityProof, verifyPlatformEvidence } from "../src/platform-evidence.mjs";

test("accessibility evidence cannot claim success without keyboard, focus, and announced feedback", () => {
  const result = validateObservableAccessibilityProof({
    accessibility_contract_version: "wrong",
    keyboard_operable: false,
    focus_visible: false,
    feedback_announced: false,
    host_receipt_outside_component_coverage: false,
  });

  assert.equal(result.passed, false);
  assert.deepEqual(result.diagnostics.map((diagnostic) => diagnostic.message), [
    "accessibility contract version differs",
    "keyboard operation proof missing",
    "visible focus proof missing",
    "feedback announcement proof missing",
    "host receipt ownership proof missing",
  ]);
});

test("accepted platform evidence proves the Dioxus and official React routes", async () => {
  const result = await verifyPlatformEvidence();

  assert.equal(result.verified, true, JSON.stringify(result.diagnostics));
  assert.deepEqual(Object.keys(result.proofs).sort(), ["dioxus_desktop", "dioxus_web", "react_web"]);
  assert.equal(result.proofs.dioxus_desktop.routes.join(","), "openui,typed-json");
  assert.equal(result.proofs.dioxus_web.state_action_update_replay, true);
  assert.equal(result.proofs.react_web.official_runtime, "@json-render/react@0.19.0");
  for (const route of [result.proofs.react_web, result.proofs.dioxus_web]) {
    assert.equal(route.accessibility_contract_version, "ope-14-feedback-ownership-v1");
    assert.equal(route.keyboard_operable, true);
    assert.equal(route.focus_visible, true);
    assert.equal(route.feedback_announced, true);
    assert.equal(route.host_receipt_outside_component_coverage, true);
  }
  assert.equal(result.proofs.dioxus_desktop.accessibility_contract_version, "ope-14-feedback-ownership-v1");
  assert.ok(result.artifact_count >= 9);
  assert.match(result.recursive_sha256, /^[a-f0-9]{64}$/);
});

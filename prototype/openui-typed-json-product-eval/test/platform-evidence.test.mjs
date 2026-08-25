import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { evidenceStatus } from "../platform/evidence-status.mjs";

const pass = (platform) => ({ platform, status: "PASS", passed: true, evidence_complete: true });

test("platform evidence distinguishes infrastructure gaps from product failures", () => {
  const complete = Object.fromEntries(["web", "desktop", "ios", "android"].map((name) => [name, pass(name)]));
  assert.equal(evidenceStatus(complete), "PASS");
  assert.equal(evidenceStatus({ ...complete, ios: { ...complete.ios, status: "FAIL", passed: false } }), "FAIL");
  assert.equal(evidenceStatus({ ...complete, android: { platform: "android", status: "INVALID_EVAL", passed: false, evidence_complete: false } }), "INVALID_EVAL");
});

test("Android evidence isolates the build from an optimized emulator", async () => {
  const workflow = await readFile(
    new URL("../../../.github/workflows/ope6-platform-eval.yml", import.meta.url),
    "utf8",
  );
  const runner = await readFile(new URL("../platform/run-android.sh", import.meta.url), "utf8");
  const buildStep = workflow.indexOf("Build Android evaluation APK");
  const emulatorStep = workflow.indexOf("Run Android Emulator evaluation");
  const kvmStep = workflow.indexOf("Enable KVM");

  assert.ok(buildStep >= 0, "workflow must build the APK explicitly");
  assert.ok(buildStep < emulatorStep, "APK build must finish before the emulator starts");
  assert.ok(kvmStep >= 0 && kvmStep < emulatorStep, "KVM must be enabled before the emulator starts");
  assert.match(workflow, /OPE6_ANDROID_BUILD_ONLY: "true"/);
  assert.match(runner, /apk=\$\{OPE6_ANDROID_APK:-\}/);
  assert.match(runner, /status=PASS\s*$/m);
});

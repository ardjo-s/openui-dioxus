import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { evidenceStatus } from "../platform/evidence-status.mjs";

const pass = (platform) => ({ platform, status: "PASS", passed: true, evidence_complete: true });
const workflow = await readFile(new URL("../../../.github/workflows/ope6-platform-eval.yml", import.meta.url), "utf8");
const installer = await readFile(new URL("../platform/install-dioxus-cli.sh", import.meta.url), "utf8");

test("platform evidence distinguishes infrastructure gaps from product failures", () => {
  const complete = Object.fromEntries(["web", "desktop", "ios", "android"].map((name) => [name, pass(name)]));
  assert.equal(evidenceStatus(complete), "PASS");
  assert.equal(evidenceStatus({ ...complete, ios: { ...complete.ios, status: "FAIL", passed: false } }), "FAIL");
  assert.equal(evidenceStatus({ ...complete, android: { platform: "android", status: "INVALID_EVAL", passed: false, evidence_complete: false } }), "INVALID_EVAL");
});

test("Android evidence isolates the build from an optimized emulator", async () => {
  const runner = await readFile(new URL("../platform/run-android.sh", import.meta.url), "utf8");
  const buildStep = workflow.indexOf("Build Android evaluation APK");
  const emulatorStep = workflow.indexOf("Run Android Emulator evaluation");
  const kvmStep = workflow.indexOf("Enable KVM");

  assert.ok(buildStep >= 0, "workflow must build the APK explicitly");
  assert.ok(buildStep < emulatorStep, "APK build must finish before the emulator starts");
  assert.ok(kvmStep >= 0 && kvmStep < emulatorStep, "KVM must be enabled before the emulator starts");
  assert.match(workflow, /OPE6_ANDROID_BUILD_ONLY: "true"/);
  assert.match(workflow, /xdotool/);
  assert.match(runner, /apk=\$\{OPE6_ANDROID_APK:-\}/);
  assert.match(runner, /status=PASS\s*$/m);
});

function jobSection(name) {
  const start = workflow.indexOf(`  ${name}:`);
  assert.notEqual(start, -1, `workflow must define ${name} job`);
  const rest = workflow.slice(start + name.length + 3);
  const next = rest.search(/^  [a-z-]+:/m);
  return workflow.slice(start, next === -1 ? workflow.length : start + name.length + 3 + next);
}

test("full workflow keeps every certified platform independently rerunnable", () => {
  assert.match(workflow, /codex\/ope-6-platform-accessibility, codex\/ope-8-ci-speed/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /profile:/);
  assert.match(workflow, /quick/);
  assert.match(workflow, /full/);
  assert.doesNotMatch(workflow, /web-desktop:/);

  for (const platform of ["web", "desktop", "ios", "android"]) {
    const section = jobSection(platform);
    assert.match(section, /Upload .* evidence/);
    assert.match(section, /Ensure .* failure evidence manifest/);
    assert.match(section, /if-no-files-found: error/);
    assert.match(section, /if: always\(\)/);
    assert.match(section, /outcome/);
  }
  assert.match(jobSection("aggregate"), /needs: \[web, desktop, ios, android\]/);
  assert.match(jobSection("aggregate"), /evidence_status == "PASS"/);
});

test("quick workflow is explicitly bounded and cannot claim the four-platform matrix", () => {
  const quick = jobSection("quick");
  assert.match(quick, /profile.*quick|quick.*profile/);
  assert.match(quick, /npm ci --prefix prototype\/dioxus-components-catalog-eval\/generator/);
  assert.doesNotMatch(quick, /aggregate-evidence|ope6-platform-aggregate|evidence_status/);
  assert.match(jobSection("aggregate"), /profile.*full|full.*profile/);
});

test("cold full jobs install every Node dependency used by their checks", () => {
  const desktop = jobSection("desktop");
  assert.match(desktop, /actions\/setup-node@v7\.0\.0/);
  assert.match(desktop, /node-version: 22/);
  assert.match(desktop, /dioxus-components-catalog-eval\/generator\/package-lock\.json/);
  assert.match(desktop, /openui-typed-json-product-eval\/package-lock\.json/);
  assert.match(desktop, /xdotool/);
  assert.match(desktop, /npm ci --prefix prototype\/dioxus-components-catalog-eval\/generator/);
  assert.match(desktop, /npm ci --prefix prototype\/openui-typed-json-product-eval/);
});

test("build caches include OS, target, Dioxus version, and Cargo.lock", () => {
  assert.match(workflow, /actions\/cache@v4/);
  assert.match(workflow, /runner\.os/);
  assert.match(workflow, /runner\.arch/);
  assert.match(workflow, /0\.7\.10/);
  assert.match(workflow, /hashFiles\(['"]prototype\/dioxus-components-catalog-eval\/Cargo\.lock['"]\)/);
  assert.match(workflow, /target/);
});

test("CLI installer pins the official release and verifies its published SHA-256 before execution", () => {
  assert.match(installer, /version=0\.7\.10/);
  assert.match(installer, /github\.com\/DioxusLabs\/dioxus\/releases\/download/);
  assert.match(installer, /\.sha256/);
  assert.match(installer, /sha(256)?sum|shasum -a 256/);
  assert.match(installer, /test ["']\$actual["'] = ["']\$expected["']/);
});

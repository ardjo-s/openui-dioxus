import assert from "node:assert/strict";
import { chmod, mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const runner = fileURLToPath(new URL("../platform/run-android.sh", import.meta.url));
const marker = "PLATFORM_SELF_TEST_PASS surfaces=40 families=5";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAUAAAADwCAIAAAD+Tyo8AAACD0lEQVR42u3TQQkAAAgEwatga8MZyg7+hIFJsLCpHuCpSAAGBgwMGBgMDBgYMDBgYDAwYGDAwGBgwMCAgQEDg4EBAwMGBgwMBgYMDBgYDAwYGDAwYGAwMGBgwMCAgcHAgIEBA4OBAQMDBgYMDAYGDAwYGAysAhgYMDBgYDAwYGDAwICBwcCAgQEDg4EBAwMGBgwMBgYMDBgYMDAYGDAwYGAwMGBgwMCAgcHAgIEBAwMGBgMDBgYMDAYGDAwYGDAwGBgwMGBgMDBgYMDAgIHBwICBAQMDBgYDAwYGDAwGBgwMGBgwMBgYMDBgYMDAYGDAwICBwcCAgQEDAwYGAwMGBgwMGBgMDBgYMDAYGDAwYGDAwGBgwMCAgcHAgIEBAwMGBgMDBgYMDBgYDAwYGDAwGBgwMGBgwMBgYMDAgIEBA4OBAQMDBgYDAwYGDAwYGAwMGBgwMBhYBTAwYGDAwGBgwMCAgQEDg4EBAwMGBgMDBgYMDBgYDAwYGDAwYGAwMGBgwMBgYMDAgIEBA4OBAQMDBgYMDAYGDAwYGAwMGBgwMGBgMDBgYMDAYGDAwICBAQODgQEDAwYGDAwGBgwMGBgMDBgYMDBgYDAwYGDAwICBwcCAgQEDg4EBAwMGBgwMBgYMDBgYMDAYGDAwYGAwMGBgwMCAgcHAgIEBA4OBAQMDBgYMDAYGDAwYGDAwGBgwMHC3btB0fwmLpfAAAAAASUVORK5CYII=",
  "base64",
);
const blankPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAUAAAADwCAIAAAD+Tyo8AAACCUlEQVR42u3TQQkAAAwDsfo33XrYb5BIOLgUeCsSgIEBAwMGBgMDBgYMDBgYDAwYGDAwGBgwMGBgwMBgYMDAgIEBA4OBAQMDBgYDAwYGDAwYGAwMGBgwMGBgMDBgYMDAYGDAwICBAQODgQEDAwYGAwMGBgwMGBgMDBgYMDBgYDAwYGDAwGBgwMCAgQEDg4EBAwMGBgwMBgYMDBgYDAwYGDAwYGAwMGBgwMCAgcHAgIEBA4OBAQMDBgYMDAYGDAwYGAwMGBgwMGBgMDBgYMDAgIHBwICBAQODgQEDAwYGDAwGBgwMGBgwMBgYMDBgYDAwYGDAwICBwcCAgQEDAwYGAwMGBgwMBgYMDBgYMDAYGDAwYGAwMGBgwMCAgcHAgIEBAwMGBgMDBgYMDAYGDAwYGDAwGBgwMGBgwMBgYMDAgIHBwICBAQMDBgYDAwYGDAwGBgwMGBgwMBgYMDBgYMDAYGDAwICBwcCAgQEDAwYGAwMGBgwMGBgMDBgYMDAYGDAwYGDAwGBgwMCAgQEDg4EBAwMGBgMDBgYMDBgYDAwYGDAwGBgwMGBgwMBgYMDAgIEBA4OBAQMDBgYDAwYGDAwYGAwMGBgwMGBgMDBgYMDAYGDAwICBAQODgQEDAwYGDAwGBgwMGBgMDBgYMDBgYDAwYGDAwGBgwMCAgQEDg4EBAwMGBgwMBgYMDNwNdNewgYHrK5IAAAAASUVORK5CYII=",
  "base64",
);
const lowContrastPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAUAAAADwCAIAAAD+Tyo8AAACCklEQVR42u3TQQkAAAwDsfrXWwH1sN8gkXBwKfBWJAADAwYGDAwGBgwMGBgwMBgYMDBgYDAwYGDAwICBwcCAgQEDAwYGAwMGBgwMBgYMDBgYMDAYGDAwYGDAwGBgwMCAgcHAgIEBAwMGBgMDBgYMDAYGDAwYGDAwGBgwMGBgwMBgYMDAgIHBwICBAQMDBgYDAwYGDAwYGAwMGBgwMBgYMDBgYMDAYGDAwICBAQODgQEDAwYGAwMGBgwMGBgMDBgYMDAYGDAwYGDAwGBgwMCAgQEDg4EBAwMGBgMDBgYMDBgYDAwYGDAwYGAwMGBgwMBgYMDAgIEBA4OBAQMDBgYMDAYGDAwYGAwMGBgwMGBgMDBgYMDAYGDAwICBAQODgQEDAwYGDAwGBgwMGBgMDBgYMDBgYDAwYGDAwICBwcCAgQEDg4EBAwMGBgwMBgYMDBgYDAwYGDAwYGAwMGBgwMCAgcHAgIEBA4OBAQMDBgYMDAYGDAwYGDAwGBgwMGBgMDBgYMDAgIHBwICBAQMDBgYDAwYGDAwGBgwMGBgwMBgYMDBgYDAwYGDAwICBwcCAgQEDAwYGAwMGBgwMBgYMDBgYMDAYGDAwYGDAwGBgwMCAgcHAgIEBAwMGBgMDBgYMDBgYDAwYGDAwGBgwMGBgwMBgYMDAgIHBwICBAQMDBgYDAwYGDAwYGAwMGBi4G93tAkeaNNfaAAAAAElFTkSuQmCC",
  "base64",
);
const blackPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAUAAAADwCAIAAAD+Tyo8AAAA9UlEQVR42u3BAQEAAACCIP+vbkhAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPBohR0AAeRzGuEAAAAASUVORK5CYII=",
  "base64",
);

test("Android runner passes only with exact marker and valid screenshot evidence", async (t) => {
  const run = await runtimeScenario(t, "success");

  assert.equal(run.process.status, 0, `${run.process.stderr}\n${run.calls}\n${JSON.stringify(run.result)}`);
  assert.deepEqual(run.result, {
    platform: "android",
    status: "PASS",
    passed: true,
    evidence_complete: true,
    surfaces: 40,
    families: 5,
    error: null,
  });
  assert.equal(await readFile(path.join(run.evidence, "traces/android-marker.log"), "utf8"), `${marker}\n`);
  assert.ok((await stat(path.join(run.evidence, "screenshots/android-emulator.png"))).size > 24);
});

test("Android runner keeps capture and transport failures out of product evidence", async (t) => {
  const screenshot = await runtimeScenario(t, "screenshot-failure");
  assert.equal(screenshot.process.status, 1);
  assert.equal(screenshot.result.status, "INVALID_EVAL");
  assert.equal(screenshot.result.passed, false);
  assert.equal(screenshot.result.error, "Android screenshot capture failed");

  const transport = await runtimeScenario(t, "launch-transport");
  assert.equal(transport.process.status, 1);
  assert.equal(transport.result.status, "INVALID_EVAL");
  assert.equal(transport.result.passed, false);
  assert.equal(transport.result.error, "Android launch transport failed");

  const blank = await runtimeScenario(t, "blank-screenshot");
  assert.equal(blank.process.status, 1);
  assert.equal(blank.result.status, "INVALID_EVAL");
  assert.equal(blank.result.passed, false);
  assert.equal(blank.result.error, "Android screenshot content invalid");

  const lowContrast = await runtimeScenario(t, "low-contrast-screenshot");
  assert.equal(lowContrast.process.status, 1);
  assert.equal(lowContrast.result.status, "INVALID_EVAL");
  assert.equal(lowContrast.result.error, "Android screenshot content invalid");

  const root = await runtimeScenario(t, "root-screenshot");
  assert.equal(root.process.status, 1);
  assert.equal(root.result.status, "INVALID_EVAL");
  assert.equal(root.result.error, "Android screenshot content invalid");
});

test("Android build-only mode hands off the APK without starting adb", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "ope6-android-build-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const bin = path.join(root, "bin");
  const evidence = path.join(root, "evidence");
  const githubEnv = path.join(root, "github-env");
  const adbCalls = path.join(root, "adb-calls");
  const builtApk = path.join(repoRoot, "prototype/dioxus-components-catalog-eval/target/dx", `test-${path.basename(root)}`, "app.apk");
  t.after(() => rm(path.dirname(builtApk), { recursive: true, force: true }));
  await mkdir(bin, { recursive: true });
  await writeExecutable(path.join(bin, "rustup"), "#!/usr/bin/env bash\nexit 0\n");
  await writeExecutable(path.join(bin, "adb"), `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> "$FAKE_ADB_CALLS"\nexit 99\n`);
  await writeExecutable(
    path.join(bin, "dx"),
    `#!/usr/bin/env bash\nif [ "${"$"}{FAKE_DX_FAIL:-false}" = true ]; then exit 1; fi\nmkdir -p "$(dirname "$FAKE_BUILT_APK")"\nprintf apk > "$FAKE_BUILT_APK"\n`,
  );

  const process = run({
    PATH: `${bin}:${processEnvPath()}`,
    DIOXUS_CLI_BIN: path.join(bin, "dx"),
    FAKE_ADB_CALLS: adbCalls,
    FAKE_BUILT_APK: builtApk,
    GITHUB_ENV: githubEnv,
    OPE6_ANDROID_BUILD_ONLY: "true",
    OPE6_EVIDENCE_DIR: evidence,
  });

  assert.equal(process.status, 0, process.stderr);
  assert.match(await readFile(githubEnv, "utf8"), /^OPE6_ANDROID_APK=.+\.apk\n$/);
  await assert.rejects(readFile(adbCalls, "utf8"), { code: "ENOENT" });
  await assert.rejects(readFile(path.join(evidence, "android.json"), "utf8"), { code: "ENOENT" });
});

test("Android build-only mode records a compile failure as FAIL", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "ope6-android-build-fail-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const bin = path.join(root, "bin");
  const evidence = path.join(root, "evidence");
  await mkdir(bin, { recursive: true });
  await writeExecutable(path.join(bin, "rustup"), "#!/usr/bin/env bash\nexit 0\n");
  await writeExecutable(path.join(bin, "dx"), "#!/usr/bin/env bash\nexit 1\n");

  const process = run({
    PATH: `${bin}:${processEnvPath()}`,
    DIOXUS_CLI_BIN: path.join(bin, "dx"),
    GITHUB_ENV: path.join(root, "github-env"),
    OPE6_ANDROID_BUILD_ONLY: "true",
    OPE6_EVIDENCE_DIR: evidence,
  });
  const result = JSON.parse(await readFile(path.join(evidence, "android.json"), "utf8"));

  assert.equal(process.status, 1);
  assert.equal(result.status, "FAIL");
  assert.equal(result.passed, false);
  assert.equal(result.error, "Dioxus Android build failed");
});

async function runtimeScenario(t, scenario) {
  const root = await mkdtemp(path.join(tmpdir(), `ope6-android-${scenario}-`));
  t.after(() => rm(root, { recursive: true, force: true }));
  const bin = path.join(root, "bin");
  const evidence = path.join(root, "evidence");
  const apk = path.join(root, "platform-app.apk");
  const screenshot = path.join(root, "android.png");
  const adbCalls = path.join(root, "adb-calls");
  await mkdir(bin, { recursive: true });
  await writeFile(apk, "apk");
  const screenshotBytes = scenario === "blank-screenshot"
    ? blankPng
    : scenario === "low-contrast-screenshot"
      ? lowContrastPng
      : scenario === "root-screenshot"
        ? blackPng
        : png;
  await writeFile(screenshot, screenshotBytes);
  await writeExecutable(path.join(bin, "apkanalyzer"), "#!/usr/bin/env bash\nprintf com.ardjo.openuidioxus.platformeval\n");
  await writeExecutable(path.join(bin, "sleep"), "#!/usr/bin/env bash\nexit 0\n");
  await writeExecutable(
    path.join(bin, "adb"),
    `#!/usr/bin/env bash
set -eu
printf '%s\n' "$*" >> "$FAKE_ADB_CALLS"
case "$*" in
  "get-state") printf device ;;
  "shell cmd package list packages") ;;
  "install -r"*) printf 'Success\\n' ;;
  "logcat -c") ;;
  "shell monkey"*)
    if [ "$FAKE_SCENARIO" = launch-transport ]; then exit 1; fi
    printf 'Events injected: 1\\n'
    ;;
  "logcat -d") printf '%s\\n' "$FAKE_MARKER" ;;
  "shell run-as"*) exit 1 ;;
  "exec-out screencap -p")
    if [ "$FAKE_SCENARIO" = screenshot-failure ]; then exit 1; fi
    cat "$FAKE_SCREENSHOT"
    ;;
  *) printf 'unexpected adb call: %s\\n' "$*" >&2; exit 64 ;;
esac
exit 0
`,
  );

  const env = {
    PATH: `${bin}:${processEnvPath()}`,
    FAKE_MARKER: marker,
    FAKE_ADB_CALLS: adbCalls,
    FAKE_SCENARIO: scenario,
    FAKE_SCREENSHOT: screenshot,
    OPE6_ANDROID_APK: apk,
    OPE6_EVIDENCE_DIR: evidence,
  };
  const process = run(env);
  const result = JSON.parse(await readFile(path.join(evidence, "android.json"), "utf8"));
  const calls = await readFile(adbCalls, "utf8").catch(() => "");
  return { calls, evidence, process, result };
}

function run(env) {
  return spawnSync("bash", [runner], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

function processEnvPath() {
  return process.env.PATH ?? "/usr/bin:/bin";
}

async function writeExecutable(file, content) {
  await writeFile(file, content);
  await chmod(file, 0o755);
}

import { createHash } from "node:crypto";
import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runBoundedProcess } from "./subprocess.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const screenshotChecker = path.resolve(root, "../openui-typed-json-product-eval/platform/check-screenshot.py");

export async function verifyPlatformEvidence({ evidenceRoot = path.join(root, "evidence"), expected = null } = {}) {
  const diagnostics = [];
  const reactWeb = await readJson(path.join(evidenceRoot, "react-web-local", "react-web.json"), diagnostics, "react_web");
  const dioxusWeb = await readJson(path.join(evidenceRoot, "dioxus-web-local", "dioxus-web.json"), diagnostics, "dioxus_web");
  const dioxusDesktop = await readJson(path.join(evidenceRoot, "dioxus-desktop-local", "dioxus-desktop.json"), diagnostics, "dioxus_desktop");
  const directRequired = Boolean(expected?.direct_rsx_binding_sha256);
  const directPath = path.join(evidenceRoot, "direct-rsx-web-local", "direct-rsx-web.json");
  const directAvailable = await exists(directPath);
  const directRsx = directRequired || directAvailable
    ? await readJson(directPath, diagnostics, "direct_rsx_web")
    : null;
  const expectedReactSurfaces = expected?.react_surface_count ?? 1;
  const expectedDioxusSurfaces = expected?.dioxus_surface_count ?? 2;
  const expectedDirectSurfaces = expected?.direct_rsx_surface_count ?? 2;
  const reactScreenshots = reactWeb?.screenshots ?? (reactWeb?.screenshot ? [reactWeb.screenshot] : []);
  const reactReceipts = reactWeb?.action_receipts ?? (reactWeb?.action_receipt ? [reactWeb.action_receipt] : []);
  const reactSurfaceCount = reactWeb?.surface_count ?? reactScreenshots.length;
  const dioxusSurfaceCount = dioxusWeb?.surface_count ?? dioxusWeb?.screenshots?.length ?? 0;
  const desktopSurfaceCount = dioxusDesktop?.surface_count ?? Number(dioxusDesktop?.marker?.match(/surfaces=(\d+)/u)?.[1] ?? 0);
  const desktopScreenshots = dioxusDesktop?.screenshots ?? (dioxusDesktop?.screenshot ? [dioxusDesktop.screenshot] : []);
  const directSurfaceCount = directRsx?.surface_count ?? directRsx?.scenarios?.length ?? 0;

  check(reactWeb?.passed === true, diagnostics, "react_web", "passed must be true");
  check(reactWeb?.official_runtime === "@json-render/react@0.19.0", diagnostics, "react_web", "official runtime pin differs");
  check(reactWeb?.state_changed === true && typeof reactWeb?.action_receipt === "string", diagnostics, "react_web", "state or typed action proof missing");
  check(reactWeb?.accessibility_blocking_findings === 0, diagnostics, "react_web", "blocking accessibility finding");
  checkObservableAccessibility(reactWeb, diagnostics, "react_web");
  checkBinding(reactWeb, diagnostics, "react_web");
  check(reactSurfaceCount === expectedReactSurfaces, diagnostics, "react_web", "surface count differs");
  check(reactReceipts.length === expectedReactSurfaces, diagnostics, "react_web", "action receipt count differs");
  for (const screenshot of reactScreenshots) {
    await requireArtifact(path.join(evidenceRoot, "react-web-local", "screenshots", screenshot), diagnostics, `react_web:${screenshot}`, 1024);
  }
  check(reactScreenshots.length === expectedReactSurfaces, diagnostics, "react_web", "screenshot count differs");

  check(dioxusWeb?.passed === true, diagnostics, "dioxus_web", "passed must be true");
  check(sameStrings(dioxusWeb?.routes, ["openui", "typed-json"]), diagnostics, "dioxus_web", "route set differs");
  check(dioxusWeb?.state_action_update_replay === true, diagnostics, "dioxus_web", "state, action, update, or replay proof missing");
  check(dioxusWeb?.accessibility_blocking_findings === 0, diagnostics, "dioxus_web", "blocking accessibility finding");
  checkObservableAccessibility(dioxusWeb, diagnostics, "dioxus_web");
  checkBinding(dioxusWeb, diagnostics, "dioxus_web");
  for (const screenshot of dioxusWeb?.screenshots ?? []) {
    await requireArtifact(path.join(evidenceRoot, "dioxus-web-local", "screenshots", screenshot), diagnostics, `dioxus_web:${screenshot}`, 1024);
  }
  check(dioxusSurfaceCount === expectedDioxusSurfaces, diagnostics, "dioxus_web", "surface count differs");
  check((dioxusWeb?.screenshots?.length ?? 0) === expectedDioxusSurfaces, diagnostics, "dioxus_web", "screenshot count differs");

  check(dioxusDesktop?.passed === true && dioxusDesktop?.evidence_complete === true, diagnostics, "dioxus_desktop", "executed evidence is incomplete");
  check(sameStrings(dioxusDesktop?.routes, ["openui", "typed-json"]), diagnostics, "dioxus_desktop", "route set differs");
  const expectedDesktopMarker = `OPE11_DIOXUS_SELF_TEST_PASS surfaces=${expectedDioxusSurfaces}`;
  check(desktopSurfaceCount === expectedDioxusSurfaces, diagnostics, "dioxus_desktop", "surface count differs");
  check(dioxusDesktop?.marker === expectedDesktopMarker, diagnostics, "dioxus_desktop", "runtime marker differs");
  check(dioxusDesktop?.accessibility_contract_version === "ope-15-route-neutral-patterns-v1", diagnostics, "dioxus_desktop", "accessibility contract version differs");
  checkBinding(dioxusDesktop, diagnostics, "dioxus_desktop");
  check(dioxusDesktop?.manifest_hash === dioxusWeb?.manifest_hash, diagnostics, "dioxus", "Web and Desktop manifest bindings differ");
  check(dioxusDesktop?.binding_sha256 === dioxusWeb?.binding_sha256, diagnostics, "dioxus", "Web and Desktop artifact bindings differ");
  check((dioxusDesktop?.screenshot?.width ?? 0) >= 800 && (dioxusDesktop?.screenshot?.height ?? 0) >= 600, diagnostics, "dioxus_desktop", "screenshot dimensions are too small");
  await requireArtifact(path.join(evidenceRoot, "dioxus-desktop-local", "screenshots", dioxusDesktop?.screenshot?.file ?? ""), diagnostics, "dioxus_desktop:screenshot", 1024);
  const desktopLog = await readText(path.join(evidenceRoot, "dioxus-desktop-local", "traces", "desktop.log"), diagnostics, "dioxus_desktop:trace");
  const renderedMarkersPresent = expected
    ? Array.from({ length: expectedDioxusSurfaces }, (_, index) => `OPE11_DIOXUS_RENDERED index=${index} surfaces=${expectedDioxusSurfaces}`).every((marker) => desktopLog.includes(marker))
    : desktopLog.includes(`OPE11_DIOXUS_RENDERED surfaces=${expectedDioxusSurfaces}`);
  check(renderedMarkersPresent && desktopLog.includes(dioxusDesktop?.marker ?? "missing"), diagnostics, "dioxus_desktop", "render or self-test marker missing from trace");
  if (expected) {
    checkArtifactBindings(reactWeb?.artifacts, expectedReactSurfaces, reactScreenshots, diagnostics, "react_web");
    checkArtifactBindings(dioxusWeb?.artifacts, expectedDioxusSurfaces, dioxusWeb?.screenshots ?? [], diagnostics, "dioxus_web");
    checkArtifactBindings(directRsx?.artifacts, expectedDirectSurfaces, directRsx?.screenshots ?? [], diagnostics, "direct_rsx_web");
    check(desktopScreenshots.length === expectedDioxusSurfaces && desktopScreenshots.every((screenshot) => screenshot.passed === true), diagnostics, "dioxus_desktop", "per-surface screenshot proof differs");
    for (const screenshot of desktopScreenshots) {
      await requireArtifact(path.join(evidenceRoot, "dioxus-desktop-local", "screenshots", screenshot.file ?? ""), diagnostics, `dioxus_desktop:${screenshot.file}`, 1024);
    }
    check(reactWeb?.manifest_hash === expected.manifest_hash, diagnostics, "react_web", "candidate manifest hash differs");
    check(reactWeb?.binding_sha256 === expected.react_binding_sha256, diagnostics, "react_web", "accepted artifact binding differs");
    check(dioxusWeb?.manifest_hash === expected.manifest_hash, diagnostics, "dioxus_web", "candidate manifest hash differs");
    check(dioxusWeb?.binding_sha256 === expected.dioxus_binding_sha256, diagnostics, "dioxus_web", "accepted artifact binding differs");
    check(dioxusDesktop?.manifest_hash === expected.manifest_hash, diagnostics, "dioxus_desktop", "candidate manifest hash differs");
    check(dioxusDesktop?.binding_sha256 === expected.dioxus_binding_sha256, diagnostics, "dioxus_desktop", "accepted artifact binding differs");
    check(directRsx?.manifest_hash === expected.manifest_hash, diagnostics, "direct_rsx_web", "candidate manifest hash differs");
    check(directRsx?.binding_sha256 === expected.direct_rsx_binding_sha256, diagnostics, "direct_rsx_web", "accepted artifact binding differs");
  }
  if (directRequired || directAvailable) {
    check(directRsx?.passed === true, diagnostics, "direct_rsx_web", "passed must be true");
    check(directRsx?.route === "direct-rsx", diagnostics, "direct_rsx_web", "route differs");
    check(directSurfaceCount === expectedDirectSurfaces, diagnostics, "direct_rsx_web", "surface count differs");
    check((directRsx?.scenarios?.length ?? 0) === expectedDirectSurfaces, diagnostics, "direct_rsx_web", "compile-known scenario count differs");
    check(directRsx?.state_changed === true && directRsx?.action_receipts_exactly_once === true && directRsx?.visible_feedback === true, diagnostics, "direct_rsx_web", "state, action, or feedback proof missing");
    check(directRsx?.accessibility_blocking_findings === 0, diagnostics, "direct_rsx_web", "blocking accessibility finding");
    checkObservableAccessibility(directRsx, diagnostics, "direct_rsx_web");
    checkBinding(directRsx, diagnostics, "direct_rsx_web");
    for (const screenshot of directRsx?.screenshots ?? []) {
      await requireArtifact(path.join(evidenceRoot, "direct-rsx-web-local", "screenshots", screenshot), diagnostics, `direct_rsx_web:${screenshot}`, 1024);
    }
    check((directRsx?.screenshots?.length ?? 0) === expectedDirectSurfaces, diagnostics, "direct_rsx_web", "screenshot count differs");
  }

  const roots = ["react-web-local", "dioxus-web-local", "dioxus-desktop-local"];
  if (directRequired || directAvailable) roots.push("direct-rsx-web-local");
  const artifacts = [];
  for (const directory of roots) {
    const absolute = path.join(evidenceRoot, directory);
    if (await exists(absolute)) artifacts.push(...await digestDirectory(absolute, directory));
  }
  return {
    verified: diagnostics.length === 0,
    diagnostics,
    proofs: {
      react_web: reactWeb,
      dioxus_web: dioxusWeb,
      dioxus_desktop: dioxusDesktop,
      ...(directRequired || directAvailable ? { direct_rsx_web: directRsx } : {}),
    },
    artifact_count: artifacts.length,
    recursive_sha256: digest(artifacts.map((entry) => `${entry.path}\0${entry.sha256}`).join("\n")),
  };
}

async function readJson(file, diagnostics, label) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    diagnostics.push({ code: "platform-evidence", label, message: String(error.message) });
    return null;
  }
}

async function readText(file, diagnostics, label) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    diagnostics.push({ code: "platform-evidence", label, message: String(error.message) });
    return "";
  }
}

async function requireArtifact(file, diagnostics, label, minimumBytes) {
  try {
    const metadata = await stat(file);
    check(metadata.isFile() && metadata.size >= minimumBytes, diagnostics, label, `artifact smaller than ${minimumBytes} bytes`);
    const inspection = await runBoundedProcess({
      command: "python3",
      args: [screenshotChecker, file],
      cwd: root,
      env: process.env,
      timeoutMs: 15_000,
      maximumBytes: 1024 * 1024,
    });
    check(!inspection.error && inspection.exitCode === 0 && inspection.process_group_reaped, diagnostics, label, `invalid or blank PNG: ${String(inspection.error ?? inspection.stderr).trim()}`);
  } catch (error) {
    diagnostics.push({ code: "platform-evidence", label, message: String(error.message) });
  }
}

function checkBinding(proof, diagnostics, label) {
  check(typeof proof?.manifest_hash === "string" && /^[a-zA-Z0-9_-]{16,64}$/.test(proof.manifest_hash), diagnostics, label, "manifest binding missing");
  check(typeof proof?.binding_sha256 === "string" && /^[a-f0-9]{64}$/.test(proof.binding_sha256), diagnostics, label, "artifact binding missing");
}

function checkObservableAccessibility(proof, diagnostics, label) {
  diagnostics.push(...validateObservableAccessibilityProof(proof, label).diagnostics);
}

function checkArtifactBindings(artifacts, expectedCount, screenshots, diagnostics, label) {
  check(Array.isArray(artifacts) && artifacts.length === expectedCount, diagnostics, label, "artifact binding count differs");
  if (!Array.isArray(artifacts)) return;
  check(new Set(artifacts.map((artifact) => `${artifact.route}:${artifact.cohort}:${artifact.schedule_scenario_id}`)).size === artifacts.length, diagnostics, label, "artifact bindings are not unique");
  check(artifacts.every((artifact) => screenshots.includes(artifact.screenshot)), diagnostics, label, "artifact screenshot binding differs");
}

export function validateObservableAccessibilityProof(proof, label = "platform") {
  const diagnostics = [];
  check(proof?.accessibility_contract_version === "ope-15-route-neutral-patterns-v1", diagnostics, label, "accessibility contract version differs");
  check(proof?.keyboard_operable === true, diagnostics, label, "keyboard operation proof missing");
  check(proof?.focus_visible === true, diagnostics, label, "visible focus proof missing");
  check(proof?.feedback_announced === true, diagnostics, label, "feedback announcement proof missing");
  check(proof?.host_receipt_outside_component_coverage === true, diagnostics, label, "host receipt ownership proof missing");
  check(proof?.semantic_patterns_verified === true, diagnostics, label, "route-neutral semantic-pattern proof missing");
  return { passed: diagnostics.length === 0, diagnostics };
}

async function digestDirectory(directory, prefix) {
  const entries = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relative = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) entries.push(...await digestDirectory(absolute, relative));
    else if (entry.isFile()) entries.push({ path: relative, sha256: digest(await readFile(absolute)) });
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function check(condition, diagnostics, label, message) {
  if (!condition) diagnostics.push({ code: "platform-evidence", label, message });
}

function sameStrings(actual, expected) {
  return JSON.stringify([...(actual ?? [])].sort()) === JSON.stringify([...expected].sort());
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

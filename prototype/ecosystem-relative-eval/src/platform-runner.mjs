import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { verifyPlatformEvidence } from "./platform-evidence.mjs";
import { buildPlatformProvenance } from "./platform-provenance.mjs";
import { boundedTimeout } from "./deadline.mjs";
import { runBoundedProcess } from "./subprocess.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

export async function writeGeneratedPlatformFixtures(records, outputDirectory, manifestHash = "deterministic-test-manifest", { scope = "canary" } = {}) {
  const { dioxusRecords, jsonRenderRecords, directRsxRecords } = selectPlatformRecords(records, { scope });

  const fixtures = path.join(outputDirectory, "platform-fixtures");
  await mkdir(fixtures, { recursive: true });
  const dioxusProvenance = buildPlatformProvenance(manifestHash, dioxusRecords);
  const reactProvenance = buildPlatformProvenance(manifestHash, jsonRenderRecords);
  const directRsxProvenance = buildPlatformProvenance(manifestHash, directRsxRecords);
  const dioxus = {
    provenance: dioxusProvenance,
    entries: dioxusRecords.map((record) => ({
      route: record.route,
      cohort: record.cohort,
      schedule_scenario_id: record.scenario_id,
      scenario_id: record.source_scenario_id,
      family: record.family,
      surface: record.platform_artifact,
    })),
  };
  const react = scope === "complete"
    ? {
      provenance: reactProvenance,
      entries: jsonRenderRecords.map((record) => ({
        cohort: record.cohort,
        schedule_scenario_id: record.scenario_id,
        scenario_id: record.source_scenario_id,
        family: record.family,
        spec: record.platform_artifact,
      })),
    }
    : {
      provenance: reactProvenance,
      cohort: jsonRenderRecords[0].cohort,
      schedule_scenario_id: jsonRenderRecords[0].scenario_id,
      scenario_id: jsonRenderRecords[0].source_scenario_id,
      family: jsonRenderRecords[0].family,
      spec: jsonRenderRecords[0].platform_artifact,
    };
  const dioxusFixture = path.join(fixtures, "dioxus-surfaces.json");
  const reactFixture = path.join(fixtures, "json-render-spec.json");
  await writeFile(dioxusFixture, `${JSON.stringify(dioxus, null, 2)}\n`);
  await writeFile(reactFixture, `${JSON.stringify(react, null, 2)}\n`);
  const directRsxCrate = path.join(outputDirectory, "direct-rsx-web-crate");
  const directRsxSourceDirectory = path.join(directRsxCrate, "src");
  await mkdir(directRsxSourceDirectory, { recursive: true });
  const directRsxCrateSource = path.join(directRsxSourceDirectory, "main.rs");
  await writeFile(path.join(directRsxCrate, "Cargo.toml"), directRsxCargoManifest());
  await writeFile(path.join(directRsxCrate, "Dioxus.toml"), directRsxDioxusConfig());
  await writeFile(directRsxCrateSource, directRsxWrapper(directRsxRecords, directRsxProvenance));
  const fixtureLabels = await Promise.all([
    dioxusFixture,
    reactFixture,
    path.join(directRsxCrate, "Cargo.toml"),
    path.join(directRsxCrate, "Dioxus.toml"),
    directRsxCrateSource,
  ].map((file) => digestFileLabel(file)));
  const fixtureSha256 = digest(fixtureLabels.join("\n"));
  return {
    dioxus_fixture: dioxusFixture,
    react_fixture: reactFixture,
    sha256: fixtureSha256,
    provenance: { dioxus: dioxusProvenance, react: reactProvenance, direct_rsx: directRsxProvenance },
    direct_rsx_sources: directRsxRecords.map((record) => ({ scenario_id: record.source_scenario_id, sha256: record.artifact_hashes?.platform_artifact_sha256 ?? digest(record.platform_artifact) })),
    direct_rsx_crate: directRsxCrate,
    direct_rsx_crate_source: directRsxCrateSource,
    surface_counts: { dioxus: dioxusRecords.length, react: jsonRenderRecords.length, direct_rsx: directRsxRecords.length },
  };
}

export function selectPlatformRecords(records, { scope = "canary" } = {}) {
  if (!["canary", "complete"].includes(scope)) throw new Error(`unknown platform fixture scope: ${scope}`);
  const accepted = latestAcceptedRecords(records);
  let dioxusRecords;
  let jsonRenderRecords;
  let directRsxRecords;
  if (scope === "canary") {
    const runtime = accepted.filter((record) => record.cohort === "runtime-uncertain");
    const openui = requiredRoute(runtime, "openui");
    const typedCandidates = runtime.filter((record) => record.route === "typed-json");
    const typedJson = typedCandidates.find((record) => record.source_scenario_id !== openui.source_scenario_id) ?? typedCandidates[0];
    if (!typedJson) throw new Error("missing accepted runtime-uncertain typed-json output");
    dioxusRecords = [openui, typedJson];
    jsonRenderRecords = [requiredRoute(runtime, "json-render")];
    directRsxRecords = accepted.filter((record) => record.cohort === "compile-known" && record.route === "direct-rsx")
      .sort((left, right) => left.scenario_id.localeCompare(right.scenario_id));
    if (directRsxRecords.length !== 2) throw new Error("expected two accepted compile-known direct RSX sources");
  } else {
    dioxusRecords = accepted.filter((record) => ["openui", "typed-json"].includes(record.route));
    jsonRenderRecords = accepted.filter((record) => record.route === "json-render");
    directRsxRecords = accepted.filter((record) => record.cohort === "compile-known" && record.route === "direct-rsx");
    if (!dioxusRecords.some((record) => record.route === "openui") || !dioxusRecords.some((record) => record.route === "typed-json")) throw new Error("complete Dioxus fixture is missing a route");
    if (jsonRenderRecords.length === 0 || directRsxRecords.length === 0) throw new Error("complete platform fixture is missing an external or direct route");
  }
  if (dioxusRecords.some((record) => !record.platform_artifact)) throw new Error("validated Dioxus platform Surface missing");
  if (jsonRenderRecords.some((record) => !record.platform_artifact)) throw new Error("validated json-render platform artifact missing");
  if (directRsxRecords.some((record) => typeof record.platform_artifact !== "string")) throw new Error("validated direct RSX source missing");
  return { dioxusRecords, jsonRenderRecords, directRsxRecords };
}

async function digestFileLabel(file) {
  return `${path.basename(file)}\0${digest(await readFile(file))}`;
}

export async function executeGeneratedPlatformProofs({ records, outputDirectory, manifestHash, deadlineMs = Number.POSITIVE_INFINITY, scope = "canary" }) {
  const fixtures = await writeGeneratedPlatformFixtures(records, outputDirectory, manifestHash, { scope });
  const evidenceRoot = path.join(outputDirectory, "platform-evidence");
  const logRoot = path.join(outputDirectory, "platform-run-logs");
  await mkdir(logRoot, { recursive: true });
  const executions = [];
  executions.push(await execute({
    id: "react-web",
    command: "npm",
    args: ["run", "platform:react:test"],
    env: {
      OPE11_JSON_RENDER_FIXTURE: fixtures.react_fixture,
      OPE11_REACT_EVIDENCE_DIR: path.join(evidenceRoot, "react-web-local"),
    },
    logRoot,
    deadlineMs,
  }));
  executions.push(await execute({
    id: "direct-rsx-web",
    command: "npm",
    args: ["run", "platform:direct-rsx:web"],
    env: {
      OPE11_DIRECT_RSX_CRATE: fixtures.direct_rsx_crate,
      OPE11_DIRECT_RSX_EVIDENCE_DIR: path.join(evidenceRoot, "direct-rsx-web-local"),
      OPE11_DIRECT_RSX_TARGET_DIR: process.env.EVAL_DIRECT_RSX_TARGET_DIR ?? path.join(root, "platform/dioxus/target"),
    },
    logRoot,
    deadlineMs,
  }));
  executions.push(await execute({
    id: "dioxus-web",
    command: "npm",
    args: ["run", "platform:dioxus:web"],
    env: {
      OPE11_DIOXUS_FIXTURE_PATH: fixtures.dioxus_fixture,
      OPE11_DIOXUS_WEB_EVIDENCE_DIR: path.join(evidenceRoot, "dioxus-web-local"),
    },
    logRoot,
    deadlineMs,
  }));
  executions.push(await execute({
    id: "dioxus-desktop",
    command: "npm",
    args: ["run", "platform:dioxus:desktop"],
    env: {
      OPE11_DIOXUS_FIXTURE_PATH: fixtures.dioxus_fixture,
      OPE11_DIOXUS_DESKTOP_EVIDENCE_DIR: path.join(evidenceRoot, "dioxus-desktop-local"),
    },
    logRoot,
    deadlineMs,
  }));
  const proof = await verifyPlatformEvidence({
    evidenceRoot,
    expected: {
      manifest_hash: manifestHash,
      dioxus_binding_sha256: fixtures.provenance.dioxus.binding_sha256,
      react_binding_sha256: fixtures.provenance.react.binding_sha256,
      direct_rsx_binding_sha256: fixtures.provenance.direct_rsx.binding_sha256,
      dioxus_surface_count: fixtures.surface_counts.dioxus,
      react_surface_count: fixtures.surface_counts.react,
      direct_rsx_surface_count: fixtures.surface_counts.direct_rsx,
    },
  });
  const failedExecutions = executions.filter((execution) => !execution.passed);
  return {
    ...proof,
    verified: proof.verified && failedExecutions.length === 0,
    source: "generated-canary-outputs",
    fixture_sha256: fixtures.sha256,
    fixture_provenance: fixtures.provenance,
    executions,
  };
}

function latestAcceptedRecords(records) {
  const latest = new Map();
  for (const record of records.filter((entry) => entry.accepted)) {
    const key = `${record.route}:${record.scenario_id}`;
    const previous = latest.get(key);
    if (!previous || record.attempt > previous.attempt) latest.set(key, record);
  }
  return [...latest.values()];
}

function directRsxWrapper(records, provenance) {
  const modules = records.map((record, index) => `mod route_${index} {\n${record.platform_artifact}\n}`).join("\n\n");
  const arms = records.map((_record, index) => `        ${index} => rsx! { route_${index}::App {} },`).join("\n");
  const scenarioArms = records.map((record, index) => `        ${index} => ${JSON.stringify(record.source_scenario_id)},`).join("\n");
  const scheduleScenarioArms = records.map((record, index) => `        ${index} => ${JSON.stringify(record.scenario_id)},`).join("\n");
  const cohortArms = records.map((record, index) => `        ${index} => ${JSON.stringify(record.cohort)},`).join("\n");
  return `${modules}\n\nuse dioxus::prelude::*;\n\n#[allow(non_snake_case)]\nfn Root() -> Element {\n    let mut current = use_signal(|| 0usize);\n    let index = current().min(${records.length - 1});\n    let content = match index {\n${arms}\n        _ => unreachable!(),\n    };\n    let scenario_id = match index {\n${scenarioArms}\n        _ => unreachable!(),\n    };\n    let schedule_scenario_id = match index {\n${scheduleScenarioArms}\n        _ => unreachable!(),\n    };\n    let cohort = match index {\n${cohortArms}\n        _ => unreachable!(),\n    };\n    rsx! {\n        document::Script { \"document.documentElement.lang = 'en';\" }\n        div {\n            id: \"ope11-direct-rsx-root\",\n            style: \"max-width: 860px; margin: 72px auto; padding: 24px; background: #d1d5db; border-radius: 12px; font-family: system-ui, sans-serif;\",\n            \"data-manifest-hash\": ${JSON.stringify(provenance.manifest_hash)},\n            \"data-binding-sha256\": ${JSON.stringify(provenance.binding_sha256)},\n            \"data-surface-count\": ${JSON.stringify(String(records.length))},\n            \"data-current-index\": \"{index}\",\n            section { style: \"min-height: 260px; padding: 24px; background: white; border-radius: 8px;\", \"data-scenario-id\": \"{scenario_id}\", \"data-schedule-scenario-id\": \"{schedule_scenario_id}\", \"data-cohort\": \"{cohort}\", {content} }\n            nav { style: \"margin-top: 16px;\", aria_label: \"Direct RSX navigation\",\n                button { r#type: \"button\", disabled: index == 0, onclick: move |_| current.set(index.saturating_sub(1)), \"Previous Source\" }\n                button { r#type: \"button\", disabled: index + 1 >= ${records.length}, onclick: move |_| current.set((index + 1).min(${records.length - 1})), \"Next Source\" }\n            }\n        }\n    }\n}\n\nfn main() { dioxus::launch(Root); }\n`;
}

function directRsxCargoManifest() {
  return `[package]\nname = "ope11-direct-rsx-generated"\nversion = "0.0.0"\nedition = "2021"\npublish = false\n\n[features]\ndefault = ["web"]\nweb = ["dioxus/web"]\n\n[dependencies]\ndioxus = { version = "=0.7.10", default-features = false, features = ["minimal", "document"] }\nope11_dioxus_web_features = { package = "web-sys", version = "=0.3.104", features = ["Location", "Window"] }\n`;
}

function directRsxDioxusConfig() {
  return `[application]\nname = "ope11-direct-rsx-generated"\ndefault_platform = "web"\n\n[web.app]\ntitle = "OPE-11 direct RSX canary"\n`;
}

function requiredRoute(records, route) {
  const record = records.find((candidate) => candidate.route === route);
  if (!record) throw new Error(`missing accepted runtime-uncertain ${route} output`);
  return record;
}

async function execute({ id, command, args, env, logRoot, deadlineMs }) {
  const started = performance.now();
  const timeoutMs = boundedTimeout(deadlineMs, 8 * 60 * 1000, `${id} platform proof`);
  const result = await runBoundedProcess({
    command,
    args,
    cwd: root,
    env: buildPlatformProcessEnv(id, env),
    timeoutMs,
    maximumBytes: 16 * 1024 * 1024,
  });
  const stdout = normalizeExecutionLog(result.stdout);
  const stderr = normalizeExecutionLog(result.stderr);
  await writeFile(path.join(logRoot, `${id}.stdout.log`), stdout);
  await writeFile(path.join(logRoot, `${id}.stderr.log`), stderr);
  return {
    id,
    passed: !result.error && result.exitCode === 0 && result.process_group_reaped,
    exit_code: result.exitCode,
    signal: result.signal,
    error: result.error,
    elapsed_ms: performance.now() - started,
    stdout_sha256: digest(stdout),
    stderr_sha256: digest(stderr),
  };
}

export function normalizeExecutionLog(value) {
  const content = String(value).replace(/[\t \r\n]+$/u, "");
  return content ? `${content}\n` : "";
}

export function buildPlatformProcessEnv(id, required, ambient = process.env) {
  if (id !== "direct-rsx-web") return { ...ambient, ...required, CI: "1" };
  const allowed = Object.fromEntries([
    "PATH",
    "HOME",
    "TMPDIR",
    "CARGO_HOME",
    "RUSTUP_HOME",
    "PLAYWRIGHT_BROWSERS_PATH",
  ].filter((name) => ambient[name] !== undefined).map((name) => [name, ambient[name]]));
  return { ...allowed, CARGO_NET_OFFLINE: "true", CI: "1", ...required };
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

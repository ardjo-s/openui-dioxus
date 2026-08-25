import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { buildScenarios } from "../../openui-typed-json-product-eval/src/scenarios.mjs";
import { IMPLEMENTATION_FOOTPRINT_POLICY } from "./footprint.mjs";
import { sha, stableJson } from "./hash.mjs";
import { repairInstruction } from "./provider.mjs";
import { routeInstructions, routeUserPrompt } from "./routes.mjs";

export { sha, stableJson } from "./hash.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const repo = path.resolve(root, "../..");

const routes = ["openui", "typed-json", "json-render", "direct-rsx"];
const comparedPairs = [
  ["openui", "typed-json"],
  ["openui", "json-render"],
  ["direct-rsx", "openui"],
  ["json-render", "direct-rsx"],
];
const toolHashCache = new Map();

export async function buildCandidateManifest() {
  const scenarios = await buildScenarios();
  const npmPackages = await npmPackageIdentities();
  const cargoPackages = await cargoPackageIdentities();
  const runtimeUncertain = scenarios.map(({ id, family, variant, shared_prompt }) => ({
    id,
    family,
    variant,
    prompt_sha256: sha(shared_prompt),
  }));
  const compileKnown = scenarios
    .filter((scenario) => scenario.variant === 1)
    .map(({ id, family, expected, shared_prompt }) => ({
      id: `compile-${id}`,
      source_scenario_id: id,
      family,
      specification_sha256: sha(stableJson({ expected, shared_prompt })),
    }));
  const canarySchedule = [
    schedule("runtime-uncertain", runtimeUncertain[0].id, ["openui", "typed-json"]),
    schedule("runtime-uncertain", runtimeUncertain[4].id, ["typed-json", "json-render"]),
    schedule("compile-known", compileKnown[2].id, ["direct-rsx", "openui"]),
    schedule("compile-known", compileKnown[3].id, ["json-render", "direct-rsx"]),
  ].flat().map((entry, index) => ({ ...entry, prompt_id: `canary-${String(index + 1).padStart(2, "0")}` }));
  const byId = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  const promptPack = canarySchedule.map((entry) => {
    const scenario = byId.get(entry.scenario_id.replace(/^compile-/, ""));
    if (!scenario) throw new Error(`missing prompt scenario: ${entry.scenario_id}`);
    const instructions = routeInstructions(entry.route, scenario);
    const userPrompt = routeUserPrompt(entry.route, scenario, entry.cohort);
    return {
      prompt_id: entry.prompt_id,
      route: entry.route,
      cohort: entry.cohort,
      scenario_id: entry.scenario_id,
      instructions,
      user_prompt: userPrompt,
      instructions_sha256: sha(instructions),
      user_prompt_sha256: sha(userPrompt),
    };
  });
  const inputHashes = await hashInputs({
    ope9_spec: "docs/evaluation/ecosystem-relative-product-value-spec.md",
    ope9_decisions: "docs/evaluation/ecosystem-relative-product-value-decisions.md",
    ope3_archive: "prototype/openui-a2ui-cloud-eval/evidence/three-arm-controlled-run-2026-08-24/SHA256SUMS",
    ope5_scenarios: "prototype/openui-typed-json-product-eval/src/scenarios.mjs",
    ope5_protocols: "prototype/openui-typed-json-product-eval/src/protocols.mjs",
    ope5_scorer: "prototype/openui-typed-json-product-eval/src/score.mjs",
    primary_catalog: "prototype/dioxus-components-catalog-eval/catalog/manifest.json",
    primary_release: "prototype/dioxus-components-catalog-eval/generated/release.json",
    rust_ui_catalog: "prototype/dioxus-components-catalog-eval/catalog/rust-ui-manifest.json",
    rust_ui_release: "prototype/dioxus-components-catalog-eval/generated-rust-ui/release.json",
    macos_window_finder: "prototype/openui-typed-json-product-eval/platform/find-macos-window-id.swift",
    screenshot_checker: "prototype/openui-typed-json-product-eval/platform/check-screenshot.py",
  });
  inputHashes.implementation_tree = await hashTree("prototype/ecosystem-relative-eval", {
    excluded: new Set([
      ".tmp",
      "evidence",
      "node_modules",
      "platform/dioxus/target",
      "platform/react/dist",
      "prototype",
    ]),
  });
  inputHashes.platform_evidence = {
    react_web: await hashTree("prototype/ecosystem-relative-eval/evidence/react-web-local"),
    dioxus_web: await hashTree("prototype/ecosystem-relative-eval/evidence/dioxus-web-local"),
    dioxus_desktop: await hashTree("prototype/ecosystem-relative-eval/evidence/dioxus-desktop-local"),
  };
  inputHashes.transitive_trees = {
    catalog_runtime: await hashTree("prototype/dioxus-components-catalog-eval", {
      excluded: new Set(["target", "generator/node_modules"]),
    }),
    primary_protocol_runtime: await hashTree("prototype/openui-typed-json-product-eval/src"),
  };
  inputHashes.installed_registry_packages = {
    openui: await hashTree("prototype/ecosystem-relative-eval/node_modules/@openuidev/lang-core"),
    json_render_core: await hashTree("prototype/ecosystem-relative-eval/node_modules/@json-render/core"),
    json_render_react: await hashTree("prototype/ecosystem-relative-eval/node_modules/@json-render/react"),
    dioxus: await hashCargoPackage("dioxus", "0.7.10"),
    dioxus_web: await hashCargoPackage("dioxus-web", "0.7.10"),
    dioxus_desktop: await hashCargoPackage("dioxus-desktop", "0.7.10"),
    dioxus_ssr: await hashCargoPackage("dioxus-ssr", "0.7.10"),
  };
  inputHashes.tool_binaries = {
    codex_cli: await hashTool(resolveCommand(process.env.EVAL_CODEX_BIN ?? "codex")),
    dioxus_cli: await hashTool(path.join(root, ".tmp/dioxus-cli/bin/dx")),
    playwright_chromium: await hashTool(chromium.executablePath()),
    cargo: await hashTool(resolveCommand("cargo")),
    rustc: await hashTool(resolveCommand("rustc")),
  };

  return {
    version: "ope-11-ecosystem-canary-v1",
    purpose: "non-decision operational canary",
    product_outcome_forbidden: true,
    source_pins: {
      openui: {
        authoritative_identity: npmPackages.openui,
        upstream_reference_commit: "c3c0d1b7cf1d58e01846e86b7e9706f54afb2511",
        package_to_upstream_commit_verified: false,
      },
      json_render: {
        authoritative_identities: [npmPackages.json_render_core, npmPackages.json_render_react],
        package_version: "0.19.0",
        upstream_reference_commit: "0bbe6ed6394b23b5aee25320d03c9b7ac717e5b7",
        package_to_upstream_commit_verified: false,
      },
      dioxus: {
        version: "0.7.10",
        authoritative_identities: cargoPackages,
        upstream_reference_commit: "57d6794ad60b949e5bd8aa282f6f8c3dc97a365e",
        package_to_upstream_commit_verified: false,
      },
      toolchain: {
        node: process.version,
        npm: toolVersion("npm", ["--version"]),
        rustc: toolVersion("rustc", ["--version"]),
        cargo: toolVersion("cargo", ["--version"]),
        codex_cli: toolVersion(process.env.EVAL_CODEX_BIN ?? "codex", ["--version"]),
        python: toolVersion("python3", ["--version"]),
        swift: toolVersion("swift", ["--version"]),
        host: toolVersion("uname", ["-srm"]),
      },
      rust_ui: {
        product_commit: "7fd792520ba5e3ad5354c26ac4e6816c2d156b7c",
        implementation_commit: "2f87a8d0531d483d5b32df6f89b7979ceb4beb74",
      },
    },
    provider: {
      provider: "codex-cli-chatgpt-plan",
      model: "gpt-5.6-luna",
      reasoning_effort: "low",
      fresh_ephemeral_process_per_attempt: true,
      tools_disabled: true,
      generated_output_execution: {
        openui: "validated-data-rendered-by-dioxus-runtime",
        "typed-json": "validated-data-rendered-by-dioxus-runtime",
        "json-render": "validated-data-rendered-by-official-react-runtime",
        "direct-rsx": "source-allowlisted; SSR compiled and executed in a deny-network sandbox; Web rendered with external requests blocked",
      },
      maximum_response_bytes: 262144,
      per_attempt_timeout_ms: 180000,
      metering: {
        token_usage_recorded: true,
        incremental_api_cost_usd: null,
        subscription_allocation: "reported separately, never estimated as zero",
      },
    },
    cohorts: {
      runtime_uncertain: runtimeUncertain,
      compile_known: compileKnown,
    },
    canary: {
      schedule: canarySchedule,
      prompt_pack: promptPack,
      maximum_provider_calls: 16,
      maximum_repairs_per_route: 1,
      repair_policy: {
        maximum_repairs_per_route: 1,
        diagnostic_payload_included: true,
        previous_output_included: true,
        final_instruction: repairInstruction,
        template_sha256: sha(`{original}\n\nREPAIR THE PREVIOUS OUTPUT\n\n{output}\n\nVALIDATOR OR COMPILER DIAGNOSTICS\n\n{diagnostics}\n\n${repairInstruction}`),
      },
      maximum_wall_time_ms: 30 * 60 * 1000,
      allowed_outcomes: ["PASS", "CANARY_INVALID"],
      promotion: "byte-identical-manifest-only",
    },
    requirement_applicability: applicabilityRows(scenarios),
    scoring_thresholds: {
      primary_pairs: 20,
      minimum_openui_post_repair_validity: 19,
      maximum_validity_disadvantage: 1,
      maximum_quality_disadvantage: 0.5,
      maximum_maintenance_and_cost_ratio: 1.25,
      material_advantage: {
        median_cumulative_raw_tokens: 0.20,
        first_pass_validity_percentage_points: 10,
        median_active_human_correction_time: 0.25,
      },
      blind_review_minimum_reviewers: 3,
      ordinal_krippendorff_alpha_minimum: 0.67,
      correction_minimum_operators: 2,
    },
    review_plan: {
      blind_reviewer_slots: [
        { id: "reviewer-a", specialty: "product-design" },
        { id: "reviewer-b", specialty: "frontend-maintenance" },
        { id: "reviewer-c", specialty: "accessibility" },
      ],
      correction_operator_slots: ["operator-a", "operator-b"],
      reviewer_eligibility: {
        minimum_relevant_experience_years: 3,
        no_contribution_to_openui_dioxus_or_compared_harnesses: true,
        no_access_to_route_labels_or_generation_metrics_before_scoring: true,
        conflict_and_independence_attestation_required: true,
        salted_identity_commitment_required_before_complete_run_provider_calls: true,
      },
      correction_operator_eligibility: {
        minimum_completed_practice_task_per_assigned_route: 1,
        same_editor_toolchain_and_machine_class: true,
        no_access_to_other_operator_results: true,
      },
      route_labels_removed: true,
      route_guess_recorded_after_scoring: true,
      blocked_crossover: true,
      correction_assignment: {
        "operator-a": ["openui", "typed-json", "json-render", "direct-rsx"],
        "operator-b": ["direct-rsx", "json-render", "typed-json", "openui"],
      },
      active_clock: {
        starts: "first operator edit after reading the frozen task packet",
        stops: "all route-native validators and required behavior checks pass",
        excludes: ["provider", "queue", "dependency-install", "compile", "platform-launch", "review-wait"],
        interruption_rule: "pause only for an externally recorded interruption longer than 30 seconds",
      },
      ui_quality_rubric: {
        dimensions: ["completeness", "usefulness", "hierarchy", "error-prevention", "feedback", "accessibility"],
        anchors: {
          1: "missing or misleading behavior that prevents task completion",
          3: "task-complete with understandable structure and no blocking defect",
          5: "task-complete, immediately legible, preventive, and polished without hidden behavior",
        },
      },
      packet_construction: {
        include: ["rendered-screenshots", "behavior-recording", "task-contract"],
        remove: ["route-name", "protocol-syntax", "file-path", "generation-metrics", "technology-brand"],
        deterministic_filename_rule: "packet-<seeded-index>",
        immutable_after_first_reviewer_opens_packet: true,
      },
      packet_randomization_seed_sha256: sha("ope-12-anonymous-review-packets-v1"),
    },
    rates: {
      currency: "USD",
      normalized_labor_usd_per_hour: 100,
      normalized_labor_basis: "preregistered opportunity-cost rate applied equally to every reviewer and correction operator",
      provider_subscription_allocation_usd: null,
      provider_subscription_allocation_policy: "report plan usage tokens and wall time separately; never estimate missing subscription allocation as zero",
      compute_cost_policy: "record actual billed amount when available and wall time separately; never estimate unavailable cost as zero",
      reviewer_and_operator_rate_source: "project-preregistered normalized opportunity cost, not an invoice or market-rate claim",
    },
    measurement_policy: {
      implementation_footprint: IMPLEMENTATION_FOOTPRINT_POLICY,
    },
    stage_scope: {
      canary: {
        dioxus_runtime_routes: ["openui", "typed-json"],
        official_react_route: ["json-render"],
        direct_rsx: ["source-allowlist", "explicit-non-secret-environment", "deny-network-ssr-sandbox", "interactive-web-external-requests-blocked"],
        direct_rsx_full_device_matrix_deferred_to: "OPE-12",
      },
      complete_run: {
        direct_rsx_targets: ["web", "desktop", "ios", "android"],
        every_compile_known_route_platform_evidence_required: true,
      },
    },
    trust_controls: {
      synthetic_non_sensitive_fixtures_only: true,
      scan_before_provider_call: true,
      generated_outputs_untrusted_after_validation: true,
      allowlisted_catalogs_and_actions: true,
      deny_by_default_host_effects: true,
      no_ambient_network_credentials_or_tools_for_generated_code: true,
      raw_retention: "retain through OPE-7 decision, then review deletion separately",
    },
    evidence_schema: {
      version: "ope-11-record-v1",
      required_record_fields: [
        "route",
        "cohort",
        "scenario_id",
        "order_position",
        "attempt",
        "accepted",
        "diagnostics",
        "tokens",
        "latency",
        "artifact_hashes",
      ],
    },
    input_hashes: inputHashes,
  };
}

export function hashManifest(manifest) {
  return sha(stableJson(manifest));
}

function schedule(cohort, scenarioId, orderedRoutes) {
  return orderedRoutes.map((route, orderPosition) => ({
    cohort,
    scenario_id: scenarioId,
    route,
    order_position: orderPosition,
  }));
}

function applicabilityRows(scenarios) {
  return [
    row("content-and-hierarchy", "shared", allRoutes()),
    row("state-transition", "shared", allRoutes()),
    row("registered-action", "shared", allRoutes()),
    row("visible-feedback", "shared", allRoutes()),
    row("canonical-surface-fingerprint", "route-specific", only("openui", "typed-json")),
    row("inert-replay", "route-specific", only("openui", "typed-json")),
    row("dioxus-desktop", "dioxus-specific", only("openui", "typed-json", "direct-rsx")),
    row("dioxus-mobile", "dioxus-specific", only("openui", "typed-json", "direct-rsx")),
    row("official-react-web-renderer", "react-supported", only("json-render")),
    ...scenarios.flatMap((scenario) => scenarioRequirementRows(scenario)),
  ];
}

function scenarioRequirementRows(scenario) {
  const requirementPaths = Object.keys(scenario.shared_contract.acceptance).map((key) => `acceptance.${key}`);
  const cohorts = [
    ["runtime-uncertain", only("openui", "typed-json", "json-render")],
    ...(scenario.variant === 1 ? [["compile-known", allRoutes()]] : []),
  ];
  return cohorts.flatMap(([cohort, supported]) => requirementPaths.map((requirementPath) => ({
    ...row(`${cohort}:${scenario.id}:${requirementPath}`, "scenario-shared", supported),
    cohort,
    scenario_id: scenario.id,
    requirement_path: requirementPath,
  })));
}

function row(id, classification, supported) {
  return {
    id,
    classification,
    routes: Object.fromEntries(routes.map((route) => [route, supported.has(route)])),
    pairwise: comparedPairs.map((pair) => ({
      routes: pair,
      included: pair.every((route) => supported.has(route)),
    })),
  };
}

function allRoutes() {
  return new Set(routes);
}

function only(...names) {
  return new Set(names);
}

async function hashInputs(entries) {
  return Object.fromEntries(await Promise.all(Object.entries(entries).map(async ([name, relative]) => {
    const bytes = await readFile(path.join(repo, relative));
    return [name, { path: relative, sha256: sha(bytes) }];
  })));
}

async function hashTree(relativeRoot, { excluded = new Set() } = {}) {
  const absoluteRoot = path.join(repo, relativeRoot);
  return hashDirectory(absoluteRoot, relativeRoot, excluded);
}

async function hashDirectory(absoluteRoot, label, excluded = new Set()) {
  const files = await filesBelow(absoluteRoot, "", excluded);
  const entries = [];
  let bytes = 0;
  let nonblankLines = 0;
  for (const relative of files) {
    const absolute = path.join(absoluteRoot, relative);
    const contents = await readFile(absolute);
    const metadata = await stat(absolute);
    bytes += metadata.size;
    if (isText(contents)) {
      nonblankLines += contents.toString("utf8").split(/\r?\n/).filter((line) => line.trim()).length;
    }
    entries.push(`${relative}\0${sha(contents)}`);
  }
  return {
    path: label,
    sha256: sha(entries.join("\n")),
    file_count: files.length,
    bytes,
    nonblank_lines: nonblankLines,
  };
}

async function npmPackageIdentities() {
  const lock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
  return {
    openui: npmPackageIdentity(lock, "@openuidev/lang-core", "0.2.15"),
    json_render_core: npmPackageIdentity(lock, "@json-render/core", "0.19.0"),
    json_render_react: npmPackageIdentity(lock, "@json-render/react", "0.19.0"),
  };
}

function npmPackageIdentity(lock, name, expectedVersion) {
  const entry = lock.packages?.[`node_modules/${name}`];
  if (!entry || entry.version !== expectedVersion || !entry.resolved || !entry.integrity) {
    throw new Error(`npm package identity differs: ${name}@${expectedVersion}`);
  }
  return {
    registry: "npm",
    package: name,
    version: entry.version,
    resolved: entry.resolved,
    integrity: entry.integrity,
  };
}

async function cargoPackageIdentities() {
  const lock = await readFile(path.join(root, "platform/dioxus/Cargo.lock"), "utf8");
  return ["dioxus", "dioxus-web", "dioxus-desktop", "dioxus-ssr"].map((name) =>
    cargoPackageIdentity(lock, name, "0.7.10")
  );
}

function cargoPackageIdentity(lock, name, expectedVersion) {
  const block = lock.split(/\n\[\[package\]\]\n/).find((candidate) =>
    candidate.includes(`name = "${name}"`) && candidate.includes(`version = "${expectedVersion}"`)
  );
  const checksum = block?.match(/\nchecksum = "([a-f0-9]{64})"/)?.[1];
  const source = block?.match(/\nsource = "([^"]+)"/)?.[1];
  if (!block || !checksum || !source) throw new Error(`Cargo package identity differs: ${name}@${expectedVersion}`);
  return { registry: "crates.io", package: name, version: expectedVersion, source, checksum };
}

async function hashCargoPackage(name, version) {
  const cargoHome = process.env.CARGO_HOME ?? path.join(homedir(), ".cargo");
  const registryRoot = path.join(cargoHome, "registry", "src");
  const indexes = await readdir(registryRoot, { withFileTypes: true });
  const candidates = [];
  for (const index of indexes.filter((entry) => entry.isDirectory())) {
    const candidate = path.join(registryRoot, index.name, `${name}-${version}`);
    try {
      if ((await stat(candidate)).isDirectory()) candidates.push(candidate);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  if (candidates.length !== 1) throw new Error(`expected one installed Cargo package tree for ${name}@${version}, found ${candidates.length}`);
  return hashDirectory(candidates[0], `cargo:${name}@${version}`);
}

async function filesBelow(directory, prefix, excluded) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if ([...excluded].some((candidate) => relative === candidate || relative.startsWith(`${candidate}/`))) continue;
    if (entry.isDirectory()) files.push(...await filesBelow(path.join(directory, entry.name), relative, excluded));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`non-regular frozen input: ${relativeRootLabel(directory, relative)}`);
  }
  return files.sort();
}

function isText(contents) {
  return !contents.subarray(0, Math.min(contents.length, 8192)).includes(0);
}

function relativeRootLabel(directory, relative) {
  return `${path.relative(repo, directory)}/${relative}`;
}

function resolveCommand(command) {
  if (path.isAbsolute(command)) return command;
  return execFileSync("/usr/bin/which", [command], { encoding: "utf8", timeout: 10_000 }).trim();
}

async function hashTool(absolutePath) {
  if (toolHashCache.has(absolutePath)) return toolHashCache.get(absolutePath);
  const metadata = await stat(absolutePath);
  if (!metadata.isFile()) throw new Error(`frozen tool is not a regular file: ${absolutePath}`);
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(absolutePath)) hash.update(chunk);
  const result = { sha256: hash.digest("hex"), bytes: metadata.size };
  toolHashCache.set(absolutePath, result);
  return result;
}

function toolVersion(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 10_000, maxBuffer: 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`cannot freeze toolchain ${command}: ${result.error?.message ?? result.stderr}`);
  return [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
}

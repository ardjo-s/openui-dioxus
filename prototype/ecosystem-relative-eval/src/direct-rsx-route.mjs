import { copyFile, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { boundedTimeout } from "./deadline.mjs";
import { runBoundedProcess } from "./subprocess.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const temporaryRoot = path.join(root, ".tmp");
const probeTemplateRoot = path.join(root, "fixtures", "direct-rsx-probe");
const maximumBytes = 256 * 1024;

export function directRsxPrompt() {
  return [
    "Return one complete Rust source file containing ordinary Dioxus RSX for the compile-known interface.",
    "Use exactly one import: use dioxus::prelude::*;",
    "Define pub fn App() -> Element and return one rsx! tree. Do not use a Surface, catalog interpreter, JSON renderer, macro definition, unsafe code, filesystem, network, process, thread, environment, include, script, or dynamic HTML API.",
    "Use standard Dioxus HTML elements. Every component becomes a stable HTML subtree with id and data-component. The root contains data-route set to direct-rsx.",
    "Use one Dioxus use_signal for every supplied state key. Bind every interactive control to its matching signal and update that signal from the normal Dioxus event.",
    "Represent each Button action with data-action and data-target-id. Its click callback must increment a local synthetic action_count exactly once and set a visible synthetic receipt to receipt:<action>:<target_id>. Expose one role=status node with data-action-count and data-receipt. This probe has no external host authority.",
    "Preserve every value and behavior declared below. Return Rust only, with no code fence or explanation.",
  ].join("\n\n");
}

export function encodeExpectedRsx(surface) {
  const nodes = new Map(surface.nodes.map((node) => [node.id, node]));
  const stateVariables = new Map(Object.keys(surface.state).map((key) => [key, `state_${rustIdentifier(key)}`]));
  const stateDeclarations = Object.entries(surface.state).map(([key, value]) => {
    const initial = typeof value === "string" ? `${rust(value)}.to_string()` : String(value);
    return `    let mut ${stateVariables.get(key)} = use_signal(|| ${initial});`;
  });
  return [
    "use dioxus::prelude::*;",
    "",
    "#[allow(non_snake_case)]",
    "pub fn App() -> Element {",
    ...stateDeclarations,
    "    let mut action_count = use_signal(|| 0usize);",
    '    let mut receipt = use_signal(|| "ready".to_string());',
    "    rsx! {",
    `        main { "data-route": "direct-rsx", ${renderNode(surface.root, nodes, 2, stateVariables)}, p { role: "status", aria_live: "polite", "data-action-count": "{action_count()}", "data-receipt": "{receipt()}", "{receipt()}" } }`,
    "    }",
    "}",
    "",
  ].join("\n");
}

export async function validateDirectRsx(source, expected, { deadlineMs = Number.POSITIVE_INFINITY } = {}) {
  const diagnostics = scanSource(source);
  if (diagnostics.length) return { ok: false, diagnostics, compiled: false, rendered_html: null, compile_ms: 0, run_ms: 0 };
  const compiled = await compileAndRender(source, deadlineMs);
  if (!compiled.ok) return { ...compiled, diagnostics: [{ code: "rust-compiler", message: compiled.stderr.slice(0, 4000) }] };
  const missing = requiredMarkers(expected).filter((marker) => !compiled.rendered_html.includes(marker));
  if (missing.length) {
    return {
      ...compiled,
      ok: false,
      diagnostics: missing.map((marker) => ({ code: "semantic-coverage", message: marker })),
    };
  }
  return { ...compiled, ok: true, diagnostics: [] };
}

export function scanSource(source) {
  const diagnostics = [];
  if (Buffer.byteLength(source) > maximumBytes) diagnostics.push({ code: "output-too-large", message: `more than ${maximumBytes} bytes` });
  if (!source.includes("pub fn App() -> Element") || !source.includes("rsx!")) diagnostics.push({ code: "source-contract", message: "missing App or rsx" });
  if (!source.includes('"data-route": "direct-rsx"')) diagnostics.push({ code: "source-contract", message: "missing route marker" });
  if (!source.includes("use_signal") || !source.includes('"data-action-count"') || !source.includes('"data-receipt"')) diagnostics.push({ code: "source-contract", message: "missing executable state or action receipt probe" });
  const imports = source.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("use "));
  if (imports.length !== 1 || imports[0] !== "use dioxus::prelude::*;") diagnostics.push({ code: "forbidden-source", message: "only the Dioxus prelude import is allowed" });
  const forbidden = [
    /\bunsafe\b/,
    /\bextern\b/,
    /\bmod\s+/,
    /\bmacro_rules\b/,
    /\b(?:include|include_str|include_bytes|env|option_env|asm|global_asm)!/,
    /\b(?:std|core|alloc)::/,
    /\b(?:Command|OpenOptions|TcpStream|UdpSocket|process|thread|spawn)\b/,
    /dangerous_inner_html/,
    /<script/i,
    /\bdioxus::(?!prelude)/,
    /\bweb_sys\b/,
    /\bope11_dioxus_web_features\b/,
    /\b(?:eval|use_eval|use_resource|use_future|use_coroutine|onmounted|onload|onerror)\b/,
    /\b(?:script|iframe|object|embed|link|meta|form|img|video|audio)\s*\{/,
    /\b(?:src|href)\s*:/,
  ];
  for (const pattern of forbidden) {
    if (pattern.test(source)) diagnostics.push({ code: "forbidden-source", message: pattern.source });
  }
  return diagnostics;
}

async function compileAndRender(source, deadlineMs) {
  await mkdir(temporaryRoot, { recursive: true });
  const directory = await mkdtemp(path.join(temporaryRoot, "direct-rsx-"));
  const targetDir = path.join(directory, "target");
  const sourceDirectory = path.join(directory, "src");
  try {
    await mkdir(sourceDirectory);
    await copyFile(path.join(probeTemplateRoot, "Cargo.toml"), path.join(directory, "Cargo.toml"));
    await copyFile(path.join(probeTemplateRoot, "Cargo.lock"), path.join(directory, "Cargo.lock"));
    await writeFile(path.join(sourceDirectory, "main.rs"), `${source}\nfn main() {\n    println!("{}", dioxus_ssr::render_element(rsx! { App {} }));\n}\n`);
    const environment = {
      PATH: process.env.PATH,
      HOME: directory,
      TMPDIR: path.join(directory, "tmp"),
      CARGO_HOME: process.env.CARGO_HOME ?? path.join(homedir(), ".cargo"),
      RUSTUP_HOME: process.env.RUSTUP_HOME ?? path.join(homedir(), ".rustup"),
      CARGO_NET_OFFLINE: "true",
      CARGO_TARGET_DIR: targetDir,
      RUST_BACKTRACE: "0",
    };
    await mkdir(environment.TMPDIR);
    const compileProfile = [
      "(version 1)",
      "(deny default)",
      "(allow process*)",
      "(allow sysctl-read)",
      "(allow file-read*)",
      `(allow file-write* (subpath ${sandboxString(directory)}))`,
      "(deny network*)",
    ].join(" ");
    const compileStarted = performance.now();
    const build = await runBoundedProcess({
      command: "/usr/bin/sandbox-exec",
      args: [
        "-p",
        compileProfile,
        "/bin/zsh",
        "-fc",
        "ulimit -t 120; ulimit -n 256; ulimit -u 2048; ulimit -f 1048576; exec cargo build --locked --offline --quiet",
      ],
      cwd: directory,
      env: environment,
      timeoutMs: boundedTimeout(deadlineMs, 180_000, "direct RSX compilation"),
      maximumBytes: 4 * 1024 * 1024,
    });
    const compileMs = performance.now() - compileStarted;
    if (build.error || build.exitCode !== 0 || !build.process_group_reaped) {
      return {
        ok: false,
        compiled: false,
        rendered_html: null,
        compile_ms: compileMs,
        run_ms: 0,
        stdout: build.stdout ?? "",
        stderr: String(build.error ?? build.stderr ?? `cargo exited ${build.exitCode}`),
      };
    }
    const binary = path.join(targetDir, "debug", "ope11-direct-rsx-probe");
    const profile = "(version 1) (deny default) (allow process*) (allow sysctl-read) (allow file-read*) (deny network*)";
    const runStarted = performance.now();
    const run = await runBoundedProcess({
      command: "/usr/bin/sandbox-exec",
      args: ["-p", profile, binary],
      cwd: directory,
      env: {},
      timeoutMs: boundedTimeout(deadlineMs, 30_000, "direct RSX sandbox execution"),
      maximumBytes: 2 * 1024 * 1024,
    });
    const runMs = performance.now() - runStarted;
    if (run.error || run.exitCode !== 0 || !run.process_group_reaped) {
      return {
        ok: false,
        compiled: true,
        rendered_html: null,
        compile_ms: compileMs,
        run_ms: runMs,
        stdout: run.stdout ?? "",
        stderr: String(run.error ?? run.stderr ?? `sandbox exited ${run.exitCode}`),
      };
    }
    return {
      ok: true,
      compiled: true,
      rendered_html: run.stdout.trim(),
      compile_ms: compileMs,
      run_ms: runMs,
      stdout: run.stdout,
      stderr: run.stderr,
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function sandboxString(value) {
  return JSON.stringify(value);
}

function renderNode(id, nodes, depth, stateVariables) {
  const node = nodes.get(id);
  if (!node) throw new Error(`broken child reference: ${id}`);
  const attrs = [`id: ${rust(node.id)}`, `"data-component": ${rust(node.kind)}`];
  const children = [];
  if (node.kind === "Toolbar") {
    attrs.push('role: "toolbar"', `"data-orientation": ${rust(node.orientation)}`);
    children.push(...node.children.map((child) => renderNode(child, nodes, depth + 1, stateVariables)));
    return element("div", attrs, children, depth);
  }
  if (node.kind === "Avatar") {
    attrs.push('role: "img"', `aria_label: ${rust(node.alt)}`);
    children.push(rust(node.fallback));
    return element("div", attrs, children, depth);
  }
  if (node.kind === "Label") {
    attrs.push(`r#for: ${rust(node.for_id)}`);
    children.push(rust(node.text));
    return element("label", attrs, children, depth);
  }
  if (node.kind === "Input") {
    const state = requiredStateVariable(stateVariables, node.state_key);
    attrs.push(`aria_label: ${rust(node.label)}`, `"data-state-key": ${rust(node.state_key)}`, `value: "{${state}()}"`, `placeholder: ${rust(node.placeholder)}`, `oninput: move |event| ${state}.set(event.value())`);
    return element("input", attrs, [], depth);
  }
  if (node.kind === "Select") {
    const state = requiredStateVariable(stateVariables, node.state_key);
    attrs.push(`aria_label: ${rust(node.label)}`, `"data-state-key": ${rust(node.state_key)}`, `value: "{${state}()}"`, `onchange: move |event| ${state}.set(event.value())`);
    children.push(...node.options.map((option) => `option { value: ${rust(option)}, selected: ${state}() == ${rust(option)}, ${rust(option)} }`));
    return element("select", attrs, children, depth);
  }
  if (node.kind === "Checkbox") {
    const state = requiredStateVariable(stateVariables, node.state_key);
    attrs.push('r#type: "checkbox"', `aria_label: ${rust(node.label)}`, `"data-state-key": ${rust(node.state_key)}`, `checked: ${state}()`, `onchange: move |event| ${state}.set(event.checked())`);
    return element("input", attrs, [], depth);
  }
  if (node.kind === "Switch") {
    const state = requiredStateVariable(stateVariables, node.state_key);
    attrs.push('role: "switch"', `aria_checked: "{${state}()}"`, `"data-state-key": ${rust(node.state_key)}`, `onclick: move |_| ${state}.set(!${state}())`);
    children.push(rust(node.label));
    return element("button", attrs, children, depth);
  }
  if (node.kind === "Button") {
    attrs.push('r#type: "button"', `"data-action": ${rust(node.action)}`, `"data-target-id": ${rust(node.target_id)}`);
    attrs.push(`onclick: move |_| { action_count.with_mut(|count| *count += 1); receipt.set(format!("receipt:{}:{}", ${rust(node.action)}, ${rust(node.target_id)})); }`);
    children.push(rust(node.label));
    return element("button", attrs, children, depth);
  }
  if (node.kind === "Tabs") {
    const state = requiredStateVariable(stateVariables, node.state_key);
    attrs.push('role: "tablist"', `"data-state-key": ${rust(node.state_key)}`, `"data-value": "{${state}()}"`);
    for (const item of node.items) {
      children.push(`button { role: "tab", "data-value": ${rust(item.value)}, onclick: move |_| ${state}.set(${rust(item.value)}.to_string()), ${rust(item.label)} }`);
      children.push(`section { role: "tabpanel", ${renderNode(item.child, nodes, depth + 1, stateVariables)} }`);
    }
    return element("div", attrs, children, depth);
  }
  if (node.kind === "Dialog") {
    const state = requiredStateVariable(stateVariables, node.open_state_key);
    attrs.push('role: "dialog"', `aria_label: ${rust(node.title)}`, `"data-state-key": ${rust(node.open_state_key)}`, `"data-open": "{${state}()}"`);
    children.push(`h2 { ${rust(node.title)} }`, ...node.children.map((child) => renderNode(child, nodes, depth + 1, stateVariables)));
    return element("section", attrs, children, depth);
  }
  if (node.kind === "Progress") {
    attrs.push(`aria_label: ${rust(node.label)}`, `value: ${rust(String(node.value))}`, `max: ${rust(String(node.max))}`);
    return element("progress", attrs, [], depth);
  }
  if (node.kind === "Toast") {
    attrs.push('role: "status"', `"data-tone": ${rust(node.tone)}`);
    children.push(`strong { ${rust(node.title)} }`, rust(node.message));
    return element("div", attrs, children, depth);
  }
  throw new Error(`unknown direct RSX component: ${node.kind}`);
}

function element(tag, attrs, children, depth) {
  const content = [...attrs, ...children].join(", ");
  return `${tag} { ${content} }`;
}

function requiredMarkers(surface) {
  const markers = ['data-route="direct-rsx"'];
  for (const node of surface.nodes) {
    markers.push(`id="${escapeHtml(node.id)}"`, `data-component="${escapeHtml(node.kind)}"`);
    for (const key of ["alt", "fallback", "label", "message", "placeholder", "text", "title", "action", "target_id", "value"]) {
      if (typeof node[key] === "string") markers.push(escapeHtml(node[key]));
    }
    for (const option of node.options ?? []) markers.push(escapeHtml(option));
    for (const item of node.items ?? []) markers.push(escapeHtml(item.label));
  }
  return [...new Set(markers)];
}

function rust(value) {
  return JSON.stringify(value);
}

function rustIdentifier(value) {
  const identifier = String(value).replace(/[^a-zA-Z0-9_]/g, "_");
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) throw new Error(`invalid state key for direct RSX: ${value}`);
  return identifier;
}

function requiredStateVariable(stateVariables, key) {
  const variable = stateVariables.get(key);
  if (!variable) throw new Error(`missing direct RSX state key: ${key}`);
  return variable;
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

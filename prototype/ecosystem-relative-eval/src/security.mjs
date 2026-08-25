import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const credentialPatterns = [
  { name: "openai-key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: "github-token", pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { name: "aws-access-key", pattern: /\bAKIA[A-Z0-9]{16}\b/ },
  { name: "private-key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "authorization-header", pattern: /\bAuthorization:\s*Bearer\s+\S+/i },
];

const decisionValues = new Set([
  "GO_OPENUI_DIOXUS",
  "PIVOT_TO_SURFACE_RUNTIME",
  "NO_GO",
  "INVALID_EVAL",
]);
const decisionKeys = new Set(["product_outcome", "final_verdict", "scorer_result"]);

export function scanProviderPayload(value) {
  const source = typeof value === "string" ? value : JSON.stringify(value);
  return credentialPatterns
    .filter(({ pattern }) => pattern.test(source))
    .map(({ name }) => ({ code: "sensitive-provider-payload", class: name }));
}

export async function scanEvidenceDirectory(directory) {
  const findings = [];
  for (const relative of await filesBelow(directory)) {
    for (const finding of scanProviderPayload(relative)) findings.push({ ...finding, path: relative, location: "filename" });
    if (!isTextEvidence(relative)) continue;
    const contents = await readFile(path.join(directory, relative), "utf8");
    for (const finding of scanProviderPayload(contents)) findings.push({ ...finding, path: relative, location: "contents" });
  }
  return findings;
}

export function scanPublicationPayloads(payloads) {
  const findings = [];
  for (const [relative, value] of Object.entries(payloads)) {
    for (const finding of scanProviderPayload(relative)) findings.push({ ...finding, path: relative, location: "filename" });
    for (const finding of scanProviderPayload(value)) findings.push({ ...finding, path: relative, location: "contents" });
  }
  return findings;
}

export function assertDecisionNeutral(value, pointer = "$") {
  if (typeof value === "string" && decisionValues.has(value)) {
    throw new Error(`decision-stage value is forbidden at ${pointer}`);
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertDecisionNeutral(child, `${pointer}[${index}]`));
    return value;
  }
  if (!value || typeof value !== "object") return value;
  for (const [key, child] of Object.entries(value)) {
    if (decisionKeys.has(key)) throw new Error(`decision-stage key is forbidden at ${pointer}.${key}`);
    assertDecisionNeutral(child, `${pointer}.${key}`);
  }
  return value;
}

export function createForbiddenProductScorer() {
  let accesses = 0;
  return Object.freeze({
    score() {
      accesses += 1;
      throw new Error("product scorer is forbidden during OPE-11");
    },
    accessCount() {
      return accesses;
    },
  });
}

export function evaluateEcosystemSignals(facts) {
  const signals = [];
  if (facts.external_route_dominates) signals.push("external-route-dominates");
  if (facts.runtime_passes_without_openui_advantage) signals.push("no-openui-material-advantage");
  if (facts.second_catalog_hard_gate_failed) signals.push("second-catalog-hard-gate-failed");
  if (facts.direct_rsx_wins_compile_known_without_runtime_requirement) signals.push("exclude-compile-known-scope");
  if (facts.direct_rsx_reproduces_platform_advantage) signals.push("credit-platform-to-dioxus-only");
  return signals;
}

async function filesBelow(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await filesBelow(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

function isTextEvidence(relative) {
  return [".json", ".jsonl", ".log", ".md", ".openui", ".rs", ".toml", ".txt", ".html"].includes(path.extname(relative));
}

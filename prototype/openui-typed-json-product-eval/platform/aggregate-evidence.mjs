#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { evidenceStatus } from "./evidence-status.mjs";

const root = path.resolve(process.argv[2] ?? "evidence/platform-cloud");
const platforms = {};
for (const name of ["web", "desktop", "ios", "android"]) {
  try {
    platforms[name] = JSON.parse(await readFile(path.join(root, `${name}.json`), "utf8"));
  } catch (error) {
    platforms[name] = { platform: name, status: "INVALID_EVAL", passed: false, evidence_complete: false, error: String(error.message) };
  }
}
const allComplete = Object.values(platforms).every((platform) => platform.passed === true && platform.evidence_complete === true);
const summary = {
  evidence_status: evidenceStatus(platforms),
  generated_at: new Date().toISOString(),
  platforms,
  claims: {
    physical_devices: false,
    native_widgets: false,
    ios_simulator: platforms.ios.passed === true,
    android_emulator: platforms.android.passed === true,
    webview_mobile: true,
  },
};
await writeFile(path.join(root, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
const files = (await filesBelow(root)).filter((name) => name !== "SHA256SUMS").sort();
const hashes = await Promise.all(files.map(async (name) => `${sha(await readFile(path.join(root, name)))}  ${name}`));
await writeFile(path.join(root, "SHA256SUMS"), `${hashes.join("\n")}\n`);
process.stdout.write(`${JSON.stringify(summary)}\n`);

async function filesBelow(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(path.join(directory, entry.name), relative));
    else files.push(relative);
  }
  return files;
}

function sha(value) {
  return createHash("sha256").update(value).digest("hex");
}

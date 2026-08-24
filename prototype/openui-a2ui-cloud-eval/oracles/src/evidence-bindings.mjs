import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildCodexPrompt, buildRepairPrompt } from "./attempt-prompt.mjs";

export async function verifyThreeArmBindings(records, preregistration, directory) {
  const scenarios = new Map(preregistration.scenarios.map((item) => [item.id, item]));
  for (const record of records) {
    if (record.provider_error) continue;
    const stem = `${String(record.passage).padStart(2, "0")}-${record.protocol}-attempt-${record.attempt}`;
    const extension = record.protocol === "openui" ? "openui" : "json";
    const raw = await readFile(path.join(directory, "raw", `${stem}.${extension}`));
    const diagnostics = await readFile(path.join(directory, "diagnostics", `${stem}.json`));
    assertHash(record.artifact_hashes?.raw_output_sha256, raw, `${stem} raw output`);
    assertHash(record.artifact_hashes?.diagnostics_sha256, diagnostics, `${stem} diagnostics`);
    const protocol = preregistration.protocols[record.protocol];
    const scenario = scenarios.get(record.scenario_id);
    if (record.prompt_hashes?.system_prompt_sha256 !== protocol?.hash) {
      throw new Error(`${stem} system prompt is not bound to preregistration`);
    }
    if (record.prompt_hashes?.shared_prompt_sha256 !== scenario?.shared_prompt_hash) {
      throw new Error(`${stem} shared prompt is not bound to preregistration`);
    }
    let userPrompt = scenario.shared_prompt;
    if (record.attempt === 2) {
      const previousStem = `${String(record.passage).padStart(2, "0")}-${record.protocol}-attempt-1`;
      const previousRaw = await readFile(
        path.join(directory, "raw", `${previousStem}.${extension}`),
        "utf8",
      );
      const previousDiagnostics = JSON.parse(
        await readFile(path.join(directory, "diagnostics", `${previousStem}.json`), "utf8"),
      );
      userPrompt = buildRepairPrompt(
        scenario.shared_prompt,
        previousRaw,
        previousDiagnostics.diagnostics ?? [],
      );
    }
    if (record.prompt_hashes?.user_prompt_sha256 !== evidenceHash(userPrompt)) {
      throw new Error(`${stem} user prompt hash mismatch`);
    }
    const providerPrompt = buildCodexPrompt(protocol.instructions, userPrompt);
    if (record.prompt_hashes?.provider_prompt_sha256 !== evidenceHash(providerPrompt)) {
      throw new Error(`${stem} provider prompt hash mismatch`);
    }
    if (record.artifact_hashes?.surface_sha256 !== null) {
      const surface = await readFile(path.join(directory, "surfaces", `${stem}.json`));
      assertHash(record.artifact_hashes?.surface_sha256, surface, `${stem} Surface`);
    }
  }
}

export function evidenceHash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertHash(expected, bytes, label) {
  const actual = evidenceHash(bytes);
  if (expected !== actual) throw new Error(`${label} hash mismatch`);
}

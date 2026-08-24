import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildCodexPrompt } from "../src/attempt-prompt.mjs";
import { evidenceHash, verifyThreeArmBindings } from "../src/evidence-bindings.mjs";

test("records bind preregistered prompts to raw, diagnostics, and Surface artifacts", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ope-3-bindings-"));
  try {
    await Promise.all(
      ["raw", "diagnostics", "surfaces"].map((name) => mkdir(path.join(directory, name))),
    );
    const raw = "payload";
    const diagnostics = "{}";
    const surface = "{\"root\":\"card\"}";
    await writeFile(path.join(directory, "raw/01-typed-json-attempt-1.json"), raw);
    await writeFile(path.join(directory, "diagnostics/01-typed-json-attempt-1.json"), diagnostics);
    await writeFile(path.join(directory, "surfaces/01-typed-json-attempt-1.json"), surface);
    const systemPrompt = "instructions";
    const sharedPrompt = "shared prompt";
    const preregistration = {
      protocols: {
        "typed-json": { hash: evidenceHash(systemPrompt), instructions: systemPrompt },
      },
      scenarios: [
        {
          id: "scenario-1",
          shared_prompt_hash: evidenceHash(sharedPrompt),
          shared_prompt: sharedPrompt,
        },
      ],
    };
    const record = {
      passage: 1,
      protocol: "typed-json",
      scenario_id: "scenario-1",
      attempt: 1,
      provider_error: null,
      prompt_hashes: {
        system_prompt_sha256: evidenceHash(systemPrompt),
        shared_prompt_sha256: evidenceHash(sharedPrompt),
        user_prompt_sha256: evidenceHash(sharedPrompt),
        provider_prompt_sha256: evidenceHash(buildCodexPrompt(systemPrompt, sharedPrompt)),
      },
      artifact_hashes: {
        raw_output_sha256: evidenceHash(raw),
        diagnostics_sha256: evidenceHash(diagnostics),
        surface_sha256: evidenceHash(surface),
      },
    };
    await verifyThreeArmBindings([record], preregistration, directory);
    await writeFile(path.join(directory, "raw/01-typed-json-attempt-1.json"), "tampered");
    await assert.rejects(
      verifyThreeArmBindings([record], preregistration, directory),
      /raw output hash mismatch/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

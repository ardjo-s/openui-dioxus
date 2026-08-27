import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { sha, stableJson } from "./hash.mjs";
import { repairPrompt } from "./provider.mjs";
import { routeExtension } from "./routes.mjs";
import { scanProviderPayload } from "./security.mjs";

export const PUBLICATION_MARKER = "PUBLICATION.json";
export const CANDIDATE_MARKER = "CANDIDATE.json";

export async function verifyEvidencePublication(directory) {
  const marker = JSON.parse(await readFile(path.join(directory, PUBLICATION_MARKER), "utf8"));
  if (marker.status !== "complete") throw new Error("evidence publication marker is not complete");
  const checksumBytes = await readFile(path.join(directory, "SHA256SUMS"));
  if (sha(checksumBytes) !== marker.checksum_manifest_sha256) throw new Error("evidence checksum manifest differs from publication marker");
  const entries = checksumBytes.toString("utf8").trim().split("\n").filter(Boolean).map((line) => {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match || path.isAbsolute(match[2]) || match[2].split(path.sep).includes("..")) throw new Error(`invalid checksum entry: ${line}`);
    return { expected: match[1], relative: match[2] };
  });
  const listed = new Set(entries.map((entry) => entry.relative));
  if (listed.size !== entries.length) throw new Error("duplicate evidence checksum entry");
  const actual = (await filesBelow(directory))
    .filter((relative) => !["SHA256SUMS", PUBLICATION_MARKER].includes(relative))
    .sort();
  if (JSON.stringify([...listed].sort()) !== JSON.stringify(actual)) throw new Error("evidence file inventory differs from checksum manifest");
  for (const entry of entries) {
    if (sha(await readFile(path.join(directory, entry.relative))) !== entry.expected) {
      throw new Error(`evidence checksum differs: ${entry.relative}`);
    }
  }
  const summary = JSON.parse(await readFile(path.join(directory, "summary.json"), "utf8"));
  const manifest = JSON.parse(await readFile(path.join(directory, "candidate-manifest.json"), "utf8"));
  const candidate = JSON.parse(await readFile(path.join(directory, CANDIDATE_MARKER), "utf8"));
  const reviewBytes = await readFile(path.join(directory, "INDEPENDENT_REVIEW.json"));
  const review = JSON.parse(reviewBytes);
  if (manifest.observable_contract?.version === "observable-contract-v2"
    && (summary.provider !== "codex"
      || summary.frozen_manifest?.verified !== true
      || summary.frozen_manifest?.one_shot_consumed !== true
      || summary.provider_event_evidence?.verified !== true)) {
    throw new Error("observable-contract-v2 publication lacks real-provider attestations");
  }
  if (summary.outcome !== marker.outcome) throw new Error("evidence outcome differs from publication marker");
  if (summary.manifest_hash !== marker.manifest_hash || manifest.hash !== marker.manifest_hash) {
    throw new Error("evidence manifest hash differs from publication marker");
  }
  if (!review.passed || review.manifest_hash !== marker.manifest_hash || review.outcome !== marker.outcome) {
    throw new Error("independent review differs from publication marker");
  }
  if (review.candidate_checksum_manifest_sha256 !== candidate.checksum_manifest_sha256) {
    throw new Error("independent review differs from candidate evidence");
  }
  if (sha(reviewBytes) !== marker.independent_review_sha256) throw new Error("independent review hash differs from publication marker");
  return {
    verified: true,
    outcome: marker.outcome,
    manifest_hash: marker.manifest_hash,
    checksum_manifest_sha256: marker.checksum_manifest_sha256,
    file_count: entries.length,
  };
}

export async function verifyFrozenExecutionRecords({
  directory,
  records,
  contract,
  cohorts,
  promptPack = contract?.prompt_pack,
  contractVersion = null,
}) {
  if (!Array.isArray(records)
    || !Array.isArray(contract?.schedule)
    || !Array.isArray(promptPack)
    || !Array.isArray(cohorts?.runtime_uncertain)
    || !Array.isArray(cohorts?.compile_known)) {
    throw new Error("frozen execution evidence is incomplete");
  }
  const scenarioById = new Map([
    ...cohorts.runtime_uncertain.map((scenario) => [scenario.id, {
      source_scenario_id: scenario.id,
      family: scenario.family,
    }]),
    ...cohorts.compile_known.map((scenario) => [scenario.id, {
      source_scenario_id: scenario.source_scenario_id,
      family: scenario.family,
    }]),
  ]);
  const promptById = new Map(promptPack.map((prompt) => [prompt.prompt_id, prompt]));
  if (promptById.size !== promptPack.length) throw new Error("frozen prompt ids are not unique");
  for (const prompt of promptPack) {
    if (sha(prompt.instructions) !== prompt.instructions_sha256
      || sha(prompt.user_prompt) !== prompt.user_prompt_sha256) {
      throw new Error(`frozen prompt hash differs: ${prompt.prompt_id}`);
    }
  }

  const evidenceStems = new Set();
  const verifiedArtifacts = new Map();
  let providerPayloadScanFindings = 0;
  let recordIndex = 0;
  let coveredCells = 0;
  for (const cell of contract.schedule) {
    if (recordIndex >= records.length) break;
    const first = records[recordIndex];
    if (first.prompt_id !== cell.prompt_id) throw new Error(`record schedule differs at ${cell.prompt_id}`);
    const attempts = [];
    while (recordIndex < records.length && records[recordIndex].prompt_id === cell.prompt_id) {
      attempts.push(records[recordIndex]);
      recordIndex += 1;
    }
    if (attempts.length > Number(contract.maximum_repairs_per_route) + 1) {
      throw new Error(`repair ceiling exceeded at ${cell.prompt_id}`);
    }
    const prompt = promptById.get(cell.prompt_id);
    if (!prompt || ["route", "cohort", "scenario_id"].some((field) => prompt[field] !== cell[field])) {
      throw new Error(`frozen prompt binding differs at ${cell.prompt_id}`);
    }
    const scenarioBinding = scenarioById.get(cell.scenario_id);
    if (!scenarioBinding) throw new Error(`missing source scenario binding at ${cell.prompt_id}`);
    for (let index = 0; index < attempts.length; index += 1) {
      const record = attempts[index];
      const expectedAttempt = index + 1;
      if (record.attempt !== expectedAttempt || record.repaired !== (expectedAttempt === 2)) {
        throw new Error(`attempt sequence differs at ${cell.prompt_id}`);
      }
      for (const field of ["prompt_id", "route", "cohort", "scenario_id", "order_position"]) {
        if (record[field] !== cell[field]) throw new Error(`record schedule differs at ${cell.prompt_id}:${field}`);
      }
      if (record.source_scenario_id !== scenarioBinding.source_scenario_id
        || record.family !== scenarioBinding.family) {
        throw new Error(`source scenario binding differs at ${cell.prompt_id}`);
      }
      if (typeof record.evidence_stem !== "string" || !/^[a-z0-9-]+$/u.test(record.evidence_stem)) {
        throw new Error(`invalid evidence stem at ${cell.prompt_id}`);
      }
      if (evidenceStems.has(record.evidence_stem)) throw new Error(`duplicate evidence stem at ${cell.prompt_id}`);
      evidenceStems.add(record.evidence_stem);
      const rawBytes = await readFile(
        path.join(directory, "raw", `${record.evidence_stem}.${routeExtension(record.route)}`),
      );
      const diagnosticsBytes = await readFile(
        path.join(directory, "diagnostics", `${record.evidence_stem}.json`),
      );
      if (sha(rawBytes) !== record.artifact_hashes?.raw_sha256
        || sha(diagnosticsBytes) !== record.artifact_hashes?.diagnostics_sha256) {
        throw new Error(`artifact hash differs at ${cell.prompt_id}:attempt-${expectedAttempt}`);
      }
      await verifyClaimedArtifacts({ directory, record, cell });
      verifiedArtifacts.set(record.evidence_stem, {
        output: rawBytes.toString("utf8"),
        diagnostics: JSON.parse(diagnosticsBytes.toString("utf8")).diagnostics,
      });
      let expectedUserPrompt = prompt.user_prompt;
      if (expectedAttempt === 2) {
        const prior = attempts[0];
        if (prior.accepted !== false) throw new Error(`repair precondition differs at ${cell.prompt_id}`);
        const priorArtifacts = verifiedArtifacts.get(prior.evidence_stem);
        expectedUserPrompt = repairPrompt(
          prompt.user_prompt,
          priorArtifacts.output,
          priorArtifacts.diagnostics,
          { contractVersion },
        );
      }
      if (record.prompt_hashes?.instructions_sha256 !== prompt.instructions_sha256
        || record.prompt_hashes?.user_prompt_sha256 !== sha(expectedUserPrompt)) {
        throw new Error(`prompt hash differs at ${cell.prompt_id}:attempt-${expectedAttempt}`);
      }
      providerPayloadScanFindings += scanProviderPayload({
        instructions: prompt.instructions,
        user_prompt: expectedUserPrompt,
      }).length;
    }
    coveredCells += 1;
  }
  if (recordIndex !== records.length) throw new Error("records are not an exact schedule prefix");
  return {
    verified: true,
    scheduled_cells: contract.schedule.length,
    covered_cells: coveredCells,
    attempts: records.length,
    repairs: records.filter((record) => record.attempt === 2).length,
    pre_provider_scan_findings: providerPayloadScanFindings,
  };
}

async function verifyClaimedArtifacts({ directory, record, cell }) {
  const hashes = record.artifact_hashes ?? {};
  for (const field of ["native_sha256", "canonical_sha256", "platform_artifact_sha256"]) {
    if (!Object.hasOwn(hashes, field)
      || (hashes[field] !== null && !/^[a-f0-9]{64}$/u.test(hashes[field]))) {
      throw new Error(`artifact field is missing or invalid at ${cell.prompt_id}:${field}`);
    }
  }
  for (const field of ["canonical_surface", "platform_artifact"]) {
    if (!Object.hasOwn(record, field)) throw new Error(`artifact field is missing at ${cell.prompt_id}:${field}`);
  }
  if ((record.platform_artifact === null) !== (hashes.platform_artifact_sha256 === null)) {
    throw new Error(`artifact presence differs at ${cell.prompt_id}:platform`);
  }
  if ((record.canonical_surface === null) !== (hashes.canonical_sha256 === null)) {
    throw new Error(`artifact presence differs at ${cell.prompt_id}:canonical`);
  }
  if (hashes.native_sha256 !== null) {
    if (!["json-render", "direct-rsx"].includes(record.route)) {
      throw new Error(`artifact presence differs at ${cell.prompt_id}:native`);
    }
    const extension = record.route === "direct-rsx" ? "html" : "json";
    const nativeBytes = await readFile(path.join(directory, "native", `${record.evidence_stem}.${extension}`));
    if (sha(nativeBytes) !== hashes.native_sha256) {
      throw new Error(`artifact hash differs at ${cell.prompt_id}:native`);
    }
  }
  if (hashes.canonical_sha256 !== null) {
    const canonical = JSON.parse(await readFile(
      path.join(directory, "canonical", `${record.evidence_stem}.canonical.json`),
      "utf8",
    ));
    if (sha(JSON.stringify(canonical)) !== hashes.canonical_sha256
      || stableJson(canonical) !== stableJson(record.canonical_surface)) {
      throw new Error(`artifact hash differs at ${cell.prompt_id}:canonical`);
    }
  }
  if (hashes.platform_artifact_sha256 !== null
    && sha(stableJson(record.platform_artifact)) !== hashes.platform_artifact_sha256) {
    throw new Error(`artifact hash differs at ${cell.prompt_id}:platform`);
  }
  if (record.accepted === true) {
    if (hashes.platform_artifact_sha256 === null) throw new Error(`artifact presence differs at ${cell.prompt_id}:platform`);
    if (["openui", "typed-json"].includes(record.route) && hashes.canonical_sha256 === null) {
      throw new Error(`artifact presence differs at ${cell.prompt_id}:canonical`);
    }
    if (["json-render", "direct-rsx"].includes(record.route) && hashes.native_sha256 === null) {
      throw new Error(`artifact presence differs at ${cell.prompt_id}:native`);
    }
  }
}

async function filesBelow(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? path.join(prefix, entry.name) : entry.name;
    if (entry.isDirectory()) files.push(...await filesBelow(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`non-regular evidence path: ${relative}`);
  }
  return files;
}

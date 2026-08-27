import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { buildEvaluationScenarios, observableBusinessProperties } from "../src/observable-contract-v2-scenarios.mjs";
import { runtimeContractCoverageV2 } from "../src/routes.mjs";

const contractVersion = "observable-contract-v2";
const temporaryRoot = new URL("../.tmp/", import.meta.url);

test("v1 replay verifies the complete immutable archive before reproducing failures", () => {
  const result = spawnSync(process.execPath, ["scripts/replay-final-invalid.mjs"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });
  const replay = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.deepEqual(replay.archive_integrity, {
    verified: true,
    evidence_commit: "5454b37",
    files_verified: 605,
    checksum_manifest_sha256: "5e04615ca018d822db6cbd54845b5eb5363f7f23f08c8dde2afcef06a15c4c79",
  });
});

test("v2 binds supplied business values to semantic component properties", async () => {
  const scenarios = await buildEvaluationScenarios({ contractVersion });
  const scenario = scenarios.find((entry) => entry.family === "navigation-feedback");
  const artifact = structuredClone(scenario.expected);
  const tabs = artifact.nodes.find((node) => node.kind === "Tabs");
  const toast = artifact.nodes.find((node) => node.kind === "Toast");
  tabs.value = toast.title;

  const coverage = runtimeContractCoverageV2(artifact, scenario.shared_contract);
  assert.equal(coverage.passed, false);
  assert.ok(coverage.diagnostics.some((entry) => entry.code === "observable-business-properties"));

  const sameKind = [
    { kind: "Toolbar", id: "root", orientation: "vertical", children: ["save", "cancel"] },
    { kind: "Button", id: "save", label: "Save", action: "SubmitProfile", target_id: "profile" },
    { kind: "Button", id: "cancel", label: "Cancel", action: "ApplyFilter", target_id: "profile" },
  ];
  const swapped = structuredClone(sameKind);
  swapped.find((node) => node.id === "save").label = "Cancel";
  swapped.find((node) => node.id === "cancel").label = "Save";
  assert.notDeepEqual(
    observableBusinessProperties(swapped, { root: "root" }),
    observableBusinessProperties(sameKind, { root: "root" }),
  );
});

test("every v2 holdout composition is structurally unseen relative to v1", async () => {
  const v1 = await buildEvaluationScenarios();
  const v2 = await buildEvaluationScenarios({ contractVersion });
  const prior = new Set(v1.map((scenario) => structuralFingerprint(scenario.expected)));

  assert.ok(v2.every((scenario) => typeof scenario.structural_fingerprint === "string"));
  assert.ok(v2.every((scenario) => !prior.has(scenario.structural_fingerprint)));
  assert.equal(new Set(v2.map((scenario) => scenario.structural_fingerprint)).size, v2.length);
});

test("real v2 execution requires raw-byte manifest attestation and one durable claim", async () => {
  const guard = await import("../src/v2-execution-guard.mjs");
  assert.equal(Object.hasOwn(guard, "claimCanaryOnce"), false);
  const {
    assertV2ProviderBoundary,
    assertExternalEvidenceDirectory,
    consumeOneShotClaim,
    loadFrozenManifest,
    loadOneShotClaim,
    loadOneShotConsumption,
    loadReviewAttestation,
    reviewAttestationName,
  } = guard;
  await mkdir(temporaryRoot, { recursive: true });
  const directory = await mkdtemp(path.join(temporaryRoot.pathname, "v2-execution-guard-"));
  try {
    const manifestPath = path.join(directory, "candidate.json");
    const bytes = Buffer.from(`${JSON.stringify({ observable_contract: { version: contractVersion } }, null, 2)}\n`);
    const digest = createHash("sha256").update(bytes).digest("hex");
    await writeFile(manifestPath, bytes);
    await writeFile(`${manifestPath}.sha256`, `${digest}\n`);
    const attestation = await loadFrozenManifest(manifestPath);
    assert.equal(attestation.raw_sha256, digest);

    assert.throws(() => assertV2ProviderBoundary({
      provider: "codex",
      contractVersion,
      contractKey: "complete_run",
      frozenManifestAttestation: attestation,
      oneShotClaim: { manifest_raw_sha256: digest },
    }), /v2 provider execution is canary-only/u);
    assert.throws(() => assertV2ProviderBoundary({
      provider: "codex",
      contractVersion,
      contractKey: "canary",
      frozenManifestAttestation: attestation,
      oneShotClaim: { manifest_raw_sha256: digest },
      reviewAttestation: null,
    }), /requires the OPE-23 Git review attestation/u);

    const ledgerRoot = path.join(directory, "ledger");
    const syntheticReview = {
      verified: true,
      reviewed_commit: "a".repeat(40),
      tag_name: "ope-23-test-review",
      tag_object: "c".repeat(40),
    };
    const outputA = path.join(directory, "output-a");
    await mkdir(ledgerRoot);
    const claimPath = path.join(ledgerRoot, `${contractVersion}-${digest}.json`);
    const claim = {
      version: "ope-24-one-shot-claim-v1",
      ticket: "OPE-24",
      status: "started",
      manifest_raw_sha256: digest,
      reviewed_commit: "a".repeat(40),
      review_attestation_tag: syntheticReview.tag_name,
      review_attestation_object: syntheticReview.tag_object,
      output_directory_sha256: createHash("sha256").update(path.resolve(outputA)).digest("hex"),
      claimed_at: new Date().toISOString(),
      ledger_path: claimPath,
    };
    const { ledger_path: _ledgerPath, ...storedClaim } = claim;
    await writeFile(claimPath, `${JSON.stringify(storedClaim, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    assert.equal(claim.manifest_raw_sha256, digest);
    assert.throws(() => assertV2ProviderBoundary({
      provider: "codex",
      contractVersion,
      contractKey: "canary",
      frozenManifestAttestation: attestation,
      oneShotClaim: claim,
      reviewAttestation: syntheticReview,
    }), /consumed matching one-shot claim/u);
    await assert.rejects(
      () => loadOneShotClaim(claim.ledger_path, {
        ledgerRoot,
        manifestRawSha256: digest,
        outputDirectory: path.join(directory, "output-b"),
        reviewAttestation: syntheticReview,
      }),
      /output directory differs/u,
    );
    const copiedClaim = path.join(directory, "copied-claim.json");
    await writeFile(copiedClaim, await readFile(claim.ledger_path));
    await assert.rejects(
      () => loadOneShotClaim(copiedClaim, { ledgerRoot }),
      /outside the canonical ledger/u,
    );
    const consumed = await consumeOneShotClaim({
      claimPath: claim.ledger_path,
      ledgerRoot,
      manifestRawSha256: digest,
      outputDirectory: outputA,
      reviewAttestation: syntheticReview,
    });
    assert.equal(consumed.consumed, true);
    assert.equal((await loadOneShotConsumption(consumed.consumption_path, { claim })).verified, true);
    assert.doesNotThrow(() => assertV2ProviderBoundary({
      provider: "codex",
      contractVersion,
      contractKey: "canary",
      frozenManifestAttestation: attestation,
      oneShotClaim: consumed,
      reviewAttestation: syntheticReview,
    }));
    await assert.rejects(
      () => consumeOneShotClaim({
        claimPath: claim.ledger_path,
        ledgerRoot,
        manifestRawSha256: digest,
        outputDirectory: outputA,
        reviewAttestation: syntheticReview,
      }),
      /claim already consumed/u,
    );
    await writeFile(`${manifestPath}.sha256`, `${"0".repeat(64)}\n`);
    await assert.rejects(() => loadFrozenManifest(manifestPath), /raw SHA-256 mismatch/u);

    const repository = path.join(directory, "reviewed-repository");
    await mkdir(repository);
    git(repository, ["init", "-q"]);
    git(repository, ["config", "user.email", "review@example.invalid"]);
    git(repository, ["config", "user.name", "OPE-23 Review"]);
    await writeFile(path.join(repository, "reviewed.txt"), "reviewed\n");
    await writeFile(path.join(repository, ".gitignore"), [
      "/prototype/dioxus-components-catalog-eval/generator/node_modules",
      "/prototype/ecosystem-relative-eval/node_modules",
      "/prototype/openui-typed-json-product-eval/node_modules",
      "",
    ].join("\n"));
    git(repository, ["add", "reviewed.txt", ".gitignore"]);
    git(repository, ["commit", "-m", "test: reviewed implementation"]);
    const tagManifest = {
      observable_contract: { version: contractVersion },
      input_hashes: { implementation_tree: { sha256: "b".repeat(64) } },
    };
    const tagBytes = Buffer.from(`${JSON.stringify(tagManifest, null, 2)}\n`);
    const tagRaw = createHash("sha256").update(tagBytes).digest("hex");
    const tagSemantic = createHash("sha256").update(JSON.stringify(tagManifest)).digest("hex");
    const tagName = reviewAttestationName(tagRaw);
    git(repository, ["tag", "-a", tagName, "-m", JSON.stringify({
      version: "ope-23-review-attestation-v1",
      ticket: "OPE-23",
      status: "approved",
      manifest_raw_sha256: tagRaw,
      manifest_semantic_sha256: tagSemantic,
      implementation_tree_sha256: "b".repeat(64),
    })]);
    const review = loadReviewAttestation({
      repoRoot: repository,
      manifestAttestation: {
        raw_sha256: tagRaw,
        semantic_sha256: tagSemantic,
        manifest: tagManifest,
      },
    });
    assert.equal(review.tag_name, tagName);
    assert.equal(review.verified, true);
    await writeFile(path.join(repository, "reviewed.txt"), "dirty\n");
    assert.throws(
      () => loadReviewAttestation({
        repoRoot: repository,
        manifestAttestation: { raw_sha256: tagRaw, semantic_sha256: tagSemantic, manifest: tagManifest },
      }),
      /tracked worktree or index differs/u,
    );
    await writeFile(path.join(repository, "reviewed.txt"), "reviewed\n");
    await writeFile(path.join(repository, "untracked.txt"), "untracked\n");
    assert.throws(
      () => loadReviewAttestation({
        repoRoot: repository,
        manifestAttestation: { raw_sha256: tagRaw, semantic_sha256: tagSemantic, manifest: tagManifest },
      }),
      /untracked worktree paths differ/u,
    );
    await rm(path.join(repository, "untracked.txt"));

    const inRepositoryEvidence = path.join(repository, "evidence", "canary");
    await mkdir(inRepositoryEvidence, { recursive: true });
    await assert.rejects(
      () => assertExternalEvidenceDirectory({ repoRoot: repository, outputDirectory: inRepositoryEvidence }),
      /outside the reviewed repository/u,
    );
    const externalEvidence = path.join(directory, "external-evidence");
    await mkdir(externalEvidence);
    await assert.doesNotReject(
      () => assertExternalEvidenceDirectory({ repoRoot: repository, outputDirectory: externalEvidence }),
    );

    const approvedRelative = "prototype/ecosystem-relative-eval/node_modules";
    const approvedLink = path.join(repository, approvedRelative);
    const dependencyTarget = path.join(directory, "dependency-source", approvedRelative);
    await mkdir(dependencyTarget, { recursive: true });
    await mkdir(path.dirname(approvedLink), { recursive: true });
    await symlink(dependencyTarget, approvedLink);
    assert.doesNotThrow(() => loadReviewAttestation({
      repoRoot: repository,
      manifestAttestation: { raw_sha256: tagRaw, semantic_sha256: tagSemantic, manifest: tagManifest },
    }));
    await rm(approvedLink);
    await mkdir(approvedLink);
    assert.throws(
      () => loadReviewAttestation({
        repoRoot: repository,
        manifestAttestation: { raw_sha256: tagRaw, semantic_sha256: tagSemantic, manifest: tagManifest },
      }),
      /approved dependency path must be a symbolic link/u,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("v2 canary classification and promotion are explicit for pass, fail, and invalid", async () => {
  const { canPromoteV2Manifest, classifyCanaryOutcomeV2 } = await import("../src/run-canary.mjs");
  assert.equal(classifyCanaryOutcomeV2({ provider: "codex", providerError: null, allAccepted: true, operationalPreflightPassed: true }), "CANARY_PASS");
  assert.equal(classifyCanaryOutcomeV2({ provider: "codex", providerError: null, allAccepted: false, operationalPreflightPassed: false }), "CANARY_FAIL");
  assert.equal(classifyCanaryOutcomeV2({ provider: "codex", providerError: "provider failed", allAccepted: false, operationalPreflightPassed: false }), "CANARY_INVALID");
  assert.equal(classifyCanaryOutcomeV2({ provider: "fake", providerError: null, allAccepted: true, operationalPreflightPassed: true }), "CANARY_INVALID");
  assert.equal(canPromoteV2Manifest({
    outcome: "CANARY_PASS",
    provider: "codex",
    platformProof: "generated",
    frozenManifestVerified: true,
  }), true);
  assert.equal(canPromoteV2Manifest({
    outcome: "CANARY_PASS",
    provider: "codex",
    platformProof: "generated",
    frozenManifestVerified: false,
  }), false);
});

test("the provider wrapper rejects v2 complete runs and missing attestations before authentication", async () => {
  await mkdir(temporaryRoot, { recursive: true });
  const output = await mkdtemp(path.join(temporaryRoot.pathname, "v2-wrapper-boundary-"));
  try {
    const complete = spawnSync("bash", ["scripts/run-canary.sh"], {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8",
      env: {
        ...process.env,
        EVAL_CONTRACT_VERSION: contractVersion,
        EVAL_FROZEN_MANIFEST: "",
        EVAL_OUTPUT_DIR: output,
        EVAL_RUN: "complete",
      },
    });
    assert.equal(complete.status, 2);
    assert.match(complete.stderr, /provider execution is canary-only/u);

    const missingManifest = spawnSync("bash", ["scripts/run-canary.sh"], {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8",
      env: {
        ...process.env,
        EVAL_CONTRACT_VERSION: contractVersion,
        EVAL_FROZEN_MANIFEST: "",
        EVAL_OUTPUT_DIR: output,
        EVAL_RUN: "canary",
      },
    });
    assert.equal(missingManifest.status, 2);
    assert.match(missingManifest.stderr, /requires EVAL_FROZEN_MANIFEST/u);

    const inRepositoryOutput = path.join(new URL("..", import.meta.url).pathname, "evidence", "unsafe-v2-output");
    const unsafeOutput = spawnSync("bash", ["scripts/run-canary.sh"], {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8",
      env: {
        ...process.env,
        EVAL_CONTRACT_VERSION: contractVersion,
        EVAL_FROZEN_MANIFEST: path.join(output, "synthetic-manifest.json"),
        EVAL_OUTPUT_DIR: inRepositoryOutput,
        EVAL_RUN: "canary",
      },
    });
    assert.equal(unsafeOutput.status, 2);
    assert.match(unsafeOutput.stderr, /outside the reviewed repository/u);

    const externalSymlinkRoot = await mkdtemp("/private/tmp/ope23-shell-output-");
    try {
      const inRepositoryTarget = path.join(output, "symlinked-output-target");
      const externalSymlink = path.join(externalSymlinkRoot, "canary-output");
      await mkdir(inRepositoryTarget);
      await symlink(inRepositoryTarget, externalSymlink);
      const symlinkedOutput = spawnSync("bash", ["scripts/run-canary.sh"], {
        cwd: new URL("..", import.meta.url),
        encoding: "utf8",
        env: {
          ...process.env,
          EVAL_CONTRACT_VERSION: contractVersion,
          EVAL_FROZEN_MANIFEST: path.join(output, "synthetic-manifest.json"),
          EVAL_OUTPUT_DIR: externalSymlink,
          EVAL_RUN: "canary",
          EVAL_SOURCE_CODEX_HOME: path.join(externalSymlinkRoot, "missing-auth"),
        },
      });
      assert.equal(symlinkedOutput.status, 2);
      assert.match(symlinkedOutput.stderr, /unsafe|outside the reviewed repository/u);

      const directCli = spawnSync(process.execPath, [
        "src/run-canary.mjs",
        "--provider", "codex",
        "--output", externalSymlink,
        "--contract-version", contractVersion,
        "--manifest", path.join(output, "missing-manifest.json"),
      ], {
        cwd: new URL("..", import.meta.url),
        encoding: "utf8",
      });
      assert.equal(directCli.status, 1);
      assert.match(directCli.stderr, /unsafe|outside the reviewed repository/u);
      assert.deepEqual(await readdir(inRepositoryTarget), []);
    } finally {
      await rm(externalSymlinkRoot, { recursive: true, force: true });
    }
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("the CLI always writes terminal status for an emergency failure", async () => {
  await mkdir(temporaryRoot, { recursive: true });
  const output = await mkdtemp(path.join(temporaryRoot.pathname, "terminal-status-"));
  try {
    const result = spawnSync(process.execPath, [
      "src/run-canary.mjs",
      "--provider", "fake",
      "--output", output,
      "--contract-version", contractVersion,
      "--manifest", path.join(output, "missing-manifest.json"),
    ], {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(await readFile(path.join(output, "summary.json"), "utf8")).outcome, "CANARY_INVALID");
    assert.equal(JSON.parse(await readFile(path.join(output, "TERMINAL_STATUS.json"), "utf8")).outcome, "CANARY_INVALID");
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("the one-shot claim and event audit occur at the last unbiased boundaries", async () => {
  const wrapper = await readFile(new URL("../scripts/run-canary.sh", import.meta.url), "utf8");
  const runner = await readFile(new URL("../src/run-canary.mjs", import.meta.url), "utf8");
  const reviewer = await readFile(new URL("../scripts/review-evidence.mjs", import.meta.url), "utf8");
  const finalizer = await readFile(new URL("../scripts/finalize-evidence.mjs", import.meta.url), "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.doesNotMatch(wrapper, /claim-observable-contract-v2-canary\.mjs/u);
  assert.ok(wrapper.indexOf("clean_shared_target", wrapper.indexOf("npm test")) < wrapper.indexOf("storage_gate post-tests"));
  assert.ok(runner.indexOf("await consumeOneShotClaim") > runner.indexOf("frozen candidate manifest differs"));
  assert.ok(runner.indexOf("await consumeOneShotClaim") > runner.indexOf("prepareOutputDirectory(outputDirectory)"));
  assert.ok(runner.indexOf("providerBuildCacheCleanup = await cleanProviderBuildCache") < runner.indexOf("capturePreProviderStorage"));
  assert.match(runner, /\.cache", "openui-dioxus-eval", "evidence"/u);
  assert.ok(runner.indexOf("providerEventEvidence = { verified: true, ...await verifyProviderEventDirectory") < runner.indexOf("const summary ="));
  assert.match(reviewer, /pre-provider-build-cache-cleanup\.json/u);
  assert.match(reviewer, /provider-build-cache-cleanup-mismatch/u);
  assert.match(reviewer, /verifyFrozenExecutionRecords/u);
  assert.match(reviewer, /incomplete-passing-schedule/u);
  assert.match(reviewer, /operational-preflight-recomputation-mismatch/u);
  assert.match(reviewer, /canary-outcome-recomputation-mismatch/u);
  assert.match(reviewer, /verifyOpe3Archive/u);
  assert.match(reviewer, /verifySecondCatalogFixtures/u);
  assert.match(reviewer, /verifyPlatformEvidence/u);
  assert.match(reviewer, /scanEvidenceDirectory/u);
  assert.match(reviewer, /pre-provider-storage-gates\.jsonl/u);
  assert.match(finalizer, /observable-contract-v2 publication requires provider=codex/u);
  assert.ok(runner.indexOf("await runMandatoryProviderPreflight") < runner.indexOf("providerExecutionCapability: options.provider"));
  assert.ok(runner.indexOf("await runMandatoryProviderPreflight") < runner.indexOf("await claimCanaryOnce"));
  assert.ok(runner.indexOf("await claimCanaryOnce") < runner.indexOf("oneShotClaimPath:"));
  assert.doesNotMatch(runner, /process\.env\.EVAL_V2_CANARY_CLAIM/u);
  assert.match(wrapper, /EVAL_PREFLIGHT_ONLY/u);
  assert.match(packageJson.scripts.preflight, /--contract-version observable-contract-v2/u);
  assert.match(packageJson.scripts["preflight:complete"], /--contract-version observable-contract-v2/u);
  assert.match(runner, /TERMINAL_STATUS\.json/u);
});

function structuralFingerprint(surface) {
  const byId = new Map(surface.nodes.map((node) => [node.id, node]));
  const visit = (id) => {
    const node = byId.get(id);
    const children = node.kind === "Tabs"
      ? node.items.map((item) => item.child)
      : node.children ?? [];
    return JSON.stringify({
      kind: node.kind,
      orientation: node.orientation ?? null,
      children: children.map(visit),
    });
  };
  return createHash("sha256").update(visit(surface.root)).digest("hex");
}

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

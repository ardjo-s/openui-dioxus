# OPE-23 two-pass independent review

Status: preparatory findings fixed, final independent re-review pending.

## Scope

Two independent read-only reviewers inspected the complete OPE-23 working tree
against the preregistered contract. Neither reviewer edited files or generated
an evaluation cell.

- Reviewer A: security and correctness.
- Reviewer B: maintainability and evaluation methodology.

## Initial actionable findings

| ID | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| A1/B1 | P0/P1 | A real v2 run could omit the reviewed manifest or select the complete-run contract. | Real v2 execution now requires a raw-byte manifest attestation, exact sidecar, exact reviewed commit, one-shot claim, and `canary` contract before provider access. |
| A2/B2 | P0/P1 | A second v2 canary could use another output directory. | A shared-Git ledger reserves the exact manifest and output after wrapper preflight, then atomically consumes it at the last internal pre-provider boundary. A second wrapper invocation is rejected. |
| A3 | P1 | Scalar-set supplied-value coverage lost path and multiplicity. | The contract now freezes route-neutral component-kind and semantic-property values. Validation compares that structure and scalar multiplicities. |
| A4 | P2 | The v1 replay trusted records and raw files from the same archive without checking the complete inventory. | Replay now verifies all 605 listed files, the registered checksum-manifest SHA-256, and zero diff from evidence commit `5454b37` before validation. |
| B3 | P1 | The holdout changed ids and values but retained observed v1 composition. | The transform now creates four valid unseen grouping compositions per family and freezes 20 unique structural fingerprints disjoint from v1. |
| B4 | P2 | `CANARY_PASS` could still serialize `manifest_promoted: false`. | v2 promotion is now explicitly gated on `CANARY_PASS`, Codex provider, generated platform proof, and verified frozen-manifest identity. |

## Preparatory re-review findings

Later read-only review cycles found additional execution-boundary defects before
freeze. Every item below was fixed and regression-tested. These cycles are not
the two final independent approvals.

| ID | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| R1 | P0 | Exported runner or provider helpers could bypass the reviewed shell entrypoint. | A private, unexported CLI capability now gates the runner and the lowest real-provider call. Reusable modules expose only pure helpers and fake generation. |
| R2 | P1 | A failed invocation could be counted as a provider call without distinguishing process, thread, and completion. | Records and summaries now separate invocation request, process start, thread start, and terminal completion. |
| R3 | P0 | Provider event files were archived but not audited before outcome classification. | Exactly one ordered event stream per invocation is verified before the summary and independently recomputed after publication. Missing, duplicate, trailing, or multiplicity-invalid events force invalidity. |
| R4 | P1 | The durable one-shot claim was consumed before deterministic wrapper checks. | Reservation now occurs after bootstrap, tests, typecheck, Dioxus, shell, authentication, cleanup, and wrapper storage checks. Consumption waits for the runner's manifest, archive, catalog, cache, and immediate storage checks. |
| R5 | P1 | A clean tracked diff did not reject non-ignored untracked source. | Reviewed-state verification now rejects every non-ignored untracked path. `node_modules` dependency links alone are ignored. |
| R6 | P1 | A completion event could be followed by unaudited provider events. | Claimed completion must be the final event in the sole JSONL stream. |
| R7 | P1 | Test compilation could leave less than the registered 4 GiB before the provider call. | Only the dedicated evaluation Cargo target is cleaned after builds. The target boundary, cleanup evidence, and immediate storage gate are all independently verified. |
| R8 | P0 | The default in-repository evidence directory would dirty the reviewed tree after consuming the one-shot claim and before the first provider call. | Real canary evidence now defaults outside the repository. Shell, claim, and runner boundaries reject in-repository or symlink-resolved destinations before consumption. |
| R9 | P1 | A broad `node_modules` ignore could hide arbitrary untracked content despite the documented dependency-link exception. | The ignore list now names three exact paths. The reviewed-state gate allows only verified absolute symlinks to the same dependency path in another worktree and rejects every extra ignored `node_modules`. |
| R10 | P1 | Independent review counted records but did not recompute exact scheduled cells, prompt binding, or the one-repair precondition. | Every record now retains `prompt_id`. Review recomputes the exact schedule prefix, prompt content hashes, attempts, repair prompt from prior raw output and diagnostics, and the repair ceiling. |
| R11 | P1 | The runner consumed the one-shot reservation before output preparation and frozen-manifest byte comparison. | Consumption now occurs only after output preparation, manifest comparison, archive and catalog checks, canonical cache cleanup, and the immediate storage gate. |
| R12 | P1 | Lexical Cargo-target checks could follow a symlink outside the dedicated cache. | Shell and Node cleanup resolve real paths, reject symbolic links and non-directories, and require the canonical target strictly below the canonical evaluation-cache root. |
| R13 | P1 | Lifecycle events could be counted without a thread id or valid token usage. | Thread-start and terminal-completion schemas now require a nonempty id and finite non-negative integer usage fields before counting or certification. |
| R14 | P1 | Repair reconstruction used retained files without matching them to each record's raw and diagnostics hashes. | Independent recomputation verifies both artifact hashes before reading prior output or diagnostics into a repair prompt. |
| R15 | P2 | The evaluator README still documented the obsolete in-repository v1 canary command and outcomes. | The README now documents the frozen v2 manifest, external output, one-shot Luna-low command, v2 outcomes, and complete-run deferral. |
| R16 | P1 | A shell output path outside the repo could be a symlink back into it and receive preflight writes. | Before any output write, the wrapper invokes the canonical Node boundary, which rejects final or ancestor symlinks and any real path projected into the repository. |
| R17 | P1 | v2 changed the review-packet seed hash while the runner retained the OPE-12 seed. | The v2-only seed override was removed. Manifest and runner preserve the single registered OPE-12 review-packet seed. |
| R18 | P1 | Record recomputation did not bind `source_scenario_id` and `family`. | Review derives both fields from frozen runtime-uncertain and compile-known cohort entries and verifies every attempt. |
| R19 | P1 | Native, canonical, and platform artifact hashes were not independently recomputed. | Every non-null claimed artifact is checked against its retained file or inline artifact, with route-specific presence rules for accepted outputs. |
| R20 | P1 | The first emergency failure wrote a summary but no terminal marker. | The CLI now always writes `TERMINAL_STATUS.json`, whether the emergency summary is newly created or invalidates an existing candidate summary. |
| R21 | P0 | A direct Node CLI invocation could grant the private provider capability without the reviewed shell preflight. | The CLI now runs the mandatory shell preflight-only path before granting the private capability. This path completes bootstrap, tests, typecheck, Dioxus, shell, authentication, cleanup, and storage gates without claiming or calling the provider. |
| R22 | P1 | The package preflight commands still selected the v1 contract by omission. | Both package preflight commands now select `observable-contract-v2` explicitly. |
| R23 | P1 | The Node CLI could create content through a symbolic-link ancestor before canonical output-path validation. | Real-provider CLI output is canonically validated before the first `mkdir`; the regression test proves that the repository target remains empty. |
| R24 | P1 | Missing derived-artifact fields could pass review because absent and null values were conflated. | Evidence review now requires explicit native, canonical, and platform artifact fields and explicit valid SHA-256 or null values. |
| R25 | P1 | `CANARY_INVALID` could rely on a claimed operational-preflight failure without independent recomputation. | Review now recomputes the operational preflight from retained records, schedule coverage, summary gates, and platform evidence, then requires exact agreement. |
| R26 | P0 | `CANARY_PASS` schedule checks were vacuously true when no final records were present. | A passing canary now requires the exact nonempty eight-cell schedule and one accepted final record for every scheduled cell. |
| R27 | P1 | A deterministic fake-provider v2 run could publish `PUBLICATION.json` with `CANARY_PASS`. | Fake-provider v2 runs are terminal `CANARY_INVALID`, carry a non-certifying deterministic-preflight status, and cannot enter finalization or publication. |
| R28 | P1 | Independent review trusted the candidate's claimed canary outcome. | Review now recomputes the v2 outcome from retained records and evidence and requires exact agreement with the candidate. |
| R29 | P1 | Independent review trusted critical summary booleans instead of the retained evidence behind them. | Review now recomputes OPE-3 integrity, second-catalog identities, runtime diff, payload and credential scans, storage records, generated or reference platform evidence, execution-log hashes, and implementation-tree stability. |
| R30 | P1 | A public claim helper or environment variable could reserve a canary before mandatory preflight and let direct CLI invocation consume it. | The public helper is removed. The reviewed CLI ignores claim injection, runs mandatory preflight itself, then creates the claim internally before passing only its canonical path to the runner. |
| R31 | P1 | The low-level claim function remained importable even after its standalone script was removed. | Claim creation is now private to the reviewed CLI module. The reusable execution-guard module exposes only verification and consumption after the claim exists. |
| R32 | P1 | Full retained-gate and outcome recomputation was limited to the canary contract, so the 80-cell fake complete preflight could pass review while trusting summary claims. | Every v2 contract now recomputes retained gates. Complete preflight review also recomputes review packets, generation completeness, operational preflight, human-evidence finalization, and the resulting `INVALID_EVAL`. |
| R33 | P1 | Missing claim and manifest objects compared as `undefined === undefined`, falsely reporting `one_shot_claimed: true` for fake runs. | Claim status now requires real non-null claim and manifest objects with a matching raw hash. Fake v2 evidence records both claim fields as false. |
| R34 | P2 | The README described all fake v2 runs as `CANARY_INVALID`, although the complete fake contract correctly emits `INVALID_EVAL`. | Documentation now distinguishes fake canaries from fake complete preflights and states that neither may publish. |
| R35 | P1 | Complete-preflight review verified packet counts and hashes but did not reconstruct packet contents from retained final records and the registered blind-review seed. | Review now rebuilds every reference packet from retained final artifacts, frozen scenarios, and `ope-12-anonymous-review-packets-v1`, then requires byte-equivalent semantic content before finalization recomputation can pass. |

## Regression evidence

Review-hardening tests were written and observed red before these fixes. The red
run had five failing tests: archive integrity, business-value provenance,
structural freshness, execution guard, and outcome or promotion classification.

The focused green command is:

```bash
cd prototype/ecosystem-relative-eval
node --test test/ope23-review-hardening.test.mjs
```

Final test counts, review dispositions, candidate hashes, and re-review results
are inserted only after all checks complete.

The final regression counts, reviewer dispositions, frozen identities, and
provider-call count are recorded only after the post-R30 verification completes.

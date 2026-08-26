# Acceptance gates

## OPE-17 rendered receipt semantics

Current state: completed. No provider call occurred. OPE-18 is eligible for its
one separately preregistered canary.

- [x] The exact OPE-16 longer visible receipt interpolation is accepted, compiled, and rendered.
- [x] Missing receipt instrumentation remains rejected by `scanSource`.
- [x] Missing rendered receipt role, live region, or host ownership remains rejected.
- [x] Direct RSX Web proves one click, one action count, and exact equality between the receipt attribute and visible text.
- [x] Deterministic generated-output preflight passes all four routes and required platforms.
- [x] OPE-13 through OPE-16 evidence remains byte-identical.
- [x] Provider settings, scenarios, schedule, thresholds, runtime semantics, and product verdict remain unchanged.
- [x] Narrow tests, full tests, typecheck, diff check, standards review, and intent review pass.
- [x] Owned changes and evidence are committed locally and Linear is synchronized.

Verification evidence:

- Red regression: the exact OPE-16 source failed only the removed source-shape check.
- Narrow route and manifest suite: 11/11.
- Full JavaScript suite: 51/51; typecheck and `git diff --check` pass.
- Final deterministic generated-output preflight: `PASS`, eight route cells, all four real platform executions, zero runtime behavior diff lines, zero provider tokens, and zero credential findings.
- Candidate manifest: `9623a1457dee64555a2595cd878ddf7a7d13187747206a0ad7c1554b1208190e`.
- Evidence: `prototype/ecosystem-relative-eval/evidence/ope17-rendered-receipt-preflight-final`.
- `SHA256SUMS` SHA-256: `85ad25096c6031eb00a49763a1bb3678334d48c1392324b9a22fbfde939040e3`.
- Independent review SHA-256: `319d2313f552a0cec17e5f220c28999c4d10c286e6459dfa61273fc72177b833`.
- One earlier no-provider preflight stopped at Desktop compilation because the local disk filled. It is excluded from the final evidence and from every aggregate.

## OPE-16 final semantic-pattern canary

Current state: completed as `CANARY_INVALID`. The one authorized provider run
used the byte-identical OPE-15 candidate. No rerun is permitted. OPE-12 remains
canceled and OPE-7 emits no product verdict.

- [x] OPE-13 and OPE-14 evidence remain byte-identical, invalid, unpooled, and outside every new aggregate.
- [x] The locally recomputed candidate manifest equals `49b71bd46638f1301c59fa345204d12896d0c2175197ec8df4563c2092ad9cf0` before generation.
- [x] The OPE-16 execution register and all source inputs are committed before the provider call.
- [x] The OPE-15 deterministic preflight remains PASS across all four routes and real Web and Desktop executions.
- [x] Codex plan authentication is valid in the isolated evaluator; model is `gpt-5.6-luna`, effort is `low`, and tools are disabled.
- [x] Exactly one provider-backed canary runs with no pooling, no silent retry, at most one repair per cell, at most 16 calls, and at most 30 minutes.
- [ ] Every accepted final output crosses the registered validator and generated-output platform proof.
- [x] Raw outputs, attempts, diagnostics, usage, latency, normalized artifacts, hashes, and credential scan are retained; platform traces and screenshots are correctly absent because generation was incomplete.
- [x] Independent recomputation emits `CANARY_INVALID` with `platform-evidence-invalid`; no complete publication marker is created.
- [x] `CANARY_INVALID` stops with OPE-12 still canceled.
- [x] No OPE-7 product verdict, push, PR, merge, publication, or public compatibility claim occurs.
- [x] Immutable evidence is committed locally and Linear is synchronized.

Verification evidence:

- Source commit: `9572c9b`.
- Evidence commit: `5d92b34`.
- Manifest: `49b71bd46638f1301c59fa345204d12896d0c2175197ec8df4563c2092ad9cf0`.
- One run: 10 provider attempts in 111.738 seconds, with no provider error and no credential finding.
- Final accepted cells: 7/8. OpenUI 2/2, typed JSON 2/2, json-render 2/2, Direct RSX 1/2.
- Blocking cell: `compile-04-status-dialog-v1` Direct RSX remained rejected after its one repair.
- `SHA256SUMS` SHA-256: `144d0a4a197fc6e70798ec79e8321a0048c381657d08af5b381ab9f9e6c22c5c`.
- Independent review SHA-256: `6a02786b744974b94b1ecc52d481b3f8f31bb940ce85bd8ec25a8f6676845079`.

## OPE-15 route-neutral accessible component patterns

Current state: completed. OPE-13 and OPE-14 remain immutable and
`CANARY_INVALID`. OPE-15 used no external provider. OPE-16 is now eligible for
its one preregistered canary. OPE-12 remains blocked until OPE-16 returns PASS.

- [x] OPE-13 and OPE-14 evidence, manifests, records, checksums, and outcomes remain byte-identical and unpooled.
- [x] The preregistration records the exact OPE-14 wrapper-versus-semantic-descendant asymmetry using pinned Dioxus source and rendered evidence.
- [x] Each marked component owns only its root and descendants outside nested component roots; host receipts are never semantic witnesses.
- [x] All 12 catalog components have frozen route-neutral observable patterns, including native and composite Select, Tabs, Dialog, and Toast.
- [x] Public-seam TDD accepts valid root and descendant patterns and rejects missing, ambiguous, wrongly named, non-keyboard-operable, cross-component, or receipt witnesses.
- [x] One rendered validator accepts the real frozen Dioxus Components, official json-render React, and direct-RSX reference outputs and rejects known-invalid variants.
- [x] Structured OpenUI and typed JSON retain their exact catalog semantics before both cross the same Dioxus renderer.
- [x] The OPE-15 candidate manifest changes only preregistered semantic-pattern methodology, the single shared Toolbar correction, probes, preregistration, and derived hashes relative to OPE-14.
- [x] Deterministic generated-output Web and Desktop preflight passes across all four routes with zero external provider calls.
- [x] Typecheck, full tests, Dioxus contract tests, diff check, standards review, and intent review pass.
- [x] Source and deterministic evidence are committed locally; Linear is synchronized; no provider, push, PR, merge, publication, promotion, or product verdict occurs.

Verification evidence:

- Source commits: `7b76fa3`, `7d50a6f`; evidence commit: `eada9f1`.
- Candidate manifest: `49b71bd46638f1301c59fa345204d12896d0c2175197ec8df4563c2092ad9cf0`.
- Deterministic generated-output preflight: PASS for 8 route cells and four real platform executions.
- `SHA256SUMS` SHA-256: `a23a850a8e77b7a45cb30ed71fb1121bf084e93fdfe604fe13bb5aba1060083d`.
- Independent review SHA-256: `1e2547d471f59f4ae53a464ef352efff470dea76dbb88722a7b875d9a2a3b88f`.
- JavaScript 48/48, Catalog Rust 17/17, Dioxus platform 1/1, typecheck and diff check pass.
- Canonical runtime behavior diff: 0 lines; credential findings: 0; external provider calls: 0.

## OPE-14 host receipt and Surface feedback ownership

Current state: completed as `CANARY_INVALID`. OPE-13 remains immutable and
`CANARY_INVALID`. OPE-14 used one preregistered Luna-low canary with 10 provider
calls. OPE-12 remains canceled. No provider rerun is permitted.

- [x] OPE-13 evidence, manifest, records, hashes, and invalid result remain byte-identical and are never pooled with OPE-14.
- [x] The public contract separates scenario-owned Surface feedback from harness-owned action receipts.
- [x] A generated feedback component is required only when the frozen scenario requires it, and forbidden otherwise.
- [x] The host receipt remains visible, exactly once, `role=status`, `aria-live=polite`, and outside `data-component` coverage.
- [x] OpenUI, typed JSON, official json-render, and direct RSX receive the same ownership and applicability rules.
- [x] Public-seam TDD fixtures reject invented Surface feedback, missing required Surface feedback, and missing or inaccessible host receipts.
- [x] The OPE-14 manifest differentially proves that every non-ownership methodology field remains identical to OPE-13.
- [x] Full tests, typecheck, Dioxus contract tests, generated-output Web/Desktop preflight, diff check, and two-pass review pass.
- [x] Source, prompts, validators, probes, preregistration, manifest, and hashes are committed before any provider call.
- [x] Exactly one Luna-low provider canary runs with no pooling or silent retry.
- [x] Independent recomputation, recursive hashes, credential scan, and finalization emit only `PASS` or `CANARY_INVALID`.
- [x] `PASS` reopens OPE-12 using only the byte-identical promoted manifest. `CANARY_INVALID` keeps OPE-12 canceled and stops.
- [x] Owned changes and evidence are committed locally; Linear is synchronized; no push, PR, merge, or public claim occurs.

## OPE-13 symmetric accessibility contract and canary rerun

Current state: implementation authorized. OPE-11 remains immutable and
`CANARY_INVALID`; no OPE-12 execution or product verdict is authorized until
this ticket produces a byte-identical promoted `PASS` manifest.

- [x] The OPE-11 critical `aria-allowed-attr` failure and its frozen evidence remain unchanged and are referenced by the new preregistration.
- [x] One route-neutral observable accessibility contract covers semantic roles, allowed ARIA, accessible names, native or equivalent keyboard behavior, focus, feedback announcement, and explicit applicability.
- [x] OpenUI, typed JSON, official json-render, and direct RSX receive equal-strength requirements with no route waiver or hidden source-style oracle.
- [x] Public-seam TDD fixtures prove equivalent valid implementations pass and invalid ARIA, missing semantics, broken keyboard behavior, inaccessible feedback, and inconsistent applicability fail.
- [x] All four route validators and generated-output platform probes enforce the frozen contract.
- [x] Model, Luna low reasoning, scenarios, ordering, repair ceiling, thresholds, schedule, scorer, trust controls, and evidence schema remain unchanged except for the accessibility contract and derived hashes.
- [x] A complete candidate manifest is frozen and hashed before any provider call; any later input or methodology change invalidates the run.
- [x] Exactly one new provider-backed canary runs under the existing 16-call and 30-minute ceilings, with no pooling against earlier candidates.
- [x] Independent recomputation, recursive hashes, credential scan, and publication finalization emit only `PASS` or `CANARY_INVALID`.
- [x] On `PASS`, only the byte-identical manifest is promoted and OPE-12 becomes eligible. On `CANARY_INVALID`, execution stops before OPE-12.
- [x] Narrow tests, typecheck, generated preflight, full tests, `git diff --check`, and two-pass standards and intent review pass.
- [x] Owned changes are committed on `codex/ope-13-symmetric-accessibility`; OPE-13 is synchronized with evidence and no merge occurs.

## OPE-11 ecosystem-relative harness and canary

Current result: `CANARY_INVALID`. The final Luna low candidate accepted all
eight generation cells on the first attempt, but Direct RSX Web produced one
critical `aria-allowed-attr` accessibility finding. React Web, Dioxus Web, and
Dioxus Desktop passed. The independent recomputation correctly refused a
complete publication marker, so OPE-12 remains blocked. See
[`docs/evaluation/ope-11-canary-result.md`](docs/evaluation/ope-11-canary-result.md).

- [ ] OPE-3 protocol evidence is imported as immutable context without rerunning A2UI.
- [ ] The frozen manifest defines 20 runtime-uncertain scenarios across five workflow families plus five compile-known representatives.
- [ ] OpenUI and typed JSON use the shared canonical runtime seam, json-render uses its official React and TypeScript seam, and direct RSX remains ordinary compiled Dioxus code.
- [ ] A requirement-applicability table excludes route-specific requirements from pairwise ranking.
- [ ] Provider settings, fresh sessions, balanced order, one-repair ceiling, prompts, catalogs, scenarios, rates, reviewers, thresholds, trust controls, scorer, and evidence schema are frozen and hashed before live calls.
- [ ] Synthetic fixtures, sensitive-data scanning, bounded resources, allowlisted catalogs and actions, and deny-by-default host effects protect every route.
- [ ] Fake-provider fixtures prove ordering, route-specific validation or compilation, rejected-attempt accounting, scorer vetoes, and the absence of final product scoring in canary code.
- [ ] The canary runs two runtime-uncertain and two compile-known workflows with at most 16 provider calls, representative Web and Desktop behavior, deterministic catalog and migration fixtures, and at most 30 minutes wall time.
- [ ] The canary emits exactly `PASS` or `CANARY_INVALID`; only a byte-identical passing manifest can be promoted.
- [ ] Complete records, LOC and file counts, cost, recursive hashes, credential scan, and an independent review are published.
- [ ] Narrow tests, formatting, checksum verification, and `git diff --check` pass with runnable evidence.
- [ ] Owned changes are committed and pushed on `codex/ope-11-ecosystem-canary`; one Draft PR targets `codex/ope-10-rust-ui-catalog`; nothing is merged.

## OPE-10 measured Rust/UI catalog onboarding

- [x] Rust/UI is pinned to `7fd792520ba5e3ad5354c26ac4e6816c2d156b7c`, with exact source and dependency identities recorded.
- [x] One reviewed catalog source generates prompt material, schemas, documentation, registry data, fixtures, and immutable release identity for at least eight components across six certified capability families.
- [x] The catalog covers two complete workflows, one typed host action, and one accessibility-sensitive control through the existing static `CatalogAdapter` seam.
- [x] Public-seam tests are observed red before implementation, then compile and behavior tests pass on every applicable Dioxus target family.
- [x] Frozen component-prop, component/schema, action-policy, DTCG token, catalog-release, and copy-on-write migration drills pass with inert replay and exact compatibility identity.
- [x] Recursive evidence hashes and a pre-publication credential scan pass; active time, categorized LOC/files/failures, normalized per-family cost, and the 16-hour hard gate are reported.
- [x] The stacked diff proves zero canonical runtime behavior lines and files changed and contains no model benchmark, production runtime, converter, dynamic plug-in, broad port, or product verdict.
- [x] Independent intent and standards reviews pass; owned changes are committed, pushed, and opened as a Draft PR against `codex/ope-9-ecosystem-value-eval` without merge.
- [x] Linear OPE-10 is synchronized at each transition with branch, worktree, evidence, reviews, and Draft PR.

Verification evidence:

- Frozen implementation commits: `ad829ba`, `9453ea8`.
- Generator/drill suite: 9/9; Rust suite: 20/20 including 9 Rust/UI tests.
- Web, Desktop, and Mobile feature checks pass; this ticket makes no distinct device-launch claim.
- Measurement: 0.833 active hours, including 5 active drill minutes; 0 canonical runtime files/lines; 6.25 active minutes and 272.125 non-generated LOC per family.
- Integrity: generated and recursive evidence hashes pass; credential scan has no credential finding.
- Delivery: Draft PR #12 targets `codex/ope-9-ecosystem-value-eval`; no merge was performed.

## OPE-9 ecosystem-relative product-value evaluation design

- [x] Current primary-source research is recorded with facts, inferences, unknowns, and source/version pins; no new model benchmark is run.
- [x] The evaluation keeps protocol promptability, constrained-runtime value, design-system onboarding/maintenance, and cross-platform leverage as four separate questions.
- [x] Typed JSON Dioxus is the primary product baseline; A2UI remains protocol context; direct Dioxus/RSX and React/TypeScript are evaluated only in their strongest fair scopes.
- [x] A fast non-decision canary and a complete decision-grade cadence define validity, repair, human correction, blind UI quality, accessibility, platform, change-drill, replay/migration, LOC/files, wall-time, and total-cost measurements with explicit thresholds.
- [x] Repository decisions and an implementation-ready specification state whether React/TypeScript belongs in OPE-7 or a separate ticket without changing OPE-7 while OPE-6 blocks it.
- [x] Only necessary implementation tickets are created in Linear, with vertical outcomes, acceptance criteria, parentage, and explicit blocking edges; OPE-9 stays synchronized at every transition.
- [x] Documentary review passes internal-link, terminology, scope, whitespace, and acceptance-coverage checks.
- [x] Owned changes are committed and pushed on `codex/ope-9-ecosystem-value-eval`; a Draft PR targets `codex/ope-6-platform-accessibility`; nothing is merged.

Verification evidence:

- Research has exactly four numbered questions; 20 cited primary-source URLs returned HTTP 200 on 2026-08-25.
- Headless documentary review integrated 11 findings across coherence, feasibility, product, design, security, scope, and adversarial lenses, including ecosystem vetoes, route neutrality, cost horizons, operator crossover, review agreement, and trust-boundary controls.
- Six changed or indexing Markdown files passed the local-link checker with zero broken links; staged and post-rebase `git diff --check` passed.
- Linear was reread live after publication: OPE-10 is blocked by OPE-9; OPE-11 by OPE-6 and OPE-10; OPE-12 by OPE-11 and blocks OPE-7; OPE-7 remains `Todo` and is also blocked by OPE-6.
- Documentation commit `37ba319` was rebased onto OPE-6 commit `76203c3`, pushed to `codex/ope-9-ecosystem-value-eval`, and opened as stacked Draft PR #11 against `codex/ope-6-platform-accessibility`.
- The owned diff contains documentation only; no provider benchmark or runtime implementation command ran.

## OPE-6 Android evidence recovery

- [x] The release APK is built before the Android Emulator starts, so Rust compilation cannot starve the system image.
- [x] The Android evaluation enables KVM for the API 34 x86_64 Emulator while preserving the existing Dioxus binary and evidence contract.
- [x] The Android runner consumes the CI-prebuilt APK, retains a standalone local-build fallback, and still requires the exact runtime marker plus a non-blank rendered screenshot before reporting `PASS`.
- [x] Desktop captures the largest visible app window and rejects a root-screen or blank-window screenshot.
- [x] Build, toolchain, ADB transport, marker, and screenshot failures retain explicit honest tri-state results with no stale or empty evidence artifact.
- [x] Local regression checks pass, then one complete cloud run reports `PASS` for Web, Desktop, iOS, Android, and aggregate evidence.

Verification evidence:

- `npm test --prefix prototype/openui-typed-json-product-eval`
- `bash -n prototype/openui-typed-json-product-eval/platform/run-android.sh`
- `git diff --check`
- Full `OPE-6 platform evaluation` workflow run and downloaded evidence artifacts
- Passing run: `32847665208` at commit `d7bb0a9`.
- Published aggregate: `prototype/openui-typed-json-product-eval/platform/evidence/published/run-32847665208/`.
- Recursive hashes, four visual captures, exact runtime markers, and credential scans were independently rechecked after download.

## Open-source decision trail

- [x] The canonical Wayfinder map and all 12 decision records live under `docs/decisions/`; no tracked documentation depends on hidden scratch paths.
- [x] The root README explains the problem, execution flow, module boundaries, integration paths, current status, and recommended reading order in plain English.
- [x] The public documentation links the compatibility, runtime, design-system, adapter/platform, and UI-primitives explainers without duplicating normative decisions.
- [x] Validation proves every local Markdown link resolves, the HTML explainers remain structurally valid, and GitHub PR #1 contains the promoted artifacts after push verification.

Verification evidence:

- Public decision inventory: 12 records under `docs/decisions/`, with eight `resolved`, four `open`, and ticket `09` as the sole current frontier.
- Repository documentation: 29 Markdown files plus five HTML explainers; 41 local Markdown links checked with zero broken links.
- HTML structure check: all five explainers contain complete document boundaries; every explainer with SVG also contains an image role, title, and description.
- Public-tree scan: no tracked documentation references the former hidden decision path or an absolute local-machine path.
- The promoted UI-primitives explainer is byte-identical to the previously reviewed visualization; final GitHub file-list verification is recorded in the PR workflow.

- [x] The Git repository exists on `main`; remote publication remains an explicit PR workflow.
- [x] OpenSRC resolves the canonical OpenUI and Dioxus repositories; exact source URLs and revisions are recorded.
- [x] Q9 research uses primary sources and answers which OpenUI capabilities should be preserved in the Dioxus project.
- [x] The Wayfinder map defines the destination, scope, fog, and named decision tickets with explicit dependencies.
- [x] Initial research tickets are resolved and indexed from the map.
- [x] Architecture tickets preserve a future path to automated React/Figma design-system conversion without implementing it in `v0.1`.
- [x] Desktop, web, and mobile are explicit `v0.1` verification targets.
- [x] The CODE workspace packet and index reference the new canonical repository.
- [x] Final verification lists the repository files and checks every completed gate against runnable evidence.

## Runtime contract decision 06

- [x] Ticket 06 is resolved with 21 explicit decisions consistent with the pinned OpenUI and Dioxus sources.
- [x] The contract separates OpenUI program history, executable Surface revisions, runtime state, and render projections.
- [x] Every host-visible effect crosses one durable, policy-checked invocation boundary with per-step receipts.
- [x] Streaming, update quarantine, replay capture, state lifetime, migrations, and compatibility have non-contradictory `v0.1` rules.
- [x] `CONTEXT.md`, the plain-language explainer, and the Wayfinder map describe the same resolved contract.
- [x] Verification proves 21 explainer cards, no unresolved recommendation marker, valid local links, and the expected next frontier.

## Runtime decision-review register

- [x] One durable register covers every runtime decision from `Q1` through `Q21` without duplicating their normative text.
- [x] Each decision has a stability class and an evidence-based reopening trigger.
- [x] `Q8` defines representative latency metrics, a project review threshold, and the safety conditions for any future streamed interaction.
- [x] The resolved ticket, Wayfinder map, and README link to the register.
- [x] Verification proves the decision table contains `Q1` through `Q21` exactly once and all local links remain valid.

## Verification evidence

- `git rev-parse --show-toplevel`, `git branch --show-current`, and `git remote -v`
- `jq -e` validation of the portable upstream references and exact revisions in `sources.json`
- `git diff --check` plus a targeted trailing-whitespace scan of every changed contract file
- Tracker dependency validation: 12 tickets; `01` through `06` resolved; current frontier exactly `07` and `08`
- Runtime-contract structure validation: questions `Q1` through `Q21` exactly once; 21 explainer cards and 21 closing sections
- Local Markdown-link validation after decision-register creation: 20 files, 19 local links, zero broken links
- Decision-review validation: 21 sequential table rows; all required Q8 timestamps, behavior signals, threshold, and capability proof fields present
- OpenUI source checks: whole-program patch merge and reachability collection; persistent state preservation; ordered multi-step actions; raw full-form action payload; remote image source
- Dioxus source checks: desktop external navigation behavior and keyed-sibling consistency/uniqueness
- Workspace index and packet existence checks in the canonical CODE workspace registry

## Design-system bridge re-evaluation

- [x] OpenSRC resolves the exact OpenUI and Dioxus snapshots used for the re-evaluation.
- [x] Targeted source evidence tests both the strict and lean proposals against catalog, props, renderer, prompt, and platform behavior.
- [x] The recommendation distinguishes non-negotiable correctness boundaries from deferred v0.1 infrastructure.
- [x] A French ELI5 HTML explainer presents the comparison and final recommendation with large visuals and little text.
- [x] The HTML was structurally validated before confirmation; the accepted recommendation is promoted under decision 07 below.

Verification evidence:

- OpenSRC paths: OpenUI `main`, Dioxus `v0.7.10`, and Dioxus `main`; exact captured revisions remain recorded in `sources.json`.
- Targeted OpenUI checks: `DefinedComponent`, `createLibrary`, `LibrarySpec`/`PromptOptions`, positional prop materialization, Vue/Svelte adapters, and the Material UI design-system example.
- Targeted Dioxus checks: `Properties`, `EventHandler`, generated component props, launch features, and WebView-backed desktop/mobile routing.
- Playwright rendered the explainer successfully at 1280 px and 390 px widths; full-page screenshots measured 1280×4415 and 390×4629.
- Ticket 07 was kept `open` during re-evaluation and changed only after explicit user confirmation.

## Design-system bridge decision 07

- [x] Ticket 07 is resolved with the validated OpenUI-like catalog and Dioxus adapter contract.
- [x] The `v0.1`, immediate phase 1b, and future converter scopes are explicitly separated.
- [x] `prop_order`, explicit catalog composition, generated artifacts, and a closed static Dioxus registry are recorded as invariants.
- [x] The Wayfinder map moves ticket 07 into resolved decisions and leaves ticket 08 as the only current frontier.
- [x] `CONTEXT.md`, `README.md`, and the French ELI5 explainer describe the same decision.
- [x] Verification checks local links, document markers, ticket dependencies, and trailing whitespace.

Verification evidence:

- Ticket 07 status is `resolved` and records the answer, decisions, evidence constraints, and implementation reopening triggers.
- The map's current frontier contains exactly ticket 08; prototype ticket 09 still records dependencies on 07 and 08.
- Repository documentation scan: 23 Markdown or HTML documents, 21 local links, zero broken links.
- Six decision files pass the targeted trailing-whitespace and stale-marker checks.
- The explainer retains valid HTML document boundaries, contains eight cards, and is marked `Décision 07 validée` with no pending-confirmation text.

## Cross-platform decision 08

- [x] Ticket 08 records every accepted cross-platform decision as `08-Q1` through `08-Q16` and is marked resolved.
- [x] The contract distinguishes semantic equivalence, platform-adapted presentation, explicit fallback, and refusal without silent behavior changes.
- [x] The certified platform, capability-family, accessibility, lifecycle, and test-cadence matrices are explicit and non-contradictory.
- [x] Catalog portability keeps the canonical runtime independent from the DOM, Dioxus Components, Rust/UI, Dioxus Primitives, and conversion sources.
- [x] `CatalogAdapter`, `PlatformHost`, and `Application host` retain separate responsibilities without a dynamic Rust ABI or misleading native-support claim.
- [x] The Wayfinder map advances from ticket 08 to prototype ticket 09, and targeted consistency checks pass.

Verification evidence:

- Contract structure: `08-Q1` through `08-Q16` appear exactly once and in order; all ten certified capability families and four platform outcomes are present.
- Compatibility identity: `catalog_contract_version`, `schema_hash`, `catalog_release_hash`, `adapter_build_id`, Dioxus version/target, `PlatformHost` profile, and `static_rust_v1` are pinned.
- Future binary-boundary candidates are explicit: C FFI, `abi_stable`, WebAssembly Component Model/WIT, and out-of-process RPC; none is selected for `v0.1`.
- Tracker structure: 12 adapter-and-platform implication sections; eight tickets `resolved`, four `open`; current frontier exactly ticket 09.
- Decision-time repository scan: 31 Markdown/HTML files and 31 local links checked, with zero broken links, trailing-whitespace matches, merge markers, or stale positive ABI/native/effect terminology.
- Diagram Design self-check returned `OK` for the repository ELI5 explainer and the updated layer-stack visualization.

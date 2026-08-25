# Acceptance gates

## OPE-6 Android evidence recovery

- [ ] The release APK is built before the Android Emulator starts, so Rust compilation cannot starve the system image.
- [ ] The Android evaluation enables KVM for the API 34 x86_64 Emulator while preserving the existing Dioxus binary and evidence contract.
- [ ] The Android runner consumes the CI-prebuilt APK, retains a standalone local-build fallback, and still requires the exact runtime marker plus a non-blank rendered screenshot before reporting `PASS`.
- [ ] Build, toolchain, ADB transport, marker, and screenshot failures retain explicit honest tri-state results with no stale or empty evidence artifact.
- [ ] Local regression checks pass, then one complete cloud run reports `PASS` for Web, Desktop, iOS, Android, and aggregate evidence.

Verification evidence:

- `npm test --prefix prototype/openui-typed-json-product-eval`
- `bash -n prototype/openui-typed-json-product-eval/platform/run-android.sh`
- `git diff --check`
- Full `OPE-6 platform evaluation` workflow run and downloaded evidence artifacts

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

# OPE-10 Rust/UI onboarding evidence

Status: corrected implementation evidence from frozen commit `1c7637d`

Captured: 2026-08-25T12:53:00Z

## Identity and scope

- Product snapshot: `rust-ui/ui@7fd792520ba5e3ad5354c26ac4e6816c2d156b7c` (MIT).
- Dioxus implementation: `rust-ui/dioxus-ui@2f87a8d0531d483d5b32df6f89b7979ceb4beb74` (MIT).
- Adapter profile: `static_rust_v1`, Dioxus `0.7.10`.
- Catalog release and adapter build identities: `generated-rust-ui/release.json`.
- Selection: Button, Input, Label, Checkbox, Card, Alert, Progress, and Table.
- Certified families represented: action, text input, content, boolean input, layout, feedback, status, and data table.
- Workflows: profile submission and preference review. Both contain all eight selected components; Button invokes the typed `submit_profile` host action; Checkbox is the accessibility-sensitive control.

The Rust/UI product repository and Dioxus implementation repository are recorded separately because the pinned product commit is not itself Dioxus component source. Selected source files are copied into the evaluation crate, matching Rust/UI's copy-on-write distribution model.

## Frozen drill results

All six drills start from the byte-identical catalog source at commit `1c7637d`, regenerate complete isolated artifact directories twice, compile each generated Rust registry, validate component and action references in both fixtures, and compare result identities. The test requires equal stable result fields across runs, a distinct result hash from the source, and an unchanged source hash. These are catalog-contract maintenance drills. They do not claim that a changed renderer was compiled for every hypothetical drill.

| Drill | Changed boundary | Result |
| --- | --- | --- |
| component-prop | optional Button `aria_description` prop plus fixture use | pass |
| component/schema | reviewed Callout schema, registry entry, and fixture use | pass |
| action-policy | `archive_profile` action, Button enum, and fixture use | pass |
| DTCG token | accent token value | pass |
| catalog-release | immutable release version | pass |
| copy-on-write migration | contract version plus explicit migration declaration | pass; source preserved |

`node --test test/*.test.mjs` passed 9/9 tests, including deterministic generation and every drill. No provider or model call ran.

## Runtime, replay, accessibility, and targets

- Canonical runtime diff: 0 files and 0 lines under `prototype/openui-dioxus-preview` and `prototype/openui-typed-json-product-eval` across the full `709cff1..1c7637d` frozen range.
- Catalog-only work changes the evaluation adapter and copied catalog source; it does not change canonical runtime behavior.
- Inert replay normalizes the same frozen bytes twice and requires complete `SurfaceRevision`, semantic fingerprint, release hash, and adapter build identity equality. Capability-confinement tests reject model, network, tool, navigation, or host-effect imports in the replay and Rust/UI adapter sources; the replay helper accepts only the closed `CatalogAdapter` seam.
- Executable migration verifies the exact source release, creates a distinct target compatibility identity, preserves the source value, and requires semantic fingerprint equality.
- SSR behavior requires stable IDs for all eight nodes, executable routes for every declared event, a named checkbox, a captioned semantic table, a named progressbar, an alert role, and rendered markers for every selected component. The upstream Tabs component was removed from the measured slice because its ARIA and keyboard behavior did not satisfy the manifest claims.
- `cargo check` passes separately for the Web, Desktop, and Mobile Dioxus feature families. One target-neutral behavior contract verifies the shared nodes and typed action; SSR additionally tests rendered component and accessibility markers. This ticket does not claim distinct device-launch behavior evidence, which remains OPE-6/OPE-11 scope.

## Cost and failures

Active onboarding time through the second independent-review corrections: 0.833 hours, including 5 active minutes for the six-drill cycle. This is below the 16-hour hard gate. Dependency downloads, compilation waits, and unrelated OPE-6 work are excluded. Raw intervals and failure categories live in `ope10-activity.json`; `node scripts/measure-rust-ui.mjs 709cff1 <final-evidence-commit>` recomputes the table and normalization from either the repository root or crate directory.

| Category | Added LOC | Files | Notes |
| --- | ---: | ---: | --- |
| handwritten generator/docs/source metadata | 355 | 11 | includes measurement, review, and evidence sources |
| generated | 1,025 | 8 | prompt, schemas, docs, registry, fixtures, release, hashes |
| test | 349 | 2 | generator/drill and Rust public-seam tests |
| catalog | 1,150 | 11 | reviewed manifest, MIT notice, eight copied components, module index |
| adapter/dependencies | 323 | 4 | static adapter, renderer, Cargo manifests |
| platform | 0 | 0 | no platform implementation change |
| canonical runtime behavior | 0 | 0 | hard gate |

Normalized over eight certified families: 6.25 active minutes, 272.125 non-generated added LOC, and 128.125 generated LOC per family. The non-generated change touches 28 files, or 3.5 files per family.

Observed failures are retained by category. The second review found one semantic-contract mismatch, one unsupported declared event, and one evidence overclaim. Four expected TDD red tests cover the original onboarding plus the corrected render contract, drill contract, and table invariant. Final product behavior failures after correction: zero.

## Integrity

- `generated-rust-ui/SHA256SUMS` verifies every generated artifact other than itself.
- The repository evidence checksum file recursively covers generated outputs and every behavior- or identity-affecting OPE-10 input: manifest, copied sources, license, adapter, generator, tests, Cargo identities, source metadata, activity log, and evidence report.
- The pre-publication scan found zero OpenAI keys, GitHub tokens, AWS access-key IDs, private-key markers, or authorization headers in the publishable OPE-10 tree.
- `git diff --check` passes.

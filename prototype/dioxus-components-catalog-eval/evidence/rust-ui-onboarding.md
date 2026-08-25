# OPE-10 Rust/UI onboarding evidence

Status: implementation evidence from frozen commit `6ac73b7`

Captured: 2026-08-25T10:00:04Z

## Identity and scope

- Product snapshot: `rust-ui/ui@7fd792520ba5e3ad5354c26ac4e6816c2d156b7c` (MIT).
- Dioxus implementation: `rust-ui/dioxus-ui@2f87a8d0531d483d5b32df6f89b7979ceb4beb74` (MIT).
- Adapter profile: `static_rust_v1`, Dioxus `0.7.10`.
- Catalog release and adapter build identities: `generated-rust-ui/release.json`.
- Selection: Button, Input, Label, Checkbox, Card, Alert, Progress, and Tabs.
- Certified families represented: action, text input, content, boolean input, layout, feedback, status, and navigation/overlay.
- Workflows: profile submission and preference review. Both contain all eight selected components; Button invokes the typed `submit_profile` host action; Checkbox is the accessibility-sensitive control.

The Rust/UI product repository and Dioxus implementation repository are recorded separately because the pinned product commit is not itself Dioxus component source. Selected source files are copied into the evaluation crate, matching Rust/UI's copy-on-write distribution model.

## Frozen drill results

All six drills start from the byte-identical catalog source at commit `6ac73b7`, regenerate complete isolated artifact directories twice, compile each generated Rust registry, behavior-check both workflows, and compare result identities. The test requires equal result hashes across runs, a distinct result hash from the source, and an unchanged source hash.

| Drill | Changed boundary | Result |
| --- | --- | --- |
| component-prop | optional Button `disabled` wire prop | pass |
| component/schema | reviewed Callout component/schema addition | pass |
| action-policy | `archive_profile` action allowlist addition | pass |
| DTCG token | accent token value | pass |
| catalog-release | immutable release version | pass |
| copy-on-write migration | contract version plus migrated copy metadata | pass; source preserved |

`node --test test/*.test.mjs` passed 9/9 tests, including deterministic generation and every drill. No provider or model call ran.

## Runtime, replay, accessibility, and targets

- Canonical runtime diff: 0 files and 0 lines under `prototype/openui-dioxus-preview` and `prototype/openui-typed-json-product-eval` across the full `709cff1..6ac73b7` frozen range.
- Catalog-only work changes the evaluation adapter and copied catalog source; it does not change canonical runtime behavior.
- Inert replay normalizes the same frozen bytes twice and requires complete `SurfaceRevision`, semantic fingerprint, release hash, and adapter build identity equality. Capability-confinement tests reject model, network, tool, navigation, or host-effect imports in the replay and Rust/UI adapter sources; the replay helper accepts only the closed `CatalogAdapter` seam.
- Executable migration verifies the exact source release, creates a distinct target compatibility identity, preserves the source value, and requires semantic fingerprint equality.
- SSR behavior requires `role="checkbox"` and `aria-checked="true"`, plus rendered markers for every selected component.
- `cargo check` passes separately for the Web, Desktop, and Mobile Dioxus feature families. One target-neutral behavior contract verifies the shared nodes and typed action; SSR additionally tests rendered component and accessibility markers. This ticket does not claim distinct device-launch behavior evidence, which remains OPE-6/OPE-11 scope.

## Cost and failures

Active onboarding time through independent-review corrections: 0.5 hours. This is below the 16-hour hard gate. Build/download queue time is excluded. Raw intervals and failure categories live in `ope10-activity.json`; `node scripts/measure-rust-ui.mjs 709cff1 6ac73b7` recomputes the table and normalization from either the repository root or crate directory.

| Category | Added LOC | Files | Notes |
| --- | ---: | ---: | --- |
| handwritten generator/docs/source metadata | 311 | 10 | includes measurement and evidence sources |
| generated | 1,029 | 8 | prompt, schemas, docs, registry, fixtures, release, hashes |
| test | 226 | 2 | generator/drill and Rust behavior tests |
| catalog | 1,199 | 11 | reviewed manifest, MIT notice, eight copied components, module index |
| adapter/dependencies | 283 | 4 | static adapter, renderer, Cargo manifests |
| platform | 0 | 0 | no platform implementation change |
| canonical runtime behavior | 0 | 0 | hard gate |

Normalized over eight certified families: 3.75 active minutes, 252.375 non-generated added LOC, and 128.625 generated LOC per family. The non-generated change touches 27 files, or 3.375 files per family.

Observed failures were retained by category: one expected TDD compile failure before implementation; one source-discovery correction from `rust-ui/ui` to the separate Dioxus repository; one unavailable npm script replaced with the repository's direct Node test command; and one stale patch-context retry. Product behavior failures after implementation: zero.

## Integrity

- `generated-rust-ui/SHA256SUMS` verifies every generated artifact other than itself.
- The repository evidence checksum file recursively covers generated outputs and every behavior- or identity-affecting OPE-10 input: manifest, copied sources, license, adapter, generator, tests, Cargo identities, source metadata, activity log, and evidence report.
- The pre-publication credential scan returned only the literal `InputType::Password` enum and HTML input type string from pinned upstream source; manual inspection confirms neither is a credential.
- `git diff --check` passes.

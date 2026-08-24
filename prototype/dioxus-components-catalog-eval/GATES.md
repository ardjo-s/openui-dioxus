# OPE-4 acceptance gates

This throwaway evaluation slice proves the `static_rust_v1` catalog seam. It
does not make a product GO decision and must remain a stacked Draft PR.

## Frozen source and catalog

- [x] Pin the canonical Dioxus Components repository to one exact commit and
  record the upstream crate/version, Dioxus version, license, and source hash.
- [x] Expose exactly 12 reviewed catalog components covering all ten certified
  capability families: content, layout, data display, text input, selection,
  boolean input, action, navigation/overlay, status, and feedback.
- [x] Use one explicit manifest as the source of truth for ordered serializable
  props, descriptions, usage rules, semantics, typed events, accessibility,
  platform adaptations, implementation bindings, and source pins.
- [x] Preserve `prop_order` byte-for-byte through every generated artifact.

## Generated bridge artifacts

- [x] Deterministically generate the OpenUI LibrarySpec, strict typed-JSON
  Schema, prompt material, public catalog documentation, static Rust registry,
  compatibility release, and SHA-256 manifest from the explicit manifest.
- [x] Reject unknown components, properties, state keys, events, and actions
  before any Dioxus render path.
- [x] Prove generated files are current by regenerating in a temporary
  directory and comparing bytes.

## Runtime and portability

- [x] Compile the pinned Dioxus Components implementation through a reviewed
  `CatalogAdapter` using the `static_rust_v1` profile.
- [x] Five reference workflows normalize into stable expected canonical
  fingerprints and preserve typed state/events.
- [x] A thin second catalog renders one representative canonical Surface with
  equivalent typed events and no canonical-runtime behavior change.
- [x] Record handwritten LOC, generated LOC/files, authoring duration, tests,
  source pins, adapter build identity, and runtime behavior diff.

## Runnable evidence

```bash
npm ci --prefix prototype/dioxus-components-catalog-eval/generator
node --test prototype/dioxus-components-catalog-eval/generator/test/*.test.mjs
prototype/dioxus-components-catalog-eval/scripts/verify-generated.sh
cargo test --manifest-path prototype/dioxus-components-catalog-eval/Cargo.toml --features ssr
cargo clippy --manifest-path prototype/dioxus-components-catalog-eval/Cargo.toml --features ssr --all-targets -- -D warnings
prototype/dioxus-components-catalog-eval/scripts/verify-evidence.sh
```

# Dioxus Components catalog evaluation

This OPE-4 slice proves that one explicit bridge manifest can produce a closed
OpenUI/typed-JSON catalog and a statically compiled Dioxus adapter without
changing canonical runtime behavior.

## What is real

- The dependency resolves `DioxusLabs/dioxus-components` at commit
  `bf007c15d0cf4d04d3181cc46cf12325aa773955` and tree
  `9b969f03d6d31c4ef3be006b730759720b4415d2`.
- Ten bindings compile against the upstream `dioxus-primitives` crate. The
  styled `Input` and `Button` follow the upstream copy-into-your-project model.
- Five workflow fixtures normalize into frozen canonical fingerprints.
- Every workflow fixture declares one allowlisted typed Button action for the
  later per-platform state/action/update/replay proof.
- OpenUI structural component values are nested language elements, while the
  typed-JSON wire form uses stable component IDs; the generated bridge flattens
  both forms into the same canonical Surface.
- The primary and thin adapters have distinct release identities but produce
  the same semantic fingerprint and typed event for the swap fixture.
- Dioxus SSR renders the union of all 12 catalog components. Dialog uses the
  explicitly labeled inert SSR adaptation because the upstream animated dialog
  opens only after a client effect.

## Upstream maturity boundary

The pinned source declares `dioxus-primitives` as version `0.0.1` and its
workspace requests Dioxus `0.7.8`; this evaluation resolves Dioxus `0.7.10`.
The adapter is therefore a reviewed source/API integration under
`static_rust_v1`, not a stable ABI or a promise that upstream APIs will not
change.

## Generated artifacts

`catalog/manifest.json` is the only hand-authored catalog source. Running
`generator/generate.mjs` produces:

- OpenUI `LibrarySpec` and official OpenUI prompt material;
- strict typed-JSON Schema;
- public catalog documentation;
- static Rust registry;
- compatibility release and SHA-256 manifest.

Run the commands in [GATES.md](GATES.md) to reproduce the evidence.

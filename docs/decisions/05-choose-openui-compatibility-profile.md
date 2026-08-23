# Choose the OpenUI compatibility profile

Type: `grilling`
Status: `resolved`
Blocked by: 02, 04

## Question

How should full OpenUI Lang `v0.5` semantic compatibility be pinned, differential-tested, versioned, and negotiated while component-catalog coverage, host-action policies, and the canonical replay model remain explicit separate capabilities?

## Answer

Compatibility is a machine-verifiable vector, not one marketing boolean.

- The project may claim `OpenUI Lang v0.5 compatible` only when 100% of the mandatory conformance corpus passes. Until then it must publish a `preview` status and explicit gaps. Silent degradation is forbidden.
- The oracle is pinned by four immutable coordinates: OpenUI Lang specification version, exact `@openuidev/lang-core` package version, upstream Git commit, and conformance-corpus hash. Upgrades happen through dedicated reviewed changes with a differential report.
- Differential tests compare normalized observable behavior rather than private TypeScript AST shapes: complete and partial parsing, streaming chunk permutations, errors, state transitions, Query/Mutation descriptors, actions, incremental merges, and replay serialization. The corpus combines upstream fixtures, project goldens, property tests, and fuzzing.
- Capability negotiation keeps language, catalog, renderer, host actions, resources, replay, and platform dimensions explicit, then pins their complete behavior-affecting combination as a compatibility vector. Host effects report `allowed`, `approval_required`, `denied`, or `unsupported`; unsupported behavior never becomes a no-op.
- Deterministic replay persists accepted OpenUI program history, executable Surface revisions, semantic state/events, classified captured results and resources, per-effect receipts, and the exact compatibility vector. Replay is semantically exact and physically inert by default, not pixel-identical across platforms. A live reopen is a new explicit execution.
- OpenUI Dioxus remains a conforming Rust port and Dioxus adapter, not a wire-format fork. Conformance fixtures and reports should circulate upstream and remain useful to future renderers.

This structure lowers reconstruction cost, prevents maintenance drift, couples the project to the OpenUI ecosystem, and lets catalog or host-policy differences evolve without weakening the language-compatibility claim.

## Adapter and platform implication

The compatibility vector pins the exact `catalog_contract_version`, schema and catalog release hashes, `adapter_build_id`, `static_rust_v1` execution profile, Dioxus version and target, and `PlatformHost` capability profile. Direct Dioxus support is certified per compiled adapter and target; it is not a stable Rust ABI, a dynamic plug-in claim, or permission to execute arbitrary React or JavaScript libraries.

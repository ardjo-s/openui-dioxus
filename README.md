# OpenUI Dioxus

Planning repository for an OpenUI-compatible generative UI runtime targeting Dioxus.

Current work is decision discovery, not implementation. The canonical effort map is [`.scratch/openui-dioxus/map.md`](.scratch/openui-dioxus/map.md).

## Working thesis

Models propose interfaces. Rust validates capabilities. Dioxus renders them across desktop, web, and mobile. Stabilized surfaces replay without another model call.

**Stochastic proposal. Deterministic execution. Intentional design.**

The runtime is one stable engine with two versioned, certified integration seams:

- `CatalogAdapter` is a statically compiled Rust contract connecting approved Dioxus component catalogs without changing runtime semantics.
- `PlatformHost` adapts bounded Web, Desktop, and Mobile presentation or input mechanics. The `Application host` alone performs host-visible effects through typed actions, policy checks, and receipts.

Dioxus Components, Rust/UI, and private Dioxus design systems can connect directly through separately certified adapters compiled with the application. Dioxus Primitives may be reused inside an adapter; it is not a mandatory runtime layer. React, shadcn/ui, Radix, Base UI, React Aria, Ariakit, Figma, JSON, and screenshots remain conversion sources until an inert draft is reviewed, compiled, tested, and certified. `v0.1` promises no dynamic plug-in loading or stable Rust ABI.

## Architecture decisions

- [Canonical runtime contract](.scratch/openui-dioxus/issues/06-define-runtime-domain-contract.md)
- [Runtime decision-review register](docs/architecture/runtime-contract-review-register.md)
- [Plain-language runtime explainer](docs/explainers/runtime-contract-eli5.html)
- [Design-system bridge and converter seam](.scratch/openui-dioxus/issues/07-design-the-design-system-bridge.md)
- [Plain-language design-system bridge explainer](docs/explainers/design-system-bridge-reevaluation-eli5.html)
- [ELI5: one engine and two certified adapter seams](docs/explainers/adapter-platform-seams-eli5.html)
- [Desktop, web, and mobile `v0.1` contract](.scratch/openui-dioxus/issues/08-lock-cross-platform-v01-contract.md)

## Source references

Third-party source is fetched through OpenSRC outside this repository. See [`sources.json`](sources.json) for exact upstream references and captured revisions.

# Find the route to OpenUI Dioxus v0.1

Label: `wayfinder:map`

## Destination

Produce an evidence-backed go/no-go decision and, if positive, an implementation-ready MVP specification plus a roadmap to a credible OSS `v0.1` for one OpenUI Dioxus umbrella project.

The proof must cover an MCP-driven generative interface constrained by a design system, stabilized for replay, and verified on Dioxus desktop, web, and mobile.

## Notes

- Planning by default. Product implementation starts only inside an explicit prototype ticket.
- One umbrella project, with renderer, deterministic runtime, and design-system bridge as distinct modules and decision tracks.
- Two versioned integration seams cross those modules: `CatalogAdapter` connects certified, statically compiled Dioxus catalogs; `PlatformHost` connects bounded local UI mechanisms for each target. The separate `Application host` alone performs policy-checked external effects. None changes runtime semantics.
- Central flow: user intent plus MCP tools and results → OpenUI generation → validation → Dioxus surface → typed actions → stabilization and replay.
- `v0.1` design-system scope: tokens, wrapped Dioxus components, semantics, and usage rules.
- Architecture must preserve a clean future seam for automated React and Figma conversion; implementing those converters is not part of `v0.1`.
- Runtime decisions remain in force until their evidence-based trigger is met; use the [decision-review register](../../docs/architecture/runtime-contract-review-register.md) during implementation.
- Desktop, web, and mobile are real `v0.1` verification targets.
- OSS licensing, governance, upstream relationships, and grant paths are in scope. Commercialization is not.
- Consult Wayfinder, Grilling, Domain Modeling, Research, OpenSRC, Prototype, Ponytail full, and Caveman.
- Use the [ELI5 adapter explainer](../../docs/explainers/adapter-platform-seams-eli5.html) when deciding whether a library connects through a direct compiled adapter, provides an internal primitive, exposes a platform capability, or is only a conversion source.

## Decisions so far

- [Set the destination and initial v0.1 boundaries](issues/01-set-destination-and-boundaries.md) — pursue one OSS umbrella through go/no-go, MVP specification, and `v0.1` roadmap, serving one adopter through three roles.
- [Decide which OpenUI capabilities the Dioxus integration must preserve](issues/02-preserve-openui-capabilities.md) — preserve full OpenUI Lang `v0.5` semantics in Rust, while versioning component-catalog coverage separately.
- [Establish Dioxus platform and renderer constraints](issues/03-establish-dioxus-platform-constraints.md) — share Dioxus HTML/CSS/state across targets, but verify web, desktop, Android, and iOS independently and isolate host capabilities behind typed actions.
- [Prove differentiation against existing generative UI alternatives](issues/04-prove-differentiation-against-alternatives.md) — renderer-only value is weak; durable value requires Rust conformance, replay, action mediation, design-system tooling, and measurable superiority over simpler adapters.
- [Choose the OpenUI compatibility profile](issues/05-choose-openui-compatibility-profile.md) — gate compatibility on a pinned mandatory corpus, negotiate language/catalog/host/replay/platform capabilities separately, and make replay semantically exact, offline, and inert by default.
- [Define the canonical runtime domain contract](issues/06-define-runtime-domain-contract.md) — keep OpenUI program history separate from executable Surface revisions, send every external effect through a durable host boundary, commit updates atomically, and replay only classified captured semantics through an inert renderer.
- [Design the design-system bridge and future converter seam](issues/07-design-the-design-system-bridge.md) — mirror OpenUI's small catalog API with ordered serializable props, explicitly compose a closed Dioxus registry, generate all derived catalog artifacts, move DTCG to phase 1b, and keep future converter output inert and human-reviewed.
- [Lock the desktop, web, and mobile v0.1 contract](issues/08-lock-cross-platform-v01-contract.md) — certify semantic equivalence across ten capability families and explicit target tiers, allow declared platform adaptations, keep catalogs portable through a static Rust contract, and defer any binary adapter ABI until a real no-recompile need exists.

## Adapter implications across the route

- `01` keeps one umbrella and treats the two adapters as seams, not extra products.
- `02` keeps OpenUI conformance independent from catalog and platform coverage.
- `03` separates bounded local UI adaptation from typed application-host effects.
- `04` requires adapters to reduce measured integration and maintenance cost.
- `05` pins exact catalog-adapter and platform-host identities in compatibility.
- `06` preserves all Q1–Q21 runtime invariants; no concrete library enters the core.
- `07` makes Dioxus systems direct compiled adapter targets and external ecosystems reviewed conversion sources.
- `08` certifies ten semantic families, platform tiers, fallbacks, accessibility evidence, static adapter portability, and the no-stable-Rust-ABI boundary.
- `09` must prove an adapter swap and the certified Web, Desktop, and Mobile matrix without broad ecosystem work or dynamic plug-in loading.
- `10` measures seam stability and certification honesty in the go/no-go decision.
- `11` defines adapter ownership, public contract evolution, certification, upstream governance, and the trigger for any later binary distribution profile.
- `12` turns runtime, renderer, catalog adapter, and platform host into explicit package boundaries.

## Current frontier

- [Prototype the enriched MCP vertical](issues/09-prototype-the-mcp-vertical.md)

## Not yet specified

- Exact public name and package names after the architecture is known.
- Long-term adapter distribution beyond the statically compiled `v0.1` profile.
- Whether later converter work becomes part of this repository or separate adapters.

## Out of scope

- A Bun-specific renderer or runtime.
- E-ink-specific refresh policies and hardware support.
- Implementing automatic React or Figma conversion in `v0.1`.
- Arbitrary model-generated Rust, JavaScript, or executable UI code.
- Building a commercial product during this effort.

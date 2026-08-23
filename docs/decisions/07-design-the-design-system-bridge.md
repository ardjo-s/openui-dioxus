# Design the design-system bridge and future converter seam

Type: `grilling`
Status: `resolved`
Blocked by: 06

## Question

What manifest and adapter contract should support tokens, wrapped Dioxus components, semantics, and usage rules now while allowing future React and Figma converters without changing runtime semantics?

## Answer

`v0.1` mirrors OpenUI's small public catalog model instead of inventing a second UI language: `define_component` → `create_catalog` → `Renderer`. Each approved definition exposes ordered, serializable OpenUI props, a description, important semantic and usage rules, and one trusted adapter to the real Dioxus component.

Catalog composition is explicit and closed. Maintainers approve entries in `catalog![]`; generators derive the OpenUI-compatible `LibrarySpec`, JSON Schema, prompt, documentation, static Dioxus registry, and minimal hashed release metadata from that one source. The bridge never discovers every Dioxus component automatically, because ordinary Dioxus props may contain callbacks, signals, or other executable values that are not a safe OpenUI wire contract.

The first proof wraps one real Dioxus design system with 8–12 excellent components, exercises 30–50 scenarios, and renders the same Surface on web, desktop, and mobile. DTCG token import follows immediately as a theme/CSS adapter, but it does not block the first functional render.

Future React, Figma, arbitrary JSON, and screenshot importers end at an inert bridge draft. They may generate a Rust scaffold and an explicit unknowns report, but a human must review the result before compilation. They do not bypass the canonical runtime or create a directly executable component.

## Decisions

- **OpenUI-shaped public flow.** The bridge follows `define_component` → `create_catalog` → `Renderer`; it does not expose a competing runtime protocol.
- **Separate wire props from Dioxus props.** OpenUI-facing props are simple, ordered, typed, and serializable. A trusted adapter converts them into the real Dioxus component's props and events.
- **Preserve `prop_order`.** The declaration records property order explicitly. OpenUI positional arguments are materialized according to property order, so losing it can send a value to the wrong field.
- **Compose catalogs explicitly.** `catalog![]` contains only reviewed components. No reflection, filesystem scan, or automatic discovery adds arbitrary Dioxus components to the executable catalog.
- **Generate all derived views.** One approved declaration generates the OpenUI-compatible `LibrarySpec`, JSON Schema, prompt material, human documentation, static Dioxus registry, and minimal release identity with content hashes.
- **Keep semantics human-owned.** Tooling automates the component list and derived files. Descriptions, usage rules, accessibility constraints, action meaning, and exceptional mappings remain reviewed design decisions.
- **Prove a narrow vertical first.** The acceptance corpus starts with 8–12 high-quality components, 30–50 scenarios, one actually wrapped Dioxus design system, and the same canonical Surface verified on web, desktop, and mobile.
- **Put DTCG in phase 1b.** A `DTCG → theme/CSS` adapter is the immediately following slice. Tokens are a paint box for the catalog, not part of OpenUI language semantics and not a prerequisite for the first render.
- **Make converter output inert.** React, Figma, arbitrary JSON, and screenshot inputs produce `inert draft → Rust scaffold → unknowns report → human review → compilation`. They never write directly into the executable registry.
- **Defer supply-chain machinery until evidence exists.** Rich attestations, signatures, and large evidence bundles wait until a real converter or distribution boundary demonstrates the need. Minimal release hashes remain required from `v0.1`.
- **Keep runtime semantics unchanged.** Importers and token adapters terminate at the bridge declaration. Validation, actions, stabilization, replay, compatibility, and migration behavior remain owned by the canonical runtime contract.

## Review during implementation

These decisions are the active first rung, not a promise that every detail is permanent. Reopen only with evidence:

- Reconsider the 8–12 component or 30–50 scenario targets after the first evaluation results show too little coverage or disproportionate maintenance cost.
- Move DTCG earlier only if the first real design-system wrapper cannot produce a representative functional render without token ingestion.
- Reconsider explicit catalog composition only if measured catalog maintenance becomes a bottleneck and an alternative remains deterministic, reviewable, and incapable of registering unapproved code.
- Expand release attestations when a real external converter, third-party catalog, or distribution channel creates a supply-chain trust boundary.
- Design a converter-specific contract only after a representative React, Figma, JSON, or screenshot corpus exposes information that the bridge draft and unknowns report cannot express.

## Source constraints

- OpenUI's library layer already separates component definitions, library composition, generated specification, schema, prompt material, and renderer implementations.
- OpenUI positional prop materialization depends on property order; the Rust declaration therefore needs explicit `prop_order` even if another serialization format appears ordered in practice.
- Dioxus `Properties` may contain executable callbacks and signals, so they cannot become the OpenUI wire schema automatically.
- OpenUI's Material UI example uses manually reviewed wrappers, variant mappings, and usage rules; a design-system port is not only token conversion.
- Dioxus web, desktop, and mobile can share HTML/CSS-facing definitions, but platform equivalence remains a separate verification contract in ticket 08.

## Adapter and platform implication

`CatalogAdapter` is the statically compiled Rust form of this bridge in `v0.1`. Dioxus Components, Rust/UI, and private Dioxus design systems can connect directly through separate reviewed adapters; Dioxus Primitives may be reused internally by an adapter but is not a mandatory runtime layer. React, shadcn/ui, Radix, Base UI, React Aria, Ariakit, Figma, JSON, and screenshots remain conversion sources or references whose output is inert until human review, successful Rust compilation, tests, and certification. This contract promises source/API integration, not dynamic loading or a stable Rust ABI.

# Differentiation against current alternatives

Research date: 2026-08-22

## Finding

A Dioxus renderer alone is useful but not strongly differentiated. OpenUI React, JSON Render, and A2UI already implement most of the declarative catalog, streaming, state, action, and safe-rendering thesis. The credible wedge is a complete OpenUI Lang implementation for Rust/Dioxus plus a typed Rust application-host contract, replayable surfaces, design-system tooling, and certified integration seams that can swap catalogs or platforms without changing runtime semantics.

## Direct comparisons

### OpenUI React

OpenUI already provides compact Lang `v0.5`, schema-derived prompts, streaming parsing, reactive state, Query/Mutation, actions, incremental editing, React rendering, and prebuilt component libraries. OpenUI Dioxus adds value only for teams choosing Dioxus or a Rust application boundary.

Source: [OpenUI repository](https://github.com/thesysdev/openui), [OpenUI overview](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/docs/content/docs/openui-lang/overview.mdx).

### Vercel JSON Render

JSON Render already offers constrained catalogs, prompt generation, progressive spec streaming, dynamic props, conditions, state bindings, watchers, event/action bindings, and React registries. OpenUI's main claimed advantage is its compact line format; that token and latency advantage is self-reported and must be reproduced with equivalent catalogs.

Source: [JSON Render README](https://github.com/vercel-labs/json-render/blob/main/README.md), [JSON Render core](https://github.com/vercel-labs/json-render/tree/main/packages/core).

### A2UI

A2UI is explicitly framework-agnostic and cross-platform. It defines declarative JSON surfaces, catalog negotiation, incremental updates, data binding, actions, transport independence, and an MCP binding. A future A2UI Dioxus renderer could compete directly. OpenUI Dioxus must therefore justify choosing OpenUI Lang through measured generation efficiency and developer experience, not generic security or portability claims.

Source: [A2UI repository](https://github.com/google/A2UI), [A2UI protocol](https://github.com/a2ui-project/a2ui/blob/main/specification/v1_0/docs/a2ui_protocol.md).

### Astryx

Astryx is an agent-ready React/StyleX design system with over 150 components, themes, templates, CLI access, typed JSON APIs, docs, and AI-oriented evaluation. It improves how agents author development-time React UI. It is not a runtime generative UI language or Dioxus renderer. The overlap is the future design-system bridge and agent-readable catalog quality, where Astryx sets a high bar.

Source: [Astryx repository](https://github.com/facebook/astryx), [Astryx CLI](https://astryx.atmeta.com/docs/cli).

### Ordinary LLM-generated React or Expo code

React and Expo win on model familiarity, component availability, examples, and iteration speed. OpenUI Dioxus should not compete at unrestricted code generation. It can win when an already-built Dioxus application needs runtime-generated surfaces without accepting arbitrary generated code or maintaining a second frontend runtime.

### Existing Dioxus ecosystem

Dioxus supplies the cross-platform application framework and HTML/CSS component model, but a GitHub repository and code search on 2026-08-22 found no existing OpenUI Dioxus or generative-UI Dioxus project. Absence from search is not proof of absence; it is enough to justify a prototype and continued monitoring.

Source: [Dioxus repository](https://github.com/DioxusLabs/dioxus), GitHub searches for `OpenUI Dioxus` and `generative UI Dioxus` performed on 2026-08-22.

## Defensible product boundary

The durable product is not `OpenUI payload → Dioxus nodes`. It is:

1. OpenUI Lang `v0.5` conformance in Rust, differential-tested against upstream.
2. A versioned executable surface and semantically exact, inert replay/migration contract.
3. A Dioxus catalog and renderer verified on desktop, web, Android, and iOS.
4. Typed, allowlisted Rust actions and MCP Query/Mutation mediation.
5. A design-system manifest generating prompt metadata, schemas, registrations, docs, fixtures, and evaluations from one component contract.
6. State reconciliation that protects user input during streamed and edited generations.
7. A conformance and quality corpus useful even if upstream later ships an official Dioxus renderer.

The runtime should expose two narrow compiled integration seams:

- a certified, statically compiled `CatalogAdapter` for Dioxus Components, Rust/UI, or a private Dioxus design system, with Dioxus Primitives optionally reused inside it;
- a certified `PlatformHost` for Web, Desktop, or Mobile capabilities.

React, shadcn/ui, Radix, Base UI, React Aria, Ariakit, Figma, JSON, and screenshots are conversion sources or behavioral references. They do not execute directly inside the Rust runtime.

`v0.1` does not need a dynamic adapter loader or stable Rust ABI. Its differentiation is the portable catalog contract, generated evidence, and unchanged runtime semantics. A binary distribution profile is future work only if real adopters need to install adapters without recompiling.

## Falsification criteria

Stop or reposition if the prototype cannot demonstrate at least one material advantage over a small JSON Render or A2UI-style Dioxus adapter:

- lower generation tokens or time at equivalent UI quality;
- higher valid-surface and repair rates;
- simpler Dioxus integration and component registration;
- addition or replacement of a certified catalog adapter or PlatformHost without runtime changes;
- semantically exact inert replay and stable user state across edits;
- safer or clearer typed action mediation;
- lower maintenance than keeping a React/Expo surface beside the Rust application.

This is a focused OSS bet on the Rust/Dioxus ecosystem, not evidence that Rust will broadly replace TypeScript UI.

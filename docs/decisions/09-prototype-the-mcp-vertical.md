# Prototype the enriched MCP vertical

Type: `prototype`
Status: `open`
Blocked by: 07, 08

## Question

Can one cheap end-to-end prototype turn intent, MCP tool schemas, and results into a design-system-constrained Dioxus interface with typed actions and semantically exact, inert replay on desktop, web, and mobile?

## Adapter and platform implication

The cheapest credible proof uses one complete statically compiled reference `CatalogAdapter`, a thin second adapter or catalog-swap smoke test with no runtime changes, and representative bounded local UI mechanisms plus policy-checked application-host effects on Web, Desktop, and Mobile. It should not attempt broad ecosystem coverage or a dynamic adapter-loading system.

## Active logic probe

The throwaway [`codex/prototype-mcp-vertical`](https://github.com/ardjo-s/openui-dioxus/tree/codex/prototype-mcp-vertical/prototype/mcp-vertical-logic) branch asks a narrower question first: whether a non-developer can understand and value the MCP-to-Surface state flow, atomic rejection, catalog-swap invariance, typed effect receipts, and inert replay when compared with a thin Dioxus adapter.

Primary-source review: [draft PR #2](https://github.com/ardjo-s/openui-dioxus/pull/2), stacked on the foundation PR and not intended as a production merge claim.

This probe is evidence for ticket 09, not its resolution. It uses an in-memory simulation rather than real MCP transport, OpenUI parsing, Dioxus rendering, or device execution; the ticket remains `open` until the full question above is measured.

Initial reducer result on 2026-08-23: all five scripted paths preserved their declared invariant. The full profile produced one typed action and one effect receipt, rejected an unknown component without replacing the committed Surface, kept the semantic fingerprint stable across a catalog swap, and replayed with zero added effects. The thin profile used fewer transitions but exposed one unreceipted effect and no replay checkpoint. This proves that the guarantees can be made separately observable; it does not yet prove that a non-developer understands or values them.

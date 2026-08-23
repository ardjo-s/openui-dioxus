# Prototype the enriched MCP vertical

Type: `prototype`
Status: `open`
Blocked by: 07, 08

## Question

Can one cheap end-to-end prototype turn intent, MCP tool schemas, and results into a design-system-constrained Dioxus interface with typed actions and semantically exact, inert replay on desktop, web, and mobile?

## Adapter and platform implication

The cheapest credible proof uses one complete statically compiled reference `CatalogAdapter`, a thin second adapter or catalog-swap smoke test with no runtime changes, and representative bounded local UI mechanisms plus policy-checked application-host effects on Web, Desktop, and Mobile. It should not attempt broad ecosystem coverage or a dynamic adapter-loading system.

## Final comparative probe

The throwaway branch `codex/prototype-openui-a2ui-cloud-eval` runs the final
ticket-09 falsification test. It feeds the same expense-review intent and MCP
schemas/results to the pinned OpenUI and A2UI reference implementations,
normalizes both into one Rust `Surface`, and exercises the same eight-component
Dioxus catalog on Desktop and Web. Twenty paired model generations, one repair
maximum, explicit cost/call caps, state/action/replay checks, adapter LOC, and
shared-runtime diff determine the pre-mobile result. iOS runs only if OpenUI
wins that gate.

This branch and its closed Draft PR are the primary source. They are not a
merge proposal and cannot by themselves resolve this ticket; only verified
cloud artifacts and the explicit outcome rules can do that.

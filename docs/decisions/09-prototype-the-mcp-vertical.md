# Prototype the enriched MCP vertical

Type: `prototype`
Status: `open`
Blocked by: 07, 08

## Question

Can one cheap end-to-end prototype turn intent, MCP tool schemas, and results into a design-system-constrained Dioxus interface with typed actions and semantically exact, inert replay on desktop, web, and mobile?

## Adapter and platform implication

The cheapest credible proof uses one complete statically compiled reference `CatalogAdapter`, a thin second adapter or catalog-swap smoke test with no runtime changes, and representative bounded local UI mechanisms plus policy-checked application-host effects on Web, Desktop, and Mobile. It should not attempt broad ecosystem coverage or a dynamic adapter-loading system.

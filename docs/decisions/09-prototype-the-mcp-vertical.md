# Prototype the enriched MCP vertical

Type: `prototype`
Status: `resolved`
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

## Evaluation closure

The MCP and constrained-Surface vertical was technically demonstrated, including real
Dioxus Web and Desktop rendering, typed actions, state, update, replay, catalog
adapters, and a zero-line canonical runtime behavior diff. The final product-potential
evaluation did not reach decision-grade completeness.

The unique OPE-12 complete generation retained 80 route cells and 96 Luna-low
attempts. Eleven cells remained invalid after one repair, so generated platform proof,
blinded packets, human correction, accessibility, mobile, maintenance, cost, and
applicability stages could not run. The authoritative result is `INVALID_EVAL`, not a
product win or loss.

Evidence:

- [OPE-12 two-pass review](../evaluation/ope-12-two-pass-review.md)
- [OPE-7 final verdict](../evaluation/ope-7-final-verdict.md)
- OPE-12 evidence commit `5454b37`
- OPE-12 generation checksum
  `5e04615ca018d822db6cbd54845b5eb5363f7f23f08c8dde2afcef06a15c4c79`

Decision 09 is resolved because the prototype question was exercised and the frozen
evaluation reached its registered stop condition. It authorizes no production build.

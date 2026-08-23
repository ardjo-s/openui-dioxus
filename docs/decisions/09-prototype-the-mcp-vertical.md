# Prototype the enriched MCP vertical

Type: `prototype`
Status: `open`
Blocked by: 07, 08

## Question

Can one cheap end-to-end prototype turn intent, MCP tool schemas, and results into a design-system-constrained Dioxus interface with typed actions and semantically exact, inert replay on desktop, web, and mobile?

## Adapter and platform implication

The cheapest credible proof uses one complete statically compiled reference `CatalogAdapter`, a thin second adapter or catalog-swap smoke test with no runtime changes, and representative bounded local UI mechanisms plus policy-checked application-host effects on Web, Desktop, and Mobile. It should not attempt broad ecosystem coverage or a dynamic adapter-loading system.

## Real MCP vertical follow-up

Branch: `codex/prototype-real-mcp-vertical`, based directly on `origin/codex/bootstrap-openui-dioxus`. Closed PR #2 and `codex/prototype-mcp-vertical` remain untouched and recoverable.

What ran for real on 2026-08-23:

- A local stdio server exchanged JSON-RPC 2.0 `initialize`, `tools/list`, and two `tools/call` requests for `list_pending_expenses` and `approve_expense`.
- The MCP result became an OpenUI program parsed by pinned `@openuidev/lang-core@0.2.15`; an unknown component was rejected while the committed Surface fingerprint stayed unchanged.
- Two statically compiled Rust `CatalogAdapter`s rendered the same Surface fingerprint with zero runtime-semantic changes.
- A typed `ApproveExpense` crossed MCP and produced a readable durable prototype JSON receipt.
- Replay loaded the captured Surface, rendered it inertly, preserved the fingerprint, and added zero MCP calls.
- Dioxus 0.7.10 Desktop reached a live interactive loop after executing MCP → OpenUI oracle → Surface. Web wasm and Mobile features compiled from the same Surface and renderer.

Measured comparison: the honest thin direct Dioxus baseline is 80 nonblank implementation lines including runnable UI, direct MCP approval, and raw-result replay; it uses one mapping transition. Runtime plus adapters are 222 lines and three transitions. The baseline therefore performs the same approval and basic replay. The surviving 142-line premium buys the adapter contract, durable typed receipt, and a replay-only type with no MCP/action capability; it does not make this single screen simpler.

Limits: one deterministic local business fixture, one OpenUI schema/full-parse seam, no conformance corpus, no browser/simulator/device launch, file-only receipt durability, and no clicked Desktop approval. This is reference-oracle evidence, not an `OpenUI v0.5 compatible` claim.

**Falsifiable verdict: CONTINUE only when a product needs both design-system portability and auditable action/replay guarantees; STOP for a simple one-catalog screen.** The narrow benefit survives the thin baseline, but ticket 09 remains `open` until broader conformance and platform-runtime evidence answers its full question.

# Real MCP vertical — throwaway prototype

This answers one narrow question with executable evidence. It is not `v0.1`, a complete OpenUI port, or a production MCP client.

## Run

```sh
npm install
cargo run --bin prototype-evidence --no-default-features -- all
cargo run --no-default-features --features desktop
./scripts/verify-platforms.sh
```

The Desktop app starts the local MCP subprocess, sends real JSON-RPC `tools/list` and `tools/call`, passes the result through the pinned OpenUI oracle, commits a Rust `Surface`, and renders it with Dioxus. Its two buttons swap the statically compiled catalog and toggle inert replay presentation.

## What ran for real

- Line-delimited MCP JSON-RPC 2.0 over subprocess stdio: `initialize`, `tools/list`, and `tools/call`.
- Both tools: `list_pending_expenses` and `approve_expense`.
- `@openuidev/lang-core@0.2.15` `parse()` as an isolated OpenUI reference oracle.
- Rust Surface commit, atomic invalid-proposal rejection, two compiled `CatalogAdapter`s, typed approval, JSON receipt, capture, and inert replay.
- Dioxus 0.7.10 Desktop interactive launch; Web wasm and Mobile feature compilation from the same `Surface` type and renderer.
- A thin direct mapper consuming the exact same MCP result.

## What stayed simulated

- Expense data and approval behavior are deterministic local business fixtures; no bank or expense service exists.
- The reference oracle covers one `ExpenseReview` schema and full parses only. This is real pinned OpenUI behavior, but not OpenUI v0.5 conformance or corpus coverage.
- Web and Mobile use the captured semantic Surface because browser/mobile builds cannot spawn the local stdio sidecars. They compile; they were not launched on a browser, simulator, or device.
- Receipt durability is one explicitly throwaway JSON file. No crash recovery, locking, signatures, or database.
- The Dioxus UI exposes catalog/replay interaction; approval itself is proven by the evidence binary, not a clicked Desktop button.

## Measurements

- Thin direct baseline: 80 nonblank implementation lines including runnable Dioxus UI, direct MCP approval, and raw-result replay; one mapping transition.
- OpenUI runtime plus adapters: 222 lines, three transitions (`MCP result → OpenUI proposal → Surface → adapter`).
- Catalog swap: two compiled adapters, zero runtime-semantic changes, equal Surface fingerprint.
- Both paths approve and replay. Guarantees exclusive to the enriched path: a durable typed receipt and replay that enforces an inert effect boundary.

The prototype runtime plus adapters are roughly 2.8× the baseline code. Its value is not brevity; it is making catalog portability, action receipts, and inert replay mechanically testable.

## Falsifiable verdict

**CONTINUE only for products that require adapter portability plus auditable actions/replay. STOP for a simple one-catalog expense screen.** The baseline now performs the same direct approval and raw replay; the surviving 142-line premium is specifically for adapter independence, durable typed receipts, and a replay-only type with no MCP/action capability. Ticket 09 stays open because one schema, one local server, and compile-only Web/Mobile do not answer the broader platform/conformance question.

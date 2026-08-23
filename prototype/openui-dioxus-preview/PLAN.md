# Plan: OpenUI-Dioxus constrained runtime prototype

Depth: tree 3   Mode: orchestrated
Budget note: 3–5 hours. Throwaway evidence for ticket 09, not `v0.1` implementation.

## Question

Can one OpenUI-shaped preview proposal be parsed, validated, atomically committed, rendered through eight approved Dioxus components, execute one typed Rust action, and replay inertly through the same semantic projection on Web, Desktop, and Mobile?

## Contract

- Location: `prototype/openui-dioxus-preview`; every artifact is marked `PROTOTYPE` and remains uncommitted.
- Language: a deliberately incomplete line-oriented preview of OpenUI Lang: `name = Component(args)`, quoted strings, direct references, and reference lists. No conformance claim.
- Catalog: exactly `Text`, `Stack`, `Card`, `Table`, `Input`, `Select`, `Button`, and `Alert`. Positional wire props remain separate from Dioxus view props.
- Runtime flow: proposal text → pure parser → closed-catalog validation → atomic committed `Surface` → `Projection` → Dioxus renderer.
- Public runtime interface in `src/runtime.rs`: `Runtime::new`, `propose`, `projection`, `set_field`, `invoke`, `checkpoint`, `replay`, `diagnostics`, and `effect_count`; public `Node`, `Projection`, `TypedAction`, `Receipt`, and `Checkpoint` types.
- Action: the only generated host effect is `TypedAction::ApproveExpense`; it is unavailable before commit and produces one in-memory receipt after commit.
- Replay: a checkpoint produces an inert `Projection`; semantic fingerprint must equal the accepted live projection and replay must not add a receipt.
- Platforms: one `src/app.rs` renderer; Cargo features `web`, `desktop`, and `mobile` select Dioxus `v0.7.10` renderers. Compilation proves the available rung; device certification is explicitly out of scope.
- Baselines: one A2UI v0.9-shaped JSONL payload for the same eight-node workflow and one source-backed MCP Apps comparison. No second renderer.
- Dependencies: Rust stdlib for runtime logic; pinned local Dioxus source from `sources.json`; no parser, state, UI, test, or comparison dependency.
- Error style: stable short diagnostics; invalid proposals never replace the last accepted Surface.
- File ownership: leaf 1 owns `Cargo.toml`, `fixtures/`, `src/lib.rs`, `src/runtime.rs`, `src/bin/prototype-self-check.rs`, and `gates/prototype-runtime.md`. Leaf 2 owns `src/main.rs`, `src/app.rs`, `README.md`, `COMPARISON.md`, `baselines/`, `scripts/`, and `gates/prototype-platform.md`. The driver owns this file, `GATES.md`, and `gates/prototype-integration.md`.

## Tree

- 1 Prototype ticket 09 ................................ `GATES.md`
  - 1.1 Deterministic runtime core ...................... `gates/prototype-runtime.md`
  - 1.2 Dioxus platform adapter and baselines ........... `gates/prototype-platform.md`
  - 1.3 Driver integration and adversarial verification . `gates/prototype-integration.md`

## Status log

- 2026-08-23 plan written; contract fixed; no implementation started.
- 2026-08-23 runtime leaf parent-verified: 6/6 gates and 5/5 self-checks; duplicate-control fixture defect corrected.
- 2026-08-23 integration blocker found: platform renderers lacked Dioxus base APIs; contract amended with optional `dioxus/minimal`, runtime remains 5/5.

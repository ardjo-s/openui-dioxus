# Plan: real OpenUI-Dioxus MCP vertical

Depth: tree 4. Mode: orchestrated discipline, small fan-out only where file ownership is disjoint.

## Contract

- Throwaway code lives only in `prototype/real-mcp-vertical`.
- The Rust runtime owns committed Surface, typed actions, receipts, replay, and the adapter trait.
- A local deterministic subprocess owns MCP JSON-RPC transport and expense state.
- The pinned upstream OpenUI package is an isolated reference oracle; any unsupported seam is named, never relabeled conformance.
- Both catalog adapters are statically compiled and consume the same immutable Surface.
- The thin baseline consumes the same decoded MCP result and is allowed the shortest honest direct mapping.
- Durable prototype artifacts may use only clearly named files under `prototype/real-mcp-vertical/evidence` or the OS temporary directory.
- No file from `prototype/openui-dioxus-preview/evaluation` or the closed experiment branch is copied, edited, staged, or deleted.

## Tree

1. Real MCP vertical (`GATES.md`)
   1.1 Upstream oracle and MCP transport
   1.2 Runtime, adapters, action receipt, replay
   1.3 Dioxus app and platform compilation
   1.4 Baseline, measurements, adversarial review, ticket and PR

## Status

- 2026-08-23: isolated worktree created from `origin/codex/bootstrap-openui-dioxus`; PR #1 open; rejected PR #2 closed and untouched.
- 2026-08-23: acceptance gates and ownership contract written before implementation.

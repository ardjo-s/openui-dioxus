# OpenUI–A2UI cloud comparator prototype

> **Throwaway evidence for decision 09. Never merge this branch into `main`.**

This prototype compares official OpenUI Lang and A2UI reference semantics before
both are normalized into the same small Rust `Surface` and rendered by the same
eight real Dioxus components.

The reference semantics are official; the Rust adapters in this directory are
project-owned experiment code.

## Current rung

Commit 1 contains the shared runtime, OpenUI `0.2.15` oracle, typed runtime
checks, and real Dioxus Desktop/Web renderer. Commit 2 adds A2UI without changing
the shared domain, runtime, or catalog renderer.

## Local checks

```bash
npm ci --prefix prototype/openui-a2ui-cloud-eval/oracles
npm test --prefix prototype/openui-a2ui-cloud-eval/oracles
cargo test --manifest-path prototype/openui-a2ui-cloud-eval/Cargo.toml
cargo check --manifest-path prototype/openui-a2ui-cloud-eval/Cargo.toml --features desktop
cargo check --manifest-path prototype/openui-a2ui-cloud-eval/Cargo.toml --features web
```

The cloud workflow is intentionally the only path that spends API credits. It
requires the protected `prototype-cloud-eval` GitHub Environment and a commit
message containing `[cloud-eval]` on the exact prototype branch.

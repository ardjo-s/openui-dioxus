# OpenUI–A2UI comparator prototype

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

The local alternative uses the ChatGPT plan through the authenticated Codex
CLI. It launches one fresh, ephemeral, read-only, tool-free Luna-low process per
attempt and stores results separately:

```bash
prototype/openui-a2ui-cloud-eval/scripts/run-local-eval.sh
```

This route preserves protocol validity, repairs, raw prompt/output token counts,
Codex CLI usage, latency, normalization, runtime, Desktop, Web, and conditional
iOS checks. It cannot report API billing cost: `estimated_cost_usd` is `null`,
and every artifact labels the billing mode as `chatgpt-plan`.

## Fixed evaluation contract

- 20 paired passages, alternating protocol order.
- `gpt-5.6-luna`, low reasoning, no storage. The API route has an 8,192-token
  output ceiling; the local route enforces the shared 256 KiB response ceiling
  because Codex CLI does not expose the same output-token setting.
- One repair maximum per invalid payload; 80 calls and $2 estimated cost maximum.
- 256 KiB raw-output and 64-node execution limits.
- Official OpenUI parser and A2UI `MessageProcessor`; project-owned Rust adapters.
- Dioxus SSR for first usable render latency, then actual Desktop and Chromium
  traversal of every accepted Surface.
- Conditional Dioxus iOS simulator gate only after a pre-mobile OpenUI win.

## Evidence

The workflow emits `records.jsonl`, raw payloads, official diagnostics,
normalized Surfaces, platform traces, screenshots, `summary.json`,
`summary.md`, and `SHA256SUMS`. Generated payloads are data only: no model output
is compiled, evaluated, sourced, or executed as code.

The automatic result is one of `OPENUI_WIN_MOBILE_PASS`,
`OPENUI_WIN_MOBILE_FAIL`, `PIVOT_OR_STOP`, or `INVALID_EVAL`. A protocol win is
not a Mobile support claim when the simulator gate fails.

## Completed local run

The 2026-08-24 ChatGPT-plan run is archived under
[`evidence/local-run-2026-08-24`](evidence/local-run-2026-08-24). Start with
[`RUN-REPORT.md`](evidence/local-run-2026-08-24/RUN-REPORT.md); `SHA256SUMS`
verifies all 303 evidence files. Its automatic outcome is
`OPENUI_WIN_MOBILE_FAIL`: Desktop and Web passed, while iOS could not run because
`simctl` was unavailable.

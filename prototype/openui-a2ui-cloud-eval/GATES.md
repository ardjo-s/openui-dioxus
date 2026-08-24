# Comparator acceptance gates

This directory is a throwaway ticket-09 prototype. It must never be merged into
`main`; the branch and closed Draft PR are the primary source.

## Contract gates

- [x] One typed Dioxus catalog exposes exactly `Text`, `Stack`, `Card`, `Table`,
  `Input`, `Select`, `Button`, and `Alert` as real RSX components.
- [x] OpenUI `@openuidev/lang-core@0.2.15` and A2UI
  `@a2ui/web_core@0.10.6` are pinned and used as reference validators.
- [x] Both protocol adapters normalize the same expense-review intent into one
  canonical Rust `Surface` and the reference fixtures have the same fingerprint.
- [x] Unknown component, unknown action, broken reference, oversized output,
  node-limit, and one-repair fixtures are rejected or repaired as specified.
- [x] State, exactly-once typed action receipt, update preservation, and inert
  replay are exercised through public runtime interfaces.

## Execution gates

- [x] The selected runner performs 20 alternating paired passages, with at most
  one repair per invalid output and at most 80 calls. The API route retains its
  hard estimated $2 cap; the completed local route reports no invented API cost.
- [x] Every record contains visible/raw and provider token counts,
  cache/reasoning tokens, nullable API cost, validation diagnostics, and
  full-response latency.
- [x] Accepted surfaces render through Dioxus Desktop and Dioxus Web
  in Chromium; Playwright exercises fields, action, update, and replay.
- [x] iOS simulator execution is conditional on the pre-mobile OpenUI win and
  cannot create a Mobile support claim when it fails.
- [x] `records.jsonl`, `summary.json`, `summary.md`, raw outputs, diagnostics,
  traces, screenshots, and SHA-256 manifests are retained as branch evidence.

## Local ChatGPT-plan gates

- [x] The local provider launches one fresh `codex exec --ephemeral` process per
  attempt with `gpt-5.6-luna`, low reasoning, ignored user config/rules, a
  read-only sandbox, and tool-bearing features disabled.
- [x] OpenUI and A2UI receive the same shared intent and equivalent reference
  prompts; passage order still alternates and each invalid output receives at
  most one repair in a fresh process.
- [x] The local run never reads `OPENAI_API_KEY`, never claims API billing data,
  and labels CLI usage separately from tokenizer-measured raw prompt/output
  tokens.
- [x] Codex event logs, stderr, raw payloads, official diagnostics, normalized
  Surfaces, platform traces, screenshots, summaries, and SHA-256 manifests are
  retained under a separate `results-local` evidence directory.
- [x] A fake Codex executable proves argument isolation, prompt delivery, usage
  parsing, provider errors, and output-size handling before any 20-pair run.
- [x] Local Desktop and Chromium traverse every accepted Surface. Local iOS is
  attempted only if the same pre-mobile protocol thresholds declare OpenUI the
  winner.

## Decision gates

- [x] `openui_wins` is computed only from the thresholds recorded in the plan;
  infrastructure/provider incompleteness produces `INVALID_EVAL`.
- [x] Two comparable commits exist: shared runtime + OpenUI, then A2UI adapter;
  the report measures adapter LOC and shared-runtime diff between them.
- [x] A separate read-only Standards review and intent review complete before
  results are published.
- [x] The workflow is branch- and marker-gated, has `contents: read`, never runs
  model output, and uses only the `prototype-cloud-eval` environment secret.
- [ ] A Draft PR is opened as explicitly non-mergeable; verified artifacts are
  committed without `[cloud-eval]`, then the secret and dedicated key are removed.

## Runnable evidence

```bash
npm ci --prefix prototype/openui-a2ui-cloud-eval/oracles
npm test --prefix prototype/openui-a2ui-cloud-eval/oracles
cargo test --manifest-path prototype/openui-a2ui-cloud-eval/Cargo.toml
cargo clippy --manifest-path prototype/openui-a2ui-cloud-eval/Cargo.toml --all-targets -- -D warnings
prototype/openui-a2ui-cloud-eval/scripts/verify-workflow.sh
prototype/openui-a2ui-cloud-eval/scripts/test-local-provider-e2e.sh
```

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
- [x] A Draft PR is opened as explicitly non-mergeable; verified artifacts are
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

## OPE-1 controlled-evaluation gates

- [x] Eval 0 evidence remains byte-for-byte unchanged and is explicitly labeled
  as an out-of-the-box promptability experiment, not a general protocol win.
- [x] Five frozen scenario families with four deterministic variants each define
  shared intent, catalog semantics, state, typed actions, MCP fixtures, coverage,
  updates, and replay expectations.
- [x] OpenUI and A2UI prompt packs isolate byte-identical shared content from
  protocol syntax; the A2UI pack includes the pinned v0.9.1 envelope and one
  official-valid minimal example.
- [x] Prompt packs, scenarios, fixtures, dependency locks, source pins, and
  scoring rules are hashed before generation; drift makes the run invalid.
- [x] Official reference payloads normalize through `ProtocolAdapter` into the
  same canonical `Surface` fingerprint before any model call.
- [x] The controlled scorer is symmetric and returns
  `CONTROLLED_OPENUI_WIN`, `CONTROLLED_A2UI_WIN`, `CONTROLLED_TIE`, or
  `INVALID_EVAL` from the pre-registered thresholds.
- [x] First-attempt and cumulative passage tokens/latency are reported
  separately, and invalid completed passages remain in protocol metrics.
- [x] A fake-provider run proves 20 paired scenarios, alternating order, one
  repair maximum, 80 calls maximum, prompt hashes, diagnostics, and artifacts.
- [x] Independent standards and intent reviews approve the frozen methodology
  before the one real 20-pair Luna-low run begins.
- [x] Every accepted `Surface` passes shared state, typed action, update, replay,
  Desktop, and Web checks without canonical-runtime changes.
- [x] Raw payloads, diagnostics, records, normalized Surfaces, traces,
  screenshots, reviews, summaries, manifests, and SHA-256 checks are archived
  on the OPE-1 branch without credentials.
- [x] OPE-1 remains distinct from the typed-JSON product baseline in OPE-2; the
  controlled result updates decision evidence but does not resolve product go/no-go.

## OPE-3 three-arm controlled-evaluation gates

- [x] The archived OPE-1 report and checksum manifest remain byte-for-byte valid;
  OPE-3 writes only to a new immutable evidence directory.
- [x] The strict typed-JSON schema is derived from the same closed eight-component
  catalog semantics, forbids extra properties, and rejects unknown components,
  props, actions, state keys, duplicate identifiers, broken references, wrong
  roots, oversized sources, and node overflow before normalization.
- [x] OpenUI, A2UI, and typed-JSON reference fixtures pass their pinned validators,
  normalize through the same `ProtocolAdapter -> Surface` seam, expose the same
  eight component kinds, and produce one semantic fingerprint.
- [x] The shared prompt bytes are identical across all arms; complete syntax
  instructions and minimal examples are isolated, pinned, validated, and counted.
- [x] A frozen 20-scenario schedule contains every arm exactly once per scenario,
  balances every pairwise relative order 10/10, and limits execution to 60 first
  attempts plus at most one repair per failed arm (120 calls maximum).
- [x] Preregistration hashes scenarios, prompts, schemas, examples, source pins,
  dependency locks, model configuration, schedule, validators, and scorer before
  generation; any drift invalidates the run.
- [x] One parameterized symmetric scorer emits independent `openui_vs_a2ui` and
  `openui_vs_typed_json` outcomes, retains failed-attempt cost, and has fixtures
  for both directional wins, tie, and invalid evidence.
- [x] A fake-provider 20x3 run proves attempt topology, process isolation, repair,
  artifacts, validation, normalization, runtime probes, metrics, and checksums
  before any Luna call.
- [ ] One frozen real `gpt-5.6-luna` low run regenerates all three arms together;
  no prompt, validator, schedule, threshold, or scorer changes occur afterward.
- [ ] Every accepted Surface passes shared state, typed action, update, replay,
  Desktop, and Chromium Web checks without canonical-runtime behavior changes.
- [ ] The final archive contains raw payloads, diagnostics, records, Surfaces,
  traces, screenshots, metrics, reviews, report, and verified SHA-256 checksums,
  with no credentials.
- [ ] The report includes one three-arm table, both primary pairwise verdicts,
  secondary A2UI-vs-JSON context, paired uncertainty intervals, OPE-1 replication
  comparison, and the explicit eight-component/OPE-2 scope boundary.

## OPE-3 runnable evidence

```bash
npm test --prefix prototype/openui-a2ui-cloud-eval/oracles
cargo test --manifest-path prototype/openui-a2ui-cloud-eval/Cargo.toml
cargo clippy --manifest-path prototype/openui-a2ui-cloud-eval/Cargo.toml --all-targets -- -D warnings
prototype/openui-a2ui-cloud-eval/scripts/test-local-provider-e2e.sh
prototype/openui-a2ui-cloud-eval/scripts/run-three-arm-controlled-eval.sh --fake
```

# OpenUI Generative UI Reliability benchmark: evaluation boundaries

**Verdict.** The benchmark is useful evidence about *LLM generation of three
wire formats under one OpenUI-derived catalog*. It is **not** evidence that an
OpenUI+Dioxus runtime renders better, faster, more accessibly, or more
reliably across Web/Desktop/Mobile. In particular, it does not benchmark
Dioxus, MCP Apps, end-user interaction, visual fidelity, action policy,
replay, device behavior, or an OpenUI-to-Dioxus adapter.

## Primary sources and frozen upstream snapshot

- [OpenUI article, 17 Aug 2026](https://www.openui.com/blog/generative-ui-benchmark)
- [Published benchmark README at upstream commit `c3c0d1b`](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/openui-bench/README.md)
  ([directory: briefs, catalog, code, raw outputs, results](https://github.com/thesysdev/openui/tree/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/openui-bench))
- [OpenUI SDK/runtime overview](https://www.openui.com/docs/overview) and
  [official repository](https://github.com/thesysdev/openui)
- [A2UI v0.9.1/current and v1.0 candidate status](https://a2ui.org/) and
  [official repository](https://github.com/a2ui-project/a2ui)
- [Dioxus 0.7 documentation](https://dioxuslabs.com/learn/0.7/)
- [MCP Apps official overview](https://modelcontextprotocol.io/extensions/apps/overview)

## Local reproduction on 23 Aug 2026

The frozen repository was cloned at `c3c0d1b7cf1d58e01846e86b7e9706f54afb2511`.
The committed raws were reused; no fresh model generations were purchased.

- `node tools/count-tokens.mjs` reproduced the six published token numbers
  exactly: prompts `5,031 / 7,651 / 12,610` and mean outputs
  `1,362 / 3,258 / 2,823` for OpenUI / json-render / A2UI.
- The cost script did **not** reproduce the whole article table. For example,
  it reports Kimi A2UI at `$3.48` per pass, while the article hard-codes
  `$3.16`; it reports Qwen OpenUI at `$0.78`, while the article shows `$0.81`.
  The script omits Sol explicitly, while the article includes a Sol row.
- The offline scorer reproduced every A2UI and json-render headline row, but
  it did **not** reproduce OpenUI with the parser built from the pinned
  repository source. Published OpenUI completeness is `1,065/1,104`
  (`96.467%`); rescoring gives `1,032/1,104` (`93.478%`). A2UI remains
  `1,057/1,104` (`95.743%`). The largest change is Gemini OpenUI:
  `175/184` published versus `144/184` rescored.
- Root cause was isolated to parser-version drift. OpenUI commit
  [`0d021ef9`](https://github.com/thesysdev/openui/commit/0d021ef9da71e833ce83db406908af23a102341b)
  added nested schema validation before the benchmark publication commits.
  Rebuilding the immediately preceding parser at
  [`9961e19a`](https://github.com/thesysdev/openui/commit/9961e19a0ae51f551aaf8ab9446e416bb43813bd)
  makes the Gemini result match the committed benchmark file byte-for-byte.
  The benchmark therefore publishes rows produced by an older parser while
  its reproduction command loads the newer parser from the pinned tree.

This does not erase the raw-output or token evidence. It does invalidate the
article's claim that its OpenUI structural-lead result can be reproduced from
the disclosed pinned source without restoring the older parser semantics.

## Claim / evidence / limitation

| Claim | Primary evidence | Limitation for this evaluation |
| --- | --- | --- |
| The published comparison is OpenUI Lang vs A2UI v0.9 vs Vercel json-render 0.19. | [Benchmark README](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/openui-bench/README.md) | It contains neither Dioxus nor MCP Apps. It is a generation-format comparison, not a runtime-framework bake-off. |
| It uses 46 English screen briefs, grouped into five bands of 2–18 numbered requirements, and a shared 70-component catalog derived from OpenUI’s public component library. Briefs intentionally do not prescribe components or layout. | [Brief design](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/openui-bench/briefs/DESIGN.md), [public catalog](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/openui-bench/catalog/public-catalog.json) | These are synthetic single-screen briefs, not a Dioxus application workload or an MCP tool/result workflow. “Requirement” is a complexity proxy, not a verified user task. |
| Six models are included in headline averages; each model × format × brief has four generations: 46 × 6 × 4 = 1,104 runs per format (184 per model/format cell). A seventh Terra run is committed but excluded from headline averages. | [Setup](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/openui-bench/README.md#headline-setup), [article results](https://www.openui.com/blog/generative-ui-benchmark) | Four samples per cell make small differences noisy; the authors themselves treat gaps below about three points as noise. Anthropic used its default temperature while the other condition was 0.7. |
| The headline 96.5% / 95.7% / 80.2% figures are **structural completeness**, not semantic quality. A pass needs parser success, a root, resolved/reachable references, valid required props/enums, no recorded truncation, and a component-count floor at least equal to the brief’s requirement count. | [Article methodology](https://www.openui.com/blog/generative-ui-benchmark#methodology), [shared scorer](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/openui-bench/score.mjs), [OpenUI validator](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/openui-bench/protocols/openui/validator.ts) | No rubric checks whether a generated surface actually satisfies each requirement, is visually correct, usable, accessible, secure, or has correct actions/state. The count floor can credit the wrong components. |
| “Render success” is a second, coarse reachability/renderer-gate metric. For OpenUI, `renderable=true` once its parser produces a root; json-render uses its compiled spec/validator; A2UI additionally sends messages through `@a2ui/web_core`’s `MessageProcessor`. | [OpenUI validator](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/openui-bench/protocols/openui/validator.ts), [json-render validator](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/openui-bench/protocols/jsonrender/validator.ts), [A2UI renderer gate](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/openui-bench/protocols/a2ui/validator.mjs) | This is not a browser/device end-to-end rendering test. It does not mount a Dioxus app, capture pixels, exercise event handlers, compare accessibility trees, or measure first paint/frame time. “Blank screen” is therefore format/validator-specific. |
| The benchmark publishes briefs, equivalent catalog definitions, prompts, validators, raw outputs, scored results, and an offline scorer; rescore requires no model API keys, but A2UI needs the pinned official Python SDK. | [Reproduction instructions](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/openui-bench/README.md#reproduce-the-scores-no-api-keys), [raw data](https://github.com/thesysdev/openui/tree/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/openui-bench/raw), [results](https://github.com/thesysdev/openui/tree/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/openui-bench/results) | The published data make *rescoring* reproducible, not necessarily fresh generation: there is no fixed provider/model revision or seed, APIs drift, retries are unscored, and provider routing can permit fallbacks. |
| Token efficiency is computed with `tiktoken` `o200k_base`: prompt tokens from each format’s generated system prompt plus mean tokens of the committed raw outputs (first four repeats, six headline models). | [Token counter](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/openui-bench/tools/count-tokens.mjs), [article token table](https://www.openui.com/blog/generative-ui-benchmark#tokens) | This measures wire/prompt token volume, not wall-clock latency, streaming UX, Rust CPU/memory, binary/WASM size, or Dioxus rendering cost. It also uses one tokenizer for all model families. |
| Cost is a replayable **estimate**, not billed spend: for each raw output it sums `system prompt + brief (+20 tokens)` at an input list price and raw-output tokens at an output list price, then divides by repeat count for a 46-screen pass. Hidden reasoning tokens are explicitly excluded. | [Cost script](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/openui-bench/tools/cost-estimate.mjs), [article cost table](https://www.openui.com/blog/generative-ui-benchmark#cost) | Several script values differ from the article table, and the script explicitly omits Sol while the article includes it. Neither source establishes billed spend, discounts/cache effects, or Dioxus runtime cost. |
| Benchmark-specific judgment calls modify the native SDK gates: e.g. json-render accepts fenced output and defaults `children`/`visible`; OpenUI ignores one documented parser artifact; A2UI combines official SDK parsing with a custom renderer gate and shared checks. | [Judgment calls](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/openui-bench/README.md#judgment-calls) | The comparison is more transparent than an opaque benchmark, but it is not a pure out-of-the-box comparison. OpenUI authors also disclose their first-party interest and that the catalog comes from their library. |

## What transfers to OpenUI+Dioxus

Transferable, with a new Dioxus-specific run:

- A hypothesis that compact OpenUI output can reduce **model token input/output**
  relative to a semantically equivalent, catalog-constrained alternative.
- A reusable evaluation shape: frozen briefs, one catalog, raw outputs,
  parser/validator results, and separate renderability reporting.
- Structural-generation failure classes worth testing in an OpenUI adapter:
  missing root, dangling/orphaned references, hallucinated catalog names,
  invalid props/enums, truncation, and partial streaming recovery.

Not transferable from this benchmark:

- Any claim about Dioxus Web/Desktop/Mobile rendering, native component
  mappings, rendering performance, layout/pixel fidelity, accessibility,
  bundle size, platform adaptation, or device stability. Dioxus is a
  cross-platform Rust UI framework, but no Dioxus renderer is in the published
  harness ([official docs](https://dioxuslabs.com/learn/0.7/)).
- Any claim about action authorization, typed effects, durable state,
  checkpoint/replay, or MCP transport. These are runtime-host properties,
  outside a static generation/validator run.
- Any conclusion about MCP Apps. MCP Apps serve interactive HTML resources
  inside MCP hosts, typically in sandboxed iframes with host/app JSON-RPC;
  that is a different execution and trust model from the three generated
  formats here ([official MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview)).
- A2UI itself remains a relevant **protocol baseline**, because its official
  design is declarative data rendered through a client’s own native catalog;
  a Dioxus catalog/renderer could therefore be evaluated against the same
  workload ([official A2UI overview](https://a2ui.org/)). The published
  A2UI result does not evaluate such an adapter.

## Recommended runtime comparison

Use this benchmark only as the generation layer of a new, pinned evaluation:

1. Freeze one Dioxus catalog and equivalent OpenUI/A2UI artifacts for the
   same MCP tool/result workflows; retain raw generations and per-model seeds
   or immutable provider revisions where available.
2. Score structural validity **and** requirement coverage by explicit rubric.
   Run actual Dioxus Web/Desktop/Mobile renderers; capture mount success,
   first usable render, streaming updates, screenshots/layout regressions,
   accessibility-tree checks, memory/CPU, and bundle/binary size.
3. Exercise typed user actions, rejected proposals, state preservation,
   replay, and host-policy boundaries. Report protocol generation metrics
   separately from renderer/runtime metrics, and compare against the simplest
   Dioxus adapter as well as an A2UI+Dioxus adapter.

This separation matches the local prototype’s current scope: it proves a
closed eight-component projection and compile checks, while explicitly not
claiming device/runtime certification or full OpenUI/A2UI conformance
([prototype README](README.md), [bounded comparison](COMPARISON.md)).

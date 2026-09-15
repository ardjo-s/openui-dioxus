# OpenUI-Dioxus evaluation

Evaluation date: 2026-08-23
Frozen OpenUI source: `thesysdev/openui@c3c0d1b7cf1d58e01846e86b7e9706f54afb2511`

## Verdict

**Continue the OpenUI+Dioxus experiment, but do not claim superiority or ship
`v0.1` yet.** Two parts of the thesis have evidence:

1. OpenUI Lang is materially smaller than A2UI on the published corpus. The
   official token counter reproduces 5,031 prompt + 1,362 mean output tokens
   for OpenUI versus 12,610 + 2,823 for A2UI: 58.6% fewer combined tokens per
   generated screen under this benchmark condition.
2. Dioxus gives this Rust prototype one 342-line renderer with no platform
   branches, compiling for Desktop, Web, and Mobile (`3/3`).

Three claims are **not** established:

- The published 96.5% OpenUI structural-reliability lead is not reproducible
  with the parser built from the pinned repository source.
- The local preview is not OpenUI-compatible: it accepts `0/1,104` official
  OpenUI benchmark outputs because it intentionally implements a different
  eight-component preview grammar and catalog.
- No equivalent A2UI+Dioxus renderer or MCP Apps application was implemented,
  so lower integration or maintenance cost versus those alternatives remains
  a hypothesis.

## Evidence summary

| Question | Result | Status |
| --- | --- | --- |
| Is OpenUI's wire format smaller than A2UI here? | 6,393 prompt+mean-output tokens versus 15,433; OpenUI uses 58.6% fewer. | Proven for this frozen 70-component benchmark. |
| Is estimated generation cheaper? | Reproduced script: OpenUI is 1.9–2.6x cheaper than A2UI across the five priced models in the script. | Direction proven; article table is not fully reproducible. |
| Is OpenUI structurally more reliable? | Published: 96.47% OpenUI vs 95.74% A2UI. Current pinned parser rescore: 93.48% vs 95.74%. | No reliable winner; published lead is stale and both gaps are below the article's ~3-point noise band. |
| Does OpenUI fail less catastrophically? | Published and rescored renderer gates: 1 blank OpenUI screen vs 35 A2UI screens out of 1,104. | Proven for those SDK gates, not for a Dioxus renderer or device. |
| Does one Dioxus tree cover three targets? | Same `src/app.rs`; Desktop, Web, and Mobile feature checks pass. Desktop event loop launched. | Technical compile/launch evidence; no browser or mobile-device certification. |
| Is the local Rust runtime fast? | Median of five 100k-iteration release runs: 14.623 µs parse/validate/commit and 9.162 µs checkpoint/replay. | Standalone prototype result, not comparative UI-render latency. |
| Is the current preview OpenUI-conformant? | 0 of 1,104 official OpenUI raws accepted. | No. This is the main implementation gap. |

## 1. Reproduced format benchmark

The official benchmark contains 46 briefs, six headline models, four repeats,
and 1,104 raw generations per format. It compares OpenUI Lang, A2UI v0.9, and
json-render over one matched 70-component catalog. It does not include Dioxus
or MCP Apps.

### Tokens

`node tools/count-tokens.mjs` reproduced the article exactly:

| Format | System prompt | Mean output | Combined |
| --- | ---: | ---: | ---: |
| OpenUI | 5,031 | 1,362 | 6,393 |
| A2UI | 12,610 | 2,823 | 15,433 |
| json-render | 7,651 | 3,258 | 10,909 |

This proves model-context and output-volume efficiency for the format. It does
not measure Dioxus CPU, rendering, accessibility, or device behavior.

### Cost

The committed estimator produced these costs for one 46-screen pass:

| Model | OpenUI | A2UI | A2UI/OpenUI |
| --- | ---: | ---: | ---: |
| Gemini | $0.42 | $0.94 | 2.2x |
| Muse | $0.72 | $1.38 | 1.9x |
| Qwen | $0.78 | $1.92 | 2.5x |
| Kimi | $1.53 | $3.48 | 2.3x |
| Claude Opus | $2.27 | $5.85 | 2.6x |

These are list-price estimates over raw token counts, excluding hidden
reasoning, cache discounts, provider routing, and runtime costs. Several
article values differ from the script: for example, the article shows Kimi
A2UI at `$3.16`, while the script gives `$3.48`. The script explicitly omits
Sol, while the article includes it. The broad cost direction survives; the
whole article table does not reproduce.

### Structural reliability and parser drift

| Format | Committed result | Rescore with parser from pinned tree | Blank screens |
| --- | ---: | ---: | ---: |
| OpenUI | 1,065/1,104 (96.47%) | 1,032/1,104 (93.48%) | 1 |
| A2UI | 1,057/1,104 (95.74%) | 1,057/1,104 (95.74%) | 35 |
| json-render | 885/1,104 (80.16%) | 885/1,104 (80.16%) | 4 |

The full A2UI and json-render rescoring matches. OpenUI does not. Gemini alone
changes from `175/184` to `144/184`, mainly because the current parser reports
nested `DialogBlock/content` and `DrawerBlock/content` validation errors.

The cause was isolated by rebuilding OpenUI Lang immediately before upstream
commit `0d021ef9` added nested schema validation. Parser commit `9961e19a`
reproduces the committed Gemini result byte-for-byte. The published result set
therefore reflects older parser semantics, while the documented reproduction
command loads newer semantics from the pinned tree.

Consequence: token savings remain good evidence. The claimed structural lead
does not. Under either scoring version, OpenUI and A2UI remain within the
article's own ~3-point noise threshold.

## 2. Local Dioxus runtime measurements

Machine: Apple M3, 8 cores, macOS 26.5.2, Rust/Cargo 1.91.0. Release timings
are medians over five runs of 100,000 operations; ranges show run-to-run noise.

| Measurement | Result |
| --- | ---: |
| Parser + closed-catalog validation + atomic commit | 14.623 µs/op median (14.136–19.709 µs) |
| Checkpoint + inert replay materialization | 9.162 µs/op median (8.901–9.267 µs) |
| Runtime correctness self-check | 5/5 PASS |
| Platform feature compilation | Desktop + Web + Mobile, 3/3 PASS |
| Desktop release executable | 5,385,456 bytes; 1,797,372 bytes gzip |
| Web release WASM from Cargo | 1,872,684 bytes; 481,133 bytes gzip |
| Desktop smoke | Event loop stayed live for five seconds, then was stopped deliberately |
| Official OpenUI raw acceptance | 0/1,104 |

The artifact sizes are raw Cargo outputs, not a `dx bundle`, `wasm-opt` result,
signed application, or app-store package. Web was compiled but not exercised
in a browser. Mobile is a host-toolchain feature compile, not an iOS/Android
simulator or device run.

The source-shape evidence for portability is narrow but real:

- one 342-line Dioxus `app.rs` renderer;
- zero target-specific conditionals in that renderer;
- one direct external Cargo dependency (`dioxus`; transitive dependencies are
  larger);
- the same projection, typed action, and inert replay path on all three feature
  builds.

That supports “Dioxus reduces platform duplication.” It does not support
“OpenUI is uniquely multiplatform”: A2UI is renderer-agnostic and could use the
same Dioxus strategy.

## 3. Minimal alternative comparison

| Approach | What this evaluation supports | What remains unmeasured |
| --- | --- | --- |
| OpenUI + Dioxus | Compact generation format; one Rust/Dioxus renderer can cover three compile targets; typed action and inert replay work in the preview. | Real OpenUI conformance, streaming, browser/mobile runtime, semantic UI quality, accessibility, repair, maintenance. |
| A2UI + Dioxus | A2UI is the closest protocol baseline and current-parser structural validity is comparable or better. | No Dioxus adapter was built, so code size, action/replay fit, and platform effort are unknown. |
| MCP Apps | Good baseline for MCP hosts that already sandbox and display HTML resources. | It is not a generated wire-format benchmark; no meaningful token or native Dioxus comparison was run. |

MCP Apps may remain simpler for chat-host-only HTML. OpenUI+Dioxus has a better
architectural fit when an existing Rust application needs generated surfaces
inside its own Web/Desktop/Mobile UI without a second application renderer.

## Decision gate for the next rung

Proceed only with a small conformance slice:

1. replace the preview grammar with pinned OpenUI Lang semantics;
2. keep the eight-component Dioxus catalog;
3. create one equivalent A2UI+Dioxus adapter for the same catalog;
4. run identical generated artifacts through both actual renderers, actions,
   state preservation, and replay on Desktop and Web;
5. add real mobile-device evidence only after the two-runtime comparison wins
   on at least one measured dimension.

Stop or reposition if that slice does not preserve OpenUI's token advantage or
cannot beat the A2UI adapter on failure recovery, typed action/replay clarity,
or maintenance burden.

## Reproduction assets

- [Source and methodology audit](../EVALUATION-SOURCES.md)
- [Official benchmark article](https://www.openui.com/blog/generative-ui-benchmark)
- [Official benchmark repository](https://github.com/thesysdev/openui/tree/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/openui-bench)
- Local runtime command:

  ```sh
  cargo run --release --locked --bin prototype-evaluation --no-default-features -- /path/to/openui/benchmarks/openui-bench/raw
  ```

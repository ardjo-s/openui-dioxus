# Gates: OpenUI-Dioxus benchmark evaluation

Scope: Reproduce the published OpenUI format evidence, measure the local Dioxus preview, and separate proven results from product hypotheses.

- [x] G1: The source audit states exactly what the official benchmark does and does not measure.
  CHECK: rg -n "not.*evidence.*OpenUI\+Dioxus|neither Dioxus nor MCP Apps|Cost is.*estimate" ../EVALUATION-SOURCES.md
  EXPECT: Cost is
  EVIDENCE: 57:| The published comparison is OpenUI Lang vs A2UI v0.9 vs Vercel json-render 0.19. | [Benchmark README](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/benchmarks/

- [x] G2: The frozen upstream corpus contains 1,104 scored raw generations for each published format.
  CHECK: test "$(git -C /Users/ardjo/CODE/.scratch/openui-benchmark-upstream rev-parse HEAD)" = c3c0d1b7cf1d58e01846e86b7e9706f54afb2511 && for fmt in openui a2ui jsonrender; do n=0; for model in sol opus48 kimi gemini qwen muse; do m=$(find "/Users/ardjo/CODE/.scratch/openui-benchmark-upstream/benchmarks/openui-bench/raw/$model" -type f -name "${fmt}__*__r[1-4].txt" | wc -l | tr -d ' '); n=$((n + m)); done; printf '%s=%s ' "$fmt" "$n"; test "$n" = 1104; done
  EXPECT: openui=1104 a2ui=1104 jsonrender=1104
  EVIDENCE: openui=1104 a2ui=1104 jsonrender=1104

- [x] G3: The official token counter reproduces the published prompt and mean-output figures.
  CHECK: cd /Users/ardjo/CODE/.scratch/openui-benchmark-upstream/benchmarks/openui-bench && node tools/count-tokens.mjs
  EXPECT: output a2ui: mean 2823 tokens over 1104 runs
  EVIDENCE: output jsonrender: mean 3258 tokens over 1104 runs | output a2ui: mean 2823 tokens over 1104 runs

- [ ] G4: The official offline scorer reproduces all committed structural verdicts without a results diff.
  CHECK: cd /Users/ardjo/CODE/.scratch/openui-benchmark-upstream/benchmarks/openui-bench && A2UI_PYTHON=.venv/bin/python node score.mjs && git diff --exit-code -- results && echo 'OFFICIAL_RESCORE_MATCH'
  EXPECT: OFFICIAL_RESCORE_MATCH
  EVIDENCE: pending

ABANDON: G4 The pinned current lang-core parser does not reproduce the committed OpenUI rows: 1,032/1,104 current versus 1,065/1,104 published. A2UI and json-render match. The pre-nested-validation parser at 9961e19a reproduces the Gemini result byte-for-byte, proving parser-version drift in the published result set.

- [x] G5: The local preview still proves parser/commit, atomic rejection, eight catalog types, one typed action, and inert replay.
  CHECK: cd .. && cargo run --quiet --locked --bin prototype-self-check --no-default-features
  EXPECT: summary: 5/5 PASS
  EVIDENCE: replay: PASS | summary: 5/5 PASS

- [x] G6: One Dioxus renderer still compiles for Desktop, Web, and Mobile feature targets.
  CHECK: cd .. && ./scripts/verify-platforms.sh
  EXPECT: platforms: 3/3 PASS
  EVIDENCE: Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.34s | Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.16s

- [x] G7: The local evaluation reports runtime timings and attempts every one of the 1,104 official OpenUI raws.
  CHECK: cd .. && cargo run --quiet --release --locked --bin prototype-evaluation --no-default-features -- /Users/ardjo/CODE/.scratch/openui-benchmark-upstream/benchmarks/openui-bench/raw
  EXPECT: official_openui_corpus: 1104 attempted
  EVIDENCE: checkpoint_replay_ns_per_op: 8191 | official_openui_corpus: 1104 attempted, 0 accepted, 1104 rejected

- [x] G8: The final report quantifies format evidence, Dioxus evidence, current conformance gap, and comparison limits.
  CHECK: rg -n "96\.5%|5,031|1,362|3/3|1,104|MCP Apps|Verdict" README.md
  EXPECT: Verdict
  EVIDENCE: 142:| MCP Apps | Good baseline for MCP hosts that already sandbox and display HTML resources. | It is not a generated wire-format benchmark; no meaningful token or native Dioxus comparison was run. |

- [x] G9: The evaluation exposes the published/current OpenUI reliability divergence instead of silently accepting committed scores.
  CHECK: cd /Users/ardjo/CODE/.scratch/openui-benchmark-upstream && current=$(jq '[.[] | select(.fmt == "openui" and .complete)] | length' benchmarks/openui-bench/results/results-gemini.json) && published=$(git show HEAD:benchmarks/openui-bench/results/results-gemini.json | jq '[.[] | select(.fmt == "openui" and .complete)] | length') && test "$current" = 144 && test "$published" = 175 && echo "current=$current published=$published"
  EXPECT: current=144 published=175
  EVIDENCE: current=144 published=175

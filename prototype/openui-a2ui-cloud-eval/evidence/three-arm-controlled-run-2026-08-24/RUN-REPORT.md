# OPE-3 joint controlled evaluation report

**Evidence status:** VALID_EVAL
**Provider:** ChatGPT-plan Codex CLI
**Model:** gpt-5.6-luna, reasoning low
**Preregistration:** `d6224f98869bb43d2663ed44028a3d7054d33489f462b772fbaa1d138317b5a9`

## Primary verdicts

- OpenUI-Dioxus vs A2UI-Dioxus: **OPENUI_WIN**
- OpenUI-Dioxus vs JSON-Dioxus: **TIE**

A2UI-Dioxus vs JSON-Dioxus is secondary context only: **RIGHT_WIN**.

## Three-arm overview

| Arm | First pass | After repair | Cumulative raw tokens | Median latency ms | Adapter/provenance LOC |
| --- | ---: | ---: | ---: | ---: | ---: |
| openui | 17/20 | 19/20 | 34470 | 37397.3 | 168 |
| a2ui | 0/20 | 12/20 | 79663 | 79700.2 | 155 |
| typed-json | 20/20 | 20/20 | 32651 | 35721.3 | 36 |

Completed scenarios: 20/20. Calls: 83/120 maximum. Accepted Surfaces: 51.

## Shared executable evidence

- Runtime semantics: PASS
- Desktop: PASS
- Chromium Web: PASS
- Shared runtime behavior diff: PASS (0 lines)
- Real provider evidence: PASS

Every accepted representation crosses the same project-owned `ProtocolAdapter -> Surface` seam. Model output is validated as data and is never executed.

## Pairwise uncertainty

- OpenUI minus A2UI raw tokens: mean -2259.7, 95% [-2526.2, -1977.5]
- OpenUI minus A2UI latency ms: mean -40436.7, 95% [-57232.7, -25864.5]
- OpenUI minus typed JSON raw tokens: mean 91.0, 95% [-177.4, 370.6]
- OpenUI minus typed JSON latency ms: mean 5985.4, 95% [-2316.2, 14533.7]

These paired bootstrap intervals are descriptive. They do not alter the pre-registered hard thresholds.

## OPE-1 replication

- Historical outcome: CONTROLLED_OPENUI_WIN
- Fresh OpenUI-vs-A2UI outcome: OPENUI_WIN
- Direction agrees: YES
- Historical post-repair validity: OpenUI 20/20; A2UI 13/20
- Fresh post-repair validity: OpenUI 19/20; A2UI 12/20

## Method boundary

This is a closed eight-component protocol-generation benchmark. It does not decide OPE-2 or prove product value, design-system breadth, accessibility, iOS, Android, maintenance cost, or blinded UI quality.

OpenUI and A2UI use pinned official reference semantics. Their Dioxus adapters and the strict typed-JSON baseline are project-owned evaluation code.

The OPE-1 archive remains immutable and is checksum-verified before this run. Records bind preregistered prompt hashes to raw payload, diagnostics, and normalized Surface hashes; `SHA256SUMS` binds the final archive.

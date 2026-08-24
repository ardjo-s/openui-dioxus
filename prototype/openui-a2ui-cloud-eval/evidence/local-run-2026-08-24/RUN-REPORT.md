# Local OpenUI–A2UI evaluation report

Run date: 2026-08-24  
Provider: Codex CLI through the ChatGPT plan  
Model: `gpt-5.6-luna`  
Reasoning: `low`  
Final automatic outcome: `OPENUI_WIN_MOBILE_FAIL`

## What was tested

Twenty paired passages used the same expense-review intent, eight-component Dioxus
catalog, MCP fixture data, state names, and typed action. Order alternated for
every pair. Each invalid payload received at most one repair in a fresh,
ephemeral, read-only Codex process with tools disabled.

Official OpenUI Lang and A2UI reference validators ran before either
project-owned Rust adapter. Accepted programs were normalized into the same
canonical `Surface`, then rendered by the same real Dioxus components.

## Result

| Measure | OpenUI | A2UI |
| --- | ---: | ---: |
| Calls | 24 | 40 |
| First-pass valid | 16/20 | 0/20 |
| Valid after one repair | 20/20 | 0/20 |
| Median raw tokens per passage | 1,324 | 2,988 |
| Median complete generation latency | 10.58 s | 32.01 s |
| p95 complete generation latency | 20.66 s | 41.36 s |
| Adapter handwritten LOC | 168 | 155 |

OpenUI used 55.7% fewer median raw tokens. All 20 accepted OpenUI Surfaces passed
the canonical state, exactly-once action, update, replay, Desktop, and Web checks.
Adding A2UI changed zero shared-runtime lines.

The local route made 64 plan-backed calls in total. It did not use the OpenAI API,
so API cost is intentionally `null`; no dollar-cost claim is made.

## Platform evidence

- Desktop: PASS. A real Dioxus desktop window emitted
  `DIOXUS_RENDERED surfaces=20` and was captured before clean shutdown.
- Web: PASS. Chromium traversed all 20 accepted Surfaces, changed available
  fields, invoked the typed action twice with one effect, preserved state through
  update, and replayed with zero new effects.
- Mobile: FAIL. The pre-mobile score triggered the iOS gate, but this machine has
  no usable `simctl`. No Mobile support claim is allowed.

## A2UI failure analysis

On the final repair attempt, 18/20 A2UI passages failed the official wrapper
schema with `invalid_union`; 2/20 remained malformed JSON. The dominant generated
shape used the older-looking `surfaceUpdate` / `beginRendering` envelope instead
of the pinned v0.9.1 `createSurface`, `updateComponents`, and
`updateDataModel` messages.

This is evidence that the tested A2UI prompt route failed, not evidence that the
A2UI runtime cannot represent the UI. The checked-in valid A2UI reference fixture
passes the official `MessageProcessor` and normalizes to the same fingerprint as
OpenUI.

OpenUI supplied an official generated language prompt. A2UI supplied official
client capabilities and the inline catalog, but that capability payload does not
teach the message envelope. A future A2UI rerun should add the pinned v0.9.1
message-envelope schema or a minimal official example. That is new adapter prompt
work and must be measured as such. It was not added after seeing results because
the preregistered run was already complete and capped at 80 calls.

## Qualitative limitation

Five of the 20 accepted OpenUI Surfaces generated a status filter with only the
`pending` option. This is schema-valid and the state-preservation check still
passes, but it is a weaker product result than a useful multi-option filter.
Catalog usage rules should require at least two meaningful filter values in a
future evaluation.

## Decision

The preregistered automatic outcome is `OPENUI_WIN_MOBILE_FAIL`:

- OpenUI clears every pre-mobile threshold.
- Ticket 09 must stay open because Mobile was not proved.
- The result supports continuing the OpenUI-Dioxus prototype on Desktop/Web.
- It does not justify a broad claim that OpenUI is universally better than A2UI.
- Before a final protocol decision, run the explicit-envelope A2UI baseline and
  execute iOS on a machine with full Xcode.


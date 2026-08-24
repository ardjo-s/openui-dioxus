# OPE-1 controlled OpenUI vs A2UI run

Date: 2026-08-24
Model route: `gpt-5.6-luna`, low reasoning, ChatGPT-plan Codex sessions
Outcome: **CONTROLLED_OPENUI_WIN**

## Result

- Complete paired scenarios: 20/20.
- Calls: 57/80; no provider or infrastructure error.
- First-pass validity: OpenUI 20/20; A2UI 3/20.
- Post-repair validity: OpenUI 20/20; A2UI 13/20.
- Cumulative raw tokens: OpenUI 29,073; A2UI 72,947 (60.1% fewer for OpenUI).
- Median repair-inclusive latency: OpenUI 10.68 s; A2UI 24.97 s.
- State, typed action, update, inert replay, Desktop, and Web: PASS for every
  accepted canonical Surface.
- Shared runtime lines changed: 0.
- Handwritten adapter LOC: OpenUI 168; A2UI 155 (ratio 1.084).

## Interpretation

This run fixes Eval 0's major fairness defect. A2UI received the pinned v0.9.1
`createSurface` → `updateComponents` → `updateDataModel` envelope and one minimal
example accepted by the official `MessageProcessor`. Its failed outputs did not
use the old envelope. They were malformed JSON, generally missing the final
root closing brace; deterministic repair sometimes reproduced the same payload.

The evidence therefore supports a narrow claim: for this closed eight-component
Dioxus catalog and Luna-low route, OpenUI's language was materially easier to
generate validly and cheaply than equivalent A2UI JSON. It does not yet prove
that OpenUI-Dioxus has more product value than direct typed JSON. That question
remains OPE-2.

## Post-generation harness correction

No model call was rerun. The first platform pass exposed two Eval 0 assumptions:
the Web test hardcoded the first scenario's merchant names, and the macOS window
finder excluded off-screen windows. The test was changed to assert each accepted
Surface's own rows, and the window finder now resolves all windows by exact PID.
Desktop and Web were then replayed over the already frozen 33 accepted Surfaces.

## Evidence boundary

The reference validators are official. Both Dioxus adapters and this evaluation
harness are project-owned prototype code. Generated payloads were treated only
as data and never compiled or executed as code.

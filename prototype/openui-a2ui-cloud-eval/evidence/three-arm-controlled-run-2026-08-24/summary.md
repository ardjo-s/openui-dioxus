# OPE-3 controlled three-arm protocol-generation evaluation

**Evidence status:** VALID_EVAL

- OpenUI-Dioxus vs A2UI-Dioxus: **OPENUI_WIN**
- OpenUI-Dioxus vs JSON-Dioxus: **TIE**
- A2UI-Dioxus vs JSON-Dioxus (secondary): **RIGHT_WIN**

| Arm | First-pass validity | Post-repair validity | Cumulative raw tokens | Median repair-inclusive latency ms |
| --- | ---: | ---: | ---: | ---: |
| openui | 17/20 | 19/20 | 34470 | 37397.3 |
| a2ui | 0/20 | 12/20 | 79663 | 79700.2 |
| typed-json | 20/20 | 20/20 | 32651 | 35721.3 |

- Complete three-arm scenarios: 20/20
- Accepted Surfaces rendered: 51
- Desktop: PASS
- Web: PASS
- Shared runtime behavior lines changed: 0

## OPE-1 replication comparison

- Historical OPE-1: CONTROLLED_OPENUI_WIN
- Fresh OPE-3 OpenUI vs A2UI: OPENUI_WIN
- Direction agrees: YES
- Historical post-repair validity: OpenUI 20/20; A2UI 13/20
- Fresh post-repair validity: OpenUI 19/20; A2UI 12/20

The OpenUI and A2UI reference semantics are official. All Dioxus adapters and the strict typed-JSON baseline are project-owned evaluation code.

Scope: one closed eight-component protocol-generation benchmark. This is not the OPE-2 product verdict; real Dioxus Components breadth, blinded quality, maintenance, accessibility, iOS, and Android remain separate.

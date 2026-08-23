# Thin Dioxus baseline comparison

Both paths consume the same `tools/call(list_pending_expenses)` JSON result.

| Measure | Thin direct Dioxus mapper | OpenUI-Dioxus prototype |
| --- | ---: | ---: |
| Nonblank implementation lines | 80 including runnable Dioxus UI, direct MCP approval, and raw replay | 222 runtime + adapters |
| Mapping transitions | 1 | 3 |
| Second catalog swap | edit/select direct render code | select another compiled adapter; 0 runtime-semantic changes |
| Approval | direct MCP call, no durable typed receipt | typed action plus durable JSON receipt after MCP response |
| Replay | reload raw MCP result, 0 new MCP calls, no enforced inert boundary | captured Surface, equal fingerprint, enforced inert boundary, 0 new MCP calls |
| Runtime semantics | coupled to direct result mapping | unchanged across adapters |

Verdict: the direct mapper wins for this screen alone. Continue the OpenUI-Dioxus direction only where the last three guarantees are product requirements; otherwise stop and ship thin Dioxus.

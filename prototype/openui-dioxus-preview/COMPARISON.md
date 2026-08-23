# Bounded comparison

Scope is one workflow: an accepted expense-review artifact with eight catalog
component types, one typed approval action, host-owned replay, and a Rust/Dioxus
renderer.

| Question | OpenUI-Dioxus preview | A2UI | MCP Apps |
| --- | --- | --- | --- |
| Generated artifact | Compact proposal becomes a typed `Projection`; this adapter renders it | Closest simpler protocol baseline: JSONL `createSurface` then flat `updateComponents` | Tool declares a `ui://` resource; host fetches HTML |
| Dioxus fit | Direct Rust component tree across the three feature checks | Requires a separate Dioxus catalog/adapter | HTML is natural for a chat host, not a Dioxus-native tree |
| Action boundary | Host invokes exactly `TypedAction::ApproveExpense` | Protocol/catalog must define the action mapping | Host bridges UI events through JSON-RPC/postMessage |
| Replay ownership | Rust `Checkpoint` produces an explicitly inert replay | Host/app must add replay semantics | Host controls sandbox/session lifecycle |
| Burden | Smaller only while the eight-type catalog and Rust boundary stay fixed | Lower protocol complexity for this workflow | Likely simpler for chat-host-only HTML workflows |

Current official facts checked 2026-08-23: A2UI production is v0.9.1 and v1.0
is a release candidate; v0.9 uses JSONL, `createSurface`, flat
`updateComponents`, root IDs, and catalog validation ([A2UI repository](https://github.com/a2ui-project/a2ui), [message reference](https://a2ui.org/reference/messages/)).
MCP Apps is an official extension in which a tool declares a `ui://` resource;
hosts fetch HTML, typically sandbox it in an iframe, and bridge through
JSON-RPC/postMessage, with host support varying ([MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview), [MCP Apps API overview](https://apps.extensions.modelcontextprotocol.io/api/documents/Overview.html)).

## Falsifiable prototype verdict: CONDITIONAL GO

A2UI is the closest simpler baseline. MCP Apps is likely simpler when the
target is only chat-hosted HTML. Continue OpenUI-Dioxus only if a measured
comparison of this workflow shows that the compact proposal plus Rust host
boundary plus inert replay reduces implementation/maintenance burden or
improves action/replay correctness. Otherwise the result is a **NO-GO** for
this direction, while the eight-type adapter remains useful as evidence.

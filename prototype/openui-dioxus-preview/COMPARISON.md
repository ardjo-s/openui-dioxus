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

## Falsifiable prototype verdict: TECHNICAL GO; PRODUCT NO-DECISION

**TECHNICAL GO:** the compile gates establish that one accepted projection can
use one Dioxus component tree across the three platform feature targets. They
do not establish A2UI/OpenUI conformance, runtime UX, device behavior, or a
maintenance advantage.

**PRODUCT NO-DECISION — and NO-GO for a v0.1 commitment:** A2UI is the closest
simpler protocol baseline, while MCP Apps is likely simpler for chat-host-only
HTML. Do not commit to v0.1 before comparing the same workflow at runtime.

**Falsification condition:** stop this direction and choose the simpler
baseline if compact proposal + Rust host boundary + inert replay does not show
a measured advantage in action/replay correctness or implementation and
maintenance burden during the conformance, UX, and runtime comparison.

# Gates: real MCP vertical prototype

Scope: Throwaway executable proof that real MCP JSON-RPC, pinned OpenUI reference semantics, two compiled Dioxus catalog adapters, typed approval receipts, inert replay, and a fair thin-Dioxus baseline compose end to end.

- [x] G1: A deterministic local server exchanges real JSON-RPC `initialize`, `tools/list`, and `tools/call` messages for `list_pending_expenses` and `approve_expense`.
  CHECK: cargo run --quiet --bin prototype-evidence --no-default-features -- mcp
  EXPECT: /mcp_jsonrpc: PASS.*tools\/list=1.*tools\/call=2/
  EVIDENCE: mcp_jsonrpc: PASS initialize=1 tools/list=1 tools/call=2

- [x] G2: The pinned OpenUI v0.5 reference oracle accepts the valid result, rejects an invalid proposal, and the rejected proposal does not replace the committed Surface.
  CHECK: cargo run --quiet --bin prototype-evidence --no-default-features -- openui
  EXPECT: /openui_oracle: PASS.*atomic_reject=PASS/
  EVIDENCE: openui_oracle: PASS package=@openuidev/lang-core version=0.2.15 atomic_reject=PASS

- [x] G3: Two statically compiled `CatalogAdapter` implementations render the same semantic Surface without runtime semantic changes.
  CHECK: cargo run --quiet --bin prototype-evidence --no-default-features -- adapters
  EXPECT: /catalog_adapters: 2\/2 PASS.*semantic_fingerprint=equal/
  EVIDENCE: catalog_adapters: 2/2 PASS semantic_fingerprint=equal fingerprint=5230571186293235748 runtime_semantic_changes=0

- [x] G4: Approval crosses the MCP boundary through a typed action and writes a durable prototype receipt.
  CHECK: cargo run --quiet --bin prototype-evidence --no-default-features -- action
  EXPECT: /typed_approval: PASS.*durable_receipt=PASS/
  EVIDENCE: typed_approval: PASS mcp_status=approved durable_receipt=PASS

- [x] G5: Replay renders captured semantics and causes zero additional MCP calls.
  CHECK: cargo run --quiet --bin prototype-evidence --no-default-features -- replay
  EXPECT: /replay: PASS.*additional_mcp_calls=0/
  EVIDENCE: replay: PASS semantic_fingerprint=equal additional_mcp_calls=0

- [x] G6: A real Dioxus Desktop app launches interactively and Web plus Mobile compile from the same semantic Surface.
  CHECK: ./scripts/verify-platforms.sh
  EXPECT: platforms: 3/3 PASS
  EVIDENCE: desktop_live: PASS fingerprint=5230571186293235748 | platforms: 3/3 PASS

- [x] G7: A runnable thin Dioxus baseline maps the same MCP result directly and measurements compare code, transitions, adapter swap, action/replay guarantees, and runtime changes without weakening it.
  CHECK: cargo run --quiet --bin prototype-evidence --no-default-features -- compare
  EXPECT: /comparison: PASS.*verdict=(CONTINUE|STOP)/
  EVIDENCE: comparison: PASS same_mcp_result=PASS baseline_loc=80 openui_runtime_adapter_loc=222 baseline_transitions=1 openui_transitions=3 baseline_action=PASS baseline_raw_replay=PASS adapter_swap_runtime_chan

- [x] G8: Ticket 09 records branch, executable evidence, limits, measurements, and falsifiable verdict; README names what remains simulated.
  CHECK: rg -n "codex/prototype-real-mcp-vertical|What ran for real|What stayed simulated|Falsifiable verdict" ../../docs/decisions/09-prototype-the-mcp-vertical.md README.md
  EXPECT: Falsifiable verdict
  EVIDENCE: ../../docs/decisions/09-prototype-the-mcp-vertical.md:19:What ran for real on 2026-08-23: | ../../docs/decisions/09-prototype-the-mcp-vertical.md:32:**Falsifiable verdict: CONTINUE only when a product

- [x] G9: Only the prototype, ticket 09, and its branch-local evidence changed; the rejected branch and user checkout remain untouched.
  CHECK: git status --short && git -C /Users/ardjo/CODE/repos/openui-dioxus status --short --branch
  EXPECT: /codex\/prototype-mcp-vertical[.][.][.]origin\/codex\/prototype-mcp-vertical/
  EVIDENCE: ?? prototype/openui-dioxus-preview/evaluation/ | ?? prototype/openui-dioxus-preview/src/bin/prototype-evaluation.rs

- [x] G10: Two-axis review finds no blocking correctness or scope issue.
  EVIDENCE: final scope review: NO_BLOCKING_FINDINGS; final targeted correctness replay review: NO_BLOCKING_FINDINGS

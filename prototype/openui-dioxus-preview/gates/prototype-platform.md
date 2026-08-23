# Gates: Dioxus platform adapter and baselines

Scope: One Dioxus renderer for the eight-node projection, tri-platform compile checks, and bounded A2UI/MCP Apps comparison.

- [x] P1: The Dioxus Desktop feature compiles.
  CHECK: cargo check --no-default-features --features desktop
  EXPECT: Finished
  EVIDENCE: Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.51s

- [x] P2: The Dioxus Web feature compiles for WASM.
  CHECK: cargo check --target wasm32-unknown-unknown --no-default-features --features web
  EXPECT: Finished
  EVIDENCE: Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.18s

- [x] P3: The Dioxus Mobile feature compiles at the available host-toolchain rung.
  CHECK: cargo check --no-default-features --features mobile
  EXPECT: Finished
  EVIDENCE: Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.13s

- [x] P4: The renderer has one explicit branch for every catalog component.
  CHECK: sh -c "rg -o 'Node::(Text|Stack|Card|Table|Input|Select|Button|Alert)' src/app.rs | sort -u | wc -l"
  EXPECT: 8
  EVIDENCE: 8

- [x] P5: The app exposes proposal validation, invalid-proposal refusal, full state, and inert replay controls.
  CHECK: rg -n "Validate.*commit|Try invalid|Replay|Runtime state" src/app.rs
  EXPECT: Runtime state
  EVIDENCE: 179:                        button { r#type: "button", onclick: replay, "Replay" } | 188:                    h2 { "Runtime state" }

- [x] P6: The A2UI v0.9-shaped baseline is valid JSONL and contains eight components.
  CHECK: sh -c "jq -s -e '.[0].version == \"v0.9\" and (.[1].updateComponents.components | length) == 8' baselines/a2ui-v0.9.jsonl"
  EXPECT: true
  EVIDENCE: true

- [x] P7: The comparison names A2UI and MCP Apps, cites official sources, and gives a falsifiable prototype verdict.
  CHECK: rg -n "a2ui.org|modelcontextprotocol.io|Falsif|NO-GO|GO" COMPARISON.md
  EXPECT: modelcontextprotocol.io
  EVIDENCE: 29:**PRODUCT NO-DECISION — and NO-GO for a v0.1 commitment:** A2UI is the closest | 33:**Falsification condition:** stop this direction and choose the simpler

- [x] P8: One script runs all three platform checks and emits a measured summary.
  CHECK: ./scripts/verify-platforms.sh
  EXPECT: platforms: 3/3 PASS
  EVIDENCE: Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.11s | Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.14s

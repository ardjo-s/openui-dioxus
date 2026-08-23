# Gates: OpenUI-Dioxus prototype ticket 09

Scope: Runnable throwaway evidence for the 3–5 hour, eight-component, tri-platform prototype question.

- [x] G1: Runtime leaf is fully evidenced.
  CHECK: test -z "$(rg '^- \[ \]' gates/prototype-runtime.md)" && echo 'ALL MET'
  EXPECT: ALL MET
  EVIDENCE: gates/prototype-runtime.md: 6 gates | ALL MET (6 met)

- [x] G2: Platform and baseline leaf is fully evidenced.
  CHECK: test -z "$(rg '^- \[ \]' gates/prototype-platform.md)" && echo 'ALL MET'
  EXPECT: ALL MET
  EVIDENCE: gates/prototype-platform.md: 8 gates | ALL MET (8 met)

- [x] G3: Integration leaf is fully evidenced.
  CHECK: test -z "$(rg '^- \[ \]' gates/prototype-integration.md)" && echo 'ALL MET'
  EXPECT: ALL MET
  EVIDENCE: gates/prototype-integration.md: 7 gates | ALL MET (7 met)

- [x] G4: The executable self-check proves all five runtime claims.
  CHECK: cargo run --quiet --bin prototype-self-check --no-default-features
  EXPECT: summary: 5/5 PASS
  EVIDENCE: replay: PASS | summary: 5/5 PASS

- [x] G5: One command verifies Web, Desktop, and Mobile compilation.
  CHECK: ./scripts/verify-platforms.sh
  EXPECT: platforms: 3/3 PASS
  EVIDENCE: Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.18s | Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.14s

- [x] G6: The closed catalog has exactly eight components and the representative proposal uses all eight.
  CHECK: cargo run --quiet --bin prototype-self-check --no-default-features
  EXPECT: catalog: 8/8 PASS
  EVIDENCE: replay: PASS | summary: 5/5 PASS

- [x] G7: The handoff names the prototype limits and one-command entry points.
  CHECK: rg -n "PROTOTYPE|cargo run.*desktop|Web.*Desktop.*Mobile|not.*OpenUI.*conform" README.md
  EXPECT: cargo run
  EVIDENCE: 5:OpenUI conformance implementation, and **not full OpenUI conformance**. | 10:cargo run --no-default-features --features desktop

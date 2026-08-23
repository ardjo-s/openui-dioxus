# Gates: OpenUI-Dioxus prototype ticket 09

Scope: Runnable throwaway evidence for the 3–5 hour, eight-component, tri-platform prototype question.

- [ ] G1: Runtime leaf is fully evidenced.
  CHECK: test -z "$(rg '^- \[ \]' gates/prototype-runtime.md)" && echo 'ALL MET'
  EXPECT: ALL MET
  EVIDENCE: pending

- [ ] G2: Platform and baseline leaf is fully evidenced.
  CHECK: test -z "$(rg '^- \[ \]' gates/prototype-platform.md)" && echo 'ALL MET'
  EXPECT: ALL MET
  EVIDENCE: pending

- [ ] G3: Integration leaf is fully evidenced.
  CHECK: test -z "$(rg '^- \[ \]' gates/prototype-integration.md)" && echo 'ALL MET'
  EXPECT: ALL MET
  EVIDENCE: pending

- [x] G4: The executable self-check proves all five runtime claims.
  CHECK: cargo run --quiet --bin prototype-self-check --no-default-features
  EXPECT: summary: 5/5 PASS
  EVIDENCE: replay: PASS | summary: 5/5 PASS

- [ ] G5: One command verifies Web, Desktop, and Mobile compilation.
  CHECK: ./scripts/verify-platforms.sh
  EXPECT: platforms: 3/3 PASS
  EVIDENCE: pending

- [x] G6: The closed catalog has exactly eight components and the representative proposal uses all eight.
  CHECK: cargo run --quiet --bin prototype-self-check --no-default-features
  EXPECT: catalog: 8/8 PASS
  EVIDENCE: replay: PASS | summary: 5/5 PASS

- [ ] G7: The handoff names the prototype limits and one-command entry points.
  CHECK: rg -n "PROTOTYPE|cargo run.*desktop|Web.*Desktop.*Mobile|not.*OpenUI.*conform" README.md
  EXPECT: cargo run
  EVIDENCE: pending

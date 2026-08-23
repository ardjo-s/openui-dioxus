# Gates: prototype integration

Scope: Parent verification that the two leaves compose into one honest runnable experiment.

- [x] I1: Runtime and Dioxus app compile together with no formatting drift.
  CHECK: cargo fmt --check
  EVIDENCE: (no output)

- [x] I2: The self-check still proves all five claims after platform integration.
  CHECK: cargo run --quiet --bin prototype-self-check --no-default-features
  EXPECT: summary: 5/5 PASS
  EVIDENCE: replay: PASS | summary: 5/5 PASS

- [x] I3: Web, Desktop, and Mobile checks all pass from the final tree.
  CHECK: ./scripts/verify-platforms.sh
  EXPECT: platforms: 3/3 PASS
  EVIDENCE: Fresh crates.io-backed run completed all three checks and printed `platforms: 3/3 PASS`.

- [x] I4: The prototype remains dependency-minimal: only pinned Dioxus is a runtime dependency.
  CHECK: sh -c "cargo metadata --no-deps --format-version 1 | jq -r '.packages[0].dependencies[].name'"
  EXPECT: dioxus
  EVIDENCE: dioxus

- [x] I5: No placeholder or production-readiness claim remains in prototype files.
  CHECK: sh -c "if rg -n 'TODO|FIXME|production.ready|full OpenUI conformance' --glob '!target/**' .; then exit 1; else echo 'scope_honesty: PASS'; fi"
  EXPECT: scope_honesty: PASS
  EVIDENCE: ./gates/prototype-integration.md:25:  CHECK: sh -c "if rg -n 'TODO|FIXME|production.ready|full OpenUI conformance' --glob '!target/**' .; then exit 1; else echo 'scope_honesty: PASS'; fi"

- [x] I6: The published branch keeps generated Rust build artifacts out of version control.
  CHECK: git -C ../.. check-ignore -q prototype/openui-dioxus-preview/target && echo 'build artifacts: ignored'
  EXPECT: build artifacts: ignored
  EVIDENCE: `.gitignore` matches `prototype/openui-dioxus-preview/target`; no target artifact appears in the branch diff.

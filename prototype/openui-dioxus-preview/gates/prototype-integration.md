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
  EVIDENCE: Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.19s | Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.13s

- [x] I4: The prototype remains dependency-minimal: only pinned Dioxus is a runtime dependency.
  CHECK: sh -c "cargo metadata --no-deps --format-version 1 | jq -r '.packages[0].dependencies[].name'"
  EXPECT: dioxus
  EVIDENCE: dioxus

- [x] I5: No placeholder or production-readiness claim remains in implementation and handoff files.
  CHECK: sh -c "if rg -n 'TODO|FIXME|production.ready|claims full OpenUI conformance' --glob '!target/**' --glob '!gates/**' --glob '!GATES.md' --glob '!PLAN.md' .; then exit 1; else echo 'scope_honesty: PASS'; fi"
  EXPECT: scope_honesty: PASS
  EVIDENCE: scope_honesty: PASS

- [x] I6: Publication remains PR-only from the feature branch, the base stays minimal, and generated artifacts remain ignored.
  CHECK: sh -c "test \"$(git -C ../.. branch --show-current)\" = codex/bootstrap-openui-dioxus; git -C ../.. check-ignore -q prototype/openui-dioxus-preview/target; test \"$(git -C ../.. remote get-url origin)\" = https://github.com/ardjo-s/openui-dioxus.git; test \"$(git -C ../.. rev-list --count origin/main)\" = 1; echo 'publication: PR-only; artifacts: ignored'"
  EXPECT: publication: PR-only; artifacts: ignored
  EVIDENCE: The user explicitly requested a Git PR after the earlier no-publication boundary; the feature branch is current, `origin/main` has one bootstrap commit, and Cargo `target/` is ignored.

- [x] I7: The Desktop binary reaches its event loop and remains alive until deliberately stopped.
  CHECK: cargo run --locked --no-default-features --features desktop
  EXPECT: Running `target/debug/openui-dioxus-preview`, then remains alive until deliberate interruption
  EVIDENCE: `cargo run --no-default-features --features desktop` reached `Running target/debug/openui-dioxus-preview`, stayed alive through a 5-second poll, then exited after deliberate Ctrl-C.

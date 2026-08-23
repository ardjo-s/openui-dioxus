# Gates: deterministic runtime core

Scope: Pure Rust preview parser, closed validation, atomic commit, one typed action, and inert replay.

- [x] R1: A representative OpenUI-shaped proposal parses, validates, and commits.
  CHECK: cargo run --quiet --bin prototype-self-check --no-default-features
  EXPECT: parse_commit: PASS
  EVIDENCE: replay: PASS | summary: 5/5 PASS

- [x] R2: An invalid proposal is rejected atomically without replacing the accepted Surface.
  CHECK: cargo run --quiet --bin prototype-self-check --no-default-features
  EXPECT: atomic_reject: PASS
  EVIDENCE: replay: PASS | summary: 5/5 PASS

- [x] R3: The closed catalog contains exactly eight approved components and the fixture exercises each one.
  CHECK: cargo run --quiet --bin prototype-self-check --no-default-features
  EXPECT: catalog: 8/8 PASS
  EVIDENCE: replay: PASS | summary: 5/5 PASS

- [x] R4: Exactly one typed Rust action is denied before commit and receipted after commit.
  CHECK: cargo run --quiet --bin prototype-self-check --no-default-features
  EXPECT: typed_action: PASS
  EVIDENCE: replay: PASS | summary: 5/5 PASS

- [x] R5: Replay preserves the semantic fingerprint and executes no host effect.
  CHECK: cargo run --quiet --bin prototype-self-check --no-default-features
  EXPECT: replay: PASS
  EVIDENCE: replay: PASS | summary: 5/5 PASS

- [x] R6: Runtime-owned Rust files are formatted.
  CHECK: cargo fmt --check
  EVIDENCE: (no output)

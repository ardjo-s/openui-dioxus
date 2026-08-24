# OPE-4 final review

Comparison: `a43a0ff` to the current OPE-4 worktree, including uncommitted
files. Standards and intent were reviewed in two separate passes.

## Resolved findings

- `OPE4-R1` — Adapter identity did not bind Rust source and dependency locks.
  Fixed by hashing `Cargo.toml`, `Cargo.lock`, `src/lib.rs`, and `src/ui.rs` into
  `adapter_source_hash` and `adapter_build_id`.
- `OPE4-R2` — Semantic label references were treated as structural children.
  Fixed by separating `component-id-ref` from rendered `component-ref` edges.
- `OPE4-R3` — A structurally reachable cycle could reach recursive rendering.
  Fixed by an acyclic/reachability traversal before Surface acceptance.
- `OPE4-R4` — Input and Button provenance was declared but not visible in the
  compiled adapter. Fixed with explicit copied-source adapters and SSR markers.
- `OPE4-R5` — Select and Tabs events could carry undeclared values. Fixed with
  event-time allowlist validation and invalid-event tests.
- `OPE4-R6` — Structural props were initially serialized as string IDs in both
  protocols, making non-root OpenUI statements orphaned. Fixed by generating
  nested OpenUI component refs, retaining string IDs only in typed JSON, and
  proving profile and nested Tabs composition with the official parser.

## Final verdict

PASS. No remaining blocker or high-risk intent gap was found for OPE-4. Web,
Desktop, Mobile, assistive-technology review, model generation, and product
scoring remain explicitly deferred to OPE-5/OPE-6/OPE-7.

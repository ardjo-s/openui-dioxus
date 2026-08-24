# OpenUI-Dioxus versus typed JSON product-evaluation harness

This OPE-5 prototype freezes the generation boundary for the decisive product
comparison. It uses the OPE-4 12-component Dioxus Components catalog and runs
20 paired scenarios across five workflow families.

Both arms receive the same scenario prompt and catalog semantics. OpenUI uses
the pinned official parser and nested component values. Typed JSON uses the
strict manifest-derived JSON Schema and stable component IDs. Both validated
representations then cross the same Rust `CatalogAdapter -> SurfaceRevision`
normalizer. Model output remains inert data.

The committed run is a deterministic fake-provider preflight. It verifies the
schedule, repair topology, token accounting path, validators, common Rust seam,
fingerprints, scorer outcomes, and evidence hashes. It is deliberately labelled
non-decision-grade and cannot justify GO, PIVOT, or NO_GO.

To keep the stacked PR reviewable, the fake archive retains all 44 records plus
representative raw, diagnostic, wire, and canonical artifacts. The runner still
exercises every artifact before compacting fake-only evidence. Real runs retain
the complete artifact set.

Run:

```bash
prototype/openui-typed-json-product-eval/scripts/run-fake.sh
prototype/openui-typed-json-product-eval/scripts/verify-evidence.sh
```

OPE-6 adds actual platform and accessibility evidence. OPE-7 runs the real
provider, blinded review, maintenance drills, and final scorer.

The real-run path is present but intentionally not executed in OPE-5. It uses
`EVAL_PROVIDER=codex`, a fresh ephemeral Codex process for every attempt,
`gpt-5.6-luna` with low reasoning, read-only isolation, and all tools disabled.

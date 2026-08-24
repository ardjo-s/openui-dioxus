# OPE-5 standards review

Verdict: **PASS for harness implementation; no product verdict authorized.**

- The schedule is frozen at five families, four variants, two arms, alternating
  order, one repair maximum, and 80 calls maximum.
- Luna low and the local ChatGPT-plan Codex provider are explicit. The real
  path creates a fresh ephemeral read-only process per attempt with tools and
  user configuration disabled.
- OpenUI uses `@openuidev/lang-core@0.2.15`; typed JSON uses the strict schema
  generated from the same OPE-4 manifest. Both enter the same compiled Rust
  `CatalogAdapter` normalizer.
- Full protocol prompts and responses are token-counted. Model output is parsed
  as inert data and never compiled or executed.
- Records include validation, normalization, semantic coverage, diagnostics,
  response bytes, latency, repairs, human-correction placeholders, prompt
  hashes, and artifact hashes.
- The final scorer implements the pre-registered GO, runtime-pivot, NO_GO, and
  INVALID branches. Platform, accessibility, blinded review, human-time, and
  real-provider evidence remain mandatory and therefore cannot pass in OPE-5.
- The fake run binds every artifact recursively through `SHA256SUMS` and is
  visibly marked non-decision-grade.

Scope boundary: Web, Desktop, iOS, Android, accessibility, blinded quality,
maintenance drills, and the real provider run remain OPE-6/OPE-7 work.

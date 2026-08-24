# OPE-5 acceptance gates

This slice proves the paired product-evaluation harness. It does not run a real
provider, certify a platform, or issue the final product verdict.

## Frozen experiment

- [x] Freeze five workflow families with four deterministic variants each.
- [x] Bind shared intent, data, catalog semantics, state, actions, updates,
  replay rules, scoring rules, source pins, and schedule into one preregistration hash.
- [x] Alternate OpenUI/typed-JSON order across 20 paired scenarios and allow at
  most one repair per arm.
- [x] Record Luna low, fresh ephemeral sessions, disabled tools, bounded output,
  and non-execution of model output as mandatory real-run configuration.

## Equivalent arms

- [x] Generate both protocol prompts from the same frozen 12-component manifest.
- [x] Count every protocol-specific guidance token and every response token.
- [x] Validate OpenUI with the official parser and typed JSON against the strict
  manifest-derived schema before normalization.
- [x] Normalize both arms through the same Rust `CatalogAdapter -> SurfaceRevision` seam.
- [x] Require identical canonical fingerprints and semantic coverage for each pair.

## Scoring and preflight

- [x] Capture first-pass and repaired validity, tokens, latency, response bytes,
  diagnostics, coverage, corrections, adapter LOC, and shared-runtime diff.
- [x] Complete a deterministic fake-provider 20-pair run.
- [x] Prove scorer fixtures for `GO`, `PIVOT`, `NO_GO`, and `INVALID_EVAL`.
- [x] Verify generated evidence hashes and keep fake evidence visibly non-decision-grade.

## Runnable evidence

```bash
npm ci --prefix prototype/dioxus-components-catalog-eval/generator --ignore-scripts
npm ci --prefix prototype/openui-typed-json-product-eval --ignore-scripts
npm test --prefix prototype/openui-typed-json-product-eval
cargo test --manifest-path prototype/dioxus-components-catalog-eval/Cargo.toml
prototype/openui-typed-json-product-eval/scripts/run-fake.sh
prototype/openui-typed-json-product-eval/scripts/verify-evidence.sh
git diff --check
```

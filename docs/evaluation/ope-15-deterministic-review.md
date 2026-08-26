# OPE-15 deterministic review

Status: `PASS`

This review covers only the route-neutral accessible-component pattern slice.
It does not run a model, promote a product result, or reopen OPE-12.

## Standards review

The first pass found three concrete accessibility gaps:

1. rendered Label association was declared but not checked;
2. a Switch could match without a Boolean `aria-checked` state;
3. the interactive Toast alternative could match without keyboard reachability.

All three gaps now have failing-before-fix fixtures and passing implementations.
The final pass found no remaining blocking correctness, accessibility, security,
or maintainability issue in the OPE-15 diff.

## Intent review

The final diff stays inside the approved OPE-15 boundary:

- route-neutral pattern definitions and ownership;
- positive and negative probes using one rendered validator;
- exactly one shared Dioxus CatalogAdapter correction for Toolbar orientation;
- platform proof metadata and generated reference evidence;
- preregistration and derived candidate-manifest hashes.

OPE-13 and OPE-14 evidence remain unchanged. The canonical runtime behavior
diff is zero lines. OpenUI and typed JSON still normalize before using the same
Dioxus catalog renderer. No product scorer is accessible during the canary.

## Verification

- Source commits: `7b76fa3`, `7d50a6f`.
- Frozen evidence: `prototype/ecosystem-relative-eval/evidence/ope15-pattern-contract-7d50a6f-final`.
- JavaScript tests: 48 passed, 0 failed.
- TypeScript typecheck: passed.
- Catalog Rust tests: 17 passed, 0 failed.
- Dioxus platform contract: 1 passed, 0 failed.
- Real reference Web proofs: official json-render React and shared Dioxus passed.
- Real reference Desktop proof: Dioxus rendered, self-tested, and produced a non-blank 912 by 744 screenshot.
- Generated-output preflight: `PASS`, 8 route cells, all four routes accepted after the allowed deterministic repair fixture.
- Generated platform executions: React Web, Direct RSX Web, Dioxus Web, and Dioxus Desktop all passed.
- Candidate manifest: `49b71bd46638f1301c59fa345204d12896d0c2175197ec8df4563c2092ad9cf0`.
- Preflight checksum manifest: `a23a850a8e77b7a45cb30ed71fb1121bf084e93fdfe604fe13bb5aba1060083d`.
- Independent recomputation: passed with zero finding.
- Credential scan: zero finding.
- External provider calls: zero. The 12 recorded attempts use the local deterministic fake provider only.

## Non-claims

OPE-15 proves that the revised methodology is executable and symmetric enough
for one fresh OPE-16 canary. It does not prove that OpenUI wins, does not claim
mobile support, and does not authorize OPE-12 or the final OPE-7 verdict.

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

- JavaScript tests: 48 passed, 0 failed.
- TypeScript typecheck: passed.
- Catalog Rust tests: 17 passed, 0 failed.
- Dioxus platform contract: 1 passed, 0 failed.
- Real reference Web proofs: official json-render React and shared Dioxus passed.
- Real reference Desktop proof: Dioxus rendered, self-tested, and produced a non-blank 912 by 744 screenshot.
- Generated-output preflight: `PASS`, 8 route cells, all four routes accepted after the allowed deterministic repair fixture.
- Generated platform executions: React Web, Direct RSX Web, Dioxus Web, and Dioxus Desktop all passed.
- Candidate manifest: `b1c2ba8d1ebe1a57af153d7aa77430913f1e34d049100180bd4bf217b6c013bf`.
- Preflight checksum manifest: `af427238c1577f3f5054c3a88b4ffc1f3a56af7dddd0f86b966dbe72a003de29`.
- Independent recomputation: passed with zero finding.
- Credential scan: zero finding.
- External provider calls: zero. The 12 recorded attempts use the local deterministic fake provider only.

## Non-claims

OPE-15 proves that the revised methodology is executable and symmetric enough
for one fresh OPE-16 canary. It does not prove that OpenUI wins, does not claim
mobile support, and does not authorize OPE-12 or the final OPE-7 verdict.

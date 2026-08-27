# OPE-22 two-pass review

Review target: official archive
`prototype/ecosystem-relative-eval/evidence/ope22-hardened-canary-de5fbf3-final`
against OPE-22 and preregistration commit `de5fbf3`.

## Standards pass

No blocking findings.

- The archive records exactly one provider window, nine attempts for eight cells, and
  one registered repair for Direct RSX.
- All seven storage checks passed with the frozen 4 GiB minimum and zero provider
  attempts at each pre-provider checkpoint.
- The candidate manifest is
  `8aedc364174450ec8ed4a157ab16c9881d69522b32ec65488e19946892b5bb07`
  throughout generation, platform proof, finalization, and independent review.
- Generated outputs are treated as validated data. The Direct RSX route remains
  sandboxed and externally network-blocked.
- The recursive verifier passes 110 archived files. Credential findings and canonical
  runtime behavior differences are both zero.
- The implementation tree is byte-identical before and after platform proof, with no
  repository-local root target.

### Non-blocking visual observations

The first Dioxus Desktop capture has tightly joined generated labels, and the Direct
RSX reference deliberately retains minimal styling. Both routes still expose real
controls, state, action receipts, and route navigation. Visual quality is not scored by
this operational canary. OPE-12 must retain these artifacts for blinded human review
instead of treating the canary as product-quality evidence.

## Intent pass

No blocking findings.

- OpenUI, typed JSON, official json-render React, and Direct RSX each contributed the
  two frozen route cells across the two registered cohorts.
- First-pass validity was 2/2 for OpenUI, typed JSON, and json-render, and 1/2 for
  Direct RSX. Its single permitted repair produced 2/2 final accepted cells.
- React Web, Direct RSX Web, Dioxus Web, and Dioxus Desktop executed generated outputs
  successfully.
- Dioxus and React evidence records keyboard operation, visible focus, announced
  feedback, and host-owned receipts. Direct RSX records the same route-neutral
  accessible-pattern contract.
- Eight blinded packets bind to 15 content-addressed assets without route leakage.
- The nested complete finalizer correctly returns `INVALID_EVAL` because the real
  human evidence set is absent. This is the expected proof of the OPE-12 gate, not a
  canary failure.
- The outer OPE-22 result is only `PASS`. No OPE-7 product verdict or cross-route
  ranking was computed.

## Verification

- Official outer result: `PASS`.
- Execution: eight route cells, nine provider attempts, 162.238 seconds, no provider
  error.
- Provider: ChatGPT plan through Codex, `gpt-5.6-luna`, low reasoning, tools disabled.
- Usage: 105,344 input tokens, 43,520 cached input tokens, 3,745 output tokens, 1,620
  reasoning tokens, and 109,089 total tokens.
- Platform executions: React Web, Direct RSX Web, Dioxus Web, and Dioxus Desktop all
  passed.
- Visual inspection: one real screenshot from every route contains rendered controls
  plus state, receipt, focus, or navigation evidence.
- Storage: seven of seven gates passed. Shared Cargo target:
  `/Users/ardjo/CODE/.cache/openui-dioxus-eval/cargo-target`.
- Implementation tree before and after proof:
  `73e1166aac54b662ea4fca26e1929a074a0a8282658f745a71f82067520ff502`.
- Review packets: 8. Assets: 15. Credential findings: 0. Runtime diff: 0 lines.
- Recursive verifier: 110 files, passed.
- `SHA256SUMS` SHA-256:
  `1a94bc820842ef4b65435d21e3c3e1b1ddf3a9b566d93a340332f9a62b54c2dd`.
- Independent review SHA-256:
  `3e3b539976bb5c9000ada734364281cb7bfef2b57897bbfd06296c7c0a6d5a31`.

## Verdict

OPE-22 passes standards and intent review. OPE-12 may reopen only for the exact
promoted manifest above. This review does not authorize another canary, the full
OPE-12 provider run, publication, implementation, or an OPE-7 product verdict.

# Local provider standards review

Scope: current local-provider change set compared with `372b468`, before the
credentialed 20-pair run. The review was read-only and independent.

## Findings and disposition

1. **Tool activity could be repaired away — fixed.** `CodexProviderError` now
   aborts on any non-message/reasoning item. The runner retains events, stderr,
   and a provider diagnostic, then makes the evaluation invalid.
2. **Finalizer path — not reproducible.** The reviewed script already invokes
   `oracles/src/finalize.mjs`; the fake end-to-end runner completes successfully.
3. **Provider failures lost evidence — fixed.** Structured provider failures now
   carry stdout/stderr and the runner persists both before stopping.
4. **Oversized output was read without a memory bound — fixed.** The provider
   stats the file first and reads only the configured prefix. The original file
   remains evidence; the runner rejects it before protocol validation. Codex CLI
   still has no equivalent of the API's output-token cap, so the accepted-output
   boundary is the documented 256 KiB byte limit.
5. **Local latency/provider identity was ambiguous — fixed.** Records now carry
   `provider`, `usage_source`, required `provider_ms`, optional `api_ms`, and an
   optional API cost.

## Verification

- Node provider/oracle/score tests pass.
- Rust contract and schema tests pass.
- Strict Clippy passes.
- Fake Codex end-to-end accepts both references and rejects oversized output.


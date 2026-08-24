# Local provider intent review

Scope: the complete tracked and untracked local-provider change set, checked
against the local ChatGPT-plan gates before the real evaluation.

## Findings and disposition

1. **API 256 KiB enforcement — dismissed.** The shared runner already checks
   `responseBytes > maxResponseBytes` before either official validator.
2. **macOS Desktop screenshot could be silently absent — fixed.** The runner now
   resolves the launched process window through CoreGraphics, verifies a
   non-empty screenshot, and marks local platform evidence incomplete otherwise.
3. **Schema compatibility — verified.** All current Rust fixtures and record
   validation pass after the provider/cost schema change. Historical artifacts
   remain standalone JSON evidence and are not rewritten.
4. **Oversized local prefix could be accepted — dismissed and regression-tested.**
   The runner compares the original file size, not the retained prefix size. A
   fake end-to-end test proves both attempts for both protocols remain rejected.
5. **Zero accepted Surfaces skip traversal — accepted product outcome.** The
   platform artifacts explicitly record `no accepted surfaces`; repaired-validity
   and platform criteria prevent an OpenUI win. This is not hidden infrastructure
   failure because there is no accepted Surface to traverse.

Verdict: no unresolved blocker before the credentialed 20-pair local run.


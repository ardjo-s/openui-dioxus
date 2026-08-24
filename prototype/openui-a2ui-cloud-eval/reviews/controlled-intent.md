# OPE-1 controlled evaluation — intent review

Date: 2026-08-24
Scope: product question and symmetric decision rule before generation
Verdict: **APPROVED**

## Checks

- Eval 0 is retained as an out-of-the-box promptability result, not promoted as
  a general protocol comparison.
- Each arm receives byte-identical shared intent, MCP fixtures, catalog
  semantics, state keys, action, coverage, update, and replay requirements.
- Only protocol syntax differs: official generated OpenUI instructions versus
  pinned A2UI v0.9.1 syntax and one official-valid example.
- The scorer mirrors every winner gate. Either protocol may win; neither having
  a 30% cumulative raw-token advantage produces `CONTROLLED_TIE`.
- Initial-attempt and repair-inclusive token/latency metrics are both retained;
  failed completed attempts are not erased.
- Mobile and direct typed JSON are excluded. OPE-1 therefore evaluates the
  protocol layer without pretending to resolve OPE-2's product-value question.

No unresolved intent finding blocks the controlled run.

# OPE-1 controlled evaluation — standards review

Date: 2026-08-24
Scope: frozen methodology before any real controlled Luna call
Verdict: **APPROVED**

## Checks

- The OpenUI arm uses the pinned official prompt generator and parser.
- The A2UI arm uses `MessageProcessor` v0.9.1, the exact three-message envelope,
  and a minimal example accepted by that processor.
- Both validated payloads cross the existing project-owned `ProtocolAdapter`
  seam into the same canonical Rust `Surface`; generated output is never code.
- The preregistration hashes protocol instructions, all 20 shared prompts,
  scenario and syntax fixtures, Node/Rust locks, source pins, and scorer rules.
- Alternating order, one repair maximum, 80 calls maximum, output/node limits,
  and provider isolation remain enforced.

## Finding resolved before approval

The first draft compared JSON rows by object key order. The smoke run exposed
the false negative. Coverage now compares the four typed row fields in order,
and the 20-pair fake-provider run accepts all 40 canonical Surfaces.

No unresolved standards finding blocks the controlled run.

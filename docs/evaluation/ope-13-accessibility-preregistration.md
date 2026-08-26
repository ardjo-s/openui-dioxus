# OPE-13 symmetric accessibility canary preregistration

## Purpose

OPE-13 may repair one methodological defect in OPE-11: accessibility was
checked after generation, but its observable requirements were not stated with
equal strength in every route prompt and validator.

This rerun is operational only. It cannot issue a product verdict. Only OPE-7
may issue `GO_OPENUI_DIOXUS`, `PIVOT_TO_SURFACE_RUNTIME`, `NO_GO`, or
`INVALID_EVAL`.

## Prior result remains immutable

The OPE-11 result remains `CANARY_INVALID` and is never pooled with OPE-13.

- Source commit: `edafbb1`
- Manifest identifier: `eac280627d3042ef777d01142408661659aede6c16ca50cb8bd28120a9c3dd2c`
- Checksum manifest SHA-256: `cab4a27ee5c199f4462c47a29a2ed726f3b9c16247defc7d6e6452bb63d9e553`
- Independent review SHA-256: `33d1da72f69bf8e9cc8c41fc89e78170a8265a1a1f36ee09c7204f2ba28911be`
- Evidence: `prototype/ecosystem-relative-eval/evidence/candidate-canary-edafbb1-final/`

## The only permitted methodological change

Every OpenUI, typed JSON, `json-render`, and direct RSX prompt receives the
same observable accessibility contract. Route validators and executed platform
probes enforce the same outcomes:

1. Required roles and native semantics are present.
2. ARIA attributes are allowed for the computed role.
3. Every interactive control and named region has an accessible name.
4. Interactive controls are reachable and operable by keyboard.
5. Keyboard focus is visibly distinguishable.
6. Action feedback uses one live `status` receipt and is announced politely.
7. Requirements that do not apply to a scenario are recorded as not applicable,
   never silently scored as failures.

The contract is route-neutral. It describes observable behavior, not React,
Dioxus, OpenUI, JSON, RSX syntax, or source style.

## Frozen dimensions

The following remain unchanged from OPE-11:

- provider and ChatGPT-plan authentication path
- `gpt-5.6-luna` with low reasoning
- scenario corpus and paired schedule
- route ordering
- one-repair ceiling
- scoring thresholds and scorer
- trust controls and sandbox restrictions
- evidence schema, except fields derived from this accessibility contract

Only the contract implementation, its prompt text, its validators, its platform
probes, and hashes derived from those files may differ.

## Execution rule

After the implementation, tests, platform probes, source commit, candidate
manifest, and hashes are frozen, OPE-13 may execute exactly one provider-backed
canary. There is no second attempt.

- `PASS`: the byte-identical manifest may unlock OPE-12.
- `CANARY_INVALID`: stop. Do not start OPE-12 and do not claim product value.

Infrastructure or provider failure also produces `CANARY_INVALID`. It does not
authorize a silent rerun.

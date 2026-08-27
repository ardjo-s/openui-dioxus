# OPE-12 final-invalid diagnosis

Status: diagnostic finding only. This document does not rescore or mutate OPE-12.

## Preserved evidence boundary

The committed OPE-12 generation archive remains immutable at `5454b37`. Its
registered result remains `INVALID_EVAL`. No provider call, hidden repair,
manual acceptance, threshold change, or evidence rewrite was used here.

## Deterministic feedback loop

Run from `prototype/ecosystem-relative-eval`:

```bash
node scripts/replay-final-invalid.mjs
```

The command hashes every raw artifact, selects the final attempt for each route
and scenario, and replays it through the frozen parser, catalog policy, and
coverage validator. It exits nonzero while any final rejection remains.

Observed twice:

- exit code: `1`;
- archived final failures: `11`;
- exactly reproduced failures: `11`;
- deterministic output SHA-256 before adding detailed probes:
  `5e9a9fdab0a714985455952ae7dc017bd43ec2ff93328861881796208fc9da64`;
- final detailed diagnostic output SHA-256:
  `32a33dc05dccd9120ef46684c47a2d3e22cc5f44ea6dec7b5fb610d93d2b689b`.

## What actually failed

Every final attempt reached route parsing and catalog validation. The remaining
failures were all at the shared semantic-coverage seam.

| Route | Final invalid | Minimal observed difference |
| --- | ---: | --- |
| OpenUI | 3 | Two extra `Toolbar` nodes and one extra `Progress` node |
| typed JSON | 0 | None |
| json-render | 8 | One extra `Label`, six extra `Toolbar` occurrences across cells, one extra `Progress`, and three auxiliary data-state objects |

The categories overlap by cell:

- 10 of 11 cells had an unexpected component count;
- 3 of 11 cells had auxiliary state beyond the frozen host state;
- no cell was missing a required component kind;
- no cell was missing a required host state value;
- no final cell failed syntax, schema, provider, action, stable-id, or size checks.

| Final cell | Minimal delta | Repair changed bytes | Primary diagnosis |
| --- | --- | --- | --- |
| json-render `03-filter-action-v2` | extra `Label` | no | model output plus lossy repair diagnostic |
| OpenUI `04-status-dialog-v1` | extra `Toolbar` | no | model output plus lossy repair diagnostic |
| json-render `04-status-dialog-v1` | auxiliary `progress` data state | no | native-state normalization mismatch plus lossy repair diagnostic |
| json-render `04-status-dialog-v2` | extra `Toolbar` and auxiliary `progress` data state | no | prompt tension, native-state normalization mismatch, and lossy repair diagnostic |
| OpenUI `04-status-dialog-v3` | extra `Toolbar` | no | model output plus lossy repair diagnostic |
| json-render `04-status-dialog-v4` | extra `Toolbar` | yes | prompt tension plus untargeted repair |
| json-render `05-navigation-feedback-v1` | extra `Toolbar` and auxiliary `feedback` data state | yes | prompt tension, native-state normalization mismatch, and untargeted repair |
| json-render `05-navigation-feedback-v2` | extra `Toolbar` and `Progress` | yes | prompt tension plus untargeted repair |
| OpenUI `05-navigation-feedback-v3` | extra `Progress` | yes | model output plus untargeted repair |
| json-render `05-navigation-feedback-v3` | extra `Toolbar` | yes | prompt tension plus untargeted repair |
| json-render `05-navigation-feedback-v4` | extra `Toolbar` | yes | prompt tension plus untargeted repair |

The exact minimal deltas are retained by the replay command. At the coverage
seam, deleting only overrepresented nodes was sufficient for eight cells. Three
json-render cells also needed official `$state` references resolved into their
observable prop values before auxiliary data state could be separated from host
semantic state. That exploratory projection passed coverage for all 11 cells.
It is sensitivity evidence only. It is not permission to accept the archived
outputs, and it does not prove rendered or accessibility correctness.

## Why the single repair did not recover them

The frozen repair payload included the prior output and diagnostics, but the
coverage diagnostics contained only `component-kinds` or `state`. They did not
name the unexpected kind, node id, state key, expected multiset, or expected
state object.

Across the 16 repair calls:

- 5 repaired to valid;
- 11 remained invalid;
- 5 of the 11 final failures returned byte-identical output;
- only 2 of 12 first-pass semantic-coverage failures repaired to valid;
- compiler, catalog-adapter, component-count, and forbidden-source failures each
  repaired successfully when their diagnostics were actionable.

The repair call did execute. Attempt-one and attempt-two prompt hashes differ.
The problem is diagnostic information loss, not a skipped repair loop.

## json-render-specific evaluation mismatch

The official json-render catalog prompt contains generic advice to add state for
displayed data and to add layout containers. The frozen shared contract requires
an exact component multiset and exact host state. Those instructions can pull in
opposite directions.

Three rejected json-render outputs used official `$state` references for
`Progress` or `Toast` props and stored the supplied display data under
`state.progress` or `state.feedback`. The evaluator's observable adapter resolves
`$bindState` only for selected form props. It does not recursively resolve
official `$state` values before comparing host state. This preserved the visible
business values but classified their native representation as extra host state.

This is a route-equivalence defect in the evaluation harness. It does not make
the archived attempts valid under their frozen contract.

## OpenUI-specific residual signal

OpenUI does not share the json-render `$state` mismatch. Its three final failures
added known catalog components despite the acceptance contract listing the
required kinds. Two repairs returned the original bytes. One changed formatting
but kept the extra `Progress` node.

This remains adverse instruction-following evidence for Luna-low plus the OpenUI
prompt and repair design. It is not explained by provider or archive failure.

## Hypothesis results

1. Lossy repair diagnostics: supported.
2. Conflicting json-render prompt and state-normalization rules: supported.
3. Missing required business semantics: falsified at the coverage seam. All
   failures were additions or route-native state representation differences.
4. Validator replay nondeterminism or archive corruption: falsified.
5. Residual model contract noncompliance: supported for the three OpenUI cells
   and the extra non-layout components.

## Actions that would bias the result

Do not:

- append a third attempt only to failed cells;
- manually edit or accept the 11 outputs;
- relax the frozen validator and rescore the same archive;
- collect downstream evidence and pretend the missing cells are complete;
- average OPE-12 with a later run;
- tune repeatedly on the same provider outputs.

## Bias-controlled continuation

OPE-12 is now a development pilot. A decision-grade continuation requires a new
manifest and a new complete run.

The next protocol revision should be implemented and reviewed without provider
calls:

1. Define the highest shared observable seam explicitly. Separate host semantic
   state from route-local immutable data bindings.
2. Replace ambiguous `required_*` names with an explicit exact or bounded-extra
   policy. Do not decide this from individual archived outputs.
3. Resolve official json-render `$state` references before observable comparison,
   while rejecting undeclared interactive state and effects.
4. Emit symmetric diagnostics with expected and actual component counts, node
   ids, state keys, actions, and supplied-value differences.
5. Add a final route-neutral checklist after route-specific catalog guidance so
   generic design advice cannot override the shared acceptance contract.
6. Keep provider, effort, order balancing, one-repair ceiling, thresholds, token
   charging, and immutable evidence rules unchanged.
7. Use the 11 archived cells only as regression fixtures. Do not score them in
   the new verdict.
8. Add a preregistered holdout cohort or a new frozen scenario manifest before
   the first provider call, then run one non-decision Luna-low canary.
9. Only an unchanged passing canary may promote its manifest to one complete run.

The old result remains `INVALID_EVAL`. A future run must stand alone and must
still complete generated platform proof, human correction, blinded review,
accessibility, mobile, maintenance, cost, and applicability evidence before a
product verdict is legal.

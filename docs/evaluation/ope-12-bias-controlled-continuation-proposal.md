# OPE-12 bias-controlled continuation proposal

Status: approved as Linear OPE-23 and OPE-24. OPE-23 authorizes deterministic
hardening only. OPE-24 authorizes one reviewed Luna-low canary only. This
document does not authorize a complete provider run.

## Objective

Produce one new decision-grade evaluation without rewriting, averaging, or
selectively extending the invalid OPE-12 run.

## Immutable prior run

OPE-12 remains an invalid development run. Its 80 cells, 96 attempts, tokens,
latencies, failures, diagnostics, and `INVALID_EVAL` result remain reportable and
unchanged. Its 11 final failures may be used as regression fixtures only. They
cannot enter the new score.

## Protocol revision boundary

Create a new `observable-contract-v2` manifest before any provider call. The
revision may change evaluation infrastructure only in the diagnosed areas:

1. precise coverage diagnostics;
2. explicit component-count semantics;
3. route-native immutable-data projection versus host semantic state;
4. ordering of route-neutral constraints after generic route guidance;
5. a fresh scenario manifest and schedule.

The following stay unchanged:

- `gpt-5.6-luna`, low reasoning, tools disabled, fresh sessions;
- one repair maximum per cell;
- full charging of every rejected attempt;
- balanced route order;
- source and catalog pinning;
- maximum response size and node count;
- original product thresholds and ecosystem vetoes;
- immutable evidence, credential scans, platform proof, human correction,
  blinded review, accessibility, maintenance, cost, and applicability gates.

## Observable contract v2

### Exact visible component semantics

Replace `required_component_kinds` with `exact_component_multiset`. The prompt
and validator must say that counts are exact and that an extra known catalog
component is invalid. Diagnostics must return:

- expected and actual counts by kind;
- missing and unexpected kind counts;
- ids of unexpected nodes;
- the exact acceptance field that failed.

This does not retroactively relax the ten component-count failures.

### Host semantic state versus native route data

The application host supplies one exact semantic state object to every route.
Declared interactive keys, values, preservation rules, and updates must match it.

A route may use native immutable data bindings only when all of these hold:

- every leaf originates byte-for-byte from the shared MCP result;
- every auxiliary path is read-only and referenced by an observable prop;
- no watcher, action, update, effect, or replay slot depends on it as mutable
  semantic state;
- the route adapter resolves it before observable comparison;
- it is excluded from the canonical host semantic-state fingerprint.

Unknown or mutable extra state remains invalid. This lets the official
json-render route use native `$state` values without pretending display data is
an additional host state slot.

### Symmetric repair information

Every structured route receives the same machine-readable diagnostic shape:

```json
{
  "rule": "exact-component-multiset",
  "expected": { "Toolbar": 1 },
  "actual": { "Toolbar": 2 },
  "unexpected_nodes": [{ "id": "progress_toolbar", "kind": "Toolbar" }]
}
```

State, action, supplied-value, id, accessibility, schema, and policy failures
receive equivalent expected-versus-actual fields. The repair instruction still
permits one complete corrected output only.

### Prompt precedence

Append one hashed route-neutral final checklist after all route-specific catalog
guidance. It must state:

- component counts are exact;
- host semantic state is exact;
- generic suggestions to add sample state, layout containers, or realistic data
  do not apply when they conflict with the scenario contract;
- only supplied business values may appear;
- output must be self-checked against the exact acceptance object.

All added prompt tokens remain charged to their route.

## Regression and preflight gates

Before a model call:

1. The v1 replay still reproduces all 11 archived rejections.
2. The v2 diagnostic layer identifies every archived delta without accepting or
   editing those outputs.
3. Fixtures cover missing and extra components, duplicate known components,
   auxiliary immutable data, undeclared mutable state, unknown actions, broken
   references, inaccessible semantics, and one failed repair.
4. Fake-provider runs cover all 80 cells and one repair without touching the
   final scorer.
5. Two independent code reviews approve contract equivalence and intent.
6. The candidate manifest, implementation tree, prompts, scenarios, thresholds,
   schedule, and evidence schemas are hashed and committed.

## Fresh evaluation cohort

Do not score the previous v1 through v4 provider outputs again. Generate a fresh
20-scenario runtime-uncertain cohort from the five frozen workflow families using
a committed deterministic holdout transform. The transform must:

- create four unseen variants per family;
- keep every catalog constraint valid;
- vary ids, values, orientation, and legal composition independently of route;
- preserve the same difficulty and component capability coverage;
- be fixed before the first provider call;
- never use a route's prior success or failure to select a scenario.

Freeze five matching compile-known representatives. The resulting complete
schedule remains 80 route cells unless an independently reviewed preregistration
changes that number before any call.

## Execution sequence

1. Deterministic hardening and preregistration, zero provider calls.
2. One Luna-low non-decision canary using the frozen v2 manifest.
3. If and only if the canary passes unchanged, one complete v2 provider run.
4. Generated Web and Desktop proof, then the registered iOS and Android scope.
5. Human correction, blinded review, accessibility, maintenance, cost, and
   applicability evidence.
6. A new final-decision review consumes only the complete v2 evidence and cites
   OPE-12 separately as the invalid development run.

If the canary fails, no full run occurs. If the complete v2 run is invalid, no
third complete run is allowed without an external methodology review and a new
explicit user decision. This prevents an endless tune-until-green loop.

## Proposed tracker slices

Each slice needs one ticket, one isolated branch or worktree, and one reviewable
pull request:

1. Diagnose and harden observable contract v2, then preregister it.
2. Run the single v2 Luna-low canary.
3. Produce the complete immutable v2 evidence set after a passing canary.
4. Perform human review and issue the new product verdict.

Only the first two should be opened initially. The complete-run ticket is opened
after the canary passes, and the verdict ticket is opened after complete evidence
exists.

# OPE-23 observable-contract-v2 preregistration

Status: all findings from the preparatory review cycles are implemented. Final
independent reviews are pending. Zero evaluation-provider calls are authorized
by OPE-23.

## Immutable prior evidence

OPE-12 remains `INVALID_EVAL` at evidence commit `5454b37`. Its 80 cells, 96
attempts, 11 final rejections, raw outputs, diagnostics, usage, and checksums are
not changed or rescored. The exact 11 final outputs are regression fixtures only.

The deterministic command below must continue to exit `1` because every archived
final rejection remains rejected:

```bash
cd prototype/ecosystem-relative-eval
node scripts/replay-final-invalid.mjs
```

Required result: `archived_final_failures=11` and `reproduced_failures=11`.

## Diagnosed evaluation defects

The hardening is limited to defects demonstrated before implementation:

1. v1 reduced exact component-count failures to the string `component-kinds`.
2. v1 reduced host-state failures to the string `state`.
3. The json-render projection resolved selected `$bindState` form props, but not
   official read-only `$state` expressions.
4. json-render display data from the shared MCP result was treated as extra host
   semantic state even when it was immutable and observable.
5. Generic route guidance appeared after or competed with the exact scenario
   contract.
6. The v1 scenario outputs had already been observed and cannot be a fresh cohort.

These findings do not retroactively validate any OPE-12 output.

## Observable contract v2

Every runtime-uncertain scenario freezes:

- `exact_component_multiset`, with an exact count per component kind;
- `exact_host_semantic_state`, with no unknown host state key;
- exact typed host actions and stable nonempty component ids;
- preservation of every business value in the shared MCP result;
- the existing update, replay, accessibility, size, catalog, and host-effect
  policies.

Machine-readable failures include the acceptance field, expected and actual
values, missing and excess counts, unexpected node ids, state-key deltas, action
deltas, or missing supplied values as applicable.

### Constrained route-native display data

json-render may represent supplied display values in route-native state only
when every leaf:

- equals a leaf from the byte-identical shared MCP result;
- is referenced by a read-only `$state` expression in an observable prop;
- is resolved before observable comparison;
- is excluded from the canonical host semantic-state fingerprint.

The validator rejects mutable bindings, watchers, actions, dynamic visibility,
repeats, effects, foreign values, unreferenced values, and empty auxiliary state.
Host semantic state still matches exactly.

### Symmetric prompt and repair contract

OpenUI, typed JSON, and json-render receive the same route-neutral final
checklist after route guidance. It states that component counts and host state
are exact, generic layout or sample-data suggestions cannot override the
acceptance object, only supplied business values are legal, and the complete
payload must be self-checked.

Every structured route receives the same repair envelope:

```json
{
  "contract_version": "observable-contract-v2",
  "failed_checks": []
}
```

The prior output and complete diagnostics are retained. One repair maximum is
unchanged.

## Fresh deterministic holdout

The evaluator owns a route-neutral transform in
`prototype/ecosystem-relative-eval/src/observable-contract-v2-scenarios.mjs`.
It takes one frozen representative from each of the five workflow families and
creates four unseen variants per family. It changes stable component ids,
business values, legal orientations, selected values, booleans, bounded progress
values, component multisets, and valid tree composition without consulting any
route result. Each holdout inserts a deterministic nested Toolbar composition.
The four variants use four different grouping patterns. All 20 route-neutral
structural fingerprints are unique and absent from every observed v1 structural
fingerprint.

The frozen matrix remains:

- 20 runtime-uncertain scenarios times 3 structured routes: 60 cells;
- 5 compile-known representatives times 4 routes: 20 cells;
- total: 80 cells, in the existing balanced rotation;
- one repair maximum and 160-call ceiling for a future complete run.

The eight-cell canary is selected deterministically from this same holdout before
any provider call. It spans both cohorts and all four routes.

## Unchanged dimensions

The following remain unchanged from OPE-12:

- provider through the ChatGPT-plan Codex CLI;
- model `gpt-5.6-luna`, low reasoning, tools disabled, fresh isolated process;
- source and catalog pins;
- balanced ordering and full token charging for rejected attempts;
- one repair maximum;
- output size and node bounds;
- product thresholds and ecosystem vetoes;
- generated Web and Desktop proof, registered Mobile scope, accessibility,
  human correction, blind review, maintenance, cost, and applicability gates;
- immutable evidence, credential scans, and product-scorer prohibition.

## TDD evidence

Focused red command:

```bash
node --test --test-name-pattern='v1 replay|v2 reports|v2 resolves|v2 route-neutral|v2 holdout' test/observable-contract-v2.test.mjs
```

Observed before implementation: 1 passed, 4 failed. The v1 replay passed. The v2
failures were missing structured diagnostics, rejected official read-only state,
missing final checklist, and reused scenario ids.

The separate 80-cell preflight test also failed before implementation because
the produced manifest had no v2 contract identity.

Focused green command:

```bash
node --test test/observable-contract-v2.test.mjs
```

Current result: 7 passed, 0 failed. The complete fake-provider preflight retains
84 attempts for 80 cells, including four deterministic first-pass failures and
four successful registered repairs. External provider calls: 0.

Full regression commands:

```bash
npm test
npm run typecheck
bash -n scripts/run-canary.sh
```

Current result after all preparatory review fixes: 91 passed, 0 failed;
typecheck, the explicit Dioxus platform-contract test, shell syntax, diff checks,
605-file archive integrity, and the zero-line shared-runtime diff passed. These
checks made zero evaluation-provider calls.

## Reviewed execution boundary

Real-provider code is private to the reviewed CLI module. Reusable exports reject
`provider=codex`, and the shell wrapper accepts only the v2 canary contract. Every
real attempt records separately whether an invocation was requested, a process
started, a provider thread started, and a turn completed. The provider event
stream must contain exactly one ordered JSONL file per invocation, with one
thread start and a terminal turn-completion event when completion is claimed.
Thread starts require a nonempty thread id. Completion requires finite,
non-negative integer token usage. This typed event evidence is audited before
the candidate summary is classified and recomputed by the independent evidence
reviewer.

The reviewed Git state rejects both tracked modifications and non-ignored
untracked paths before a real call. Only three exact dependency paths may be
ignored as `node_modules`, and each must be an absolute symbolic link to the
same relative dependency path in another worktree under `/Users/ardjo/CODE`.
Any directory, extra ignored `node_modules`, unsafe target, or other untracked
path is a hard failure.

The registered 4 GiB free-space floor is unchanged. Reproducible Cargo build
artifacts are removed only from
`/Users/ardjo/CODE/.cache/openui-dioxus-eval/*` after local test builds and after
the second-catalog fixture. Both shell and Node boundaries reject symbolic links,
resolve the cache and target canonically, and require the target to remain
strictly below the dedicated cache root. The cleanup is archived as
`pre-provider-build-cache-cleanup.json` and independently compared with the
summary before certification. The storage gate then runs immediately before the
first provider invocation.

Canary evidence is written outside the reviewed repository, under the dedicated
evaluation cache by default. Before any output write, the shell invokes the
canonical Node path boundary, which rejects symbolic links, symbolic-link
ancestors, and any destination resolving into the repository. The reviewed CLI
repeats this check before its mandatory preflight and is the only entrypoint
that may create the one-shot claim after that preflight passes. The independent
review also recomputes the exact schedule prefix, prompt id and hashes, attempt
sequence, repair precondition, and one-repair ceiling from frozen manifest bytes
and retained raw evidence. Raw and diagnostics bytes are checked against each
attempt's recorded hashes before they may reconstruct a repair prompt. Source
scenario id, family, native artifact, canonical artifact, and platform artifact
are also independently bound to frozen schedule data and retained bytes. The
same retained-gate recomputation applies to the 80-cell fake complete preflight,
including review packets, generation completeness, human-evidence finalization,
and its expected `INVALID_EVAL` result. Packet review reconstructs all 80 blinded
packets from retained final records, frozen scenarios, and the registered seed;
matching only candidate-provided packet hashes is insufficient.

The same boundary applies to direct Node CLI invocation. Before the CLI may hold
the private provider capability, it invokes the reviewed wrapper in
preflight-only mode. That mode performs every deterministic, authentication,
cleanup, and storage check, but exits before creating the one-shot reservation
or contacting the provider. Canonical external-output validation also precedes
the CLI's first directory write. Passing evidence must contain the exact
nonempty canary schedule and one accepted final record per scheduled cell.
Invalid evidence may cite operational preflight failure only when independent
review recomputes that failure from retained evidence.

The v2 review-packet seed is unchanged from the registered OPE-12 methodology.
Any emergency failure writes both an emergency summary and
`TERMINAL_STATUS.json`, including a failure after one-shot consumption but before
the ordinary summary path.

## Freeze and one-shot boundary

After both independent reviews pass and every actionable finding is resolved,
the candidate is frozen with:

```bash
npm run freeze:v2 -- --output ../../docs/evaluation/ope-23-observable-contract-v2-candidate.json
```

The freeze writes the manifest and a sibling raw-byte SHA-256 file with
exclusive-create semantics. The manifest contains all prompt bytes and hashes,
scenario contracts, structural fingerprints, schedule, thresholds, evidence
schemas, source pins, repair policy, and the implementation-tree hash.

OPE-24 may consume only that exact reviewed manifest and an implementation that
rebuilds byte-identically. It may run exactly one `gpt-5.6-luna` low canary. It
may emit only `CANARY_PASS`, `CANARY_FAIL`, or `CANARY_INVALID`. It may never
retry, extend, replace, or selectively repair the canary after inspection. A
complete provider run requires a later ticket and explicit approval.

For a real v2 provider run, the wrapper requires the raw manifest, its matching
sidecar, the exact reviewed OPE-23 commit, an absolute evidence destination
outside the repository, and the `canary` run contract. The wrapper completes
bootstrap, tests, typecheck, the Dioxus contract, shell syntax, authentication
status, cache cleanup, and every registered storage gate before entering the
reviewed CLI. The CLI does not trust an environment-provided claim. It
independently invokes the same wrapper in preflight-only mode and only after that
mandatory preflight passes does it atomically create the manifest-hash-keyed
execution reservation in the repository's shared Git directory. The runner then
prepares the external output, rebuilds and byte-compares the frozen manifest,
verifies immutable archives and catalog fixtures, performs canonical cache
cleanup, and passes the immediate storage gate before atomically consuming that
reservation. Consumption is therefore the last local boundary before the
provider loop. Internal failure after consumption yields terminal invalid
evidence, never permission to retry. The reservation is common to all worktrees
and survives success, failure, invalidity, or interruption. Any second wrapper
or direct CLI invocation for that manifest is rejected regardless of output
directory. The frozen bytes, claim, consumption record, provider-event evidence,
and terminal status are copied into the immutable canary evidence.

## Frozen identities

The final reviewed manifest SHA-256, implementation-tree SHA-256, commit, review
records, fake-preflight evidence path, and archive-integrity result are inserted
here only after review. Until then, OPE-24 remains blocked.

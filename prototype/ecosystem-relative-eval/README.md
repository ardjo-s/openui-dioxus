# OPE-11 ecosystem-relative evaluation canary

This prototype is the operational gate between the OPE-9 evaluation design and the complete OPE-12 evidence run. It cannot produce a product verdict. Its only outcomes are `PASS` and `CANARY_INVALID`.

## Compared routes

| Route | Honest native seam | Cohort |
| --- | --- | --- |
| OpenUI | Official OpenUI Lang parser, then the shared Dioxus Surface runtime | Runtime-uncertain and compile-known |
| Typed JSON | Frozen JSON schema, then the shared Dioxus Surface runtime | Runtime-uncertain and compile-known |
| `json-render` | Official `@json-render/core` catalog and stream compiler plus `@json-render/react` | Runtime-uncertain and compile-known |
| Direct RSX | Ordinary Dioxus RSX with an allowlisted source, sandboxed SSR proof, and externally blocked browser requests | Compile-known |

Route-specific guarantees are excluded from comparisons where they do not apply. `json-render` is not forced through the Dioxus Surface. Direct RSX is not forced through a runtime interpreter.

## Canary sequence

1. Freeze source pins, toolchain, scenarios, exact prompts, order, reviewer slots, rates, thresholds, trust controls, source tree, and reference platform proofs in one candidate manifest.
2. Run eight balanced route cells with fresh Luna low sessions. Retain and charge every rejected first attempt. Permit at most one repair per cell and at most 16 provider calls total.
3. Validate each output through its route-native validator or compiler. Compile-known OpenUI and typed JSON must normalize to the expected canonical fingerprint.
4. Convert only accepted runtime outputs into isolated platform fixtures.
5. Render those generated fixtures through real Dioxus Web, Dioxus Desktop, and official `json-render` React Web. Exercise state, actions, updates, replay, accessibility checks, traces, and screenshots.
6. Verify the frozen OPE-3 archive, the second Dioxus catalog and migration drills, zero canonical runtime changes, credential scans, the 30 minute ceiling, and recursive hashes.

Runtime-uncertain outputs are checked against the byte-identical supplied
observable contract: component kinds, supplied business values, state, typed
actions, and stable ids. They may choose ids, orientation, composition details,
or copy that the contract did not provide. Compile-known outputs still receive
the complete frozen specification and must match it exactly. Canonical
fingerprint equality with the hidden oracle is therefore a compile-known check,
not a runtime-uncertain style oracle.

An evidence directory is unpublished until the last exclusive write creates
`PUBLICATION.json`. The runner first freezes `CANDIDATE.json`, then a separate
process recomputes the records into `INDEPENDENT_REVIEW.json`. Finalization
includes both files in `SHA256SUMS` and binds the outcome, manifest, review, and
complete inventory in the publication marker. Interrupted directories without
that marker are invalid.

Generated OpenUI, typed JSON, and `json-render` outputs remain validated data. Generated direct RSX is accepted only after its source allowlist passes. Its SSR compile and execution use an empty environment and a deny-network sandbox. Its Web proof receives an explicit non-secret environment, rejects direct access to the aliased `web-sys` feature shim, and blocks external browser requests.

## Commands

```sh
npm install
npm run bootstrap
npm test
npm run typecheck
npm run preflight
npm run preflight:complete
npm run canary
npm run canary:complete
npm run run:complete
npm run finalize:complete -- --evidence-dir evidence/candidate-complete --human-evidence human-evidence.json --human-assets human-assets/
node scripts/verify-evidence.mjs evidence/candidate-canary
```

`npm run preflight` uses deterministic fake outputs and executes the same generated-output Web and Desktop proof path. Unit tests may use frozen reference proofs, but those runs are never promotable.

`npm run canary` requires an existing ChatGPT Codex login. The wrapper creates an isolated temporary Codex home, links only `auth.json`, removes OpenAI API environment variables, disables tools, and starts one ephemeral Codex process per attempt with `gpt-5.6-luna` and low reasoning.

The default real output is `evidence/candidate-canary/`. The runner refuses to overwrite a non-empty output directory.

## Complete-run contract

`npm run preflight:complete` executes the full frozen 80-cell schedule with the
deterministic fake provider. It generates route-neutral review packets and must
report zero external provider calls. Its expected outcome is `INVALID_EVAL`
until all registered correction, review, keyboard, VoiceOver, TalkBack, mobile,
replay, migration, drill, cost, and applicability evidence is present. The
separate `operational_preflight_passed` field proves whether generation and the
runner itself passed before those human records exist.

Generated-output packets contain only content-addressed asset ids. The runner
verifies that every id is the SHA-256 of a real retained screenshot. Dioxus
packets bind both Web and per-Surface Desktop captures. Reference-only
preflights mark their packet assets as placeholders and cannot be promoted as
human review evidence.

`npm run canary:complete` is the OPE-20 representative subset. It uses eight
cells copied from the exact 80-cell schedule, spans both cohorts and all four
routes, and runs the generated-output platform orchestration. Its outer outcome
is `PASS` only when generation passes and the nested complete-run finalizer
correctly remains `INVALID_EVAL` because real human and assistive-technology
evidence is absent. A passing canary promotes only the byte-identical OPE-19
manifest.

`npm run run:complete` executes the complete 80-cell provider run through the
same isolated Codex wrapper as the canaries. Human
and assistive-technology evidence is collected afterward, then
`finalize:complete` validates and hash-chains it onto the frozen generation
archive without a second provider run. Every blinded reviewer record must bind
all opened packet ids and packet hashes. Every `artifact_sha256` in the human
records must resolve to exactly one real file in the supplied `--human-assets`
directory. The finalizer copies those files into a content-addressed private
archive, scans them for credentials, and includes them in the final checksum
chain. The frozen blocked-crossover assignment also requires the two operators
to cover every one of the 80 registered cells exactly once. The finalizer may emit only
`READY_FOR_REVIEW` or `INVALID_EVAL`; OPE-7 still owns every product verdict.

## Evidence boundary

The canary publishes raw outputs, diagnostics, canonical and native artifacts, provider usage events, platform fixtures, platform traces, screenshots, summary, credential scan, and recursive SHA-256 checksums. ChatGPT plan usage has no per-run API invoice, so token usage and wall time are reported while missing dollar allocation remains `null`, never zero.

A passing canary only permits OPE-12 to run the byte-identical manifest. OPE-7 remains the sole ticket allowed to issue `GO_OPENUI_DIOXUS`, `PIVOT_TO_SURFACE_RUNTIME`, `NO_GO`, or `INVALID_EVAL`.

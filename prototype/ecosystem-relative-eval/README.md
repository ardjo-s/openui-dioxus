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
3. Validate each output through its route-native validator or compiler. OpenUI and typed JSON must normalize to the same expected canonical fingerprint.
4. Convert only accepted runtime outputs into isolated platform fixtures.
5. Render those generated fixtures through real Dioxus Web, Dioxus Desktop, and official `json-render` React Web. Exercise state, actions, updates, replay, accessibility checks, traces, and screenshots.
6. Verify the frozen OPE-3 archive, the second Dioxus catalog and migration drills, zero canonical runtime changes, credential scans, the 30 minute ceiling, and recursive hashes.

An evidence directory is unpublished until the last exclusive write creates
`PUBLICATION.json`. The marker binds the outcome and manifest to the complete
`SHA256SUMS` inventory. Interrupted directories without that marker are invalid.

Generated OpenUI, typed JSON, and `json-render` outputs remain validated data. Generated direct RSX is accepted only after its source allowlist passes. Its SSR compile and execution use an empty environment and a deny-network sandbox. Its Web proof receives an explicit non-secret environment, rejects direct access to the aliased `web-sys` feature shim, and blocks external browser requests.

## Commands

```sh
npm install
npm run bootstrap
npm test
npm run typecheck
npm run preflight
npm run canary
node scripts/verify-evidence.mjs evidence/candidate-canary
```

`npm run preflight` uses deterministic fake outputs and executes the same generated-output Web and Desktop proof path. Unit tests may use frozen reference proofs, but those runs are never promotable.

`npm run canary` requires an existing ChatGPT Codex login. The wrapper creates an isolated temporary Codex home, links only `auth.json`, removes OpenAI API environment variables, disables tools, and starts one ephemeral Codex process per attempt with `gpt-5.6-luna` and low reasoning.

The default real output is `evidence/candidate-canary/`. The runner refuses to overwrite a non-empty output directory.

## Evidence boundary

The canary publishes raw outputs, diagnostics, canonical and native artifacts, provider usage events, platform fixtures, platform traces, screenshots, summary, credential scan, and recursive SHA-256 checksums. ChatGPT plan usage has no per-run API invoice, so token usage and wall time are reported while missing dollar allocation remains `null`, never zero.

A passing canary only permits OPE-12 to run the byte-identical manifest. OPE-7 remains the sole ticket allowed to issue `GO_OPENUI_DIOXUS`, `PIVOT_TO_SURFACE_RUNTIME`, `NO_GO`, or `INVALID_EVAL`.

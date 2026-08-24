# OPE-5 intent review

Verdict: **PASS after removing oracle leakage.**

The first harness draft embedded the expected canonical Surface in the shared
prompt. That would have measured syntax translation instead of product-level UI
composition. The final contract exposes only identical domain data, state,
typed actions, update/replay rules, required component kinds, and semantic
acceptance criteria. Expected component IDs and the oracle tree remain hidden.

The semantic scorer accepts different stable IDs while requiring the same
component capabilities, business props, state, actions, and valid graph. The
Rust adapter remains the authority for unknown props, references, state, action
policy, graph reachability, and catalog semantics.

The fake provider deliberately produces two first-pass failures per arm and
repairs both symmetrically. Its apparent token and latency numbers are pipeline
fixtures only. They are not evidence that OpenUI is better or worse than typed
JSON.

The decisive question remains open: after real generation, platform execution,
blinded review, and maintenance drills, does OpenUI show one material advantage
without failing a hard gate? Only OPE-7 may answer it.

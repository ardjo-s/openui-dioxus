# OPE-17 rendered receipt preregistration

OPE-17 is a deterministic harness correction with zero provider calls. It does
not retry, amend, pool, or reinterpret OPE-16. It may only prepare a new
candidate manifest for OPE-18 after every deterministic gate passes.

## Frozen predecessor

- OPE-16 source commit: `9572c9b`.
- OPE-16 evidence commit: `5d92b34`.
- OPE-16 outcome: `CANARY_INVALID`.
- Evidence: `prototype/ecosystem-relative-eval/evidence/ope16-canary-9572c9b-final`.
- Candidate manifest SHA-256: `49b71bd46638f1301c59fa345204d12896d0c2175197ec8df4563c2092ad9cf0`.
- `SHA256SUMS` SHA-256: `144d0a4a197fc6e70798ec79e8321a0048c381657d08af5b381ab9f9e6c22c5c`.
- Independent review SHA-256: `6a02786b744974b94b1ecc52d481b3f8f31bb940ce85bd8ec25a8f6676845079`.

## Registered correction

OPE-16 rejected valid Direct RSX because visible receipt text was embedded in a
longer interpolated string. OPE-17 removes only that source-shape requirement.
The source scanner still requires the executable state and receipt probes and
still rejects host-capable or remote-resource source.

Static acceptance still requires Rust compilation and the shared rendered
accessibility contract. Real Direct RSX Web execution additionally requires one
click to produce action count `1` and exact equality between `data-receipt` and
the receipt value present in visible status text.

No source parser or alternate syntax oracle is introduced.

## Frozen dimensions

Provider, model, reasoning effort, scenarios, schedule, route ordering, repair
limit, call and wall-time ceilings, scoring thresholds, runtime semantics,
trust controls, evidence schema, and product-verdict ownership remain exact.

## Deterministic promotion gate

OPE-18 becomes executable only if the exact OPE-16 regression passes, negative
source and rendered fixtures pass, all four generated routes pass their real
platform probes, the manifest differential is limited to this correction and
derived hashes, full checks and two independent review passes are green, and
the external provider call count remains zero.

OPE-17 emits no product verdict. OPE-18 owns one new Luna-low canary. OPE-12
remains canceled unless OPE-18 returns `PASS`.

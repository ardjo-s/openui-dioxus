# OPE-11 ecosystem canary result

## Result

The final registered canary result is `CANARY_INVALID`. It does not authorize
OPE-12 and it cannot produce a product verdict.

The final candidate used `gpt-5.6-luna` with low reasoning through the ChatGPT
plan. All eight generation cells passed their route-native validation on the
first attempt:

- OpenUI: 2/2
- typed JSON: 2/2
- `json-render`: 2/2
- direct RSX: 2/2

Three executed platform proofs passed:

- official `json-render` React Web
- Dioxus Web
- Dioxus Desktop

Direct RSX Web failed its accessibility gate. The generated Toolbar rendered
`aria-orientation="horizontal"` on a `div` without a compatible role. Axe
classified this as a critical `aria-allowed-attr` violation. This is a real
generated-output defect, not an infrastructure or provider failure.

## Frozen evidence

- Source commit: `edafbb1`
- Candidate manifest: `eac280627d3042ef777d01142408661659aede6c16ca50cb8bd28120a9c3dd2c`
- Candidate checksum manifest: `cab4a27ee5c199f4462c47a29a2ed726f3b9c16247defc7d6e6452bb63d9e553`
- Independent recomputation: `33d1da72f69bf8e9cc8c41fc89e78170a8265a1a1f36ee09c7204f2ba28911be`
- Evidence directory: `prototype/ecosystem-relative-eval/evidence/candidate-canary-edafbb1-final/`

The evidence intentionally has no `PUBLICATION.json`. Independent
recomputation found `platform-evidence-invalid`, so finalization correctly
refused to label the candidate complete.

## Interpretation

This result does not show that OpenUI failed. OpenUI, typed JSON, and
`json-render` all passed their generation cells and applicable platform proofs.
It shows that the complete four-route canary did not satisfy its preregistered
accessibility gate. Changing the Direct RSX prompt or patching its generated
output after seeing the result would improve a baseline after preregistration,
so the final candidate remains invalid.

OPE-7 remains the only ticket allowed to issue `GO_OPENUI_DIOXUS`,
`PIVOT_TO_SURFACE_RUNTIME`, `NO_GO`, or `INVALID_EVAL`. Because OPE-12 cannot
start from an unpromoted manifest, no product verdict is currently authorized.

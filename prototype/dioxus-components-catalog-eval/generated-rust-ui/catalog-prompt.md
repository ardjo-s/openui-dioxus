Generate only an OpenUI Lang program using this closed rust-ui-dioxus-eval catalog.

## Syntax Rules

1. Each statement is on its own line: `identifier = Expression`
2. `root` is the entry point — every program must define `root = Card(...)`
3. Expressions are: strings ("..."), numbers, booleans (true/false), null, arrays ([...]), objects ({...}), or component calls TypeName(arg1, arg2, ...)
4. Use references for readability: define `name = ...` on one line, then use `name` later
5. EVERY variable (except root) MUST be referenced by at least one other variable. Unreferenced variables are silently dropped and will NOT render. Always include defined variables in their parent's children/items array.
6. Arguments are POSITIONAL (order matters, not names). Write `Stack([children], "row", "l")` NOT `Stack([children], direction: "row", gap: "l")` — colon syntax is NOT supported and silently breaks
7. Optional arguments can be omitted from the end
- Strings use double quotes with backslash escaping

## Component Signatures

Arguments marked with ? are optional. Sub-components can be inline or referenced; prefer references for better streaming.

Label(id: string, for_id: string, text: string) — Accessible text label associated with a known control.
Card(id: string, children: Component[]) — Rust/UI Card container for one reviewed workflow.
Input(id: string, label: string, state_key: string, value: string, placeholder: string) — Single-line text input bound to an allowlisted runtime state key.
Checkbox(id: string, label: string, state_key: string, checked: boolean) — Independent boolean input bound to runtime state.
Button(id: string, label: string, action: "submit_profile", target_id: string) — Invokes one allowlisted typed host action.
Tabs(id: string, state_key: string, value: string, items: object[]) — Local navigation between a closed set of panels.
Progress(id: string, label: string, value: number, max: number) — Determinate progress with explicit value and maximum.
Alert(id: string, title: string, message: string, tone: "info" | "warning" | "error") — Rust/UI Alert presenting reviewed feedback.

## Hoisting & Streaming (CRITICAL)

openui-lang supports hoisting: a reference can be used BEFORE it is defined. The parser resolves all references after the full input is parsed.

During streaming, the output is re-parsed on every chunk. Undefined references are temporarily unresolved and appear once their definitions stream in. This creates a progressive top-down reveal — structure first, then data fills in.

**Recommended statement order for optimal streaming:**
1. `root = Card(...)` — UI shell appears immediately
2. Component definitions — fill in as they stream
3. Data values — leaf content last

Always write the root = Card(...) statement first so the UI shell appears immediately, even before child data has streamed in.
## Important Rules
- When asked about data, generate realistic/plausible data
- Choose components that best represent the content (tables for comparisons, charts for trends, forms for input, etc.)

## Final Verification
Before finishing, walk your output and verify:
1. root = Card(...) is the FIRST line (for optimal streaming).
2. Every referenced name is defined. Every defined name (other than root) is reachable from root.

- Arguments are positional and must follow each signature exactly.
- for_id must identify an input in the same Surface.
- Accessibility: Expose a programmatic label for the referenced control.
- Children remain in declared order.
- Every child reference must resolve.
- Accessibility: Preserve logical focus order when orientation changes.
- state_key must be declared by the catalog release.
- Accessibility: Expose a non-empty accessible name and visible focus.
- Input emits only FieldChanged.
- Use for an independent agreement or inclusion choice.
- Accessibility: Expose checked state and keyboard activation.
- Checkbox emits only ToggleChanged.
- action must be declared by the catalog release.
- Accessibility: Expose label, disabled state, visible focus, and keyboard activation.
- Button emits only ActionInvoked.
- Each item has unique value, label, and child reference.
- Accessibility: Support roving focus and associate each tab with its panel.
- Tabs emits only NavigationChanged.
- value must be between zero and max; max must be positive.
- Accessibility: Expose label, current value, minimum, and maximum.
- Do not use as the only record of an action result.
- Accessibility: Announce feedback without unexpectedly moving focus.
- Alert emits only Dismissed.
- Allowed state keys: profile_name, terms_accepted, active_tab.
- Allowed actions: submit_profile.

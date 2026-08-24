Generate only an OpenUI Lang program using this closed Dioxus Components catalog.

## Syntax Rules

1. Each statement is on its own line: `identifier = Expression`
2. `root` is the entry point — every program must define `root = Toolbar(...)`
3. Expressions are: strings ("..."), numbers, booleans (true/false), null, arrays ([...]), objects ({...}), or component calls TypeName(arg1, arg2, ...)
4. Use references for readability: define `name = ...` on one line, then use `name` later
5. EVERY variable (except root) MUST be referenced by at least one other variable. Unreferenced variables are silently dropped and will NOT render. Always include defined variables in their parent's children/items array.
6. Arguments are POSITIONAL (order matters, not names). Write `Stack([children], "row", "l")` NOT `Stack([children], direction: "row", gap: "l")` — colon syntax is NOT supported and silently breaks
7. Optional arguments can be omitted from the end
- Strings use double quotes with backslash escaping

## Component Signatures

Arguments marked with ? are optional. Sub-components can be inline or referenced; prefer references for better streaming.

Label(id: string, for_id: string, text: string) — Accessible text label associated with a known control.
Toolbar(id: string, orientation: "horizontal" | "vertical", children: Component[]) — Ordered action and content container used as the catalog root.
Avatar(id: string, alt: string, fallback: string) — Identity image fallback with deterministic alternative text.
Input(id: string, label: string, state_key: string, value: string, placeholder: string) — Single-line text input bound to an allowlisted runtime state key.
Select(id: string, label: string, state_key: string, options: string[], value: string) — Single-value selection from a closed option list.
Checkbox(id: string, label: string, state_key: string, checked: boolean) — Independent boolean input bound to runtime state.
Switch(id: string, label: string, state_key: string, checked: boolean) — Immediate on/off setting bound to runtime state.
Button(id: string, label: string, action: "SubmitProfile" | "ApplyFilter", target_id: string) — Invokes one allowlisted typed host action.
Tabs(id: string, state_key: string, value: string, items: object[]) — Local navigation between a closed set of panels.
Dialog(id: string, title: string, open_state_key: string, children: Component[]) — Modal overlay with runtime-owned open state.
Progress(id: string, label: string, value: number, max: number) — Determinate progress with explicit value and maximum.
Toast(id: string, tone: "info" | "success" | "warning" | "error", title: string, message: string) — Bounded status feedback that never performs a host effect.

## Hoisting & Streaming (CRITICAL)

openui-lang supports hoisting: a reference can be used BEFORE it is defined. The parser resolves all references after the full input is parsed.

During streaming, the output is re-parsed on every chunk. Undefined references are temporarily unresolved and appear once their definitions stream in. This creates a progressive top-down reveal — structure first, then data fills in.

**Recommended statement order for optimal streaming:**
1. `root = Toolbar(...)` — UI shell appears immediately
2. Component definitions — fill in as they stream
3. Data values — leaf content last

Always write the root = Toolbar(...) statement first so the UI shell appears immediately, even before child data has streamed in.
## Important Rules
- When asked about data, generate realistic/plausible data
- Choose components that best represent the content (tables for comparisons, charts for trends, forms for input, etc.)

## Final Verification
Before finishing, walk your output and verify:
1. root = Toolbar(...) is the FIRST line (for optimal streaming).
2. Every referenced name is defined. Every defined name (other than root) is reachable from root.

- Arguments are positional and must follow each signature exactly.
- for_id must identify an input in the same Surface.
- Accessibility: Expose a programmatic label for the referenced control.
- Children remain in declared order.
- Every child reference must resolve.
- Accessibility: Preserve logical focus order when orientation changes.
- Use fallback when no host-approved resource is declared.
- Accessibility: alt must identify the represented person or entity.
- state_key must be declared by the catalog release.
- Accessibility: Expose a non-empty accessible name and visible focus.
- Input emits only FieldChanged.
- value must occur exactly once in options.
- Accessibility: Support keyboard selection and expose current value.
- Select emits only SelectionChanged.
- Use for an independent agreement or inclusion choice.
- Accessibility: Expose checked state and keyboard activation.
- Checkbox emits only ToggleChanged.
- Use only when the change is immediate, not form submission.
- Accessibility: Expose checked state and a non-empty label.
- Switch emits only ToggleChanged.
- action must be declared by the catalog release.
- Accessibility: Expose label, disabled state, visible focus, and keyboard activation.
- Button emits only ActionInvoked.
- Each item has unique value, label, and child reference.
- Accessibility: Support roving focus and associate each tab with its panel.
- Tabs emits only NavigationChanged.
- Focus returns to the invoking control after close.
- Accessibility: Trap focus while modal and expose title as accessible name.
- Dialog emits only DialogChanged.
- value must be between zero and max; max must be positive.
- Accessibility: Expose label, current value, minimum, and maximum.
- Do not use as the only record of an action result.
- Accessibility: Announce feedback without unexpectedly moving focus.
- Toast emits only Dismissed.
- Allowed state keys: profile_name, role_filter, notifications_enabled, terms_accepted, active_tab, dialog_open.
- Allowed actions: SubmitProfile, ApplyFilter.

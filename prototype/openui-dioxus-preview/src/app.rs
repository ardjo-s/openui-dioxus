use dioxus::prelude::*;
use openui_dioxus_preview::{Checkpoint, Node, Projection, Runtime, TypedAction};

const VALID_PROPOSAL: &str = include_str!("../fixtures/valid-proposal.ui");
const INVALID_PROPOSAL: &str = include_str!("../fixtures/invalid-proposal.ui");

const STYLE: &str = r#"
    :root { color-scheme: light; font-family: system-ui, sans-serif; }
    body { margin: 0; background: #f5f7fb; color: #172033; }
    main { max-width: 1100px; margin: 0 auto; padding: 24px; }
    h1, h2, h3, p { margin-top: 0; }
    .lede { color: #506079; }
    .grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, .8fr); gap: 16px; align-items: start; }
    .panel, .surface { background: white; border: 1px solid #d9dfeb; border-radius: 12px; padding: 16px; box-shadow: 0 4px 16px #17203312; }
    .surface { margin-top: 16px; }
    .controls { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    button { border: 1px solid #8796b3; border-radius: 7px; background: #edf2fb; color: #172033; cursor: pointer; padding: 8px 12px; font: inherit; }
    button:hover:not(:disabled), button:focus-visible { border-color: #315fbd; outline: 2px solid #9bb9f7; outline-offset: 1px; }
    button.primary { background: #315fbd; border-color: #315fbd; color: white; }
    button:disabled, input:disabled, select:disabled { cursor: not-allowed; opacity: .62; }
    textarea, input, select { box-sizing: border-box; border: 1px solid #aeb9cc; border-radius: 7px; padding: 8px; font: inherit; }
    textarea { width: 100%; min-height: 220px; resize: vertical; font-family: ui-monospace, SFMono-Regular, monospace; font-size: .88rem; }
    label { display: grid; gap: 5px; color: #34425c; font-weight: 650; }
    .surface-root, .stack { display: grid; gap: 12px; }
    .card { border: 1px solid #d9dfeb; border-radius: 10px; padding: 14px; background: #fbfcff; }
    .card > h3 { margin-bottom: 10px; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #e3e7ef; padding: 8px; text-align: left; vertical-align: top; }
    th { color: #506079; font-size: .86rem; }
    .alert { border-left: 4px solid #d58a18; background: #fff7e8; padding: 10px 12px; }
    .state { overflow-x: auto; white-space: pre-wrap; overflow-wrap: anywhere; background: #111827; color: #e5edf9; border-radius: 8px; padding: 12px; font-size: .82rem; }
    .status { color: #315fbd; font-weight: 650; }
    .refusal { color: #a33a2b; font-weight: 650; }
    .replay { border-color: #b78620; background: #fffaf0; }
    @media (max-width: 760px) { main { padding: 14px; } .grid { grid-template-columns: 1fr; } }
"#;

struct HostState {
    runtime: Runtime,
    checkpoint: Option<Checkpoint>,
    replay: Option<Projection>,
    refusal: Option<String>,
    status: String,
}

fn initial_state() -> HostState {
    let mut runtime = Runtime::new();
    runtime
        .propose(VALID_PROPOSAL)
        .expect("valid fixture must be accepted");
    let checkpoint = runtime.checkpoint();
    HostState {
        runtime,
        checkpoint,
        replay: None,
        refusal: None,
        status: "accepted fixture loaded".to_owned(),
    }
}

fn apply_proposal(state: &mut HostState, proposal: &str) {
    state.replay = None;
    match state.runtime.propose(proposal) {
        Ok(_) => {
            state.checkpoint = state.runtime.checkpoint();
            state.refusal = None;
            state.status = "proposal accepted and committed".to_owned();
        }
        Err(error) => {
            state.refusal = Some(format!("proposal refused: {error}"));
            state.status = "proposal refused; last accepted surface retained".to_owned();
        }
    }
}

#[component]
pub fn App() -> Element {
    let mut source = use_signal(|| VALID_PROPOSAL.to_owned());
    let mut host = use_signal(initial_state);

    let validate = move |_| {
        let proposal = source();
        apply_proposal(&mut host.write(), &proposal);
    };
    let try_invalid = move |_| {
        source.set(INVALID_PROPOSAL.to_owned());
        apply_proposal(&mut host.write(), INVALID_PROPOSAL);
    };
    let replay = move |_| {
        let mut state = host.write();
        let Some(checkpoint) = state.checkpoint.clone() else {
            state.status = "replay unavailable: no accepted checkpoint".to_owned();
            return;
        };
        match state.runtime.replay(&checkpoint) {
            Ok(projection) => {
                state.replay = Some(projection);
                state.refusal = None;
                state.status = "inert replay shown; generated effects disabled".to_owned();
            }
            Err(error) => {
                state.refusal = Some(format!("replay refused: {error}"));
                state.status = "replay refused".to_owned();
            }
        }
    };
    let on_field = move |(field, value): (String, String)| {
        let mut state = host.write();
        if state.replay.is_some() {
            state.status = "inert replay: field update ignored".to_owned();
            return;
        }
        match state.runtime.set_field(&field, &value) {
            Ok(_) => {
                state.checkpoint = state.runtime.checkpoint();
                state.refusal = None;
                state.status = format!("field updated: {field}");
            }
            Err(error) => {
                state.refusal = Some(error);
                state.status = "field update refused".to_owned();
            }
        }
    };
    let on_action = move |action: TypedAction| {
        let mut state = host.write();
        if state.replay.is_some() {
            state.status = "inert replay: generated action ignored".to_owned();
            return;
        }
        match state.runtime.invoke(action) {
            Ok(receipt) => {
                state.refusal = None;
                state.status = receipt.message;
            }
            Err(error) => {
                state.refusal = Some(error);
                state.status = "typed action refused".to_owned();
            }
        }
    };

    let state = host.read();
    let live_projection = state.runtime.projection();
    let projection = state.replay.clone().or(live_projection);
    let replay_active = projection.as_ref().is_some_and(Projection::is_inert);
    let projection_debug = projection
        .as_ref()
        .map(|value| format!("{value:#?}"))
        .unwrap_or_else(|| "None".to_owned());
    let diagnostics = format!("{:#?}", state.runtime.diagnostics());
    let effect_count = state.runtime.effect_count();
    let mode = if replay_active {
        "replay (inert)"
    } else {
        "live"
    };

    rsx! {
        style { "{STYLE}" }
        main {
            h1 { "OpenUI-Dioxus MCP vertical" }
            p { class: "lede", "One accepted projection, one Dioxus tree, three platform feature checks." }

            div { class: "grid",
                section { class: "panel", aria_label: "Host controls",
                    h2 { "Host controls" }
                    label { r#for: "proposal-source", "Proposal source editor" }
                    textarea {
                        id: "proposal-source",
                        value: "{source}",
                        aria_label: "Proposal source editor",
                        oninput: move |event| source.set(event.value()),
                    }
                    div { class: "controls",
                        button { class: "primary", r#type: "button", onclick: validate, "Validate + commit" }
                        button { r#type: "button", onclick: try_invalid, "Try invalid" }
                        button { r#type: "button", onclick: replay, "Replay" }
                    }
                    p { class: "status", aria_live: "polite", "Status: {state.status}" }
                    if let Some(refusal) = &state.refusal {
                        p { class: "refusal", role: "alert", "{refusal}" }
                    }
                }

                section { class: "panel", id: "runtime-state",
                    h2 { "Runtime state" }
                    p { "Mode: {mode}" }
                    p { "Effect count: {effect_count}" }
                    h3 { "Projection Debug" }
                    pre { class: "state", "{projection_debug}" }
                    h3 { "Diagnostics" }
                    pre { class: "state", "{diagnostics}" }
                }
            }

            if let Some(projection) = projection {
                GeneratedSurface {
                    projection,
                    inert: replay_active,
                    on_field,
                    on_action,
                }
            } else {
                section { class: "surface", "No accepted surface." }
            }
        }
    }
}

#[component]
fn GeneratedSurface(
    projection: Projection,
    inert: bool,
    on_field: EventHandler<(String, String)>,
    on_action: EventHandler<TypedAction>,
) -> Element {
    let root = projection.root.clone();
    rsx! {
        section {
            class: if inert { "surface replay" } else { "surface" },
            aria_label: if inert { "Generated surface replay" } else { "Generated surface" },
            h2 { if inert { "Generated surface — replay (inert)" } else { "Generated surface" } }
            div { class: "surface-root",
                {render_node(&projection, &root, inert, on_field, on_action)}
            }
        }
    }
}

fn render_node(
    projection: &Projection,
    name: &str,
    inert: bool,
    on_field: EventHandler<(String, String)>,
    on_action: EventHandler<TypedAction>,
) -> Element {
    let node = projection
        .nodes
        .iter()
        .find(|node| node_name(node) == name)
        .expect("validated projection reference");
    match node {
        Node::Text { text, .. } => rsx! { p { "{text}" } },
        Node::Stack { children, .. } => rsx! {
            div { class: "stack",
                for child in children {
                    {render_node(projection, child, inert, on_field, on_action)}
                }
            }
        },
        Node::Card { title, child, .. } => rsx! {
            article { class: "card",
                h3 { "{title}" }
                {render_node(projection, child, inert, on_field, on_action)}
            }
        },
        Node::Table { columns, rows, .. } => rsx! {
            div { class: "table-wrap",
                table {
                    thead { tr { for column in columns { th { "{column}" } } } }
                    tbody {
                        for row in rows {
                            tr { td { colspan: "{columns.len()}", {render_node(projection, row, inert, on_field, on_action)} } }
                        }
                    }
                }
            }
        },
        Node::Input {
            name,
            label,
            field,
            value,
        } => {
            let field = field.clone();
            rsx! {
                label { r#for: "{name}",
                    "{label}"
                    input {
                        id: "{name}",
                        r#type: "text",
                        value: "{value}",
                        disabled: inert,
                        aria_label: "{label}",
                        oninput: move |event| on_field.call((field.clone(), event.value())),
                    }
                }
            }
        }
        Node::Select {
            name,
            label,
            options,
            field,
            value,
        } => {
            let field = field.clone();
            rsx! {
                label { r#for: "{name}",
                    "{label}"
                    select {
                        id: "{name}",
                        value: "{value}",
                        disabled: inert,
                        aria_label: "{label}",
                        onchange: move |event| on_field.call((field.clone(), event.value())),
                        option { value: "", "Choose an option" }
                        for option_value in options {
                            option { value: "{option_value}", selected: option_value == value, "{option_value}" }
                        }
                    }
                }
            }
        }
        Node::Button { label, action, .. } => {
            let action = *action;
            if inert {
                rsx! { button { r#type: "button", disabled: true, aria_label: "{label}", "{label} (replay)" } }
            } else {
                rsx! { button { class: "primary", r#type: "button", onclick: move |_| on_action.call(action), "{label}" } }
            }
        }
        Node::Alert { tone, message, .. } => rsx! {
            div { class: "alert", role: "status", "{tone}: {message}" }
        },
    }
}

fn node_name(node: &Node) -> &str {
    match node {
        Node::Text { name, .. }
        | Node::Stack { name, .. }
        | Node::Card { name, .. }
        | Node::Table { name, .. }
        | Node::Input { name, .. }
        | Node::Select { name, .. }
        | Node::Button { name, .. }
        | Node::Alert { name, .. } => name,
    }
}

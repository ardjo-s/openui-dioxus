use std::collections::BTreeMap;

use dioxus::prelude::*;

use crate::{ActionInvocation, ActionSpec, Runtime, Surface, TypedNode};

const STYLE: &str = r#"
    :root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #152033; background: #eef2f8; }
    body { margin: 0; }
    main { max-width: 1100px; margin: 0 auto; padding: 24px; }
    .surface { background: white; border: 1px solid #d8dfeb; border-radius: 14px; padding: 18px; margin: 0 0 20px; box-shadow: 0 8px 30px #15203312; }
    .stack { display: grid; gap: 14px; }
    .card { border: 1px solid #d8dfeb; border-radius: 12px; padding: 16px; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #e4e9f1; padding: 8px; text-align: left; }
    label { display: grid; gap: 6px; font-weight: 650; }
    input, select, button { font: inherit; border: 1px solid #9eabc0; border-radius: 8px; padding: 9px 11px; }
    button { cursor: pointer; background: #1f5ebc; color: white; border-color: #1f5ebc; }
    button.secondary { background: white; color: #24344f; border-color: #9eabc0; }
    button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid #9ec4ff; outline-offset: 2px; }
    .alert { border-left: 4px solid #1f5ebc; background: #edf5ff; padding: 10px 12px; }
    .alert.success { border-color: #25844e; background: #ecf8f0; }
    .alert.warning { border-color: #b87716; background: #fff7e8; }
    .alert.error { border-color: #b63737; background: #fff0f0; }
    .host-controls { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
    .runtime-status { font-family: ui-monospace, SFMono-Regular, monospace; font-size: .82rem; color: #43516a; }
    [data-replay="true"] { outline: 3px dashed #b87716; }
    @media (max-width: 640px) { main { padding: 12px; } .surface { padding: 12px; } }
"#;

#[component]
pub fn Text(id: String, text: String) -> Element {
    rsx! { p { "data-component": "Text", "data-node-id": "{id}", "{text}" } }
}

#[component]
pub fn Stack(id: String, children: Element) -> Element {
    rsx! { div { class: "stack", "data-component": "Stack", "data-node-id": "{id}", {children} } }
}

#[component]
pub fn Card(id: String, title: String, child: Element) -> Element {
    rsx! {
        article { class: "card", "data-component": "Card", "data-node-id": "{id}",
            h2 { "{title}" }
            {child}
        }
    }
}

#[component]
pub fn Table(id: String, columns: Vec<String>, rows: Vec<BTreeMap<String, String>>) -> Element {
    rsx! {
        div { class: "table-wrap", "data-component": "Table", "data-node-id": "{id}",
            table {
                thead { tr { for column in &columns { th { "{column}" } } } }
                tbody {
                    for row in &rows {
                        tr { for value in row.values() { td { "{value}" } } }
                    }
                }
            }
        }
    }
}

#[component]
pub fn Input(
    id: String,
    label: String,
    state_key: String,
    value: String,
    inert: bool,
    on_change: EventHandler<String>,
) -> Element {
    rsx! {
        label { r#for: "{id}", "data-component": "Input", "data-node-id": "{id}",
            "{label}"
            input {
                id: "{id}",
                "data-state-key": "{state_key}",
                value: "{value}",
                disabled: inert,
                oninput: move |event| on_change.call(event.value()),
            }
        }
    }
}

#[component]
pub fn Select(
    id: String,
    label: String,
    state_key: String,
    options: Vec<String>,
    value: String,
    inert: bool,
    on_change: EventHandler<String>,
) -> Element {
    rsx! {
        label { r#for: "{id}", "data-component": "Select", "data-node-id": "{id}",
            "{label}"
            select {
                id: "{id}",
                "data-state-key": "{state_key}",
                value: "{value}",
                disabled: inert,
                onchange: move |event| on_change.call(event.value()),
                for option in options { option { value: "{option}", "{option}" } }
            }
        }
    }
}

#[component]
pub fn Button(
    id: String,
    label: String,
    action: ActionSpec,
    inert: bool,
    on_action: EventHandler<ActionSpec>,
) -> Element {
    rsx! {
        button {
            id: "{id}",
            r#type: "button",
            "data-component": "Button",
            "data-node-id": "{id}",
            "data-action": "{action.name}",
            disabled: inert,
            onclick: move |_| on_action.call(action.clone()),
            "{label}"
        }
    }
}

#[component]
pub fn Alert(id: String, tone: String, message: String) -> Element {
    rsx! {
        div {
            class: "alert {tone}",
            role: "status",
            "data-component": "Alert",
            "data-node-id": "{id}",
            "{message}"
        }
    }
}

#[component]
pub fn App() -> Element {
    let surfaces = use_resource(|| async {
        load_surfaces().await.unwrap_or_else(|error| {
            eprintln!("surface-load-error: {error}");
            Vec::new()
        })
    });
    let surface_count = surfaces
        .value()
        .as_ref()
        .map(|items| items.len())
        .unwrap_or(0);

    use_effect(move || {
        if surface_count > 0 {
            println!("DIOXUS_RENDERED surfaces={surface_count}");
        }
    });

    #[cfg(feature = "mobile")]
    use_effect(move || {
        if let Some(items) = surfaces.value().as_ref() {
            if mobile_runtime_check(&items) {
                println!("IOS_EVAL_PASS surfaces={}", items.len());
            }
        }
    });

    rsx! {
        style { "{STYLE}" }
        main {
            h1 { "OpenUI vs A2UI — Dioxus runtime" }
            p { "Same catalog, same Surface, same host behavior." }
            match surfaces.value().as_ref() {
                None => rsx! { p { id: "loading", "Loading surfaces…" } },
                Some(items) => rsx! {
                    div { id: "surface-list", "data-surface-count": "{items.len()}",
                        for (index, surface) in items.iter().cloned().enumerate() {
                            SurfacePanel { key: "{surface.source_hash}-{index}", index, surface }
                        }
                    }
                },
            }
        }
    }
}

#[component]
pub fn StaticSurface(surface: Surface) -> Element {
    let state = surface.fields.clone();
    let on_field: EventHandler<(String, String)> = Callback::new(|_| {});
    let on_action: EventHandler<ActionSpec> = Callback::new(|_| {});
    rsx! {
        section { class: "surface", "data-fingerprint": "{surface.fingerprint()}",
            {render_node(&surface, &state, &surface.root, false, on_field, on_action)}
        }
    }
}

#[component]
fn SurfacePanel(index: usize, surface: Surface) -> Element {
    let mut runtime = use_signal(|| Runtime::new(surface));
    let mut replay = use_signal(|| false);
    let mut status = use_signal(|| "ready".to_owned());

    let view = runtime.read();
    let current_surface = view.surface().clone();
    let state = view.state().clone();
    let effect_count = view.effect_count();
    drop(view);

    let on_field: EventHandler<(String, String)> =
        Callback::new(move |(field, value): (String, String)| {
            if replay() {
                return;
            }
            if runtime.write().set_field(&field, &value).is_ok() {
                status.set(format!("field:{field}"));
            }
        });
    let on_action: EventHandler<ActionSpec> = Callback::new(move |action: ActionSpec| {
        if replay() {
            return;
        }
        let invocation = ActionInvocation {
            invocation_id: format!("{}:{}", action.name, action.expense_id),
            action: action.name,
            expense_id: action.expense_id,
        };
        match runtime.write().invoke(invocation) {
            Ok(receipt) => status.set(format!("receipt:{}:{}", receipt.sequence, receipt.outcome)),
            Err(error) => status.set(format!("action-error:{error}")),
        }
    });
    let apply_update = move |_| {
        let accepted = runtime.read().surface().clone();
        runtime.write().apply_update(accepted);
        status.set("update-preserved-state".into());
    };
    let activate_replay = move |_| match runtime.read().snapshot().replay() {
        Ok(projection) => {
            replay.set(true);
            status.set(format!(
                "replay:{}:effects={}",
                projection.fingerprint, projection.effect_count
            ));
        }
        Err(error) => status.set(format!("replay-error:{error}")),
    };

    rsx! {
        section {
            class: "surface",
            "data-surface-index": "{index}",
            "data-protocol": "{current_surface.protocol:?}",
            "data-fingerprint": "{current_surface.fingerprint()}",
            "data-replay": "{replay}",
            {render_node(&current_surface, &state, &current_surface.root, replay(), on_field, on_action)}
            div { class: "host-controls",
                button { class: "secondary", r#type: "button", "data-host-action": "update", onclick: apply_update, "Apply update" }
                button { class: "secondary", r#type: "button", "data-host-action": "replay", onclick: activate_replay, "Replay inertly" }
            }
            p {
                class: "runtime-status",
                "data-runtime-status": "true",
                "data-effect-count": "{effect_count}",
                "{status}"
            }
        }
    }
}

fn render_node(
    surface: &Surface,
    state: &BTreeMap<String, String>,
    id: &str,
    inert: bool,
    on_field: EventHandler<(String, String)>,
    on_action: EventHandler<ActionSpec>,
) -> Element {
    let node = surface
        .nodes
        .get(id)
        .expect("validated component reference");
    match node {
        TypedNode::Text { id, text } => rsx! { Text { id: id.clone(), text: text.clone() } },
        TypedNode::Stack { id, children } => rsx! {
            Stack { id: id.clone(),
                for child in children {
                    {render_node(surface, state, child, inert, on_field, on_action)}
                }
            }
        },
        TypedNode::Card { id, title, child } => rsx! {
            Card {
                id: id.clone(),
                title: title.clone(),
                child: render_node(surface, state, child, inert, on_field, on_action)
            }
        },
        TypedNode::Table { id, columns, rows } => rsx! {
            Table { id: id.clone(), columns: columns.clone(), rows: rows.clone() }
        },
        TypedNode::Input {
            id,
            label,
            state_key,
            ..
        } => {
            let field = state_key.clone();
            rsx! {
                Input {
                    id: id.clone(),
                    label: label.clone(),
                    state_key: field.clone(),
                    value: state.get(state_key).cloned().unwrap_or_default(),
                    inert,
                    on_change: move |value| on_field.call((field.clone(), value)),
                }
            }
        }
        TypedNode::Select {
            id,
            label,
            state_key,
            options,
            ..
        } => {
            let field = state_key.clone();
            rsx! {
                Select {
                    id: id.clone(),
                    label: label.clone(),
                    state_key: field.clone(),
                    options: options.clone(),
                    value: state.get(state_key).cloned().unwrap_or_default(),
                    inert,
                    on_change: move |value| on_field.call((field.clone(), value)),
                }
            }
        }
        TypedNode::Button { id, label, action } => rsx! {
            Button { id: id.clone(), label: label.clone(), action: action.clone(), inert, on_action }
        },
        TypedNode::Alert { id, tone, message } => rsx! {
            Alert { id: id.clone(), tone: tone.clone(), message: message.clone() }
        },
    }
}

async fn load_surfaces() -> Result<Vec<Surface>, String> {
    #[cfg(feature = "web")]
    {
        let mut eval = document::eval(
            r#"
                const response = await fetch('/surfaces.json', {cache: 'no-store'});
                if (!response.ok) throw new Error(`surface fetch failed: ${response.status}`);
                dioxus.send(await response.text());
            "#,
        );
        let json: String = eval.recv().await.map_err(|error| error.to_string())?;
        serde_json::from_str(&json).map_err(|error| error.to_string())
    }
    #[cfg(feature = "mobile")]
    {
        serde_json::from_str(include_str!("../fixtures/mobile-pair.surfaces.json"))
            .map_err(|error| error.to_string())
    }
    #[cfg(all(not(feature = "web"), not(feature = "mobile")))]
    {
        let path = std::env::var("EVAL_SURFACES_PATH")
            .map_err(|_| "EVAL_SURFACES_PATH is required".to_owned())?;
        let bytes = std::fs::read(path).map_err(|error| error.to_string())?;
        serde_json::from_slice(&bytes).map_err(|error| error.to_string())
    }
}

#[cfg(feature = "mobile")]
fn mobile_runtime_check(surfaces: &[Surface]) -> bool {
    surfaces.iter().all(|surface| {
        let mut runtime = Runtime::new(surface.clone());
        runtime.set_field("review_note", "mobile-check").is_ok()
            && runtime.set_field("status_filter", "all").is_ok()
            && runtime
                .invoke(ActionInvocation {
                    invocation_id: "mobile-exp-001".into(),
                    action: "ApproveExpense".into(),
                    expense_id: "exp-001".into(),
                })
                .is_ok()
            && runtime.effect_count() == 1
            && runtime
                .snapshot()
                .replay()
                .is_ok_and(|replay| replay.effect_count == 0)
    })
}

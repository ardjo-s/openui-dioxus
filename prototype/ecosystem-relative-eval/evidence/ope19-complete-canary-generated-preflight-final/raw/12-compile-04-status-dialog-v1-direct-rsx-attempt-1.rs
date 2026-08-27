use dioxus::prelude::*;

#[allow(non_snake_case)]
pub fn App() -> Element {
    let mut state_dialog_open = use_signal(|| true);
    let mut action_count = use_signal(|| 0usize);
    let mut receipt = use_signal(|| "ready".to_string());
    rsx! {
        main { "data-route": "direct-rsx", div { id: "progress_toolbar", "data-component": "Toolbar", role: "toolbar", aria_label: "Generated interface", aria_orientation: "vertical", "data-orientation": "vertical", section { id: "sync_dialog", "data-component": "Dialog", role: "dialog", aria_label: "Syncing workspace · variant 1", "data-state-key": "dialog_open", "data-open": "{state_dialog_open()}", h2 { "Syncing workspace · variant 1" }, progress { id: "sync_progress", "data-component": "Progress", aria_label: "Sync progress · variant 1", value: "20", max: "100" }, button { id: "sync_button", "data-component": "Button", r#type: "button", "data-action": "ApplyFilter", "data-target-id": "sync", onclick: move |_| { action_count.with_mut(|count| *count += 1); receipt.set(format!("receipt:{}:{}", "ApplyFilter", "sync")); }, "Acknowledge sync · variant 1" } } }, p { role: "status", aria_live: "polite", "data-action-count": "{action_count()}", "data-receipt": "{receipt()}", "{receipt()}" } }
    }
}

use dioxus::prelude::*;

#[allow(non_snake_case)]
pub fn App() -> Element {
    let mut state_notifications_enabled = use_signal(|| true);
    let mut state_terms_accepted = use_signal(|| false);
    let mut action_count = use_signal(|| 0usize);
    let mut receipt = use_signal(|| "ready".to_string());
    rsx! {
        main { "data-route": "direct-rsx", div { id: "preferences_toolbar", "data-component": "Toolbar", role: "toolbar", aria_label: "Generated interface", aria_orientation: "vertical", "data-orientation": "vertical", button { id: "notifications_switch", "data-component": "Switch", role: "switch", aria_checked: "{state_notifications_enabled()}", "data-state-key": "notifications_enabled", onclick: move |_| state_notifications_enabled.set(!state_notifications_enabled()), "Enable notifications · variant 1" }, input { id: "terms_checkbox", "data-component": "Checkbox", r#type: "checkbox", aria_label: "Accept terms · variant 1", "data-state-key": "terms_accepted", checked: state_terms_accepted(), onchange: move |event| state_terms_accepted.set(event.checked()) }, button { id: "preferences_button", "data-component": "Button", r#type: "button", "data-action": "ApplyFilter", "data-target-id": "preferences", onclick: move |_| { action_count.with_mut(|count| *count += 1); receipt.set(format!("receipt:{}:{}", "ApplyFilter", "preferences")); }, "Save preferences · variant 1" } }, p { role: "status", aria_live: "polite", "data-action-count": "{action_count()}", "data-receipt": "{receipt()}", "{receipt()}" } }
    }
}

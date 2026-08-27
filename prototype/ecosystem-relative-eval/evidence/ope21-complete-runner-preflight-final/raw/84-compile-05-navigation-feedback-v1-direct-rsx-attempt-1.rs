use dioxus::prelude::*;

#[allow(non_snake_case)]
pub fn App() -> Element {
    let mut state_active_tab = use_signal(|| "activity".to_string());
    let mut action_count = use_signal(|| 0usize);
    let mut receipt = use_signal(|| "ready".to_string());
    rsx! {
        main { "data-route": "direct-rsx", div { id: "navigation_toolbar", "data-component": "Toolbar", role: "toolbar", aria_label: "Generated interface", aria_orientation: "vertical", "data-orientation": "vertical", div { id: "account_tabs", "data-component": "Tabs", role: "tablist", "data-state-key": "active_tab", "data-value": "{state_active_tab()}", button { role: "tab", "data-value": "activity", onclick: move |_| state_active_tab.set("activity".to_string()), "Activity · variant 1" }, section { role: "tabpanel", div { id: "saved_toast", "data-component": "Toast", role: "status", "data-tone": "success", strong { "Saved · variant 1" }, "Your activity view is current. · variant 1" } } }, button { id: "activity_button", "data-component": "Button", r#type: "button", "data-action": "ApplyFilter", "data-target-id": "activity", onclick: move |_| { action_count.with_mut(|count| *count += 1); receipt.set(format!("receipt:{}:{}", "ApplyFilter", "activity")); }, "Refresh activity · variant 1" } }, p { role: "status", aria_live: "polite", "data-action-count": "{action_count()}", "data-receipt": "{receipt()}", "{receipt()}" } }
    }
}

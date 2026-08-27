use dioxus::prelude::*;

#[allow(non_snake_case)]
pub fn App() -> Element {
    let mut state_role_filter = use_signal(|| "All".to_string());
    let mut action_count = use_signal(|| 0usize);
    let mut receipt = use_signal(|| "ready".to_string());
    rsx! {
        main { "data-route": "direct-rsx", div { id: "filter_toolbar", "data-component": "Toolbar", role: "toolbar", aria_label: "Generated interface", aria_orientation: "horizontal", "data-orientation": "horizontal", select { id: "role_select", "data-component": "Select", aria_label: "Role · variant 1", "data-state-key": "role_filter", value: "{state_role_filter()}", onchange: move |event| state_role_filter.set(event.value()), option { value: "All", selected: state_role_filter() == "All", "All" }, option { value: "Admin", selected: state_role_filter() == "Admin", "Admin" }, option { value: "Member", selected: state_role_filter() == "Member", "Member" } }, button { id: "filter_button", "data-component": "Button", r#type: "button", "data-action": "ApplyFilter", "data-target-id": "people", onclick: move |_| { action_count.with_mut(|count| *count += 1); receipt.set(format!("receipt:{}:{}", "ApplyFilter", "people")); }, "Apply · variant 1" } }, p { role: "status", aria_live: "polite", "data-action-count": "{action_count()}", "data-receipt": "{receipt()}", "{receipt()}" } }
    }
}

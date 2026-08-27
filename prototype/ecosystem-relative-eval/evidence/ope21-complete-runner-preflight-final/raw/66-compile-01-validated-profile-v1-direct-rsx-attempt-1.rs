use dioxus::prelude::*;

#[allow(non_snake_case)]
pub fn App() -> Element {
    let mut state_profile_name = use_signal(|| "Ada-1".to_string());
    let mut action_count = use_signal(|| 0usize);
    let mut receipt = use_signal(|| "ready".to_string());
    rsx! {
        main { "data-route": "direct-rsx", div { id: "profile_toolbar", "data-component": "Toolbar", role: "toolbar", aria_label: "Generated interface", aria_orientation: "vertical", "data-orientation": "vertical", div { id: "profile_avatar", "data-component": "Avatar", role: "img", aria_label: "Ada Lovelace · variant 1", "AL" }, label { id: "name_label", "data-component": "Label", r#for: "name_input", "Profile name · variant 1" }, input { id: "name_input", "data-component": "Input", aria_label: "Profile name · variant 1", "data-state-key": "profile_name", value: "{state_profile_name()}", placeholder: "Enter a name · variant 1", oninput: move |event| state_profile_name.set(event.value()) }, button { id: "submit_button", "data-component": "Button", r#type: "button", "data-action": "SubmitProfile", "data-target-id": "profile", onclick: move |_| { action_count.with_mut(|count| *count += 1); receipt.set(format!("receipt:{}:{}", "SubmitProfile", "profile")); }, "Save profile · variant 1" } }, p { role: "status", aria_live: "polite", "data-action-count": "{action_count()}", "data-receipt": "{receipt()}", "{receipt()}" } }
    }
}

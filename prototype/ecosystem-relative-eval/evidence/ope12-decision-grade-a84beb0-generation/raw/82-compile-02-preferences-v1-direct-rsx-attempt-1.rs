use dioxus::prelude::*;

pub fn App() -> Element {
    let mut notifications_enabled = use_signal(|| true);
    let mut terms_accepted = use_signal(|| false);
    let mut action_count = use_signal(|| 0u32);
    let mut receipt = use_signal(|| String::new());

    rsx! {
        main {
            id: "preferences_root",
            "data-route": "direct-rsx",

            section {
                id: "preferences_toolbar",
                "data-component": "Toolbar",
                role: "toolbar",
                "aria-label": "Preferences",
                "aria-orientation": "vertical",

                div {
                    id: "notifications_switch",
                    "data-component": "Switch",

                    label {
                        r#for: "notifications_switch_control",
                        "Enable notifications · variant 1"
                    }
                    input {
                        id: "notifications_switch_control",
                        r#type: "checkbox",
                        role: "switch",
                        checked: notifications_enabled(),
                        "aria-checked": notifications_enabled(),
                        onchange: move |event| {
                            notifications_enabled.set(event.checked());
                        }
                    }
                }

                div {
                    id: "terms_checkbox",
                    "data-component": "Checkbox",

                    label {
                        r#for: "terms_checkbox_control",
                        "Accept terms · variant 1"
                    }
                    input {
                        id: "terms_checkbox_control",
                        r#type: "checkbox",
                        checked: terms_accepted(),
                        onchange: move |event| {
                            terms_accepted.set(event.checked());
                        }
                    }
                }

                button {
                    id: "preferences_button",
                    "data-component": "Button",
                    "data-action": "ApplyFilter",
                    "data-target-id": "preferences",
                    r#type: "button",
                    onclick: move |_| {
                        action_count += 1;
                        receipt.set("receipt:ApplyFilter:preferences".to_string());
                    },
                    "Save preferences · variant 1"
                }
            }

            output {
                role: "status",
                "aria-live": "polite",
                "data-action-count": "{action_count()}",
                "data-receipt": "{receipt()}",
                "{receipt()}"
            }
        }
    }
}
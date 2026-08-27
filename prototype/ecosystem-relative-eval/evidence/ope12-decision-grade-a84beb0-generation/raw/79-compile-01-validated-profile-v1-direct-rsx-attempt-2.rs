use dioxus::prelude::*;

pub fn App() -> Element {
    let mut profile_name = use_signal(|| "Ada-1".to_string());
    let mut action_count = use_signal(|| 0u32);
    let mut receipt = use_signal(|| String::new());

    rsx! {
        main {
            "data-route": "direct-rsx",
            div {
                id: "profile_toolbar",
                "data-component": "Toolbar",
                role: "toolbar",
                "aria-orientation": "vertical",
                aria_label: "Profile actions",
                style: "display: flex; flex-direction: column; gap: 0.75rem;",

                div {
                    id: "profile_avatar",
                    "data-component": "Avatar",
                    role: "img",
                    aria_label: "Ada Lovelace · variant 1",
                    style: "width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: #6b7280; color: white; font-size: 22px;",
                    "AL"
                }

                label {
                    id: "name_label",
                    "data-component": "Label",
                    r#for: "name_input",
                    "Profile name · variant 1"
                }

                input {
                    id: "name_input",
                    "data-component": "Input",
                    r#type: "text",
                    value: "{profile_name}",
                    placeholder: "Enter a name · variant 1",
                    oninput: move |event| profile_name.set(event.value()),
                    style: "outline: 2px solid #2563eb; outline-offset: 2px;"
                }

                button {
                    id: "submit_button",
                    "data-component": "Button",
                    "data-action": "SubmitProfile",
                    "data-target-id": "profile",
                    r#type: "button",
                    onclick: move |_| {
                        action_count.set(action_count() + 1);
                        receipt.set("receipt:SubmitProfile:profile".to_string());
                    },
                    style: "outline: 2px solid #2563eb; outline-offset: 2px;",
                    "Save profile · variant 1"
                }
            }

            div {
                role: "status",
                "aria-live": "polite",
                "data-action-count": "{action_count}",
                "data-receipt": "{receipt}",
                "{receipt}"
            }
        }
    }
}
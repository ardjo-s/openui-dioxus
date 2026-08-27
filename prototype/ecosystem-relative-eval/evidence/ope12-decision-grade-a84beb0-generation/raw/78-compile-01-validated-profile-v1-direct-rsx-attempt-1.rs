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
                style: "display: flex; flex-direction: column; gap: 0.75rem;",

                img {
                    id: "profile_avatar",
                    "data-component": "Avatar",
                    role: "img",
                    alt: "Ada Lovelace · variant 1",
                    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%236b7280'/%3E%3Ctext x='32' y='40' text-anchor='middle' fill='white' font-size='22'%3EAL%3C/text%3E%3C/svg%3E",
                }

                label {
                    id: "name_label",
                    "data-component": "Label",
                    r#for: "name_input",
                    "Profile name · variant 1",
                }

                input {
                    id: "name_input",
                    "data-component": "Input",
                    r#type: "text",
                    value: "{profile_name}",
                    placeholder: "Enter a name · variant 1",
                    oninput: move |event| profile_name.set(event.value()),
                    style: "outline: 2px solid transparent; outline-offset: 2px;",
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
                    style: "outline: 2px solid transparent; outline-offset: 2px;",
                    "Save profile · variant 1",
                }
            }

            div {
                role: "status",
                "aria-live": "polite",
                "data-action-count": "{action_count}",
                "data-receipt": "{receipt}",
                "{receipt}",
            }
        }
    }
}
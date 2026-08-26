use dioxus::prelude::*;

pub fn App() -> Element {
    let mut role_filter = use_signal(|| "All".to_string());
    let mut action_count = use_signal(|| 0u32);
    let mut receipt = use_signal(|| String::new());

    rsx! {
        style {
            "button:focus-visible, select:focus-visible {{ outline: 3px solid #2563eb; outline-offset: 2px; }}"
        }
        div {
            id: "filter_toolbar_root",
            "data-route": "direct-rsx",
            div {
                id: "filter_toolbar",
                "data-component": "Toolbar",
                role: "toolbar",
                "aria-label": "Filter actions",
                "aria-orientation": "horizontal",
                style: "display: flex; gap: 0.75rem; align-items: end;",
                div {
                    id: "role_select",
                    "data-component": "Select",
                    label {
                        r#for: "role_filter",
                        "Role · variant 1"
                    }
                    select {
                        id: "role_filter",
                        name: "role_filter",
                        value: "{role_filter}",
                        onchange: move |event| {
                            role_filter.set(event.value());
                        },
                        option { value: "All", "All" }
                        option { value: "Admin", "Admin" }
                        option { value: "Member", "Member" }
                    }
                }
                button {
                    id: "filter_button",
                    "data-component": "Button",
                    "data-action": "ApplyFilter",
                    "data-target-id": "people",
                    r#type: "button",
                    onclick: move |_| {
                        action_count += 1;
                        receipt.set("receipt:ApplyFilter:people".to_string());
                    },
                    "Apply · variant 1"
                }
            }
            div {
                role: "status",
                "aria-live": "polite",
                "data-action-count": "{action_count}",
                "data-receipt": "{receipt}",
                style: "display: block;",
                "{receipt}"
            }
        }
    }
}
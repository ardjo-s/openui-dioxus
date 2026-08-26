use dioxus::prelude::*;

pub fn App() -> Element {
    let mut role_filter = use_signal(|| "All".to_string());
    let mut action_count = use_signal(|| 0u32);
    let mut receipt = use_signal(String::new);

    rsx! {
        main {
            id: "filter_toolbar",
            "data-route": "direct-rsx",
            "data-component": "Toolbar",
            role: "toolbar",
            "aria-orientation": "horizontal",
            h2 { "People filters" }
            div {
                id: "role_select",
                "data-component": "Select",
                label {
                    r#for: "role_filter_input",
                    "Role · variant 1"
                }
                select {
                    id: "role_filter_input",
                    name: "role_filter",
                    value: "{role_filter}",
                    onchange: move |event| role_filter.set(event.value()),
                    option { value: "All", "All" }
                    option { value: "Admin", "Admin" }
                    option { value: "Member", "Member" }
                }
            }
            div {
                id: "filter_button",
                "data-component": "Button",
                button {
                    r#type: "button",
                    "data-action": "ApplyFilter",
                    "data-target-id": "people",
                    onclick: move |_| {
                        let next_count = action_count() + 1;
                        action_count.set(next_count);
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
                "Action receipt: {receipt}"
            }
        }
    }
}
use dioxus::prelude::*;

pub fn App() -> Element {
    let mut role_filter = use_signal(|| "All".to_string());
    let mut action_count = use_signal(|| 0u32);
    let mut receipt = use_signal(String::new);

    rsx! {
        div {
            id: "filter_toolbar",
            "data-route": "direct-rsx",
            "data-component": "Toolbar",
            role: "toolbar",
            "aria-label": "Role filter actions",
            "aria-orientation": "horizontal",

            label {
                r#for: "role_select",
                "Role · variant 1"
            }
            select {
                id: "role_select",
                "data-component": "Select",
                name: "role_filter",
                aria_label: "Role · variant 1",
                value: "{role_filter}",
                onchange: move |event| role_filter.set(event.value()),
                option { value: "All", "All" }
                option { value: "Admin", "Admin" }
                option { value: "Member", "Member" }
            }
            button {
                id: "filter_button",
                "data-component": "Button",
                "data-action": "ApplyFilter",
                "data-target-id": "people",
                onclick: move |_| {
                    action_count += 1;
                    receipt.set("receipt:ApplyFilter:people".to_string());
                },
                "Apply · variant 1"
            }
            div {
                role: "status",
                "data-action-count": "{action_count}",
                "data-receipt": "{receipt}",
                "{receipt}"
            }
        }
    }
}
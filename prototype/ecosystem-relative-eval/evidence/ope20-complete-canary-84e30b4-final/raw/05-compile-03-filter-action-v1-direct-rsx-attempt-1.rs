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
            "aria-label": "Filter actions",
            "aria-orientation": "horizontal",

            label {
                for: "role_select",
                "data-component": "Select",
                "aria-label": "Role · variant 1",
                "Role · variant 1"
            }

            select {
                id: "role_select",
                "data-component": "Select",
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
                "aria-live": "polite",
                "data-action-count": "{action_count}",
                "data-receipt": "{receipt}",
                "{receipt}"
            }
        }
    }
}
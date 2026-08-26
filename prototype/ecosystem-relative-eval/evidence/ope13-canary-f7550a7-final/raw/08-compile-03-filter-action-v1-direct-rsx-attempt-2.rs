use dioxus::prelude::*;

pub fn App() -> Element {
    let mut role_filter = use_signal(|| "All".to_string());
    let mut action_count = use_signal(|| 0u32);
    let mut receipt = use_signal(|| "receipt:none:".to_string());

    rsx! {
        main {
            id: "filter_toolbar",
            "data-route": "direct-rsx",
            "data-component": "Toolbar",
            role: "toolbar",
            "aria-label": "Filter actions",
            "aria-orientation": "horizontal",
            style: "display:flex;gap:12px;align-items:end;",

            select {
                id: "role_select",
                "data-component": "Select",
                "aria-label": "Role · variant 1",
                name: "role_filter",
                value: "{role_filter}",
                onchange: move |event| role_filter.set(event.value().to_string()),
                option { value: "All", "All" }
                option { value: "Admin", "Admin" }
                option { value: "Member", "Member" }
            }

            button {
                id: "filter_button",
                "data-component": "Button",
                r#type: "button",
                "data-action": "ApplyFilter",
                "data-target-id": "people",
                onclick: move |_| {
                    action_count.set(action_count() + 1);
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
use dioxus::prelude::*;

pub fn App() -> Element {
    let mut active_tab = use_signal(|| "activity");
    let mut action_count = use_signal(|| 0usize);
    let mut receipt = use_signal(String::new);

    rsx! {
        main {
            id: "navigation_toolbar",
            "data-route": "direct-rsx",
            "data-component": "Toolbar",
            role: "toolbar",
            aria_label: "Navigation toolbar",
            aria_orientation: "vertical",
            style: "outline: 2px solid transparent;",

            section {
                id: "account_tabs",
                "data-component": "Tabs",
                role: "tablist",
                aria_label: "Activity navigation",

                button {
                    id: "activity_tab",
                    role: "tab",
                    aria_selected: "{active_tab() == \"activity\"}",
                    aria_controls: "activity_panel",
                    tabindex: "0",
                    onclick: move |_| active_tab.set("activity"),
                    "Activity · variant 1"
                }

                section {
                    id: "activity_panel",
                    role: "tabpanel",
                    aria_labelledby: "activity_tab",
                    tabindex: "0",

                    div {
                        id: "saved_toast",
                        "data-component": "Toast",
                        role: "status",
                        aria_label: "Saved · variant 1",
                        "Saved · variant 1",
                        p { "Your activity view is current. · variant 1" }
                    }
                }
            }

            button {
                id: "activity_button",
                "data-component": "Button",
                "data-action": "ApplyFilter",
                "data-target-id": "activity",
                onclick: move |_| {
                    action_count += 1;
                    receipt.set("receipt:ApplyFilter:activity".to_string());
                },
                "Refresh activity · variant 1"
            }

            div {
                role: "status",
                "data-action-count": "{action_count()}",
                "data-receipt": "{receipt()}",
                aria_live: "polite",
                "{receipt()}"
            }
        }
    }
}
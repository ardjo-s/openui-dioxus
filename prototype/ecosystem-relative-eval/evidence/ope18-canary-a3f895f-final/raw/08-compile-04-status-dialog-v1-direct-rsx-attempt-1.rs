use dioxus::prelude::*;

pub fn App() -> Element {
    let dialog_open = use_signal(|| true);
    let action_count = use_signal(|| 0u32);
    let receipt = use_signal(|| String::new());

    rsx! {
        main {
            "data-route": "direct-rsx",
            id: "progress_toolbar",
            "data-component": "Toolbar",
            role: "toolbar",
            "aria-orientation": "vertical",
            tabindex: "0",

            dialog {
                id: "sync_dialog",
                "data-component": "Dialog",
                role: "dialog",
                "aria-label": "Syncing workspace · variant 1",
                open: dialog_open(),

                h2 { "Syncing workspace · variant 1" }

                progress {
                    id: "sync_progress",
                    "data-component": "Progress",
                    aria_label: "Sync progress · variant 1",
                    value: "20",
                    max: "100",
                    "20%"
                }

                button {
                    id: "sync_button",
                    "data-component": "Button",
                    "data-action": "ApplyFilter",
                    "data-target-id": "sync",
                    onclick: move |_| {
                        let next_count = action_count() + 1;
                        action_count.set(next_count);
                        receipt.set("receipt:ApplyFilter:sync".to_string());
                    },
                    "Acknowledge sync · variant 1"
                }
            }

            div {
                role: "status",
                aria_live: "polite",
                "data-action-count": "{action_count()}",
                "data-receipt": "{receipt()}",
                "{receipt()}"
            }
        }
    }
}
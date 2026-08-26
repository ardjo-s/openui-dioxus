use dioxus::prelude::*;

pub fn App() -> Element {
    let dialog_open = use_signal(|| true);
    let mut action_count = use_signal(|| 0u32);
    let mut receipt = use_signal(|| String::new());

    rsx! {
        div {
            id: "progress_toolbar",
            "data-component": "Toolbar",
            "data-route": "direct-rsx",
            role: "toolbar",
            "aria-label": "Sync progress controls",
            "aria-orientation": "vertical",

            dialog {
                id: "sync_dialog",
                "data-component": "Dialog",
                open: dialog_open,
                "aria-labelledby": "sync_dialog_title",

                h2 {
                    id: "sync_dialog_title",
                    "Syncing workspace · variant 1"
                }

                progress {
                    id: "sync_progress",
                    "data-component": "Progress",
                    "aria-label": "Sync progress · variant 1",
                    value: "20",
                    max: "100"
                }

                button {
                    id: "sync_button",
                    "data-component": "Button",
                    "data-action": "ApplyFilter",
                    "data-target-id": "sync",
                    onclick: move |_| {
                        action_count += 1;
                        receipt.set("receipt:ApplyFilter:sync".to_string());
                    },
                    "Acknowledge sync · variant 1"
                }
            }

            div {
                role: "status",
                "aria-live": "polite",
                data_action_count: "{action_count}",
                data_receipt: "{receipt}",
                "{receipt}"
            }
        }
    }
}
use dioxus::prelude::*;

pub fn App() -> Element {
    let mut dialog_open = use_signal(|| true);
    let mut action_count = use_signal(|| 0u32);
    let mut receipt = use_signal(String::new);

    rsx! {
        div {
            id: "progress_toolbar",
            "data-component": "Toolbar",
            "data-route": "direct-rsx",
            "data-orientation": "vertical",
            dialog {
                id: "sync_dialog",
                "data-component": "Dialog",
                title: "Syncing workspace · variant 1",
                open: dialog_open(),
                section {
                    id: "sync_progress",
                    "data-component": "Progress",
                    aria_label: "Sync progress · variant 1",
                    progress {
                        value: 20,
                        max: 100,
                    }
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
                "data-action-count": "{action_count}",
                "data-receipt": "{receipt}",
                "{receipt}"
            }
        }
    }
}
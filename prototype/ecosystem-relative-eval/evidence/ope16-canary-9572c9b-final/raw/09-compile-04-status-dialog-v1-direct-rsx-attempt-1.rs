use dioxus::prelude::*;

pub fn App() -> Element {
    let mut dialog_open = use_signal(|| true);
    let mut action_count = use_signal(|| 0u32);
    let mut receipt = use_signal(|| String::new());

    rsx! {
        div {
            "data-route": "direct-rsx",

            div {
                id: "progress_toolbar",
                "data-component": "Toolbar",
                role: "toolbar",
                "aria-label": "Workspace sync controls",
                "aria-orientation": "vertical",

                dialog {
                    id: "sync_dialog",
                    "data-component": "Dialog",
                    role: "dialog",
                    "aria-labelledby": "sync_dialog_title",
                    open: dialog_open(),

                    h2 {
                        id: "sync_dialog_title",
                        "Syncing workspace · variant 1"
                    }

                    progress {
                        id: "sync_progress",
                        "data-component": "Progress",
                        aria-label: "Sync progress · variant 1",
                        value: "20",
                        max: "100"
                    }

                    button {
                        id: "sync_button",
                        "data-component": "Button",
                        "data-action": "ApplyFilter",
                        "data-target-id": "sync",
                        style: "outline: 2px solid currentColor; outline-offset: 2px;",
                        onclick: move |_| {
                            action_count += 1;
                            receipt.set("receipt:ApplyFilter:sync".to_string());
                        },
                        "Acknowledge sync · variant 1"
                    }
                }
            }

            div {
                role: "status",
                "aria-live": "polite",
                "data-action-count": "{action_count()}",
                "data-receipt": "{receipt()}",
                "Action count: {action_count()} Receipt: {receipt()}"
            }
        }
    }
}
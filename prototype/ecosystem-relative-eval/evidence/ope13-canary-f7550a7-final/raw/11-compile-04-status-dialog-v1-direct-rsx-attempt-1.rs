use dioxus::prelude::*;

pub fn App() -> Element {
    let mut dialog_open = use_signal(|| true);
    let mut action_count = use_signal(|| 0u32);
    let mut receipt = use_signal(|| String::new());

    rsx! {
        div {
            id: "progress_toolbar",
            "data-component": "Toolbar",
            "data-route": "direct-rsx",
            role: "toolbar",
            "aria-label": "Sync status controls",
            "aria-orientation": "vertical",
            style: "display: flex; flex-direction: column; gap: 1rem; padding: 1rem;",

            dialog {
                id: "sync_dialog",
                "data-component": "Dialog",
                open: dialog_open(),
                "aria-labelledby": "sync_dialog_title",
                style: "padding: 1rem; border: 1px solid #888;",

                h2 {
                    id: "sync_dialog_title",
                    "Syncing workspace · variant 1"
                }

                progress {
                    id: "sync_progress",
                    "data-component": "Progress",
                    aria_label: "Sync progress · variant 1",
                    value: "20",
                    max: "100"
                }

                button {
                    id: "sync_button",
                    "data-component": "Button",
                    "data-action": "ApplyFilter",
                    "data-target-id": "sync",
                    style: "outline: 3px solid transparent; outline-offset: 2px;",
                    onclick: move |_| {
                        action_count.set(action_count() + 1);
                        receipt.set("receipt:ApplyFilter:sync".to_string());
                    },
                    "Acknowledge sync · variant 1"
                }
            }

            div {
                role: "status",
                "aria-live": "polite",
                "data-action-count": "{action_count()}",
                "data-receipt": "{receipt()}",
                style: "min-height: 1.5rem;",
                "{receipt()}"
            }
        }
    }
}
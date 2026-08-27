use dioxus::prelude::*;

pub fn App() -> Element {
    let mut dialog_open = use_signal(|| true);
    let mut action_count = use_signal(|| 0u32);
    let mut receipt = use_signal(|| String::new());

    rsx! {
        div {
            id: "progress_toolbar",
            "data-route": "direct-rsx",
            "data-component": "Toolbar",
            role: "toolbar",
            "aria-label": "Sync status controls",
            "aria-orientation": "vertical",

            dialog {
                id: "sync_dialog",
                "data-component": "Dialog",
                role: "dialog",
                "aria-label": "Syncing workspace · variant 1",
                open: *dialog_open.read(),

                h2 { "Syncing workspace · variant 1" }

                progress {
                    id: "sync_progress",
                    "data-component": "Progress",
                    role: "progressbar",
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
                "data-action-count": "{action_count}",
                "data-receipt": "{receipt}"
            }
        }
    }
}
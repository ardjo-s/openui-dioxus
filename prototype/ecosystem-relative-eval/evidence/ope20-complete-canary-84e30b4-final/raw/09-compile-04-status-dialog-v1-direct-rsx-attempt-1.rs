use dioxus::prelude::*;

pub fn App() -> Element {
    let mut dialog_open = use_signal(|| true);
    let mut action_count = use_signal(|| 0u32);
    let mut receipt = use_signal(|| String::new());

    rsx! {
        main {
            id: "progress_toolbar",
            "data-route": "direct-rsx",
            "data-component": "Toolbar",
            role: "toolbar",
            "aria-label": "Workspace sync controls",
            "aria-orientation": "vertical",
            section {
                id: "sync_dialog",
                "data-component": "Dialog",
                role: "dialog",
                "aria-labelledby": "sync_dialog_title",
                open: (dialog_open)(),
                h2 {
                    id: "sync_dialog_title",
                    "Syncing workspace · variant 1"
                }
                div {
                    id: "sync_progress",
                    "data-component": "Progress",
                    role: "progressbar",
                    "aria-label": "Sync progress · variant 1",
                    "aria-valuenow": "20",
                    "aria-valuemin": "0",
                    "aria-valuemax": "100",
                    "aria-valuetext": "20%",
                    style: "width: 100%; height: 1rem; background: linear-gradient(to right, #2563eb 20%, #d1d5db 20%);"
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
                "data-receipt": "{receipt}",
                "Action count: {action_count} Receipt: {receipt}"
            }
        }
    }
}
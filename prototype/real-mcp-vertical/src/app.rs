use dioxus::prelude::*;
use openui_dioxus_real_mcp_prototype::{CatalogAdapter, CompactCatalog, LedgerCatalog, Surface};

#[cfg(not(feature = "desktop"))]
use openui_dioxus_real_mcp_prototype::Expense;

#[cfg(feature = "desktop")]
use openui_dioxus_real_mcp_prototype::{baseline::ThinBaseline, McpClient, Runtime};

#[cfg(not(feature = "desktop"))]
use openui_dioxus_real_mcp_prototype::baseline::ThinBaseline;

#[derive(Clone)]
struct Boot {
    surface: Surface,
    mcp_result: serde_json::Value,
}

#[cfg(feature = "desktop")]
fn initial_boot() -> Boot {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let mut client = McpClient::spawn(root).expect("Desktop must start the real local MCP server");
    client
        .list_tools()
        .expect("Desktop tools/list must succeed");
    let result = client
        .call_tool("list_pending_expenses", serde_json::json!({}))
        .expect("Desktop tools/call must succeed");
    let semantic = Runtime::surface_from_mcp(&result).expect("MCP result must map to semantics");
    let proposal = format!(
        "root = ExpenseReview({}, {}, {})",
        serde_json::to_string(&semantic.title).unwrap(),
        serde_json::to_string(&semantic.expenses).unwrap(),
        serde_json::to_string(&semantic.action_label).unwrap()
    );
    let surface = Runtime::default()
        .propose_with_oracle(root, &proposal)
        .expect("Desktop OpenUI oracle must commit the Surface");
    if let Ok(path) = std::env::var("OPENUI_DIOXUS_LAUNCH_EVIDENCE") {
        std::fs::write(
            path,
            format!("desktop_live: PASS fingerprint={}\n", surface.fingerprint()),
        )
        .expect("write Desktop launch evidence");
    }
    Boot {
        surface,
        mcp_result: result,
    }
}

#[cfg(not(feature = "desktop"))]
fn initial_boot() -> Boot {
    let surface = captured_surface();
    let expenses = serde_json::to_value(&surface.expenses).unwrap();
    Boot {
        surface,
        mcp_result: serde_json::json!({ "structuredContent": { "expenses": expenses } }),
    }
}

#[cfg(not(feature = "desktop"))]
fn captured_surface() -> Surface {
    Surface {
        title: "Pending expenses".into(),
        expenses: vec![
            Expense {
                id: "exp-001".into(),
                merchant: "Acme Rail".into(),
                amount_cents: 4280,
                currency: "EUR".into(),
                status: "pending".into(),
            },
            Expense {
                id: "exp-002".into(),
                merchant: "Cafe Compile".into(),
                amount_cents: 1860,
                currency: "EUR".into(),
                status: "pending".into(),
            },
        ],
        action_label: "Approve exp-001".into(),
    }
}

#[component]
pub fn App() -> Element {
    let mut compact = use_signal(|| false);
    let mut inert = use_signal(|| false);
    let mut baseline = use_signal(|| false);
    let boot = use_hook(initial_boot);
    let surface = &boot.surface;
    let rendered = if compact() {
        CompactCatalog.render_text(surface)
    } else {
        LedgerCatalog.render_text(surface)
    };
    let rendered = if inert() {
        format!("{rendered}\n[REPLAY PRESENTATION — evidence binary enforces replay capability]")
    } else {
        rendered
    };
    let adapter_id = if compact() {
        CompactCatalog.build_id()
    } else {
        LedgerCatalog.build_id()
    };
    rsx! {
        style { "body {{ font-family: system-ui; background: #f4f6fa; color: #182033; margin: 0; }} main {{ max-width: 760px; margin: 40px auto; background: white; padding: 24px; border-radius: 14px; }} button {{ margin-right: 8px; padding: 8px 12px; }} pre {{ white-space: pre-wrap; background: #eef2f8; padding: 16px; border-radius: 8px; }}" }
        main {
            h1 { "Real OpenUI-Dioxus MCP prototype" }
            p { "Desktop runs MCP → pinned OpenUI oracle → Surface. Web and Mobile compile the same captured semantic Surface." }
            button { onclick: move |_| compact.toggle(), "Swap compiled catalog" }
            button { onclick: move |_| inert.toggle(), "Toggle replay presentation" }
            button { onclick: move |_| baseline.toggle(), "Toggle thin baseline" }
            p { "Adapter: {adapter_id}" }
            pre { "{rendered}" }
            if baseline() {
                ThinBaseline { result: boot.mcp_result.clone() }
            }
        }
    }
}

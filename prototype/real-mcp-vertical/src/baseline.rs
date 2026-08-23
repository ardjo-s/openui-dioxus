use serde_json::Value;
use std::path::Path;

use crate::McpClient;

#[cfg(any(feature = "desktop", feature = "web", feature = "mobile"))]
use dioxus::dioxus_core;
#[cfg(any(feature = "desktop", feature = "web", feature = "mobile"))]
use dioxus::prelude::Props;

/// Honest thin baseline: decode the MCP result just enough to render it directly.
/// It deliberately has no canonical Surface, adapter contract, action receipt, or replay layer.
pub fn render_direct(result: &Value) -> Result<String, String> {
    let expenses = result
        .pointer("/structuredContent/expenses")
        .and_then(Value::as_array)
        .ok_or("missing expenses")?;
    let rows = expenses
        .iter()
        .map(|expense| {
            let id = expense.get("id").and_then(Value::as_str).unwrap_or("?");
            let merchant = expense
                .get("merchant")
                .and_then(Value::as_str)
                .unwrap_or("?");
            let cents = expense
                .get("amount_cents")
                .and_then(Value::as_u64)
                .unwrap_or(0);
            format!("{id}: {merchant} {:.2} EUR", cents as f64 / 100.0)
        })
        .collect::<Vec<_>>()
        .join("\n");
    Ok(format!("Pending expenses\n{rows}\nApprove exp-001"))
}

/// Direct action with no typed claim or durable receipt.
pub fn approve_direct(client: &mut McpClient, expense_id: &str) -> Result<String, String> {
    let response = client.call_tool(
        "approve_expense",
        serde_json::json!({ "expense_id": expense_id }),
    )?;
    response
        .pointer("/structuredContent/status")
        .and_then(Value::as_str)
        .map(str::to_owned)
        .ok_or("direct approval missing status".into())
}

/// Thin replay: persist and reload the raw MCP result. It is useful, but does
/// not enforce an inert effect boundary or pin adapter/runtime semantics.
pub fn capture_direct(result: &Value, path: &Path) -> Result<(), String> {
    std::fs::write(
        path,
        serde_json::to_vec_pretty(result).map_err(|e| e.to_string())?,
    )
    .map_err(|e| format!("write direct capture: {e}"))
}

pub fn replay_direct(path: &Path) -> Result<Value, String> {
    serde_json::from_slice(&std::fs::read(path).map_err(|e| format!("read direct capture: {e}"))?)
        .map_err(|e| format!("decode direct capture: {e}"))
}

/// Runnable Dioxus baseline for the exact direct-mapping output above.
#[cfg(any(feature = "desktop", feature = "web", feature = "mobile"))]
#[dioxus::prelude::component]
#[allow(non_snake_case)]
pub fn ThinBaseline(result: Value) -> dioxus::prelude::Element {
    use dioxus::prelude::*;
    let rendered =
        render_direct(&result).unwrap_or_else(|error| format!("Baseline error: {error}"));
    let mut status = use_signal(|| "No direct action yet".to_owned());
    #[cfg(feature = "desktop")]
    let approve = move |_| {
        let root = Path::new(env!("CARGO_MANIFEST_DIR"));
        let outcome = McpClient::spawn(root)
            .and_then(|mut client| approve_direct(&mut client, "exp-001"))
            .unwrap_or_else(|error| format!("failed: {error}"));
        status.set(format!("Direct MCP approval: {outcome}"));
    };
    #[cfg(not(feature = "desktop"))]
    let approve = move |_| status.set("Direct approval requires Desktop stdio".to_owned());
    rsx! {
        section {
            aria_label: "Thin direct Dioxus baseline",
            h2 { "Thin direct Dioxus baseline" }
            pre { "{rendered}" }
            button { onclick: approve, "Approve directly" }
            p { "{status}" }
        }
    }
}

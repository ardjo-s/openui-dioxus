use crate::mcp::McpClient;
use crate::CatalogAdapter;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::Path;
use std::process::{Command, Stdio};

#[derive(Clone, Debug, Deserialize, Hash, PartialEq, Eq, Serialize)]
pub struct Expense {
    pub id: String,
    pub merchant: String,
    pub amount_cents: u64,
    pub currency: String,
    pub status: String,
}

#[derive(Clone, Debug, Hash, PartialEq, Eq, Serialize, Deserialize)]
pub struct Surface {
    pub title: String,
    pub expenses: Vec<Expense>,
    pub action_label: String,
}

impl Surface {
    pub fn fingerprint(&self) -> u64 {
        let mut h = DefaultHasher::new();
        self.hash(&mut h);
        h.finish()
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum TypedAction {
    ApproveExpense { expense_id: String },
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct ActionReceipt {
    pub action: TypedAction,
    pub mcp_status: String,
    pub surface_fingerprint: u64,
}

/// Replay-only capability. It cannot invoke an action or expose a live Surface.
#[derive(Clone, Debug)]
pub struct ReplaySurface {
    surface: Surface,
}

impl ReplaySurface {
    pub fn fingerprint(&self) -> u64 {
        self.surface.fingerprint()
    }

    pub fn render(&self, adapter: &dyn CatalogAdapter) -> String {
        format!(
            "{}\n[REPLAY INERT — no action capability]",
            adapter.render_text(&self.surface)
        )
    }
}

#[derive(Default)]
pub struct Runtime {
    committed: Option<Surface>,
}

impl Runtime {
    pub fn committed(&self) -> Option<&Surface> {
        self.committed.as_ref()
    }

    pub fn propose_with_oracle(&mut self, root: &Path, source: &str) -> Result<Surface, String> {
        let mut child = Command::new("node")
            .arg(root.join("scripts/openui-oracle.mjs"))
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .spawn()
            .map_err(|error| format!("spawn OpenUI oracle: {error}"))?;
        use std::io::Write;
        child
            .stdin
            .as_mut()
            .ok_or("missing oracle stdin")?
            .write_all(source.as_bytes())
            .map_err(|error| format!("write oracle: {error}"))?;
        let output = child
            .wait_with_output()
            .map_err(|error| format!("wait oracle: {error}"))?;
        let oracle: Value = serde_json::from_slice(&output.stdout).map_err(|error| {
            format!(
                "decode oracle: {error}: {}",
                String::from_utf8_lossy(&output.stdout)
            )
        })?;
        if oracle.get("accepted") != Some(&Value::Bool(true)) {
            return Err(format!(
                "OpenUI oracle rejected proposal: {}",
                oracle.get("meta").unwrap_or(&Value::Null)
            ));
        }
        let props = oracle
            .pointer("/root/props")
            .ok_or("oracle root has no props")?;
        let surface = Surface {
            title: props
                .get("title")
                .and_then(Value::as_str)
                .ok_or("missing title")?
                .to_owned(),
            expenses: serde_json::from_value(
                props.get("expenses").cloned().ok_or("missing expenses")?,
            )
            .map_err(|error| format!("decode expenses: {error}"))?,
            action_label: props
                .get("actionLabel")
                .and_then(Value::as_str)
                .ok_or("missing actionLabel")?
                .to_owned(),
        };
        self.committed = Some(surface.clone());
        Ok(surface)
    }

    pub fn surface_from_mcp(result: &Value) -> Result<Surface, String> {
        let expenses: Vec<Expense> = serde_json::from_value(
            result
                .pointer("/structuredContent/expenses")
                .cloned()
                .ok_or("MCP result missing structuredContent.expenses")?,
        )
        .map_err(|error| format!("decode MCP expenses: {error}"))?;
        Ok(Surface {
            title: "Pending expenses".into(),
            expenses,
            action_label: "Approve exp-001".into(),
        })
    }

    pub fn invoke(
        &self,
        client: &mut McpClient,
        action: TypedAction,
        receipt_path: &Path,
    ) -> Result<ActionReceipt, String> {
        let surface = self.committed.as_ref().ok_or("no committed Surface")?;
        let TypedAction::ApproveExpense { expense_id } = &action;
        let response = client.call_tool("approve_expense", json!({ "expense_id": expense_id }))?;
        let status = response
            .pointer("/structuredContent/status")
            .and_then(Value::as_str)
            .ok_or("MCP approval missing status")?
            .to_owned();
        let receipt = ActionReceipt {
            action,
            mcp_status: status,
            surface_fingerprint: surface.fingerprint(),
        };
        fs::write(
            receipt_path,
            serde_json::to_vec_pretty(&receipt).map_err(|error| error.to_string())?,
        )
        .map_err(|error| format!("write receipt: {error}"))?;
        Ok(receipt)
    }

    pub fn capture(&self, path: &Path) -> Result<(), String> {
        let surface = self.committed.as_ref().ok_or("no committed Surface")?;
        fs::write(
            path,
            serde_json::to_vec_pretty(surface).map_err(|error| error.to_string())?,
        )
        .map_err(|error| format!("write capture: {error}"))
    }

    pub fn replay(path: &Path) -> Result<ReplaySurface, String> {
        let surface = serde_json::from_slice(
            &fs::read(path).map_err(|error| format!("read capture: {error}"))?,
        )
        .map_err(|error| format!("decode capture: {error}"))?;
        Ok(ReplaySurface { surface })
    }
}

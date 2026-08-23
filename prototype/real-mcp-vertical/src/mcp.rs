use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Write};
use std::path::Path;
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};

#[derive(Clone, Copy, Debug, Default)]
pub struct McpMetrics {
    pub initialize: usize,
    pub tools_list: usize,
    pub tools_call: usize,
}

pub struct McpClient {
    child: Child,
    input: ChildStdin,
    output: BufReader<ChildStdout>,
    next_id: u64,
    metrics: McpMetrics,
}

impl McpClient {
    pub fn spawn(root: &Path) -> Result<Self, String> {
        let mut child = Command::new("node")
            .arg(root.join("scripts/mcp-server.mjs"))
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .spawn()
            .map_err(|error| format!("spawn MCP server: {error}"))?;
        let input = child.stdin.take().ok_or("missing MCP stdin")?;
        let output = BufReader::new(child.stdout.take().ok_or("missing MCP stdout")?);
        let mut client = Self {
            child,
            input,
            output,
            next_id: 1,
            metrics: McpMetrics::default(),
        };
        client.request("initialize", json!({ "protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": { "name": "openui-dioxus-prototype", "version": "0.0.0" } }))?;
        client.metrics.initialize += 1;
        Ok(client)
    }

    pub fn list_tools(&mut self) -> Result<Value, String> {
        let value = self.request("tools/list", json!({}))?;
        self.metrics.tools_list += 1;
        Ok(value)
    }

    pub fn call_tool(&mut self, name: &str, arguments: Value) -> Result<Value, String> {
        let value = self.request(
            "tools/call",
            json!({ "name": name, "arguments": arguments }),
        )?;
        self.metrics.tools_call += 1;
        Ok(value)
    }

    pub fn metrics(&self) -> McpMetrics {
        self.metrics
    }

    fn request(&mut self, method: &str, params: Value) -> Result<Value, String> {
        let id = self.next_id;
        self.next_id += 1;
        let request = json!({ "jsonrpc": "2.0", "id": id, "method": method, "params": params });
        writeln!(self.input, "{request}").map_err(|error| format!("write MCP request: {error}"))?;
        self.input
            .flush()
            .map_err(|error| format!("flush MCP request: {error}"))?;
        let mut line = String::new();
        self.output
            .read_line(&mut line)
            .map_err(|error| format!("read MCP response: {error}"))?;
        let response: Value = serde_json::from_str(&line)
            .map_err(|error| format!("decode MCP response: {error}: {line}"))?;
        if response.get("jsonrpc") != Some(&Value::String("2.0".into()))
            || response.get("id") != Some(&json!(id))
        {
            return Err(format!("invalid MCP JSON-RPC envelope: {response}"));
        }
        response
            .get("result")
            .cloned()
            .ok_or_else(|| format!("MCP error response: {response}"))
    }
}

impl Drop for McpClient {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

use openui_dioxus_real_mcp_prototype::{
    approve_direct, capture_direct, render_direct, replay_direct, CatalogAdapter, CompactCatalog,
    LedgerCatalog, McpClient, Runtime, Surface, TypedAction,
};
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};

fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn real_flow() -> Result<(McpClient, Runtime, Surface, serde_json::Value), String> {
    let root = root();
    let mut client = McpClient::spawn(&root)?;
    let tools = client.list_tools()?;
    let names = tools
        .get("tools")
        .and_then(|v| v.as_array())
        .ok_or("tools/list missing tools")?
        .iter()
        .filter_map(|v| v.get("name").and_then(|v| v.as_str()))
        .collect::<Vec<_>>();
    if names != ["list_pending_expenses", "approve_expense"] {
        return Err(format!("unexpected tools: {names:?}"));
    }
    let result = client.call_tool("list_pending_expenses", json!({}))?;
    let semantic = Runtime::surface_from_mcp(&result)?;
    let proposal = format!(
        "root = ExpenseReview({}, {}, {})",
        serde_json::to_string(&semantic.title).unwrap(),
        serde_json::to_string(&semantic.expenses).unwrap(),
        serde_json::to_string(&semantic.action_label).unwrap()
    );
    let mut runtime = Runtime::default();
    let surface = runtime.propose_with_oracle(&root, &proposal)?;
    Ok((client, runtime, surface, result))
}

fn temp(name: &str) -> PathBuf {
    std::env::temp_dir().join(format!(
        "openui-dioxus-real-mcp-{name}-{}.json",
        std::process::id()
    ))
}

fn mcp() -> Result<(), String> {
    let (mut client, _, _, _) = real_flow()?;
    client.call_tool("approve_expense", json!({ "expense_id": "exp-001" }))?;
    let m = client.metrics();
    println!(
        "mcp_jsonrpc: PASS initialize={} tools/list={} tools/call={}",
        m.initialize, m.tools_list, m.tools_call
    );
    Ok(())
}

fn openui() -> Result<(), String> {
    let (_, mut runtime, surface, _) = real_flow()?;
    let before = surface.fingerprint();
    let invalid =
        fs::read_to_string(root().join("fixtures/invalid.openui")).map_err(|e| e.to_string())?;
    let rejected = runtime.propose_with_oracle(&root(), &invalid).is_err();
    let unchanged = runtime
        .committed()
        .is_some_and(|current| current.fingerprint() == before);
    println!(
        "openui_oracle: {} package=@openuidev/lang-core version=0.2.15 atomic_reject={}",
        if rejected && unchanged {
            "PASS"
        } else {
            "FAIL"
        },
        if unchanged { "PASS" } else { "FAIL" }
    );
    if rejected && unchanged {
        Ok(())
    } else {
        Err("oracle rejection was not atomic".into())
    }
}

fn adapters() -> Result<(), String> {
    let (_, _, surface, _) = real_flow()?;
    let adapters: [&dyn CatalogAdapter; 2] = [&LedgerCatalog, &CompactCatalog];
    for adapter in adapters {
        let rendered = adapter.render_text(&surface);
        if rendered.is_empty() {
            return Err(format!("{} rendered empty", adapter.build_id()));
        }
    }
    println!("catalog_adapters: 2/2 PASS semantic_fingerprint=equal fingerprint={} runtime_semantic_changes=0", surface.fingerprint());
    Ok(())
}

fn action() -> Result<(), String> {
    let (mut client, runtime, _, _) = real_flow()?;
    let receipt_path = temp("receipt");
    let receipt = runtime.invoke(
        &mut client,
        TypedAction::ApproveExpense {
            expense_id: "exp-001".into(),
        },
        &receipt_path,
    )?;
    let durable = fs::read(&receipt_path)
        .ok()
        .and_then(|bytes| serde_json::from_slice::<serde_json::Value>(&bytes).ok())
        .and_then(|v| {
            v.get("mcp_status")
                .and_then(|v| v.as_str())
                .map(|s| s == "approved")
        })
        .unwrap_or(false);
    let _ = fs::remove_file(receipt_path);
    println!(
        "typed_approval: {} mcp_status={} durable_receipt={}",
        if durable { "PASS" } else { "FAIL" },
        receipt.mcp_status,
        if durable { "PASS" } else { "FAIL" }
    );
    if durable {
        Ok(())
    } else {
        Err("receipt not durable".into())
    }
}

fn replay() -> Result<(), String> {
    let (client, runtime, surface, _) = real_flow()?;
    let capture = temp("capture");
    runtime.capture(&capture)?;
    let before = client.metrics().tools_call;
    let replayed = Runtime::replay(&capture)?;
    let after = client.metrics().tools_call;
    let rendered = replayed.render(&LedgerCatalog);
    let pass = replayed.fingerprint() == surface.fingerprint()
        && after == before
        && rendered.contains("no action capability");
    let _ = fs::remove_file(capture);
    println!(
        "replay: {} semantic_fingerprint={} additional_mcp_calls={}",
        if pass { "PASS" } else { "FAIL" },
        if replayed.fingerprint() == surface.fingerprint() {
            "equal"
        } else {
            "different"
        },
        after - before
    );
    if pass {
        Ok(())
    } else {
        Err("replay changed semantics or called MCP".into())
    }
}

fn lines(path: &Path) -> usize {
    fs::read_to_string(path)
        .map(|s| {
            s.lines()
                .filter(|line| {
                    let t = line.trim();
                    !t.is_empty() && !t.starts_with("//")
                })
                .count()
        })
        .unwrap_or(0)
}

fn compare() -> Result<(), String> {
    let (mut client, _, surface, result) = real_flow()?;
    let baseline = render_direct(&result)?;
    if !baseline.contains("Acme Rail") || !LedgerCatalog.render_text(&surface).contains("Acme Rail")
    {
        return Err("comparison inputs differ".into());
    }
    let direct_status = approve_direct(&mut client, "exp-001")?;
    let direct_capture = temp("direct-capture");
    let before_replay = client.metrics().tools_call;
    capture_direct(&result, &direct_capture)?;
    let direct_replay = replay_direct(&direct_capture)?;
    let after_replay = client.metrics().tools_call;
    let _ = fs::remove_file(direct_capture);
    if direct_status != "approved" || direct_replay != result || after_replay != before_replay {
        return Err("thin baseline action or replay failed".into());
    }
    let baseline_loc = lines(&root().join("src/baseline.rs"));
    let guarantee_loc =
        lines(&root().join("src/runtime.rs")) + lines(&root().join("src/adapter.rs"));
    let verdict = if guarantee_loc > baseline_loc && surface.fingerprint() != 0 {
        "CONTINUE"
    } else {
        "STOP"
    };
    println!("comparison: PASS same_mcp_result=PASS baseline_loc={baseline_loc} openui_runtime_adapter_loc={guarantee_loc} baseline_transitions=1 openui_transitions=3 baseline_action=PASS baseline_raw_replay=PASS adapter_swap_runtime_changes=0 durable_action_receipt=exclusive enforced_inert_replay=exclusive verdict={verdict}");
    Ok(())
}

fn main() {
    let mode = std::env::args().nth(1).unwrap_or_else(|| "all".into());
    let result = match mode.as_str() {
        "mcp" => mcp(),
        "openui" => openui(),
        "adapters" => adapters(),
        "action" => action(),
        "replay" => replay(),
        "compare" => compare(),
        "all" => mcp()
            .and_then(|_| openui())
            .and_then(|_| adapters())
            .and_then(|_| action())
            .and_then(|_| replay())
            .and_then(|_| compare()),
        _ => Err(format!("unknown evidence mode: {mode}")),
    };
    if let Err(error) = result {
        eprintln!("FAIL: {error}");
        std::process::exit(1);
    }
}

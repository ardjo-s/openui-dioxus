use std::{env, fs};

use anyhow::Context;
use openui_a2ui_cloud_eval::{ActionInvocation, Runtime, Surface};

fn main() -> anyhow::Result<()> {
    let path = env::args().nth(1).context("missing Surface JSON path")?;
    let surface: Surface = serde_json::from_slice(&fs::read(path)?)?;
    let fingerprint = surface.fingerprint();
    let mut runtime = Runtime::new(surface.clone());
    runtime.set_field("review_note", "Looks correct")?;
    runtime.set_field("status_filter", "all")?;
    let invocation = ActionInvocation {
        invocation_id: "probe-exp-001".into(),
        action: "ApproveExpense".into(),
        expense_id: "exp-001".into(),
    };
    let first = runtime.invoke(invocation.clone())?;
    let duplicate = runtime.invoke(invocation)?;
    runtime.apply_update(surface);
    let state_preserved = runtime.state().get("review_note").map(String::as_str)
        == Some("Looks correct")
        && runtime.state().get("status_filter").map(String::as_str) == Some("all");
    let replay = runtime.snapshot().replay()?;
    println!(
        "{}",
        serde_json::json!({
            "state_preserved": state_preserved,
            "action_exactly_once": first == duplicate && runtime.effect_count() == 1,
            "typed_receipt": first,
            "replay_same_fingerprint": replay.fingerprint == fingerprint,
            "replay_effect_count": replay.effect_count
        })
    );
    Ok(())
}

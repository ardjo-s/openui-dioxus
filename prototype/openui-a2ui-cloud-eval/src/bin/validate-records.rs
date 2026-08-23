use std::{env, fs};

use anyhow::Context;
use openui_a2ui_cloud_eval::EvalRecord;

fn main() -> anyhow::Result<()> {
    let path = env::args().nth(1).context("missing records.jsonl path")?;
    let source = fs::read_to_string(path)?;
    let mut count = 0usize;
    for (index, line) in source.lines().enumerate() {
        if line.trim().is_empty() {
            continue;
        }
        serde_json::from_str::<EvalRecord>(line)
            .with_context(|| format!("invalid EvalRecord at line {}", index + 1))?;
        count += 1;
    }
    println!("validated_records={count}");
    Ok(())
}

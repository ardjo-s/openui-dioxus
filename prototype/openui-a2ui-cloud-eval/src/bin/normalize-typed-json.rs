use std::{env, fs};

use anyhow::Context;
use openui_a2ui_cloud_eval::{ProtocolAdapter, TypedJsonAdapter};

fn main() -> anyhow::Result<()> {
    let mut args = env::args().skip(1);
    let oracle_path = args.next().context("missing typed-JSON oracle path")?;
    let source_path = args.next().context("missing typed-JSON source path")?;
    let output_path = args.next().context("missing Surface output path")?;
    if args.next().is_some() {
        anyhow::bail!("usage: normalize-typed-json <oracle.json> <source.json> <surface.json>");
    }
    let oracle = serde_json::from_slice(&fs::read(&oracle_path)?)?;
    let source = fs::read(source_path)?;
    let surface = TypedJsonAdapter.normalize(&oracle, &source)?;
    fs::write(output_path, serde_json::to_vec_pretty(&surface)?)?;
    Ok(())
}

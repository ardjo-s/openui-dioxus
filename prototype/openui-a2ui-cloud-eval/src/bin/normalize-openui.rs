use std::{env, fs};

use anyhow::Context;
use openui_a2ui_cloud_eval::{OpenUiAdapter, ProtocolAdapter};

fn main() -> anyhow::Result<()> {
    let mut args = env::args().skip(1);
    let oracle_path = args.next().context("missing OpenUI oracle JSON path")?;
    let source_path = args.next().context("missing OpenUI source path")?;
    let output_path = args.next().context("missing Surface output path")?;
    if args.next().is_some() {
        anyhow::bail!("usage: normalize-openui <oracle.json> <source> <surface.json>");
    }
    let oracle = serde_json::from_slice(&fs::read(&oracle_path)?)?;
    let source = fs::read(source_path)?;
    let surface = OpenUiAdapter.normalize(&oracle, &source)?;
    fs::write(output_path, serde_json::to_vec_pretty(&surface)?)?;
    Ok(())
}

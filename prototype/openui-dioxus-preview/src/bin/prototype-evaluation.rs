use openui_dioxus_preview::Runtime;
use std::error::Error;
use std::fs;
use std::hint::black_box;
use std::path::Path;
use std::time::Instant;

const VALID: &str = include_str!("../../fixtures/valid-proposal.ui");
const ITERATIONS: usize = 100_000;
const HEADLINE_MODELS: [&str; 6] = ["sol", "opus48", "kimi", "gemini", "qwen", "muse"];

fn main() -> Result<(), Box<dyn Error>> {
    let raw_root = std::env::args_os()
        .nth(1)
        .expect("usage: prototype-evaluation <openui-bench/raw>");

    let parse_ns = nanos_per_op(ITERATIONS, || {
        let mut runtime = Runtime::new();
        black_box(runtime.propose(black_box(VALID)).expect("valid fixture"));
    });

    let mut runtime = Runtime::new();
    runtime.propose(VALID).expect("valid fixture");
    let replay_ns = nanos_per_op(ITERATIONS, || {
        let checkpoint = runtime.checkpoint().expect("checkpoint");
        black_box(runtime.replay(&checkpoint).expect("replay"));
    });

    let (attempted, accepted) = score_official_openui(Path::new(&raw_root))?;
    if attempted != 1_104 {
        return Err(format!("expected 1,104 official OpenUI raws, found {attempted}").into());
    }

    println!("iterations: {ITERATIONS}");
    println!("parse_validate_commit_ns_per_op: {parse_ns}");
    println!("checkpoint_replay_ns_per_op: {replay_ns}");
    println!(
        "official_openui_corpus: {attempted} attempted, {accepted} accepted, {} rejected",
        attempted - accepted
    );
    Ok(())
}

fn nanos_per_op(mut iterations: usize, mut operation: impl FnMut()) -> u128 {
    for _ in 0..1_000 {
        operation();
    }
    let started = Instant::now();
    for _ in 0..iterations {
        operation();
    }
    let elapsed = started.elapsed().as_nanos();
    iterations = iterations.max(1);
    elapsed / iterations as u128
}

fn score_official_openui(raw_root: &Path) -> Result<(usize, usize), Box<dyn Error>> {
    let mut attempted = 0;
    let mut accepted = 0;
    for model in HEADLINE_MODELS {
        for entry in fs::read_dir(raw_root.join(model))? {
            let path = entry?.path();
            let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
                continue;
            };
            if !is_scored_openui_raw(name) {
                continue;
            }
            attempted += 1;
            let proposal = fs::read_to_string(path)?;
            if Runtime::new().propose(&proposal).is_ok() {
                accepted += 1;
            }
        }
    }
    Ok((attempted, accepted))
}

fn is_scored_openui_raw(name: &str) -> bool {
    let Some(stem) = name
        .strip_prefix("openui__")
        .and_then(|name| name.strip_suffix(".txt"))
    else {
        return false;
    };
    stem.rsplit_once("__r")
        .and_then(|(_, repeat)| repeat.parse::<u8>().ok())
        .is_some_and(|repeat| (1..=4).contains(&repeat))
}

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::Protocol;

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct EvalTokenUsage {
    pub raw_prompt_tokens: u64,
    pub raw_output_tokens: u64,
    pub input_tokens: u64,
    pub cached_input_tokens: u64,
    pub output_tokens: u64,
    pub reasoning_tokens: u64,
    pub total_tokens: u64,
    pub estimated_cost_usd: f64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct EvalLatency {
    pub api_ms: f64,
    pub validation_ms: f64,
    pub normalization_ms: f64,
    pub first_render_ms: f64,
    pub full_response_ms: f64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct EvalRecord {
    pub protocol: Protocol,
    pub passage: u32,
    pub attempt: u8,
    pub accepted: bool,
    pub repaired: bool,
    pub diagnostics: Value,
    pub tokens: EvalTokenUsage,
    pub latency: EvalLatency,
    pub response_bytes: usize,
    pub fingerprint: Option<String>,
    pub coverage: Option<Value>,
    pub runtime_probe: Option<Value>,
    pub provider_error: Option<String>,
}

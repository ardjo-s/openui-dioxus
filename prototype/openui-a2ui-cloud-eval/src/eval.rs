use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::Protocol;

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum EvalProvider {
    Api,
    Codex,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct EvalTokenUsage {
    pub raw_prompt_tokens: u64,
    pub raw_output_tokens: u64,
    pub input_tokens: u64,
    pub cached_input_tokens: u64,
    #[serde(default)]
    pub cache_write_input_tokens: u64,
    pub output_tokens: u64,
    pub reasoning_tokens: u64,
    pub total_tokens: u64,
    pub estimated_cost_usd: Option<f64>,
    pub usage_source: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct EvalLatency {
    pub provider_ms: f64,
    pub api_ms: Option<f64>,
    pub validation_ms: f64,
    pub normalization_ms: f64,
    pub first_render_ms: f64,
    pub full_response_ms: f64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct EvalRecord {
    pub protocol: Protocol,
    pub order_position: usize,
    pub provider: EvalProvider,
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

#[cfg(test)]
mod tests {
    use super::EvalTokenUsage;

    #[test]
    fn chatgpt_plan_usage_accepts_unavailable_api_cost() {
        let usage: EvalTokenUsage = serde_json::from_value(serde_json::json!({
            "raw_prompt_tokens": 10,
            "raw_output_tokens": 5,
            "input_tokens": 100,
            "cached_input_tokens": 20,
            "cache_write_input_tokens": 0,
            "output_tokens": 5,
            "reasoning_tokens": 0,
            "total_tokens": 105,
            "estimated_cost_usd": null,
            "usage_source": "codex-cli-chatgpt-plan"
        }))
        .expect("ChatGPT-plan records must not invent an API cost");
        assert_eq!(usage.estimated_cost_usd, None);
    }
}

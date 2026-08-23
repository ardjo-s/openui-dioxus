# Kalosm vs OpenUI-Dioxus

Research date: 2026-08-23<br>
Scope: primary Kalosm repository sources and the local OpenUI-Dioxus planning record. This is a comparison of architectural roles, not a benchmark.

## Verdict

**Inference:** these projects mostly compose; they are not direct substitutes. Kalosm is an application-side Rust AI/inference toolkit. OpenUI-Dioxus is a planned, deterministic runtime that turns a model-produced **OpenUI program** plus tool context into a bounded Dioxus interface and mediates its effects. A host could use Kalosm to obtain a structured OpenUI program, but Kalosm supplies neither OpenUI semantics nor the catalog/action/replay contract that OpenUI-Dioxus proposes.

## Kalosm today

### Facts

- Kalosm is a Rust crate ecosystem for using local **or remote** pre-trained language, audio, and image models; the workspace also contains Fusor, a WGPU-oriented runtime for quantized inference. [README](https://github.com/floneum/kalosm/blob/main/README.md), [workspace manifest](https://github.com/floneum/kalosm/blob/main/Cargo.toml)
- Its workspace separates model crates (Llama, BERT, Whisper, Segment Anything), interfaces (language, sound, vision, streaming, parsing), and Fusor ML crates. The public `kalosm` facade gates language, sound, vision, evaluation, retrieval, scraping, and remote-provider features. [workspace manifest](https://github.com/floneum/kalosm/blob/main/Cargo.toml), [facade source](https://github.com/floneum/kalosm/blob/main/interfaces/kalosm/src/lib.rs)
- The language-model interface covers streaming text, sampling, embeddings, chat/completion sessions, and OpenAI/Anthropic adapters behind features. [language-model source](https://github.com/floneum/kalosm/blob/main/interfaces/language-model/src/lib.rs), [feature matrix](https://github.com/floneum/kalosm/blob/main/Cargo.toml)
- Structured generation is constrained by Rust-derived or custom parsers/grammars; the repository says these can describe JSON, HTML, or XML. This constrains **model output**, not an executable UI runtime. [README](https://github.com/floneum/kalosm/blob/main/README.md), [constrained-generation examples declared in the manifest](https://github.com/floneum/kalosm/blob/main/Cargo.toml)
- The root examples target CLI/chat, Axum, RAG, crawling, transcription, image segmentation, local and remote models. Dioxus is used by the internal, unpublished `fusor-webgpu-runner` UI (`version = "0.1.0"`, `publish = false`), which depends on Dioxus 0.7 with web features, `dioxus-primitives`, `dioxus-router`, and Fusor; the public Kalosm facade does not expose a Dioxus generative-UI runtime or OpenUI renderer. [examples and features](https://github.com/floneum/kalosm/blob/main/Cargo.toml), [Fusor WebGPU runner manifest](https://github.com/floneum/kalosm/blob/main/fusor-ml/webgpu-runner/Cargo.toml), [facade source](https://github.com/floneum/kalosm/blob/main/interfaces/kalosm/src/lib.rs)
- Maintenance signal, not a quality guarantee: the repository is not archived (`archived=false`) and was last pushed on 2026-08-22 at 03:37:08 UTC; the latest commit on `main` is `e1006b04e46cb485eef91a78b03af6d260064e90`, dated 2026-08-08 at 17:38:50 UTC, with message `Fix chat template rendering to match transformers (#452)`. The latest GitHub release shown is `kalosm-0.4`, dated 2025-02-09. The README still labels Fusor early and not production-ready while describing it as the planned 0.5 backend. [commit history](https://github.com/floneum/kalosm/commits/main), [releases](https://github.com/floneum/kalosm/releases), [README](https://github.com/floneum/kalosm/blob/main/README.md)

### Execution model

**Fact:** an application instantiates or connects a model, creates a chat/completion/task session, then consumes asynchronous streams of tokens or typed parsed results. Optional modules retrieve/chunk/embed documents, process audio, scrape, or serve application endpoints. [README](https://github.com/floneum/kalosm/blob/main/README.md), [language-model source](https://github.com/floneum/kalosm/blob/main/interfaces/language-model/src/lib.rs)

**Inference:** Kalosm deliberately stays below the app/UI policy layer. A Rust application chooses the prompt, parser/grammar, model backend, storage, HTTP endpoint, and UI; nothing in the consulted facade or workspace establishes a declarative component registry, an action-effect firewall, or replayable UI revisions.

## Narrow comparison

| Dimension | Kalosm | OpenUI-Dioxus planning project | Result |
| --- | --- | --- | --- |
| Architectural layer | Model/inference and AI utilities. | Language-compatible generative-UI runtime, Dioxus renderer, design-system bridge, and host contract. | Complementary layers. |
| Input → output | Prompt/data → streamed text or parser-constrained Rust values; optional model/audio/image/RAG outputs. | Intent + MCP tools/results → OpenUI generation → validated `Surface` → Dioxus UI → typed actions, stabilization, replay. | Kalosm could produce one input to the OpenUI adapter, but cannot replace it. |
| Arbitrary code | Kalosm is ordinary Rust library code: the application writes and compiles its own UI/host code. Its structured output can be arbitrary data structures or grammars. | Explicitly excludes model-generated Rust, JavaScript, and executable UI; only a trusted compiled catalog may render. | Different safety/operational boundary. |
| Dioxus | Dioxus powers the internal, unpublished Fusor WebGPU runner UI, but the public Kalosm facade exposes no Dioxus generative-UI runtime or OpenUI renderer. | Dioxus is the target renderer; portable HTML/CSS/state are verified independently on web, desktop, Android, iOS. | Kalosm's internal runner UI does not overlap with OpenUI-Dioxus's public runtime/renderer contract; a separate app can integrate both. |
| Tool/MCP actions | No MCP action mediation was found in the consulted root README, manifest, or public facade. Provider adapters are model backends, not a tool-effect protocol. | MCP Query/Mutation plus all external effects go through typed, policy-checked, recorded host invocations. | OpenUI-Dioxus owns the effect boundary. |
| Runtime/deployment | Native Rust inference; README describes local acceleration and remote adapters. Fusor targets native accelerators and browser WebGPU, but is explicitly early/non-production. | One platform-independent runtime contract; Dioxus web/desktop/mobile renderers and host capabilities are separately verified. | Same application can choose Kalosm inference placement and OpenUI-Dioxus surface placement independently. |

OpenUI-Dioxus evidence: [route map](../../.scratch/openui-dioxus/map.md), [runtime contract](../../.scratch/openui-dioxus/issues/06-define-runtime-domain-contract.md), [MCP prototype question](../../.scratch/openui-dioxus/issues/09-prototype-the-mcp-vertical.md), [Dioxus constraints](dioxus-platform-constraints.md), [differentiation boundary](differentiation.md).

## Composition pattern

**Inference:** the viable integration is `Kalosm model/session -> grammar or schema constrained OpenUI source -> OpenUI-Dioxus parse/validate/merge -> closed Dioxus catalog -> typed host/MCP effects -> receipts/replay`. Keep the boundary at serialized OpenUI source (or an application-owned translation to it), not at Kalosm’s internal parser types: OpenUI-Dioxus must remain independently conformant with OpenUI Lang and preserve its own versioned compatibility, validation, and replay rules.

Kalosm’s constrained generation may reduce malformed OpenUI candidates; it does **not** remove the need for complete OpenUI parsing, catalog validation, policy checks, atomic commits, or inert replay. Conversely, OpenUI-Dioxus does not provide local models, embeddings, transcription, vision, scraping, or quantized inference.

## Unknowns and next check

- **Unknown:** no end-to-end example was found in the consulted sources that makes a Kalosm model emit OpenUI Lang, renders it with Dioxus, or binds MCP tools to it. Do not claim a ready-made integration.
- **Unknown:** the live compatibility and production maturity of Kalosm/Fusor for a chosen target require a pinned commit, a hardware/platform smoke test, and dependency/security review; the repository’s active 2026 commits do not certify those properties.
- **Recommended next step:** if the OpenUI-Dioxus MCP prototype is authorized, add Kalosm only as a replaceable generation-provider adapter with one constrained-output experiment. Measure valid OpenUI rate, correction attempts, latency, and replay invariants against a remote-provider baseline; do not couple the deterministic runtime to Kalosm types or Fusor.

## Sources consulted

### Kalosm primary sources

- [README](https://github.com/floneum/kalosm/blob/main/README.md)
- [workspace `Cargo.toml`](https://github.com/floneum/kalosm/blob/main/Cargo.toml)
- [`interfaces/kalosm/src/lib.rs`](https://github.com/floneum/kalosm/blob/main/interfaces/kalosm/src/lib.rs)
- [`interfaces/language-model/src/lib.rs`](https://github.com/floneum/kalosm/blob/main/interfaces/language-model/src/lib.rs)
- [commit history](https://github.com/floneum/kalosm/commits/main) and [releases](https://github.com/floneum/kalosm/releases)

### Local OpenUI-Dioxus sources

- `.scratch/openui-dioxus/map.md`
- `.scratch/openui-dioxus/issues/03-establish-dioxus-platform-constraints.md`
- `.scratch/openui-dioxus/issues/06-define-runtime-domain-contract.md`
- `.scratch/openui-dioxus/issues/09-prototype-the-mcp-vertical.md`
- `docs/research/openui-capabilities.md`
- `docs/research/differentiation.md`
- `docs/research/dioxus-platform-constraints.md`

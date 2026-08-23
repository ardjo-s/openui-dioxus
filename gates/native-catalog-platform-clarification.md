# Catalog and platform integration clarification

Scope: Keep one deterministic runtime while certified, statically compiled catalog adapters reuse Dioxus systems, thin platform hosts adapt bounded local UI mechanics, and the application host alone performs external effects.

- [x] A1: The architecture explainer shows direct compiled Dioxus adapters, optional internal primitives, a thin platform seam, and a separate application-host effect boundary.
  CHECK: rg -n 'adaptateur Rust compilé|Aucun effet externe|Primitives en option interne' docs/explainers/adapter-platform-seams-eli5.html
  EXPECT: /adaptateur Rust compilé/
  EVIDENCE: The self-contained explainer contains all three boundaries; its accessible SVG self-check returned `OK` during the decision session.

- [x] A2: All twelve Wayfinder tickets contain an explicit adapter-and-platform implication and the accepted decision inventory is eight `resolved` plus four `open` tickets.
  CHECK: test "$(rg -l '^## Adapter and platform implication$' .scratch/openui-dioxus/issues/*.md | wc -l | tr -d ' ')" = 12 && echo 12-tickets
  EXPECT: /12-tickets/
  EVIDENCE: Exactly 12 ticket files contain the heading once; status inventory is eight `resolved` and four `open`.

- [x] A3: The Wayfinder map names the catalog-adapter, platform-host, and application-host boundaries and advances the current frontier to ticket 09.
  CHECK: rg -n 'CatalogAdapter|PlatformHost|Application host|Current frontier|09-prototype-the-mcp-vertical' .scratch/openui-dioxus/map.md
  EXPECT: /PlatformHost/
  EVIDENCE: The map names all three responsibilities, records resolved decision 08, and its frontier contains exactly one link to ticket 09.

- [x] A4: The glossary separates bounded renderer-side UI mechanisms from policy-checked host-visible effects owned by the application host.
  CHECK: rg -n 'CatalogAdapter|PlatformHost|Platform UI capability|host-visible effect' CONTEXT.md
  EXPECT: /Platform UI capability/
  EVIDENCE: `CONTEXT.md` defines the static `CatalogAdapter`, thin `PlatformHost`, bounded `Platform UI capability`, and exclusive application-host effect ownership.

- [x] A5: Product and research documents position Dioxus extensibility as reviewed compile-time adapters and external ecosystems as conversion sources.
  CHECK: rg -n 'certified adapter|certified adapters|conversion source|conversion sources' README.md docs/research/differentiation.md docs/research/dioxus-platform-constraints.md
  EXPECT: /certified adapter/
  EVIDENCE: README and both research notes use direct compiled-adapter and conversion-source language and deny direct external-framework execution.

- [x] A6: Repository documentation has no broken local Markdown links, trailing whitespace, or unresolved merge markers after the clarification.
  EVIDENCE: 31 Markdown/HTML files checked; 31 local links, zero broken links, zero trailing-whitespace matches, and zero merge markers.

- [x] A7: A self-contained French ELI5 explainer shows one stable engine, static compiled adapters, thin platform adaptation, and application-host effects with big visuals and little text.
  CHECK: rg -n 'Le moteur ne change pas|Prise composants|Prise plateforme|CatalogAdapter|PlatformHost' docs/explainers/adapter-platform-seams-eli5.html
  EXPECT: /Le moteur ne change pas/
  EVIDENCE: Explainer self-check returned `OK`; its desktop SVG and mobile stack both show optional primitives and the external-effect boundary.

- [x] A8: Decision 08 pins static adapter compatibility precisely and defers any binary ABI until a demonstrated no-recompile requirement.
  CHECK: rg -n 'catalog_contract_version|schema_hash|catalog_release_hash|adapter_build_id|static_rust_v1|C FFI|abi_stable|WebAssembly Component Model|out-of-process RPC' .scratch/openui-dioxus/issues/08-lock-cross-platform-v01-contract.md
  EXPECT: /static_rust_v1/
  EVIDENCE: Ticket 08 pins all five required catalog/build fields, `static_rust_v1`, and four future boundary candidates with a separate reopening trigger.

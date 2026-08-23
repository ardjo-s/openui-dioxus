# OpenUI capabilities and Dioxus compatibility

Research date: 2026-08-22<br>
Snapshot: `thesysdev/openui@c3c0d1b7cf1d58e01846e86b7e9706f54afb2511`<br>
OpenUI Lang: `v0.5`; `@openuidev/lang-core`: `0.2.15`

## Finding

OpenUI already separates its portable language engine from React. `@openuidev/lang-core` is framework-generic; `@openuidev/react-lang` supplies React renderers, hooks, context, and error boundaries. A Dioxus integration should therefore preserve OpenUI Lang semantics and replace the React adapter, not invent another protocol.

Sources: [lang-core exports](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/packages/lang-core/src/index.ts), [generic library types](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/packages/lang-core/src/library.ts), [React wrapper](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/packages/react-lang/src/library.ts).

## Material capabilities to preserve

1. **Compact line-oriented language.** OpenUI Lang uses one assignment per line, positional component arguments, forward references, literals, arrays, objects, expressions, and a named root. This is the source of its streaming and token-efficiency thesis.
2. **Streaming parser.** The core exposes ordinary and streaming parsers. Parsed elements carry a `partial` flag; incomplete or invalid output can still materialize progressively with structured errors.
3. **Schema-driven component catalog.** Components have a name, description, typed prop schema, optional grouping, and renderer. A library generates both JSON Schema and the model prompt, keeping generation vocabulary and runtime validation aligned.
4. **Reactive language semantics.** Lang `v0.5` adds `$state`, expressions, conditions, collection built-ins, `@Each`, and state-dependent component properties.
5. **Tool-backed data.** `Query` and `Mutation` model reads and writes, including defaults, refresh intervals, dependency re-fetching, and MCP-aware tool descriptors.
6. **Declarative actions.** Action plans include `@Run`, `@Set`, `@Reset`, `@ToAssistant`, and `@OpenUrl`. A host remains responsible for deciding which effects are allowed.
7. **Incremental editing.** Statement-level merging lets later generations update a surface while retaining unchanged statements and stable identities.
8. **Reliability and diagnostics.** The parser exposes structured validation errors, unresolved references, orphaned statements, query and mutation metadata, and source categories for parser, runtime, query, and mutation failures.
9. **Prompt generation.** The same library contract produces component signatures, syntax rules, tool descriptions, examples, edit-mode instructions, inline mode, bindings, and additional rules.
10. **Serialization and observability seams.** Core exports AST walking, serialization, statement merging, validation, and error enrichment; React packages add rendering and streaming observability.

Sources: [Lang `v0.5` specification](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/docs/content/docs/openui-lang/specification-v05.mdx), [parser types](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/packages/lang-core/src/parser/types.ts), [parser implementation](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/packages/lang-core/src/parser/parser.ts), [incremental merge](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/packages/lang-core/src/parser/merge.ts), [prompt and library contract](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/packages/lang-core/src/library.ts).

## React-specific parts that should not define compatibility

- `ReactNode`, React functional component types, context providers, hooks, error boundaries, and the React `<Renderer />` lifecycle.
- Prebuilt `@openuidev/react-ui` component implementations and chat layouts.
- Browser-specific handling such as opening URLs or React render-error recovery.

These are adapters or component-library implementations. Their user-visible behaviors may inspire a Dioxus catalog, but compatibility should be measured at the language, catalog, state, action, and stream levels.

Sources: [React renderer](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/packages/react-lang/src/Renderer.tsx), [React context](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/packages/react-lang/src/context.ts), [React package metadata](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/packages/react-lang/package.json).

## Recommended compatibility contract

Target **full OpenUI Lang `v0.5` semantic compatibility**, but keep component-catalog coverage explicit and separately versioned.

- Build a Rust language engine whose parser, AST, partial-stream behavior, validation, errors, state evaluation, built-ins, Query/Mutation metadata, actions, merge semantics, and prompt generation are differential-tested against `@openuidev/lang-core`.
- Translate the accepted AST into an internal versioned `Surface`; this is a runtime representation, not a competing wire protocol. It must retain every OpenUI semantic needed for round-trip conformance and replay.
- Implement a Dioxus renderer and Rust action/tool host on top of that `Surface`.
- Publish a capability manifest distinguishing language support, action-host policies, and available component catalogs. Unsupported catalog components must fail explicitly; they must not silently degrade.
- Pin upstream snapshots and run the upstream corpus plus local differential fixtures whenever OpenUI changes. OpenUI has package versions but no stable repository release stream, so compatibility cannot rely on `main` implicitly.
- Treat upstream self-reported token savings as a hypothesis. Re-run the benchmark corpus with the Dioxus catalog before making performance claims.

This preserves OpenUI's actual advantages while allowing Rust-native validation, typed actions, persistence, and Dioxus rendering. The repository is MIT licensed, permitting a Rust port with attribution and license preservation: [OpenUI license](https://github.com/thesysdev/openui/blob/c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/LICENSE).

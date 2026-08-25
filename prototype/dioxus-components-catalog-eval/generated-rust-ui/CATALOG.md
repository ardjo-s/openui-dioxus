# Frozen rust-ui-dioxus-eval evaluation catalog

This catalog exposes exactly 12 reviewed components through the
`static_rust_v1` profile. It is an evaluation artifact, not a claim that the
upstream repository or Rust ABI is stable.

- Source: https://github.com/rust-ui/ui
- Commit: `7fd792520ba5e3ad5354c26ac4e6816c2d156b7c`
- Upstream crate: `copy-on-write-registry@not-published`
- Dioxus: `0.7.10`
- License: `MIT`

| Component | Capability families | Upstream binding | Typed events |
| --- | --- | --- | --- |
| Label | content | rust_ui::label::Label | none |
| Card | layout | rust_ui::card::Card | none |
| Input | text_input | rust_ui::input::Input | FieldChanged |
| Checkbox | boolean_input | rust_ui::checkbox::Checkbox | ToggleChanged |
| Button | action | rust_ui::button::Button | ActionInvoked |
| Tabs | navigation_or_overlay | rust_ui::tabs::Tabs | NavigationChanged |
| Progress | status | rust_ui::progress::Progress | none |
| Alert | feedback | rust_ui::alert::Alert | Dismissed |

All wire props, state keys, events, accessibility expectations, and platform
adaptations are owned by `catalog/manifest.json`. Generated files must not be
edited by hand.

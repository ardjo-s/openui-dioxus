# Frozen Dioxus Components evaluation catalog

This catalog exposes exactly 12 reviewed components through the
`static_rust_v1` profile. It is an evaluation artifact, not a claim that the
upstream repository or Rust ABI is stable.

- Source: https://github.com/DioxusLabs/dioxus-components
- Commit: `bf007c15d0cf4d04d3181cc46cf12325aa773955`
- Upstream crate: `dioxus-primitives@0.0.1`
- Dioxus: `0.7.10`
- License: `MIT OR Apache-2.0`

| Component | Capability families | Upstream binding | Typed events |
| --- | --- | --- | --- |
| Label | content | dioxus_primitives::label::Label | none |
| Toolbar | layout | dioxus_primitives::toolbar::Toolbar | none |
| Avatar | data_display | dioxus_primitives::avatar::Avatar | none |
| Input | text_input | preview::components::input::Input | FieldChanged |
| Select | selection | dioxus_primitives::select::Select | SelectionChanged |
| Checkbox | boolean_input | dioxus_primitives::checkbox::Checkbox | ToggleChanged |
| Switch | boolean_input | dioxus_primitives::switch::Switch | ToggleChanged |
| Button | action | preview::components::button::Button | ActionInvoked |
| Tabs | navigation_or_overlay | dioxus_primitives::tabs::Tabs | NavigationChanged |
| Dialog | navigation_or_overlay | dioxus_primitives::dialog::DialogRoot | DialogChanged |
| Progress | status | dioxus_primitives::progress::Progress | none |
| Toast | feedback | dioxus_primitives::toast::Toast | Dismissed |

All wire props, state keys, events, accessibility expectations, and platform
adaptations are owned by `catalog/manifest.json`. Generated files must not be
edited by hand.

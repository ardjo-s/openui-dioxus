fn main() {
    let _ = dioxus_logger::init(dioxus_logger::tracing::Level::INFO);
    dioxus::launch(dioxus_components_catalog_eval::platform::App);
}

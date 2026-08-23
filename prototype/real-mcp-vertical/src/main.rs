#[cfg(any(feature = "desktop", feature = "web", feature = "mobile"))]
mod app;

#[cfg(any(feature = "desktop", feature = "web", feature = "mobile"))]
fn main() {
    dioxus::launch(app::App);
}

#[cfg(not(any(feature = "desktop", feature = "web", feature = "mobile")))]
fn main() {
    println!("Enable desktop, web, or mobile");
}

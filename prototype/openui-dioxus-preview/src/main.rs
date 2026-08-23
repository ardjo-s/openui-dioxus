#[cfg(any(feature = "desktop", feature = "mobile", feature = "web"))]
mod app;

#[cfg(any(feature = "desktop", feature = "mobile", feature = "web"))]
fn main() {
    dioxus::launch(app::App);
}

#[cfg(not(any(feature = "desktop", feature = "mobile", feature = "web")))]
fn main() {
    println!("Enable one platform feature: desktop, mobile, or web");
}

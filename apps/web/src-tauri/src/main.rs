// EventTech Manager — Tauri Entry Point
// Die gesamte Anwendungslogik lebt in der React/TypeScript-Codebase.
// Dieser Rust-Teil ist bewusst minimal und dient nur als nativer Wrapper
// für Windows und Linux Desktop. Native Erweiterungen (z.B. direkter
// USB-Gerätezugriff, falls der Browser-Weg über die Web Serial API später
// nicht ausreicht) können hier später als Tauri-Commands ergänzt werden.

fn main() {
    eventtech_manager_lib::run();
}

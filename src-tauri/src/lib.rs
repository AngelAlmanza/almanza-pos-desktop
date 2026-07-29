mod bootstrap;
mod constants;
mod infrastructure;
mod models;
mod modules;
mod printer;
mod shared;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    bootstrap::run();
}

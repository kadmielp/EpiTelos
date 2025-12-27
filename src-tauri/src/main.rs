
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod secure_store;

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      secure_store::set_secret,
      secure_store::get_secret,
      secure_store::delete_secret
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}


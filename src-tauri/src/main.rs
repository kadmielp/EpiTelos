
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod secure_store;
mod local_gguf;

fn main() {
  tauri::Builder::default()
    .manage(local_gguf::LocalManager::default())
    .invoke_handler(tauri::generate_handler![
      secure_store::set_secret,
      secure_store::get_secret,
      secure_store::delete_secret,
      local_gguf::validate_model,
      local_gguf::start_model,
      local_gguf::stop_model,
      local_gguf::run_model,
      local_gguf::stop_request
    ])
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app, event| {
      if let tauri::RunEvent::Exit = event {
        use tauri::Manager;
        let _ = local_gguf::stop_model(app.state::<local_gguf::LocalManager>());
      }
    });
}


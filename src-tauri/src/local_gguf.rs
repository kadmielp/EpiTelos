use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs::File, io::Read, net::TcpListener, path::{Path, PathBuf}, process::{Child, Command, Stdio}, sync::Mutex, time::Duration};
use tauri::{Manager, State, Window};
use tokio::task::JoinHandle;
#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[derive(Default)]
pub struct LocalManager(Mutex<LocalState>);

#[derive(Default)]
struct LocalState {
    child: Option<Child>,
    model: Option<String>,
    backend: Option<String>,
    context_size: Option<u32>,
    ready: bool,
    port: Option<u16>,
    key: Option<String>,
    requests: HashMap<String, JoinHandle<()>>,
}

impl Drop for LocalManager {
    fn drop(&mut self) {
        if let Ok(mut state) = self.0.lock() {
            for (_, request) in state.requests.drain() { request.abort(); }
            if let Some(mut child) = state.child.take() { let _ = child.kill(); let _ = child.wait(); }
        }
    }
}

#[derive(Serialize)]
pub struct ModelStatus { pub backend: String, pub model: String }

#[derive(Serialize, Clone)]
struct StreamEvent { id: String, chunk: Option<String>, error: Option<String>, done: bool }

#[derive(Deserialize)]
pub struct RunInput { id: String, system_prompt: String, user_prompt: String }

fn validate_path(path: &str) -> Result<PathBuf, String> {
    let file = Path::new(path);
    if !file.is_file() || file.extension().and_then(|v| v.to_str()).map(|v| !v.eq_ignore_ascii_case("gguf")).unwrap_or(true) {
        return Err("Select an existing .gguf model file. The file may have been moved or deleted.".into());
    }
    let mut handle = File::open(file).map_err(|e| format!("Cannot read model file: {e}"))?;
    let mut magic = [0u8; 4];
    handle.read_exact(&mut magic).map_err(|e| format!("Cannot read GGUF header: {e}"))?;
    if &magic != b"GGUF" { return Err("This file does not have a valid GGUF header.".into()); }
    file.canonicalize().map_err(|e| format!("Cannot resolve model path: {e}"))
}

#[tauri::command]
pub fn validate_model(path: String) -> Result<String, String> {
    Ok(validate_path(&path)?.to_string_lossy().into_owned())
}

fn stop_locked(state: &mut LocalState) {
    for (_, request) in state.requests.drain() { request.abort(); }
    if let Some(mut child) = state.child.take() { let _ = child.kill(); let _ = child.wait(); }
    state.model = None;
    state.backend = None;
    state.context_size = None;
    state.ready = false;
    state.port = None;
    state.key = None;
}

fn backend_path(window: &Window, backend: &str) -> Result<PathBuf, String> {
    let dir = window.app_handle().path_resolver().resource_dir().ok_or("Cannot find bundled runtimes")?;
    runtime_path(&dir, backend)
}

fn runtime_path(resource_dir: &Path, backend: &str) -> Result<PathBuf, String> {
    let bundled = resource_dir.join("local_gguf").join(backend).join("llama-server.exe");
    if bundled.is_file() { return Ok(bundled); }

    // Running target/debug or target/release directly does not install Tauri bundle resources.
    // In that case, use the runtimes prepared in the source tree. Installed builds still
    // require their own bundled resources.
    let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
    let target_dir = manifest_dir.join("target");
    let is_local_build = matches!(resource_dir.file_name().and_then(|name| name.to_str()), Some("debug" | "release"))
        && match (resource_dir.parent().and_then(|path| path.canonicalize().ok()), target_dir.canonicalize().ok()) {
            (Some(actual), Some(expected)) => actual == expected,
            _ => false,
        };
    if is_local_build {
        let prepared = manifest_dir.join("resources").join("local_gguf").join(backend).join("llama-server.exe");
        if prepared.is_file() { return Ok(prepared); }
    }

    Err(format!("Bundled {backend} llama.cpp runtime is missing: {}", bundled.display()))
}

fn auto_backend(window: &Window) -> String {
    if backend_path(window, "cuda").is_ok()
        && Command::new("nvidia-smi").arg("-L").output().map(|o| o.status.success() && !o.stdout.is_empty()).unwrap_or(false) {
        return "cuda".into();
    }
    if backend_path(window, "vulkan").is_ok() {
        let gpu = Command::new("powershell").args(["-NoProfile", "-Command", "(Get-CimInstance Win32_VideoController).Name"]).output();
        if gpu.map(|o| o.status.success() && String::from_utf8_lossy(&o.stdout).lines().any(|line| {
            let name = line.to_ascii_lowercase();
            name.contains("nvidia") || name.contains("radeon") || name.contains("intel") && !name.contains("basic")
        })).unwrap_or(false) { return "vulkan".into(); }
    }
    "cpu".into()
}

#[tauri::command]
pub async fn start_model(window: Window, state: State<'_, LocalManager>, path: String, backend: String, context_size: u32) -> Result<ModelStatus, String> {
    let model = validate_path(&path)?.to_string_lossy().into_owned();
    if !["auto", "cpu", "cuda", "vulkan"].contains(&backend.as_str()) { return Err("Invalid runtime selection".into()); }
    if ![4096, 8192, 16384].contains(&context_size) { return Err("Invalid local context window size".into()); }
    let selected = if backend == "auto" { auto_backend(&window) } else { backend };
    let executable = backend_path(&window, &selected)?;
    let key = uuid::Uuid::new_v4().to_string();
    {
        let mut current = state.0.lock().map_err(|_| "Local model state unavailable")?;
        if current.ready && current.model.as_deref() == Some(&model) && current.backend.as_deref() == Some(&selected) && current.context_size == Some(context_size) {
            if current.child.as_mut().and_then(|c| c.try_wait().ok()).flatten().is_none() {
                return Ok(ModelStatus { backend: selected, model });
            }
        }
        stop_locked(&mut current);
        current.key = Some(key.clone());
    }
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| format!("Cannot reserve local port: {e}"))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    drop(listener);
    let log_dir = window.app_handle().path_resolver().app_log_dir().ok_or("Cannot find app log directory")?;
    std::fs::create_dir_all(&log_dir).map_err(|e| e.to_string())?;
    let log_path = log_dir.join("local-gguf.log");
    let log = File::create(&log_path).map_err(|e| e.to_string())?;
    let mut process = Command::new(executable);
    #[cfg(windows)]
    process.creation_flags(0x08000000);
    process.args(["--model", &model, "--host", "127.0.0.1", "--port", &port.to_string(), "--api-key", &key, "--ctx-size", &context_size.to_string()]);
    if selected != "cpu" { process.args(["--n-gpu-layers", "auto", "--fit", "on"]); }
    let mut child = process.current_dir(backend_path(&window, &selected)?.parent().unwrap())
        .stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::from(log))
        .spawn().map_err(|e| format!("Could not start {selected} runtime: {e}"))?;
    {
        let mut current = state.0.lock().map_err(|_| "Local model state unavailable")?;
        if current.key.as_deref() != Some(&key) {
            let _ = child.kill(); let _ = child.wait();
            return Err("Model loading was superseded by another selection.".into());
        }
        current.child = Some(child);
        current.model = Some(model.clone());
        current.backend = Some(selected.clone());
        current.context_size = Some(context_size);
        current.port = Some(port);
        current.key = Some(key.clone());
    }
    let client = reqwest::Client::new();
    let url = format!("http://127.0.0.1:{port}/health");
    for _ in 0..360 {
        tokio::time::sleep(Duration::from_millis(500)).await;
        {
            let mut current = state.0.lock().map_err(|_| "Local model state unavailable")?;
            if current.key.as_deref() != Some(&key) { return Err("Model loading was superseded by another selection.".into()); }
            if let Some(child) = current.child.as_mut() {
                if let Ok(Some(exit)) = child.try_wait() {
                    stop_locked(&mut current);
                    return Err(format!("{selected} runtime exited ({exit}). Check {}. Try CPU mode if GPU initialization failed.", log_path.display()));
                }
            }
        }
        if let Ok(response) = client.get(&url).bearer_auth(&key).timeout(Duration::from_secs(2)).send().await {
            if response.status().is_success() {
                let mut current = state.0.lock().map_err(|_| "Local model state unavailable")?;
                if current.key.as_deref() != Some(&key) { return Err("Model loading was superseded by another selection.".into()); }
                current.ready = true;
                return Ok(ModelStatus { backend: selected, model });
            }
        }
    }
    let mut current = state.0.lock().map_err(|_| "Local model state unavailable")?;
    if current.key.as_deref() == Some(&key) { stop_locked(&mut current); }
    Err(format!("Model did not become ready within three minutes. Check {} for details, or try CPU mode.", log_path.display()))
}

#[tauri::command]
pub fn stop_model(state: State<'_, LocalManager>) -> Result<(), String> {
    let mut current = state.0.lock().map_err(|_| "Local model state unavailable")?;
    stop_locked(&mut current);
    Ok(())
}

#[tauri::command]
pub async fn run_model(window: Window, state: State<'_, LocalManager>, input: RunInput) -> Result<(), String> {
    let (port, key, model) = {
        let current = state.0.lock().map_err(|_| "Local model state unavailable")?;
        if !current.ready { return Err("Local model is still loading. Wait for the Ready status in Settings.".into()); }
        (current.port.ok_or("Load a local model first")?, current.key.clone().ok_or("Missing local session")?, current.model.clone().ok_or("Missing model")?)
    };
    let url = format!("http://127.0.0.1:{port}/v1/chat/completions");
    let body = serde_json::json!({"model": model, "messages": [{"role": "system", "content": input.system_prompt}, {"role": "user", "content": input.user_prompt}], "stream": true});
    let client = reqwest::Client::new();
    let id = input.id;
    let event_window = window.clone();
    let task_id = id.clone();
    let (ready_tx, ready_rx) = tokio::sync::oneshot::channel::<()>();
    let task = tokio::spawn(async move {
        if ready_rx.await.is_err() { return; }
        let result = async {
            let response = client.post(url).bearer_auth(key).json(&body).send().await.map_err(|e| e.to_string())?;
            if !response.status().is_success() { return Err(format!("Local model error: {}", response.text().await.unwrap_or_default())); }
            let mut bytes = response.bytes_stream();
            let mut buffer: Vec<u8> = Vec::new();
            while let Some(next) = bytes.next().await {
                let chunk = next.map_err(|e| e.to_string())?;
                buffer.extend_from_slice(&chunk);
                while let Some(end) = buffer.iter().position(|byte| *byte == b'\n') {
                    let line = String::from_utf8_lossy(&buffer[..end]).trim().to_string();
                    buffer.drain(..=end);
                    if let Some(json) = line.strip_prefix("data: ") {
                        if json == "[DONE]" { break; }
                        if let Ok(value) = serde_json::from_str::<serde_json::Value>(json) {
                            if let Some(content) = value["choices"][0]["delta"]["content"].as_str() {
                                let _ = event_window.emit("local-gguf-chunk", StreamEvent { id: task_id.clone(), chunk: Some(content.into()), error: None, done: false });
                            }
                        }
                    }
                }
            }
            Ok::<(), String>(())
        }.await;
        let _ = event_window.emit("local-gguf-chunk", StreamEvent { id: task_id.clone(), chunk: None, error: result.err(), done: true });
        if let Ok(mut current) = event_window.state::<LocalManager>().0.lock() {
            current.requests.remove(&task_id);
        }
    });
    state.0.lock().map_err(|_| "Local model state unavailable")?.requests.insert(id, task);
    let _ = ready_tx.send(());
    Ok(())
}

#[tauri::command]
pub fn stop_request(state: State<'_, LocalManager>, id: String) -> Result<(), String> {
    if let Some(task) = state.0.lock().map_err(|_| "Local model state unavailable")?.requests.remove(&id) { task.abort(); }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::validate_path;

    #[test]
    fn validates_gguf_header_and_missing_files() {
        let path = std::env::temp_dir().join(format!("epitelos-{}.gguf", uuid::Uuid::new_v4()));
        assert!(validate_path(path.to_str().unwrap()).is_err());
        std::fs::write(&path, b"not a model").unwrap();
        assert!(validate_path(path.to_str().unwrap()).is_err());
        std::fs::write(&path, b"GGUFtest").unwrap();
        assert!(validate_path(path.to_str().unwrap()).is_ok());
        std::fs::remove_file(path).unwrap();
    }
}

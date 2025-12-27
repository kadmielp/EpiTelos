use keyring::Entry;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SecureStoreResponse {
    pub success: bool,
    pub data: Option<String>,

    pub error: Option<String>,

}

#[tauri::command]
pub fn set_secret(service: &str, key: &str, value: &str) -> SecureStoreResponse {
    let entry_name = format!("{}:{}", service, key);
    match Entry::new(&entry_name, "epitelos_user") {
        Ok(entry) => {
            match entry.set_password(value) {
                Ok(_) => SecureStoreResponse {
                    success: true,
                    data: None,
                    error: None,
                },
                Err(e) => SecureStoreResponse {
                    success: false,
                    data: None,
                    error: Some(format!("Failed to set secret: {}", e)),
                },
            }
        },
        Err(e) => SecureStoreResponse {
            success: false,
            data: None,
            error: Some(format!("Failed to create keyring entry: {}", e)),
        },
    }
}

#[tauri::command]
pub fn get_secret(service: &str, key: &str) -> SecureStoreResponse {
    let entry_name = format!("{}:{}", service, key);
    match Entry::new(&entry_name, "epitelos_user") {
        Ok(entry) => {
            match entry.get_password() {
                Ok(password) => SecureStoreResponse {
                    success: true,
                    data: Some(password),
                    error: None,
                },
                Err(e) => SecureStoreResponse {
                    success: false,
                    data: None,
                    error: Some(format!("Failed to get secret: {}", e)),
                },
            }
        },
        Err(e) => SecureStoreResponse {
            success: false,
            data: None,
            error: Some(format!("Failed to create keyring entry: {}", e)),
        },
    }
}

#[tauri::command]
pub fn delete_secret(service: &str, key: &str) -> SecureStoreResponse {
    let entry_name = format!("{}:{}", service, key);
    match Entry::new(&entry_name, "epitelos_user") {
        Ok(entry) => {
            match entry.delete_password() {
                Ok(_) => SecureStoreResponse {
                    success: true,
                    data: None,
                    error: None,
                },
                Err(e) => SecureStoreResponse {
                    success: false,
                    data: None,
                    error: Some(format!("Failed to delete secret: {}", e)),
                },
            }
        },
        Err(e) => SecureStoreResponse {
            success: false,
            data: None,
            error: Some(format!("Failed to create keyring entry: {}", e)),
        },
    }
}

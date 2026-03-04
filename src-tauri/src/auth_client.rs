use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthRequest {
    pub token: String,
    pub machine_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub allowed: bool,
    pub message: Option<String>,
}

#[tauri::command]
pub async fn check_auth(
    auth_endpoint: String,
    token: String,
    machine_id: String,
) -> Result<AuthResponse, String> {
    let client = reqwest::Client::new();
    let payload = AuthRequest { token, machine_id };

    let response = client
        .post(&auth_endpoint)
        .json(&payload)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Auth request failed: {}", e))?;

    let auth_response = response
        .json::<AuthResponse>()
        .await
        .map_err(|e| format!("Invalid auth response: {}", e))?;

    Ok(auth_response)
}

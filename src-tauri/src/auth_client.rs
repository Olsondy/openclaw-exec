use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthRequest {
    pub token: String,
    pub machine_id: String,
    /// exec 的 ed25519 公钥（base64url），首次 verify 时上报给 tenant，用于设备身份绑定
    #[serde(skip_serializing_if = "Option::is_none")]
    pub public_key: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub allowed: bool,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TenantVerifyRequest {
    pub license_key: String,
    pub hwid: String,
    pub device_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub public_key: Option<String>,
}

#[tauri::command]
pub async fn check_auth(
    auth_endpoint: String,
    token: String,
    machine_id: String,
    public_key: Option<String>,
) -> Result<AuthResponse, String> {
    let client = reqwest::Client::new();
    let payload = AuthRequest {
        token,
        machine_id,
        public_key,
    };

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

#[tauri::command]
pub async fn tenant_verify(
    verify_endpoint: String,
    license_key: String,
    hwid: String,
    device_name: String,
    public_key: Option<String>,
) -> Result<serde_json::Value, String> {
    let endpoint = verify_endpoint.trim();
    if endpoint.is_empty() {
        return Err("verify endpoint 不能为空".to_string());
    }
    if license_key.trim().is_empty() {
        return Err("license key 不能为空".to_string());
    }
    if hwid.trim().is_empty() {
        return Err("hwid 不能为空".to_string());
    }
    if device_name.trim().is_empty() {
        return Err("device name 不能为空".to_string());
    }

    let payload = TenantVerifyRequest {
        license_key,
        hwid,
        device_name,
        public_key,
    };

    let client = reqwest::Client::new();
    let response = client
        .post(endpoint)
        .json(&payload)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Tenant verify request failed: {}", e))?;

    let status = response.status();
    let body_text = response
        .text()
        .await
        .map_err(|e| format!("Tenant verify read body failed: {}", e))?;

    let parsed_json = serde_json::from_str::<serde_json::Value>(&body_text)
        .unwrap_or_else(|_| serde_json::json!({ "success": false, "error": body_text }));

    if status.is_success() {
        return Ok(parsed_json);
    }

    let error_message = parsed_json
        .get("error")
        .and_then(|v| v.as_str())
        .unwrap_or_else(|| body_text.trim());
    Err(format!(
        "Tenant verify failed: HTTP {} {}",
        status.as_u16(),
        if error_message.is_empty() {
            status.canonical_reason().unwrap_or("Unknown")
        } else {
            error_message
        }
    ))
}

use serde::{Deserialize, Serialize};
use tauri_plugin_store::StoreExt;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct NodeConfig {
    pub token: String,
    pub auth_endpoint: String,
    pub gateway_endpoint: String,
    pub cloud_console_url: String,
}

#[tauri::command]
pub fn get_config(app: tauri::AppHandle) -> Result<NodeConfig, String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;
    let config = store
        .get("node_config")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    Ok(config)
}

#[tauri::command]
pub fn save_config(app: tauri::AppHandle, config: NodeConfig) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;
    store.set(
        "node_config",
        serde_json::to_value(&config).map_err(|e| e.to_string())?,
    );
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

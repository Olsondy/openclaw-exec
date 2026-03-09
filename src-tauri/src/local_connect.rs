use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};

/// 本地连接结果，返回给前端
#[derive(Debug, Serialize)]
pub struct LocalConnectResult {
    pub gateway_url: String,
    pub gateway_web_ui: String,
    pub token: String,
    pub agent_id: String,
    pub device_name: String,
    /// 重启日志（含成功/失败/不可用信息），None 表示设备已配对无需重启
    pub restart_log: Option<String>,
}

/// openclaw.json gateway 字段子集
#[derive(Debug, Deserialize)]
struct OpenClawConfig {
    gateway: Option<GatewayConfig>,
}

#[derive(Debug, Deserialize)]
struct GatewayConfig {
    port: Option<u16>,
}

// ─── 工作空间 ────────────────────────────────────────────────────

fn find_workspace(home: PathBuf) -> Result<PathBuf, String> {
    let workspace = home.join(".openclaw");
    if !workspace.exists() {
        return Err("未找到 .openclaw 工作空间，请确认 openclaw 已本地安装".to_string());
    }
    Ok(workspace)
}

fn read_gateway_port(workspace: &PathBuf) -> u16 {
    let config_path = workspace.join("openclaw.json");
    if let Ok(content) = std::fs::read_to_string(config_path) {
        if let Ok(config) = serde_json::from_str::<OpenClawConfig>(&content) {
            if let Some(gw) = config.gateway {
                if let Some(port) = gw.port {
                    return port;
                }
            }
        }
    }
    18789
}

// ─── 端口探测 ────────────────────────────────────────────────────

async fn discover_gateway_port(base_port: u16) -> Result<u16, String> {
    for port in base_port..=(base_port + 10) {
        if tokio::net::TcpStream::connect(format!("127.0.0.1:{}", port))
            .await
            .is_ok()
        {
            return Ok(port);
        }
    }
    Err(format!(
        "未找到在线的 openclaw gateway（扫描 {}~{}），请确认服务已启动",
        base_port,
        base_port + 10
    ))
}

async fn wait_for_port(port: u16, timeout_secs: u64) -> bool {
    for _ in 0..timeout_secs {
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        if tokio::net::TcpStream::connect(format!("127.0.0.1:{}", port))
            .await
            .is_ok()
        {
            return true;
        }
    }
    false
}

// ─── 设备配对 ────────────────────────────────────────────────────

/// 读取或写入 paired.json
/// 返回 (token, needs_restart)
fn ensure_device_paired(
    workspace: &PathBuf,
    device_id: &str,
    public_key_raw: &str,
) -> Result<(String, bool), String> {
    let paired_path = workspace.join("devices").join("paired.json");

    let mut paired: serde_json::Map<String, serde_json::Value> = if paired_path.exists() {
        let content = std::fs::read_to_string(&paired_path)
            .map_err(|e| format!("读取 paired.json 失败: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("解析 paired.json 失败: {}", e))?
    } else {
        serde_json::Map::new()
    };

    // 已有有效 token，直接复用
    if let Some(entry) = paired.get(device_id) {
        if let Some(token) = entry
            .get("tokens")
            .and_then(|t| t.get("node"))
            .and_then(|n| n.get("token"))
            .and_then(|t| t.as_str())
        {
            return Ok((token.to_string(), false));
        }
    }

    // 写入新授权条目
    let token_bytes: [u8; 32] = rand::random();
    let token = hex::encode(token_bytes);

    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    paired.insert(
        device_id.to_string(),
        serde_json::json!({
            "deviceId": device_id,
            "publicKey": public_key_raw,
            "clientId": "openclaw-mate",
            "clientMode": "backend",
            "role": "node",
            "roles": ["node"],
            "scopes": ["node.execute"],
            "approvedScopes": ["node.execute"],
            "tokens": {
                "node": {
                    "token": token,
                    "role": "node",
                    "scopes": ["node.execute"],
                    "createdAtMs": now_ms,
                    "lastUsedAtMs": now_ms
                }
            },
            "createdAtMs": now_ms,
            "approvedAtMs": now_ms
        }),
    );

    if let Some(parent) = paired_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("创建 devices 目录失败: {}", e))?;
    }

    let content = serde_json::to_string_pretty(&serde_json::Value::Object(paired))
        .map_err(|e| format!("序列化 paired.json 失败: {}", e))?;
    std::fs::write(&paired_path, content)
        .map_err(|e| format!("写入 paired.json 失败: {}", e))?;

    Ok((token, true))
}

// ─── 服务重启 ────────────────────────────────────────────────────

async fn try_restart_openclaw() -> String {
    match tokio::process::Command::new("openclaw")
        .args(["daemon", "restart"])
        .output()
        .await
    {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);
            if out.status.success() {
                format!("[restart] success\n{}", stdout.trim())
            } else {
                format!(
                    "[restart] failed (exit: {:?})\nstdout: {}\nstderr: {}",
                    out.status.code(),
                    stdout.trim(),
                    stderr.trim()
                )
            }
        }
        Err(e) => format!(
            "[restart] command not available: {}\n容器安装请手动重启 openclaw 服务",
            e
        ),
    }
}

// ─── Tauri Command ───────────────────────────────────────────────

#[tauri::command]
pub async fn local_connect(app: tauri::AppHandle) -> Result<LocalConnectResult, String> {
    use tauri::Manager;

    // 1. 找工作空间
    let home = app
        .path()
        .home_dir()
        .map_err(|e| format!("无法获取用户主目录: {}", e))?;
    let workspace = find_workspace(home)?;

    // 2. 读取配置的 gateway port
    let base_port = read_gateway_port(&workspace);

    // 3. 探测在线的 gateway 端口
    let port = discover_gateway_port(base_port).await?;

    // 4. 加载 device identity
    let identity = crate::device_identity::load_or_create_device_identity(&app)?;

    // 5. 确保设备已配对，获取 token
    let (token, needs_restart) =
        ensure_device_paired(&workspace, &identity.device_id, &identity.public_key_raw)?;

    // 6. 写入了新条目则重启服务，失败仅记录日志
    let restart_log = if needs_restart {
        let log = try_restart_openclaw().await;
        let recovered = wait_for_port(port, 15).await;
        let health = if recovered {
            "[health] 服务已就绪"
        } else {
            "[health] 等待超时，尝试直接连接（容器模式可能需要手动重启）"
        };
        Some(format!("{}\n{}", log, health))
    } else {
        None
    };

    Ok(LocalConnectResult {
        gateway_url: format!("ws://127.0.0.1:{}", port),
        gateway_web_ui: format!("http://127.0.0.1:{}/#token={}", port, token),
        token,
        agent_id: identity.device_id.clone(),
        device_name: format!("openclaw-mate-{}", &identity.device_id[..8]),
        restart_log,
    })
}

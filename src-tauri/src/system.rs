use crate::config::AppConfig;
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub kernel: String,
    pub hostname: String,
    pub default_shell: String,
    pub user: String,
}

#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    let os = std::fs::read_to_string("/etc/os-release")
        .ok()
        .and_then(|c| {
            for line in c.lines() {
                if line.starts_with("PRETTY_NAME=") {
                    return Some(
                        line.trim_start_matches("PRETTY_NAME=")
                            .trim_matches('"')
                            .to_string(),
                    );
                }
            }
            None
        })
        .unwrap_or_else(|| "Linux".to_string());

    let kernel = std::fs::read_to_string("/proc/sys/kernel/osrelease")
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| "Unknown Kernel".to_string());

    let hostname = std::fs::read_to_string("/etc/hostname")
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| "localhost".to_string());

    let default_shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
    let user = std::env::var("USER").unwrap_or_else(|_| "user".to_string());

    SystemInfo {
        os,
        kernel,
        hostname,
        default_shell,
        user,
    }
}

#[tauri::command]
pub async fn pick_wallpaper_file() -> Result<Option<String>, String> {
    tokio::task::spawn_blocking(|| {
        let initial_dir = dirs::picture_dir()
            .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("/")));
        let initial_filename = format!("{}/", initial_dir.to_string_lossy().trim_end_matches('/'));

        let zenity_bin = if Path::new("/usr/bin/zenity").is_file() {
            "/usr/bin/zenity"
        } else {
            "zenity"
        };
        if let Ok(output) = std::process::Command::new(zenity_bin)
            .args([
                "--file-selection",
                "--title=壁紙画像を選択",
                &format!("--filename={}", initial_filename),
                "--file-filter=画像ファイル (*.png, *.jpg, *.jpeg, *.webp, *.svg, *.bmp) | *.png *.jpg *.jpeg *.webp *.gif *.svg *.bmp *.PNG *.JPG *.JPEG *.WEBP *.SVG *.BMP",
                "--file-filter=すべてのファイル (*) | *",
            ])
            .output()
        {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    crate::config::validate_wallpaper_file_path(&path)?;
                    return Ok(Some(path));
                }
            }
            return Ok(None);
        }

        let kdialog_bin = if Path::new("/usr/bin/kdialog").is_file() {
            "/usr/bin/kdialog"
        } else {
            "kdialog"
        };
        if let Ok(output) = std::process::Command::new(kdialog_bin)
            .args([
                "--getopenfilename",
                &initial_filename,
                "*.png *.jpg *.jpeg *.webp *.gif *.svg *.bmp *.PNG *.JPG *.JPEG *.WEBP|画像ファイル (*.png *.jpg *.jpeg *.webp)\n*|すべてのファイル (*)",
            ])
            .output()
        {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    crate::config::validate_wallpaper_file_path(&path)?;
                    return Ok(Some(path));
                }
            }
            return Ok(None);
        }

        Err("ファイル選択ダイアログを開けませんでした。パスを手動で入力してください。".to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn validate_wallpaper_path(path: String) -> Result<(), String> {
    crate::config::validate_wallpaper_file_path(&path)
}

#[tauri::command]
pub fn save_wallpaper_file(
    state: State<'_, AppState>,
    file_name: String,
    file_data: Vec<u8>,
) -> Result<String, String> {
    state.config_manager.save_wallpaper_data(&file_name, &file_data)
}

#[tauri::command]
pub fn get_config(state: State<'_, AppState>) -> AppConfig {
    state.config_manager.load()
}

#[tauri::command]
pub fn save_config(state: State<'_, AppState>, config: AppConfig) -> Result<(), String> {
    state.config_manager.save(&config)
}

#[tauri::command]
pub fn log_kitty_debug(msg: String) {
    use std::io::Write;
    const MAX_LOG_SIZE: u64 = 10 * 1024 * 1024; // 10MB
    const MAX_MSG_LEN: usize = 4096;

    let log_path = "/tmp/waddle_kitty_debug.log";
    if let Ok(metadata) = std::fs::symlink_metadata(log_path) {
        if metadata.file_type().is_symlink() || metadata.len() > MAX_LOG_SIZE {
            let _ = std::fs::remove_file(log_path);
        }
    }

    let end_idx = if msg.len() > MAX_MSG_LEN {
        match msg.char_indices().take_while(|(idx, _)| *idx <= MAX_MSG_LEN).last() {
            Some((idx, ch)) => {
                let next = idx + ch.len_utf8();
                if next <= MAX_MSG_LEN { next } else { idx }
            }
            None => 0,
        }
    } else {
        msg.len()
    };
    let trimmed = &msg[..end_idx];

    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        if let Ok(mut f) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .custom_flags(libc::O_NOFOLLOW)
            .open(log_path)
        {
            let _ = writeln!(f, "{}", trimmed);
        }
    }
    #[cfg(not(unix))]
    {
        if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(log_path) {
            let _ = writeln!(f, "{}", trimmed);
        }
    }
}

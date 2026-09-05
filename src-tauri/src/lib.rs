mod ai;
mod config;
mod pty;

use ai::{
    AiClient, ChatMessage, CommandSuggestion, ErrorExplanation, OllamaStatus, TerminalContext,
};
use config::{AppConfig, ConfigManager};
use pty::{check_git_status, GitStatus, PtyManager, PtySessionInfo};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::{AppHandle, State};

pub struct AppState {
    pty_manager: PtyManager,
    config_manager: ConfigManager,
    ai_client: AiClient,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub kernel: String,
    pub hostname: String,
    pub default_shell: String,
    pub user: String,
}

// --- PTY Commands ---

#[tauri::command]
async fn create_pty(
    app: AppHandle,
    state: State<'_, AppState>,
    rows: u16,
    cols: u16,
    cwd: Option<String>,
    shell: Option<String>,
) -> Result<PtySessionInfo, String> {
    state
        .pty_manager
        .create_pty(app, rows, cols, cwd, shell)
        .await
}

#[tauri::command]
async fn write_pty(
    state: State<'_, AppState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    state.pty_manager.write(&session_id, &data).await
}

#[tauri::command]
async fn resize_pty(
    state: State<'_, AppState>,
    session_id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    state.pty_manager.resize(&session_id, rows, cols).await
}

#[tauri::command]
async fn close_pty(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    state.pty_manager.close(&session_id).await
}

#[tauri::command]
async fn get_session_cwd(state: State<'_, AppState>, session_id: String) -> Result<String, String> {
    state.pty_manager.get_cwd(&session_id).await
}

#[tauri::command]
fn get_git_status(path: String) -> GitStatus {
    check_git_status(&path)
}

// --- Editor & File System Commands ---

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("File not found: {}", path));
    }
    fs::read_to_string(p).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(p, content).map_err(|e| format!("Failed to write file: {}", e))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_symlink: bool,
    pub size: u64,
    pub readonly: bool,
    pub modified: Option<u64>,
}

#[tauri::command]
fn read_directory(path: String, show_hidden: bool) -> Result<Vec<FileEntry>, String> {
    let p = Path::new(&path);
    if !p.exists() || !p.is_dir() {
        return Ok(Vec::new());
    }

    let mut entries_list = Vec::new();
    if let Ok(entries) = fs::read_dir(p) {
        for entry in entries.flatten() {
            if let Ok(file_name) = entry.file_name().into_string() {
                if !show_hidden && file_name.starts_with('.') {
                    continue;
                }
                if !show_hidden && file_name == ".git" {
                    continue;
                }
                let file_path = entry.path().to_string_lossy().to_string();
                let file_type = entry.file_type();
                let is_dir = file_type.as_ref().map(|t| t.is_dir()).unwrap_or(false);
                let is_symlink = file_type.as_ref().map(|t| t.is_symlink()).unwrap_or(false);
                let metadata = entry.metadata().ok();
                let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
                let readonly = metadata.as_ref().map(|m| m.permissions().readonly()).unwrap_or(false);
                let modified = metadata
                    .and_then(|m| m.modified().ok())
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs());

                entries_list.push(FileEntry {
                    name: file_name,
                    path: file_path,
                    is_dir,
                    is_symlink,
                    size,
                    readonly,
                    modified,
                });
            }
        }
    }

    // Sort: directories first, then alphabetical case-insensitive
    entries_list.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(entries_list)
}

#[tauri::command]
fn create_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if p.exists() {
        return Err("File already exists".to_string());
    }
    fs::File::create(p).map_err(|e| format!("Failed to create file: {}", e))?;
    Ok(())
}

#[tauri::command]
fn create_directory(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    fs::create_dir_all(p).map_err(|e| format!("Failed to create directory: {}", e))
}

fn validate_safe_deletion(path: &Path) -> Result<(), String> {
    let canonical = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());

    // 1. Never allow root directory "/"
    if canonical.parent().is_none() || canonical == Path::new("/") {
        return Err("安全上の理由によりルートディレクトリ (/) の削除は禁止されています。".to_string());
    }

    // 2. Never allow user home directory directly
    if let Some(home) = dirs::home_dir() {
        if let Ok(home_canonical) = home.canonicalize() {
            if canonical == home_canonical {
                return Err("安全上の理由によりホームディレクトリ自体の削除は禁止されています。".to_string());
            }
        } else if canonical == home {
            return Err("安全上の理由によりホームディレクトリ自体の削除は禁止されています。".to_string());
        }
    }

    // 3. Never allow critical system directories
    let forbidden_system_dirs = [
        "/etc", "/usr", "/bin", "/sbin", "/boot", "/lib", "/lib64",
        "/sys", "/proc", "/dev", "/var", "/opt", "/root", "/run"
    ];
    for &sys_dir in &forbidden_system_dirs {
        if canonical == Path::new(sys_dir) {
            return Err(format!("安全上の理由によりシステムディレクトリ ({}) の削除は禁止されています。", sys_dir));
        }
    }

    Ok(())
}

#[tauri::command]
fn delete_entry(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Ok(());
    }
    validate_safe_deletion(p)?;
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| format!("Failed to delete directory: {}", e))
    } else {
        fs::remove_file(p).map_err(|e| format!("Failed to delete file: {}", e))
    }
}

// --- AI Commands (Ollama) ---

#[tauri::command]
async fn check_ollama_status(
    state: State<'_, AppState>,
    endpoint: Option<String>,
) -> Result<OllamaStatus, String> {
    let ep = endpoint.unwrap_or_else(|| "http://localhost:11434".to_string());
    Ok(state.ai_client.check_ollama_status(&ep).await)
}

#[tauri::command]
async fn generate_command(
    state: State<'_, AppState>,
    prompt: String,
    context: TerminalContext,
) -> Result<CommandSuggestion, String> {
    let config = state.config_manager.load();
    state
        .ai_client
        .generate_command(&prompt, &context, &config.ai)
        .await
}

#[tauri::command]
async fn explain_error(
    state: State<'_, AppState>,
    command: String,
    output: String,
    exit_code: i32,
    context: TerminalContext,
) -> Result<ErrorExplanation, String> {
    let config = state.config_manager.load();
    state
        .ai_client
        .explain_error(&command, &output, exit_code, &context, &config.ai)
        .await
}

#[tauri::command]
async fn stream_ai_chat(
    app: AppHandle,
    state: State<'_, AppState>,
    chat_id: String,
    messages: Vec<ChatMessage>,
    context: TerminalContext,
) -> Result<(), String> {
    let config = state.config_manager.load();
    state
        .ai_client
        .stream_chat(app, chat_id, messages, &context, &config.ai)
        .await
}

#[tauri::command]
async fn ai_edit_code(
    state: State<'_, AppState>,
    instruction: String,
    code: String,
    file_name: Option<String>,
    context: TerminalContext,
) -> Result<String, String> {
    let config = state.config_manager.load();
    state
        .ai_client
        .edit_code(
            &instruction,
            &code,
            file_name.as_deref(),
            &context,
            &config.ai,
        )
        .await
}

// --- Config & System Commands ---

#[tauri::command]
async fn pick_wallpaper_file() -> Result<Option<String>, String> {
    tokio::task::spawn_blocking(|| {
        // Prefer /usr/bin/zenity to prevent PATH spoofing
        let zenity_bin = if Path::new("/usr/bin/zenity").is_file() {
            "/usr/bin/zenity"
        } else {
            "zenity"
        };
        if let Ok(output) = std::process::Command::new(zenity_bin)
            .args([
                "--file-selection",
                "--title=壁紙画像を選択",
                "--file-filter=画像ファイル (*.png, *.jpg, *.jpeg, *.webp, *.svg) | *.png *.jpg *.jpeg *.webp *.gif *.svg *.bmp",
            ])
            .output()
        {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    return Ok(Some(path));
                }
            }
            return Ok(None);
        }

        // Try kdialog fallback
        let kdialog_bin = if Path::new("/usr/bin/kdialog").is_file() {
            "/usr/bin/kdialog"
        } else {
            "kdialog"
        };
        if let Ok(output) = std::process::Command::new(kdialog_bin)
            .args(["--getopenfilename", ".", "*.png *.jpg *.jpeg *.webp *.gif *.svg *.bmp"])
            .output()
        {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
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
fn save_wallpaper_file(
    state: State<'_, AppState>,
    file_name: String,
    file_data: Vec<u8>,
) -> Result<String, String> {
    state.config_manager.save_wallpaper_data(&file_name, &file_data)
}

#[tauri::command]
fn get_config(state: State<'_, AppState>) -> AppConfig {
    state.config_manager.load()
}

#[tauri::command]
fn save_config(state: State<'_, AppState>, config: AppConfig) -> Result<(), String> {
    state.config_manager.save(&config)
}

#[tauri::command]
fn get_system_info() -> SystemInfo {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let pty_manager = PtyManager::new();
    let config_manager = ConfigManager::new();
    let ai_client = AiClient::new();

    let state = AppState {
        pty_manager,
        config_manager,
        ai_client,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            create_pty,
            write_pty,
            resize_pty,
            close_pty,
            get_session_cwd,
            get_git_status,
            read_file,
            write_file,
            read_directory,
            create_file,
            create_directory,
            delete_entry,
            check_ollama_status,
            generate_command,
            explain_error,
            stream_ai_chat,
            ai_edit_code,
            get_config,
            save_config,
            save_wallpaper_file,
            pick_wallpaper_file,
            get_system_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Waddle terminal application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_tree_operations() {
        let temp_dir = std::env::temp_dir().join(format!("waddle_tree_test_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(&temp_dir);
        let dir_path = temp_dir.to_str().unwrap().to_string();

        // 1. Create sub-directory
        let sub_dir = format!("{}/test_folder", dir_path);
        assert!(create_directory(sub_dir.clone()).is_ok());

        // 2. Create file
        let file_a = format!("{}/alpha.txt", dir_path);
        let file_b = format!("{}/beta.py", dir_path);
        let hidden_file = format!("{}/.hidden", dir_path);
        assert!(create_file(file_a.clone()).is_ok());
        assert!(create_file(file_b.clone()).is_ok());
        assert!(create_file(hidden_file.clone()).is_ok());

        // 3. Read directory without hidden
        let entries = read_directory(dir_path.clone(), false).expect("read_directory failed");
        let names: Vec<String> = entries.iter().map(|e| e.name.clone()).collect();
        assert!(names.contains(&"test_folder".to_string()));
        assert!(names.contains(&"alpha.txt".to_string()));
        assert!(names.contains(&"beta.py".to_string()));
        assert!(!names.contains(&".hidden".to_string()));

        // Folders should come first
        assert!(entries[0].is_dir);
        assert_eq!(entries[0].name, "test_folder");

        // 4. Read directory with hidden
        let entries_with_hidden = read_directory(dir_path.clone(), true).expect("read_directory failed");
        let all_names: Vec<String> = entries_with_hidden.iter().map(|e| e.name.clone()).collect();
        assert!(all_names.contains(&".hidden".to_string()));

        // 5. Delete file and folder
        assert!(delete_entry(file_a.clone()).is_ok());
        assert!(!Path::new(&file_a).exists());
        assert!(delete_entry(sub_dir.clone()).is_ok());
        assert!(!Path::new(&sub_dir).exists());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_forbidden_deletion_prevention() {
        // Root deletion should be blocked
        assert!(delete_entry("/".to_string()).is_err());

        // System dir deletion should be blocked
        assert!(delete_entry("/etc".to_string()).is_err());
        assert!(delete_entry("/usr".to_string()).is_err());

        // User home dir deletion should be blocked
        if let Some(home) = dirs::home_dir() {
            let home_str = home.to_string_lossy().to_string();
            assert!(delete_entry(home_str).is_err());
        }
    }
}

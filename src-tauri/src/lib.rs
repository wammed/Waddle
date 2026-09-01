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

#[tauri::command]
fn list_directory_files(path: String) -> Result<Vec<String>, String> {
    let p = Path::new(&path);
    if !p.exists() || !p.is_dir() {
        return Ok(Vec::new());
    }

    let mut files = Vec::new();
    if let Ok(entries) = fs::read_dir(p) {
        for entry in entries.flatten() {
            if let Ok(file_name) = entry.file_name().into_string() {
                // Skip hidden files if preferred, or keep
                if !file_name.starts_with(".git") {
                    let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
                    let display_name = if is_dir {
                        format!("{}/", file_name)
                    } else {
                        file_name
                    };
                    files.push(display_name);
                }
            }
        }
    }
    files.sort();
    Ok(files)
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
            list_directory_files,
            check_ollama_status,
            generate_command,
            explain_error,
            stream_ai_chat,
            ai_edit_code,
            get_config,
            save_config,
            save_wallpaper_file,
            get_system_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Waddle terminal application");
}

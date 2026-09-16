pub mod ai;
pub mod config;
pub mod editor_ops;
pub mod fs_ops;
pub mod git_ops;
pub mod kitty;
pub mod pty;
pub mod system;

use ai::{
    AiClient, ChatMessage, CommandSuggestion, ErrorExplanation, OllamaStatus, TerminalContext,
};
use config::ConfigManager;
use pty::{PtyManager, PtySessionInfo};
use tauri::{AppHandle, State};

pub use editor_ops::*;
pub use fs_ops::{
    create_directory, create_file, delete_entry, read_directory, read_file, rename_entry,
    reveal_in_file_manager, write_file, DirectoryListing, FileEntry,
};
pub use git_ops::*;
pub use system::*;

pub struct AppState {
    pub pty_manager: PtyManager,
    pub config_manager: ConfigManager,
    pub ai_client: AiClient,
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
async fn start_pty(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    state.pty_manager.start_pty(&session_id).await
}

#[tauri::command]
async fn pause_pty(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    state.pty_manager.pause_pty(&session_id).await
}

#[tauri::command]
async fn resume_pty(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    state.pty_manager.resume_pty(&session_id).await
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
    pixel_width: Option<u16>,
    pixel_height: Option<u16>,
) -> Result<(), String> {
    state
        .pty_manager
        .resize(&session_id, rows, cols, pixel_width, pixel_height)
        .await
}

#[tauri::command]
async fn close_pty(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    state.pty_manager.close(&session_id).await
}

#[tauri::command]
async fn get_session_cwd(state: State<'_, AppState>, session_id: String) -> Result<String, String> {
    state.pty_manager.get_cwd(&session_id).await
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
    mut context: TerminalContext,
) -> Result<CommandSuggestion, String> {
    let config = state.config_manager.load();
    if context.language.is_none() {
        context.language = Some(config.general.language.clone());
    }
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
    mut context: TerminalContext,
) -> Result<ErrorExplanation, String> {
    let config = state.config_manager.load();
    if context.language.is_none() {
        context.language = Some(config.general.language.clone());
    }
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
    mut context: TerminalContext,
) -> Result<(), String> {
    let config = state.config_manager.load();
    if context.language.is_none() {
        context.language = Some(config.general.language.clone());
    }
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
    mut context: TerminalContext,
) -> Result<String, String> {
    let config = state.config_manager.load();
    if context.language.is_none() {
        context.language = Some(config.general.language.clone());
    }
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

#[tauri::command]
fn get_project_rules(
    state: State<'_, AppState>,
    cwd: String,
    lang: Option<String>,
) -> Result<Option<ai::ProjectRulesInfo>, String> {
    let effective_lang = lang.unwrap_or_else(|| {
        let config = state.config_manager.load();
        config.general.language
    });
    Ok(ai::load_project_rules_info(&cwd, Some(&effective_lang)))
}

// --- Kitty Graphics Commands ---

#[tauri::command]
fn kitty_read_file(
    path: String,
    allowed_dir: Option<String>,
    max_bytes: Option<usize>,
    max_dimension: Option<u32>,
    is_temp: Option<bool>,
) -> Result<kitty::KittyFileData, String> {
    let limit_bytes = max_bytes.unwrap_or(16 * 1024 * 1024);
    let limit_dim = max_dimension.unwrap_or(4096);
    kitty::read_kitty_file(
        &path,
        allowed_dir.as_deref(),
        limit_bytes,
        limit_dim,
        is_temp.unwrap_or(false),
    )
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
            start_pty,
            pause_pty,
            resume_pty,
            write_pty,
            resize_pty,
            close_pty,
            get_session_cwd,
            get_git_status,
            git_stage_file,
            git_unstage_file,
            git_stage_all,
            git_unstage_all,
            git_discard_file,
            git_commit,
            git_get_branches,
            git_checkout_branch,
            git_get_diff,
            git_push,
            git_pull,
            git_generate_commit_message,
            read_file,
            write_file,
            read_directory,
            create_file,
            create_directory,
            delete_entry,
            rename_entry,
            reveal_in_file_manager,
            check_ollama_status,
            generate_command,
            explain_error,
            stream_ai_chat,
            ai_edit_code,
            get_project_rules,
            get_config,
            save_config,
            save_wallpaper_file,
            pick_wallpaper_file,
            validate_wallpaper_path,
            get_system_info,
            kitty_read_file,
            log_kitty_debug,
            editor_open_file,
            editor_save_file,
            editor_save_autosave,
            editor_remove_autosave,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Waddle terminal application");
}

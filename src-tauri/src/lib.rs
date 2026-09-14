mod ai;
mod config;
mod kitty;
mod pty;

use ai::{
    AiClient, ChatMessage, CommandSuggestion, ErrorExplanation, OllamaStatus, TerminalContext,
};
use config::{AppConfig, ConfigManager};
use pty::{check_git_status, GitStatus, PtyManager, PtySessionInfo};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
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

#[tauri::command]
fn get_git_status(path: String) -> GitStatus {
    check_git_status(&path)
}

#[tauri::command]
fn git_stage_file(repo_path: String, file_path: String) -> Result<(), String> {
    pty::git_stage_file(&repo_path, &file_path)
}

#[tauri::command]
fn git_unstage_file(repo_path: String, file_path: String) -> Result<(), String> {
    pty::git_unstage_file(&repo_path, &file_path)
}

#[tauri::command]
fn git_stage_all(repo_path: String) -> Result<(), String> {
    pty::git_stage_all(&repo_path)
}

#[tauri::command]
fn git_unstage_all(repo_path: String) -> Result<(), String> {
    pty::git_unstage_all(&repo_path)
}

#[tauri::command]
fn git_discard_file(repo_path: String, file_path: String) -> Result<(), String> {
    pty::git_discard_file(&repo_path, &file_path)
}

#[tauri::command]
fn git_commit(repo_path: String, message: String) -> Result<String, String> {
    pty::git_commit(&repo_path, &message)
}

#[tauri::command]
fn git_get_branches(repo_path: String) -> Result<Vec<String>, String> {
    pty::git_get_branches(&repo_path)
}

#[tauri::command]
fn git_checkout_branch(repo_path: String, branch: String) -> Result<String, String> {
    pty::git_checkout_branch(&repo_path, &branch)
}

#[tauri::command]
fn git_get_diff(repo_path: String, file_path: Option<String>, staged: bool) -> Result<String, String> {
    pty::git_get_diff(&repo_path, file_path.as_deref(), staged)
}

#[tauri::command]
async fn git_push(state: State<'_, AppState>, repo_path: String) -> Result<String, String> {
    let config = state.config_manager.load();
    let restrict = config.git.restrict_to_github;
    tokio::task::spawn_blocking(move || {
        pty::git_push(&repo_path, restrict)
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
async fn git_pull(state: State<'_, AppState>, repo_path: String) -> Result<String, String> {
    let config = state.config_manager.load();
    let restrict = config.git.restrict_to_github;
    tokio::task::spawn_blocking(move || {
        pty::git_pull(&repo_path, restrict)
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
async fn git_generate_commit_message(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<String, String> {
    let diff = pty::git_get_diff(&repo_path, None, true)?;
    let target_diff = if diff.trim().is_empty() {
        pty::git_get_diff(&repo_path, None, false)?
    } else {
        diff
    };

    if target_diff.trim().is_empty() {
        return Err("No staged or unstaged changes found to generate commit message.".to_string());
    }

    let config = state.config_manager.load();
    state
        .ai_client
        .generate_commit_message(&target_diff, &config.ai)
        .await
}

// --- Editor & File System Commands ---

fn resolve_canonical_path(path: &Path) -> PathBuf {
    if let Ok(c) = path.canonicalize() {
        return c;
    }
    // If path does not exist yet (e.g. creating/writing a new file),
    // traverse up until an existing ancestor is found and canonicalize that,
    // then append the remaining components.
    let mut components = Vec::new();
    let mut curr = path.to_path_buf();
    while !curr.exists() {
        if let Some(file_name) = curr.file_name() {
            components.push(file_name.to_os_string());
            if let Some(parent) = curr.parent() {
                curr = parent.to_path_buf();
            } else {
                break;
            }
        } else {
            break;
        }
    }
    let base = curr.canonicalize().unwrap_or(curr);
    let mut resolved = base;
    for comp in components.into_iter().rev() {
        resolved.push(comp);
    }
    resolved
}

fn validate_safe_read(path: &Path) -> Result<(), String> {
    let canonical = resolve_canonical_path(path);

    if let Some(home) = dirs::home_dir() {
        let home_canon = home.canonicalize().unwrap_or(home);

        // 1. Protect ~/.ssh directory secrets (allow only config, known_hosts, authorized_keys, *.pub)
        let ssh_dir = home_canon.join(".ssh");
        if canonical.starts_with(&ssh_dir) {
            if let Some(file_name) = canonical.file_name().and_then(|n| n.to_str()) {
                let is_safe_ssh_file = file_name == "config"
                    || file_name.starts_with("known_hosts")
                    || file_name.starts_with("authorized_keys")
                    || file_name.ends_with(".pub");
                if !is_safe_ssh_file {
                    return Err("EACCES: 安全上の理由によりSSH秘密鍵・機密設定の直接読み出しは禁止されています。 (Access denied: reading SSH private keys or configuration is restricted)".to_string());
                }
            } else {
                return Err("EACCES: 安全上の理由によりSSH設定ディレクトリの直接読み出しは禁止されています。 (Access denied: reading SSH configuration directory is restricted)".to_string());
            }
        }

        // 2. Block reading sensitive private keys matching well-known names anywhere
        if let Some(file_name) = canonical.file_name().and_then(|n| n.to_str()) {
            let sensitive_keys = ["id_rsa", "id_ed25519", "id_ecdsa", "id_dsa"];
            if sensitive_keys.contains(&file_name) {
                return Err("EACCES: 安全上の理由によりSSH秘密鍵の直接読み出しは禁止されています。 (Access denied: reading SSH private key files is restricted)".to_string());
            }
        }

        // 3. Block reading sensitive GPG private keys
        let gpg_private = home_canon.join(".gnupg").join("private-keys-v1.d");
        if canonical.starts_with(&gpg_private) {
            return Err("EACCES: 安全上の理由によりGPG秘密鍵領域の読み出しは禁止されています。 (Access denied: reading GPG private keys is restricted)".to_string());
        }

        // 4. Block reading system keyrings
        let keyrings_dir = home_canon.join(".local").join("share").join("keyrings");
        if canonical.starts_with(&keyrings_dir) {
            return Err("EACCES: 安全上の理由によりシステムキーリング領域の読み出しは禁止されています。 (Access denied: reading system keyrings is restricted)".to_string());
        }
    }

    Ok(())
}

fn validate_safe_write(path: &Path) -> Result<(), String> {
    let canonical = resolve_canonical_path(path);

    // 1. Never allow root directory "/"
    if canonical.parent().is_none() || canonical == Path::new("/") {
        return Err("EACCES: 安全上の理由によりルートディレクトリ (/) への書き込みは禁止されています。 (Access denied: writing to root directory is restricted)".to_string());
    }

    // 2. Protect user home directly and sensitive credential directories
    if let Some(home) = dirs::home_dir() {
        let home_canon = home.canonicalize().unwrap_or(home);
        if canonical == home_canon {
            return Err("EACCES: 安全上の理由によりホームディレクトリパス自体への書き込みは禁止されています。 (Access denied: writing to home directory path is restricted)".to_string());
        }

        let sensitive_home_dirs = [".ssh", ".gnupg", ".local/share/keyrings"];
        for rel in &sensitive_home_dirs {
            let target = home_canon.join(rel);
            if canonical == target || canonical.starts_with(&target) {
                return Err(format!("EACCES: 安全上の理由により重要資格情報領域 (~/{}) への書き込みは禁止されています。 (Access denied: writing to credential directory is restricted)", rel));
            }
        }

        let sensitive_shell_files = [
            ".bashrc", ".bash_profile", ".bash_login",
            ".zshrc", ".zprofile", ".zshenv", ".profile"
        ];
        for file in &sensitive_shell_files {
            let target = home_canon.join(file);
            if canonical == target {
                return Err(format!("EACCES: 安全上の理由によりシェル設定ファイル (~/{}) への書き込みは禁止されています。 (Access denied: writing to shell configuration file is restricted)", file));
            }
        }
    }

    // 3. Protect critical system directories
    let forbidden_system_dirs = [
        "/etc", "/usr", "/bin", "/sbin", "/boot", "/lib", "/lib64",
        "/sys", "/proc", "/dev", "/var", "/opt", "/root", "/run"
    ];
    for &sys_dir in &forbidden_system_dirs {
        let sys_path = Path::new(sys_dir);
        if canonical == sys_path || canonical.starts_with(sys_path) {
            // Allow temporary files inside /var/tmp if used by system
            if sys_dir == "/var" && canonical.starts_with("/var/tmp") {
                continue;
            }
            return Err(format!("EACCES: 安全上の理由によりシステム領域 ({}) 配下への書き込みは禁止されています。 (Access denied: writing to system directory is restricted)", sys_dir));
        }
    }

    Ok(())
}

fn validate_safe_deletion(path: &Path) -> Result<(), String> {
    let canonical = resolve_canonical_path(path);

    // 1. Never allow root directory "/"
    if canonical.parent().is_none() || canonical == Path::new("/") {
        return Err("EACCES: 安全上の理由によりルートディレクトリ (/) の削除は禁止されています。 (Access denied: deleting root directory is restricted)".to_string());
    }

    // 2. Never allow user home directory directly and protect sensitive credential stores
    if let Some(home) = dirs::home_dir() {
        let home_canon = home.canonicalize().unwrap_or(home);
        if canonical == home_canon {
            return Err("EACCES: 安全上の理由によりホームディレクトリ自体の削除は禁止されています。 (Access denied: deleting home directory path is restricted)".to_string());
        }

        let sensitive_home_dirs = [".ssh", ".gnupg", ".local/share/keyrings"];
        for rel in &sensitive_home_dirs {
            let target = home_canon.join(rel);
            if canonical == target || canonical.starts_with(&target) {
                return Err(format!("EACCES: 安全上の理由により重要資格情報領域 (~/{}) の削除は禁止されています。 (Access denied: deleting credential directory is restricted)", rel));
            }
        }

        let sensitive_shell_files = [
            ".bashrc", ".bash_profile", ".bash_login",
            ".zshrc", ".zprofile", ".zshenv", ".profile"
        ];
        for file in &sensitive_shell_files {
            let target = home_canon.join(file);
            if canonical == target {
                return Err(format!("EACCES: 安全上の理由によりシェル設定ファイル (~/{}) の削除は禁止されています。 (Access denied: deleting shell configuration file is restricted)", file));
            }
        }

        let config_root = home_canon.join(".config");
        if canonical == config_root {
            return Err("EACCES: 安全上の理由により設定ルートディレクトリ (~/.config) の削除は禁止されています。 (Access denied: deleting ~/.config directory is restricted)".to_string());
        }
    }

    // 3. Never allow critical system directories or subdirectories (prefix match)
    let forbidden_system_dirs = [
        "/etc", "/usr", "/bin", "/sbin", "/boot", "/lib", "/lib64",
        "/sys", "/proc", "/dev", "/var", "/opt", "/root", "/run"
    ];
    for &sys_dir in &forbidden_system_dirs {
        let sys_path = Path::new(sys_dir);
        if canonical == sys_path || canonical.starts_with(sys_path) {
            if sys_dir == "/var" && canonical.starts_with("/var/tmp/") {
                continue;
            }
            return Err(format!("EACCES: 安全上の理由によりシステム領域 ({}) 配下の削除は禁止されています。 (Access denied: deleting system directory is restricted)", sys_dir));
        }
    }

    Ok(())
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    validate_safe_read(p)?;
    if !p.exists() {
        return Err(format!("File not found: {}", path));
    }
    fs::read_to_string(p).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    let p = Path::new(&path);
    validate_safe_write(p)?;
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryListing {
    pub entries: Vec<FileEntry>,
    pub total_count: usize,
    pub has_more: bool,
}

#[tauri::command]
fn read_directory(path: String, show_hidden: bool, limit: Option<usize>) -> Result<DirectoryListing, String> {
    let p = Path::new(&path);
    if !p.exists() || !p.is_dir() {
        return Ok(DirectoryListing {
            entries: Vec::new(),
            total_count: 0,
            has_more: false,
        });
    }

    let canonical = resolve_canonical_path(p);

    // 1. Block virtual/kernel/device filesystem probing: /proc, /sys, /dev
    let path_str = canonical.to_string_lossy();
    if path_str.starts_with("/proc") || path_str.starts_with("/sys") || path_str.starts_with("/dev") {
        return Err("EACCES: 安全上の理由により仮想/システムディレクトリ (/proc, /sys, /dev) の参照は禁止されています。 (Access denied: browsing /proc, /sys, /dev is restricted)".to_string());
    }

    // 2. Block sensitive credential directory browsing and flag SSH dir
    let is_ssh_dir = if let Some(home) = dirs::home_dir() {
        let home_canon = home.canonicalize().unwrap_or(home);
        let gpg_private = home_canon.join(".gnupg").join("private-keys-v1.d");
        if canonical == gpg_private || canonical.starts_with(&gpg_private) {
            return Err("EACCES: 安全上の理由によりGPG秘密鍵領域の参照は禁止されています。 (Access denied: browsing GPG private keys is restricted)".to_string());
        }
        let keyrings_dir = home_canon.join(".local").join("share").join("keyrings");
        if canonical == keyrings_dir || canonical.starts_with(&keyrings_dir) {
            return Err("EACCES: 安全上の理由によりシステムキーリング領域の参照は禁止されています。 (Access denied: browsing system keyrings is restricted)".to_string());
        }
        let ssh_dir = home_canon.join(".ssh");
        canonical == ssh_dir || canonical.starts_with(&ssh_dir)
    } else {
        false
    };

    let mut entries_list = Vec::new();
    if let Ok(entries) = fs::read_dir(p) {
        for entry in entries.flatten() {
            if let Ok(file_name) = entry.file_name().into_string() {
                // If browsing ~/.ssh, strip private keys to protect credentials
                if is_ssh_dir {
                    let is_safe_ssh_file = file_name == "config"
                        || file_name.starts_with("known_hosts")
                        || file_name.starts_with("authorized_keys")
                        || file_name.ends_with(".pub");
                    if !is_safe_ssh_file {
                        continue;
                    }
                }

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

    let total_count = entries_list.len();
    let max_limit = limit.unwrap_or(500);
    let has_more = total_count > max_limit;

    if has_more {
        entries_list.truncate(max_limit);
    }

    Ok(DirectoryListing {
        entries: entries_list,
        total_count,
        has_more,
    })
}

#[tauri::command]
fn create_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    validate_safe_write(p)?;
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
    validate_safe_write(p)?;
    fs::create_dir_all(p).map_err(|e| format!("Failed to create directory: {}", e))
}

#[tauri::command]
fn delete_entry(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    validate_safe_deletion(p)?;
    if !p.exists() {
        return Ok(());
    }
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| format!("Failed to delete directory: {}", e))
    } else {
        fs::remove_file(p).map_err(|e| format!("Failed to delete file: {}", e))
    }
}

#[tauri::command]
fn rename_entry(old_path: String, new_path: String) -> Result<(), String> {
    let old_p = Path::new(&old_path);
    let new_p = Path::new(&new_path);
    validate_safe_deletion(old_p)?;
    validate_safe_write(new_p)?;
    if !old_p.exists() {
        return Err("変更対象のファイルまたはディレクトリが存在しません。".to_string());
    }
    if new_p.exists() {
        return Err("変更先のファイル名またはパスが既に存在します。".to_string());
    }
    if let Some(parent) = new_p.parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::rename(old_p, new_p).map_err(|e| format!("名前の変更に失敗しました: {}", e))
}

#[tauri::command]
fn reveal_in_file_manager(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("対象パスが存在しません。".to_string());
    }
    let target_dir = if p.is_dir() {
        p
    } else {
        p.parent().unwrap_or(p)
    };

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(target_dir)
            .spawn()
            .map_err(|e| format!("ファイルマネージャーの起動に失敗しました: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("ファイルマネージャーの起動に失敗しました: {}", e))?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(format!("/select,{}", path))
            .spawn()
            .map_err(|e| format!("ファイルマネージャーの起動に失敗しました: {}", e))?;
    }

    Ok(())
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

// --- Config & System Commands ---

#[tauri::command]
async fn pick_wallpaper_file() -> Result<Option<String>, String> {
    tokio::task::spawn_blocking(|| {
        let initial_dir = dirs::picture_dir()
            .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("/")));
        let initial_filename = format!("{}/", initial_dir.to_string_lossy().trim_end_matches('/'));

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

        // Try kdialog fallback
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
fn validate_wallpaper_path(path: String) -> Result<(), String> {
    crate::config::validate_wallpaper_file_path(&path)
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

#[tauri::command]
fn log_kitty_debug(msg: String) {
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
        // Safely find the closest char boundary <= MAX_MSG_LEN to avoid UTF-8 slice panic
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
        let listing = read_directory(dir_path.clone(), false, None).expect("read_directory failed");
        let names: Vec<String> = listing.entries.iter().map(|e| e.name.clone()).collect();
        assert!(names.contains(&"test_folder".to_string()));
        assert!(names.contains(&"alpha.txt".to_string()));
        assert!(names.contains(&"beta.py".to_string()));
        assert!(!names.contains(&".hidden".to_string()));

        // Folders should come first
        assert!(listing.entries[0].is_dir);
        assert_eq!(listing.entries[0].name, "test_folder");

        // 4. Read directory with hidden
        let listing_with_hidden = read_directory(dir_path.clone(), true, None).expect("read_directory failed");
        let all_names: Vec<String> = listing_with_hidden.entries.iter().map(|e| e.name.clone()).collect();
        assert!(all_names.contains(&".hidden".to_string()));

        // 5. Rename entry
        let file_renamed = format!("{}/gamma.txt", dir_path);
        assert!(rename_entry(file_b.clone(), file_renamed.clone()).is_ok());
        assert!(!Path::new(&file_b).exists());
        assert!(Path::new(&file_renamed).exists());

        // 6. Delete file and folder
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

        // System dir and subdirectories deletion should be blocked
        assert!(delete_entry("/etc".to_string()).is_err());
        assert!(delete_entry("/etc/hosts".to_string()).is_err());
        assert!(delete_entry("/usr".to_string()).is_err());
        assert!(delete_entry("/usr/bin".to_string()).is_err());
        assert!(delete_entry("/bin".to_string()).is_err());
        assert!(delete_entry("/boot".to_string()).is_err());

        // User home dir and sensitive credential dirs should be blocked
        if let Some(home) = dirs::home_dir() {
            let home_str = home.to_string_lossy().to_string();
            assert!(delete_entry(home_str.clone()).is_err());

            let ssh_path = home.join(".ssh").to_string_lossy().to_string();
            assert!(delete_entry(ssh_path).is_err());

            let ssh_key_path = home.join(".ssh").join("id_rsa").to_string_lossy().to_string();
            assert!(delete_entry(ssh_key_path).is_err());

            let gpg_path = home.join(".gnupg").to_string_lossy().to_string();
            assert!(delete_entry(gpg_path).is_err());

            let config_root = home.join(".config").to_string_lossy().to_string();
            assert!(delete_entry(config_root).is_err());

            let bashrc_path = home.join(".bashrc").to_string_lossy().to_string();
            assert!(delete_entry(bashrc_path).is_err());

            let zshrc_path = home.join(".zshrc").to_string_lossy().to_string();
            assert!(delete_entry(zshrc_path).is_err());
        }
    }

    #[test]
    fn test_forbidden_write_prevention() {
        // Root write should be blocked
        assert!(write_file("/test_root_file.txt".to_string(), "malicious".to_string()).is_err());
        assert!(create_file("/test_root_file.txt".to_string()).is_err());

        // System dir write should be blocked
        assert!(write_file("/etc/malicious_cron".to_string(), "* * * * *".to_string()).is_err());
        assert!(create_file("/usr/bin/malicious_binary".to_string()).is_err());

        // Sensitive credential store write should be blocked
        if let Some(home) = dirs::home_dir() {
            let ssh_auth_keys = home.join(".ssh").join("authorized_keys").to_string_lossy().to_string();
            assert!(write_file(ssh_auth_keys.clone(), "ssh-rsa ...".to_string()).is_err());
            assert!(create_file(ssh_auth_keys).is_err());

            let gpg_key = home.join(".gnupg").join("private-keys-v1.d").join("key.sec").to_string_lossy().to_string();
            assert!(write_file(gpg_key.clone(), "secret".to_string()).is_err());

            let bashrc = home.join(".bashrc").to_string_lossy().to_string();
            assert!(write_file(bashrc.clone(), "# malicious payload".to_string()).is_err());

            let zshrc = home.join(".zshrc").to_string_lossy().to_string();
            assert!(write_file(zshrc.clone(), "# malicious payload".to_string()).is_err());
        }
    }

    #[test]
    fn test_forbidden_read_prevention() {
        // Sensitive private key reading should be blocked
        assert!(validate_safe_read(Path::new("/home/user/.ssh/id_rsa")).is_err());
        assert!(validate_safe_read(Path::new("/home/user/.ssh/id_ed25519")).is_err());
        assert!(validate_safe_read(Path::new("/home/user/.ssh/id_ecdsa")).is_err());

        // Normal files should be allowed
        assert!(validate_safe_read(Path::new("/tmp/some_script.py")).is_ok());
    }

    #[test]
    fn test_git_repo_root_and_github_remotes() {
        // The current working directory is inside a git repo (Waddle)
        let curr_dir = std::env::current_dir().unwrap();
        let root = pty::resolve_repo_root(&curr_dir.to_string_lossy());
        assert!(root.is_some(), "Current dir should be inside a git repo");

        let repo_root = root.unwrap();
        let (is_gh, blocked) = pty::inspect_github_remotes(&repo_root);
        // In Waddle repository, remote points to GitHub (https://github.com/wammed/Waddle.git)
        assert!(is_gh, "Waddle remote should be recognized as GitHub");
        assert!(blocked.is_none(), "No non-GitHub remote should be blocked in Waddle");

        let status = pty::check_git_status(&curr_dir.to_string_lossy());
        assert!(status.is_repo);
        assert!(status.is_github_repo);
    }

    #[test]
    fn test_git_push_pull_restrictions() {
        let temp_dir = std::env::temp_dir().join(format!("waddle_git_test_{}", uuid::Uuid::new_v4()));
        let _ = std::fs::create_dir_all(&temp_dir);
        let path_str = temp_dir.to_str().unwrap().to_string();

        // Init a temporary git repo
        let _ = std::process::Command::new("git")
            .args(["init"])
            .current_dir(&temp_dir)
            .output();

        // Add a non-github remote (e.g. gitlab.com)
        let _ = std::process::Command::new("git")
            .args(["remote", "add", "origin", "https://gitlab.com/user/fake-repo.git"])
            .current_dir(&temp_dir)
            .output();

        // When restrict_to_github is true, push and pull must be blocked
        let push_res = pty::git_push(&path_str, true);
        assert!(push_res.is_err(), "Push to GitLab should be blocked when restrict_to_github is true");
        assert!(push_res.unwrap_err().contains("GitHub限定ポリシー"));

        let pull_res = pty::git_pull(&path_str, true);
        assert!(pull_res.is_err(), "Pull from GitLab should be blocked when restrict_to_github is true");
        assert!(pull_res.unwrap_err().contains("GitHub限定ポリシー"));

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_is_github_host_strict_domain_validation() {
        // Valid GitHub endpoints
        assert!(pty::is_github_host("git@github.com:wammed/Waddle.git"));
        assert!(pty::is_github_host("https://github.com/wammed/Waddle.git"));
        assert!(pty::is_github_host("https://user:ghp_123456789@github.com/wammed/Waddle.git"));
        assert!(pty::is_github_host("https://gist.github.com/wammed/1234567.git"));
        assert!(pty::is_github_host("https://wammed.github.io/blog.git"));
        assert!(pty::is_github_host("ssh://git@github.com/wammed/Waddle.git"));

        // Malicious or non-GitHub endpoints that attempt to trick substring checks
        assert!(!pty::is_github_host("https://attacker.com/wammed/github.com.git"));
        assert!(!pty::is_github_host("https://github.com.attacker.com/wammed/Waddle.git"));
        assert!(!pty::is_github_host("git@attacker.com:github.com/Waddle.git"));
        assert!(!pty::is_github_host("https://gitlab.com/wammed/Waddle.git"));
        assert!(!pty::is_github_host("https://bitbucket.org/wammed/Waddle.git"));
        assert!(!pty::is_github_host(""));
        assert!(!pty::is_github_host("invalid-url"));
    }

    #[test]
    fn test_safe_read_custom_ssh_keys_and_keyrings() {
        if let Some(home) = dirs::home_dir() {
            // Safe SSH files must be allowed
            let safe_config = home.join(".ssh").join("config");
            let safe_pub = home.join(".ssh").join("id_ed25519.pub");
            let safe_hosts = home.join(".ssh").join("known_hosts");
            assert!(validate_safe_read(&safe_config).is_ok());
            assert!(validate_safe_read(&safe_pub).is_ok());
            assert!(validate_safe_read(&safe_hosts).is_ok());

            // Private keys (standard or custom named) must be rejected
            let standard_key = home.join(".ssh").join("id_ed25519");
            let custom_key = home.join(".ssh").join("my_custom_deploy_key");
            let work_key = home.join(".ssh").join("work_rsa_backup");
            assert!(validate_safe_read(&standard_key).is_err());
            assert!(validate_safe_read(&custom_key).is_err());
            assert!(validate_safe_read(&work_key).is_err());

            // Keyrings must be rejected
            let keyring = home.join(".local").join("share").join("keyrings").join("login.keyring");
            assert!(validate_safe_read(&keyring).is_err());
        }
    }

    #[test]
    fn test_read_directory_path_probing_protection() {
        // 1. Virtual / kernel filesystem access must be rejected
        assert!(read_directory("/proc".to_string(), true, None).is_err());
        assert!(read_directory("/proc/sys".to_string(), true, None).is_err());
        assert!(read_directory("/sys".to_string(), true, None).is_err());
        assert!(read_directory("/dev".to_string(), true, None).is_err());

        if let Some(home) = dirs::home_dir() {
            // 2. Sensitive key vault directories must be rejected
            let gpg_private = home.join(".gnupg").join("private-keys-v1.d");
            let _ = fs::create_dir_all(&gpg_private);
            assert!(read_directory(gpg_private.to_string_lossy().to_string(), true, None).is_err());

            let keyrings_dir = home.join(".local").join("share").join("keyrings");
            let _ = fs::create_dir_all(&keyrings_dir);
            assert!(read_directory(keyrings_dir.to_string_lossy().to_string(), true, None).is_err());

            // 3. ~/.ssh directory should not expose private keys
            let ssh_dir = home.join(".ssh");
            if ssh_dir.is_dir() {
                if let Ok(listing) = read_directory(ssh_dir.to_string_lossy().to_string(), true, None) {
                    for entry in listing.entries {
                        let name = &entry.name;
                        let is_safe = name == "config"
                            || name.starts_with("known_hosts")
                            || name.starts_with("authorized_keys")
                            || name.ends_with(".pub");
                        assert!(is_safe, "Private key file {} should have been stripped from read_directory", name);
                    }
                }
            }
        }
    }

    #[test]
    fn test_read_directory_pagination_limit() {
        let temp_dir = std::env::temp_dir().join(format!("waddle_test_page_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(&temp_dir);
        for i in 0..12 {
            let _ = fs::File::create(temp_dir.join(format!("file_{:02}.txt", i)));
        }

        // Limit 5
        let res5 = read_directory(temp_dir.to_string_lossy().to_string(), false, Some(5)).unwrap();
        assert_eq!(res5.total_count, 12);
        assert_eq!(res5.entries.len(), 5);
        assert!(res5.has_more);

        // Limit 15
        let res15 = read_directory(temp_dir.to_string_lossy().to_string(), false, Some(15)).unwrap();
        assert_eq!(res15.total_count, 12);
        assert_eq!(res15.entries.len(), 12);
        assert!(!res15.has_more);

        let _ = fs::remove_dir_all(&temp_dir);
    }
}


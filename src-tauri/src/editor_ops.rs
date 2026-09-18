use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

#[cfg(unix)]
use std::os::unix::fs::{MetadataExt, PermissionsExt};

const MAX_FILE_SIZE: u64 = 5 * 1024 * 1024; // 5MB
const BINARY_PROBE_SIZE: usize = 1024; // 1KB

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditorOpenResult {
    pub content: String,
    pub original_path: String,
    pub canonical_path: String,
    pub is_symlink: bool,
    pub is_readonly: bool,
    pub readonly_reason: Option<String>,
    pub warning_message: Option<String>,
    pub has_autosave: bool,
    pub autosave_content: Option<String>,
    pub autosave_timestamp: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AutosaveEntry {
    pub id: String,
    pub timestamp: u64,
    pub size_bytes: u64,
}

pub const MAX_AUTOSAVE_GENERATIONS: usize = 6;
pub const AUTOSAVE_STALE_SECS: u64 = 7 * 24 * 3600; // 7 days

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditorSaveResult {
    pub saved_path: String,
    pub is_symlink: bool,
    pub message: Option<String>,
}

/// Convert a canonical path to an autosave cache filename.
/// Example: /home/susie/.config/fish/config.fish -> %home%susie%.config%fish%config.fish
pub fn path_to_autosave_filename(canonical_path: &Path) -> String {
    let s = canonical_path.to_string_lossy();
    s.replace('/', "%")
}

/// Get the autosave cache directory ~/.cache/waddle/autosave/ and ensure it has 0700 permissions.
pub fn get_autosave_dir() -> Result<PathBuf, String> {
    let cache_dir = dirs::cache_dir()
        .or_else(|| dirs::home_dir().map(|h| h.join(".cache")))
        .ok_or_else(|| "Failed to resolve cache directory".to_string())?;

    let autosave_dir = cache_dir.join("waddle").join("autosave");
    if !autosave_dir.exists() {
        fs::create_dir_all(&autosave_dir)
            .map_err(|e| format!("Failed to create autosave cache dir: {}", e))?;
    }

    #[cfg(unix)]
    {
        let _ = fs::set_permissions(&autosave_dir, fs::Permissions::from_mode(0o700));
    }

    Ok(autosave_dir)
}

/// Get the autosave file path for a canonical target path (legacy single file).
pub fn get_autosave_file_path(canonical_path: &Path) -> Result<PathBuf, String> {
    let dir = get_autosave_dir()?;
    let name = path_to_autosave_filename(canonical_path);
    Ok(dir.join(name))
}

/// Save a timestamped autosave snapshot and rotate to keep at most MAX_AUTOSAVE_GENERATIONS (6).
pub fn save_autosave_snapshot(canonical_path: &Path, content: &str) -> Result<(), String> {
    let dir = get_autosave_dir()?;
    let base_name = path_to_autosave_filename(canonical_path);
    let now_millis = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    let new_filename = format!("{}.{}", base_name, now_millis);
    let new_file_path = dir.join(&new_filename);

    fs::write(&new_file_path, content)
        .map_err(|e| format!("自動バックアップスナップショットの保存に失敗しました: {}", e))?;

    #[cfg(unix)]
    {
        let _ = fs::set_permissions(&new_file_path, fs::Permissions::from_mode(0o600));
    }

    // Scan for all snapshots belonging to this base_name
    let prefix = format!("{}.", base_name);
    if let Ok(entries) = fs::read_dir(&dir) {
        let mut snapshots: Vec<(PathBuf, u64)> = Vec::new();
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with(&prefix) {
                let ts_str = &name[prefix.len()..];
                let ts = ts_str.parse::<u64>().unwrap_or_else(|_| {
                    entry
                        .metadata()
                        .ok()
                        .and_then(|m| m.modified().ok())
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_millis() as u64)
                        .unwrap_or(0)
                });
                snapshots.push((entry.path(), ts));
            } else if name == base_name {
                let ts = entry
                    .metadata()
                    .ok()
                    .and_then(|m| m.modified().ok())
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_millis() as u64)
                    .unwrap_or(0);
                snapshots.push((entry.path(), ts));
            }
        }

        // Sort descending (newest first)
        snapshots.sort_by_key(|a| std::cmp::Reverse(a.1));

        // Delete excess snapshots older than MAX_AUTOSAVE_GENERATIONS
        if snapshots.len() > MAX_AUTOSAVE_GENERATIONS {
            for (old_path, _) in &snapshots[MAX_AUTOSAVE_GENERATIONS..] {
                let _ = fs::remove_file(old_path);
            }
        }
    }

    Ok(())
}

/// Retrieve list of autosave snapshots for a canonical path, sorted descending (newest first), up to 6.
pub fn get_autosave_history(canonical_path: &Path) -> Result<Vec<AutosaveEntry>, String> {
    let dir = get_autosave_dir()?;
    let base_name = path_to_autosave_filename(canonical_path);
    let prefix = format!("{}.", base_name);

    let mut list: Vec<AutosaveEntry> = Vec::new();
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with(&prefix) {
                let ts_str = &name[prefix.len()..];
                let timestamp = ts_str.parse::<u64>().unwrap_or_else(|_| {
                    entry
                        .metadata()
                        .ok()
                        .and_then(|m| m.modified().ok())
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_millis() as u64)
                        .unwrap_or(0)
                });
                let size_bytes = entry.metadata().map(|m| m.len()).unwrap_or(0);
                list.push(AutosaveEntry {
                    id: name,
                    timestamp,
                    size_bytes,
                });
            } else if name == base_name {
                let meta = entry.metadata().ok();
                let timestamp = meta
                    .as_ref()
                    .and_then(|m| m.modified().ok())
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_millis() as u64)
                    .unwrap_or(0);
                let size_bytes = meta.map(|m| m.len()).unwrap_or(0);
                list.push(AutosaveEntry {
                    id: name,
                    timestamp,
                    size_bytes,
                });
            }
        }
    }

    list.sort_by_key(|a| std::cmp::Reverse(a.timestamp));
    list.truncate(MAX_AUTOSAVE_GENERATIONS);
    Ok(list)
}

/// Safely load content of an autosave snapshot by ID with path traversal and canonicalization checks.
pub fn load_autosave_content(cache_id: &str) -> Result<String, String> {
    if cache_id.is_empty()
        || cache_id.contains('/')
        || cache_id.contains('\\')
        || cache_id.contains("..")
    {
        return Err("不正なキャッシュファイル名です（パストラバーサル防止）".to_string());
    }

    let dir = get_autosave_dir()?;
    let target = dir.join(cache_id);

    if !target.exists() {
        return Err("指定されたバックアップキャッシュファイルが存在しません".to_string());
    }

    let canon_dir = dir.canonicalize().unwrap_or(dir);
    let canon_target = target
        .canonicalize()
        .map_err(|e| format!("キャッシュパスの解決に失敗しました: {}", e))?;

    if !canon_target.starts_with(&canon_dir) {
        return Err("不正なキャッシュパスへのアクセスが拒否されました".to_string());
    }

    fs::read_to_string(&canon_target)
        .map_err(|e| format!("バックアップキャッシュの読み込みに失敗しました: {}", e))
}

/// Remove autosave files in the given directory that are older than max_age_secs.
pub fn clean_stale_autosaves_in_dir(dir: &Path, max_age_secs: u64) -> usize {
    let Ok(entries) = fs::read_dir(dir) else { return 0 };
    let now = std::time::SystemTime::now();
    let mut removed = 0;

    for entry in entries.flatten() {
        if let Ok(meta) = entry.metadata() {
            if let Ok(mtime) = meta.modified() {
                if let Ok(age) = now.duration_since(mtime) {
                    if age.as_secs() >= max_age_secs && fs::remove_file(entry.path()).is_ok() {
                        removed += 1;
                    }
                }
            }
        }
    }
    removed
}

/// Remove autosave files that are older than max_age_secs (e.g. 7 days).
pub fn clean_stale_autosaves(max_age_secs: u64) -> usize {
    let Ok(dir) = get_autosave_dir() else { return 0 };
    clean_stale_autosaves_in_dir(&dir, max_age_secs)
}

/// Check if a path is within the user's home directory.
pub fn is_under_home(path: &Path) -> bool {
    if let Some(home) = dirs::home_dir() {
        let home_canon = home.canonicalize().unwrap_or(home);
        if let Ok(canon) = path.canonicalize() {
            return canon.starts_with(&home_canon);
        }
        return path.starts_with(&home_canon);
    }
    false
}

/// Check if a canonical path corresponds to a shell configuration file within the user's home directory.
pub fn is_shell_config(canonical_path: &Path, home_dir: &Path) -> bool {
    let Ok(rel_path) = canonical_path.strip_prefix(home_dir) else {
        return false;
    };

    let file_name = match canonical_path.file_name().and_then(|n| n.to_str()) {
        Some(name) => name,
        None => return false,
    };

    // 1. ~/.config/ standard shell config directories
    let config_prefix = Path::new(".config");
    if let Ok(config_rel) = rel_path.strip_prefix(config_prefix) {
        if config_rel.starts_with("fish")
            || config_rel.starts_with("zsh")
            || config_rel.starts_with("bash")
            || config_rel.starts_with("nushell")
        {
            return true;
        }
    }

    // 2. $HOME direct children (known shell files)
    if rel_path.parent() == Some(Path::new("")) || rel_path == Path::new(file_name) {
        let known_home_shell_files = [
            ".bashrc", ".bash_profile", ".bash_login", ".bash_logout", ".profile", ".shrc",
            ".zshrc", ".zprofile", ".zshenv", ".zlogin", ".zlogout",
            ".cshrc", ".tcshrc", ".kshrc",
        ];
        if known_home_shell_files.contains(&file_name) {
            return true;
        }
    }

    // 3. Dotfile naming convention (.bash_* or .zsh_*)
    if file_name.starts_with(".bash_") || file_name.starts_with(".zsh_") {
        return true;
    }

    false
}

/// Validate if the current process is running as root (prohibited inside editor).
pub fn validate_not_root() -> Result<(), String> {
    #[cfg(unix)]
    {
        let euid = unsafe { libc::geteuid() };
        if euid == 0 {
            return Err("[権限エラー] エディタ内での root 権限操作（sudo等）は禁止されています。ターミナルをご利用ください。".to_string());
        }
    }
    Ok(())
}

/// Check security restrictions for opening files (virtual FS, credentials).
pub fn validate_editor_security(canonical_path: &Path) -> Result<(), String> {
    let path_str = canonical_path.to_string_lossy();

    // 1. Virtual filesystems
    if path_str.starts_with("/proc")
        || path_str.starts_with("/sys")
        || path_str.starts_with("/dev")
    {
        return Err("[オープン拒否] システム仮想ディレクトリ（/proc, /sys, /dev 等）内のファイルは開くことができません。".to_string());
    }

    // 2. Sensitive credential stores
    if let Some(home) = dirs::home_dir() {
        let home_canon = home.canonicalize().unwrap_or(home);

        // SSH secrets
        let ssh_dir = home_canon.join(".ssh");
        if canonical_path.starts_with(&ssh_dir) {
            if let Some(file_name) = canonical_path.file_name().and_then(|n| n.to_str()) {
                let is_safe_ssh_file = file_name == "config"
                    || file_name.starts_with("known_hosts")
                    || file_name.starts_with("authorized_keys")
                    || file_name.ends_with(".pub");
                if !is_safe_ssh_file {
                    return Err("[アクセス遮断] 機密資格情報ファイル（SSH鍵/暗号化キー/認証トークン等）は安全のため開くことができません。".to_string());
                }
            } else {
                return Err("[アクセス遮断] 機密資格情報ファイル（SSH鍵/暗号化キー/認証トークン等）は安全のため開くことができません。".to_string());
            }
        }

        // SSH private key well-known names anywhere
        if let Some(file_name) = canonical_path.file_name().and_then(|n| n.to_str()) {
            let sensitive_keys = ["id_rsa", "id_ed25519", "id_ecdsa", "id_dsa"];
            if sensitive_keys.contains(&file_name) {
                return Err("[アクセス遮断] 機密資格情報ファイル（SSH鍵/暗号化キー/認証トークン等）は安全のため開くことができません。".to_string());
            }
        }

        // GPG private keys
        let gpg_private = home_canon.join(".gnupg").join("private-keys-v1.d");
        if canonical_path.starts_with(&gpg_private) {
            return Err("[アクセス遮断] 機密資格情報ファイル（SSH鍵/暗号化キー/認証トークン等）は安全のため開くことができません。".to_string());
        }

        // System keyrings
        let keyrings_dir = home_canon.join(".local").join("share").join("keyrings");
        if canonical_path.starts_with(&keyrings_dir) {
            return Err("[アクセス遮断] 機密資格情報ファイル（SSH鍵/暗号化キー/認証トークン等）は安全のため開くことができません。".to_string());
        }
    }

    Ok(())
}

/// Open a file for editing with comprehensive security, symlink, and autosave checks.
#[tauri::command]
pub fn editor_open_file(path: String) -> Result<EditorOpenResult, String> {
    validate_not_root()?;

    let orig_p = Path::new(&path);
    if !orig_p.exists() {
        return Err(format!("ファイルが見つかりません: {}", path));
    }

    // Check symlink status of the original path
    let is_symlink = match fs::symlink_metadata(orig_p) {
        Ok(m) => m.file_type().is_symlink(),
        Err(e) => return Err(format!("メタデータの取得に失敗しました: {}", e)),
    };

    // Canonicalize path to real target
    let canonical_path = orig_p
        .canonicalize()
        .map_err(|e| format!("実体パスの解決に失敗しました: {}", e))?;

    // Security guard checks
    validate_editor_security(&canonical_path)?;

    // Metadata of the canonical target
    let metadata = fs::metadata(&canonical_path)
        .map_err(|e| format!("ファイル情報の取得に失敗しました: {}", e))?;

    if metadata.is_dir() {
        return Err("ディレクトリを直接開くことはできません。".to_string());
    }

    // Size limit check (5MB)
    if metadata.len() > MAX_FILE_SIZE {
        return Err("[サイズ超過] ファイルサイズが 5MB を超えているため開くことができません（ターミナルの less 等をご利用ください）。".to_string());
    }

    // Binary check: scan first 1KB for null bytes
    let mut file = fs::File::open(&canonical_path)
        .map_err(|e| format!("ファイルのオープンに失敗しました: {}", e))?;
    let mut probe_buf = vec![0u8; BINARY_PROBE_SIZE.min(metadata.len() as usize)];
    if !probe_buf.is_empty() {
        let bytes_read = file
            .read(&mut probe_buf)
            .map_err(|e| format!("ファイル読み込み検査に失敗しました: {}", e))?;
        if probe_buf[..bytes_read].contains(&0u8) {
            return Err("[バイナリ検出] バイナリファイル形式のためエディタで開くことができません。".to_string());
        }
    }

    // Determine read-only status and reason
    let mut is_readonly = false;
    let mut readonly_reason: Option<String> = None;

    let under_home = is_under_home(&canonical_path);
    if !under_home {
        is_readonly = true;
        if is_symlink {
            readonly_reason = Some(format!(
                "[保存不可] このファイルはシンボリックリンクですが、リンク先の実ファイル ({}) が $HOME 外にあるため編集・保存は遮断されました。",
                canonical_path.display()
            ));
        } else {
            readonly_reason = Some("[保存不可] このファイルは $HOME ディレクトリ外にあるため、閲覧専用（Read-Only）です。".to_string());
        }
    } else {
        // Owner UID check on Unix
        #[cfg(unix)]
        {
            let file_uid = metadata.uid();
            let process_euid = unsafe { libc::geteuid() };
            if file_uid != process_euid {
                is_readonly = true;
                readonly_reason = Some("[保存不可] 所有者が現在のユーザー ($USER) ではないため、変更できません。".to_string());
            }
        }

        // File write permission check
        if !is_readonly && metadata.permissions().readonly() {
            is_readonly = true;
            readonly_reason = Some("[保存不可] ファイルに書き込み権限がありません。".to_string());
        }
    }

    // Read file content
    let content = fs::read_to_string(&canonical_path)
        .map_err(|e| format!("ファイル内容の読み出しに失敗しました: {}", e))?;

    // Check for existing autosave history (up to 6 generations)
    let mut has_autosave = false;
    let mut autosave_content: Option<String> = None;
    let mut autosave_timestamp: Option<u64> = None;

    if let Ok(history) = get_autosave_history(&canonical_path) {
        if let Some(newest) = history.first() {
            if let Ok(cache_text) = load_autosave_content(&newest.id) {
                if cache_text != content {
                    has_autosave = true;
                    autosave_content = Some(cache_text);
                    autosave_timestamp = Some(newest.timestamp);
                }
            }
        }
    }

    // Warning banner check for shell configuration files (editable, but with persistent caution banner)
    let mut warning_message: Option<String> = None;
    if !is_readonly {
        if let Some(home) = dirs::home_dir() {
            let home_canon = home.canonicalize().unwrap_or(home);
            if is_shell_config(&canonical_path, &home_canon) {
                warning_message = Some("⚠️ シェル設定ファイルです。構文ミスによりシェル起動に影響が出る恐れがあります（自動バックアップ有効）。".to_string());
            }
        }
    }

    Ok(EditorOpenResult {
        content,
        original_path: path,
        canonical_path: canonical_path.to_string_lossy().to_string(),
        is_symlink,
        is_readonly,
        readonly_reason,
        warning_message,
        has_autosave,
        autosave_content,
        autosave_timestamp,
    })
}

/// Atomically save file to disk, resolving symlink to target file and preserving permissions.
#[tauri::command]
pub fn editor_save_file(path: String, content: String) -> Result<EditorSaveResult, String> {
    validate_not_root()?;

    let orig_p = Path::new(&path);
    let is_symlink = match fs::symlink_metadata(orig_p) {
        Ok(m) => m.file_type().is_symlink(),
        Err(_) => false,
    };

    let canonical_path = if orig_p.exists() {
        orig_p
            .canonicalize()
            .map_err(|e| format!("実体パスの解決に失敗しました: {}", e))?
    } else {
        // For new files, canonicalize the parent directory
        let parent = orig_p.parent().unwrap_or_else(|| Path::new("."));
        let parent_canon = parent
            .canonicalize()
            .map_err(|e| format!("親ディレクトリの解決に失敗しました: {}", e))?;
        let filename = orig_p
            .file_name()
            .ok_or_else(|| "無効なファイル名です".to_string())?;
        parent_canon.join(filename)
    };

    // Security checks
    validate_editor_security(&canonical_path)?;

    // Must be within $HOME
    if !is_under_home(&canonical_path) {
        if is_symlink {
            return Err(format!(
                "[保存不可] このファイルはシンボリックリンクですが、リンク先の実ファイル ({}) が $HOME 外にあるため編集・保存は遮断されました。",
                canonical_path.display()
            ));
        } else {
            return Err("[保存不可] このファイルは $HOME ディレクトリ外にあるため、閲覧専用（Read-Only）です。".to_string());
        }
    }

    // Owner UID check if file exists
    #[cfg(unix)]
    let mut original_mode: Option<u32> = None;

    if canonical_path.exists() {
        let metadata = fs::metadata(&canonical_path)
            .map_err(|e| format!("ファイルメタデータの取得に失敗しました: {}", e))?;

        #[cfg(unix)]
        {
            let file_uid = metadata.uid();
            let process_euid = unsafe { libc::geteuid() };
            if file_uid != process_euid {
                return Err("[保存不可] 所有者が現在のユーザー ($USER) ではないため、変更できません。".to_string());
            }
            original_mode = Some(metadata.permissions().mode());
        }
    }

    // Atomic write via temporary file in the same directory
    let parent = canonical_path
        .parent()
        .ok_or_else(|| "親ディレクトリが見つかりません".to_string())?;

    if !parent.exists() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("親ディレクトリの作成に失敗しました: {}", e))?;
    }

    let temp_name = format!(".waddle_tmp_{}", uuid::Uuid::new_v4());
    let temp_path = parent.join(temp_name);

    {
        let mut temp_file = fs::File::create(&temp_path)
            .map_err(|e| format!("一時ファイルの作成に失敗しました: {}", e))?;
        temp_file
            .write_all(content.as_bytes())
            .map_err(|e| format!("一時ファイルへの書き込みに失敗しました: {}", e))?;
        temp_file
            .flush()
            .map_err(|e| format!("一時ファイルのフラッシュに失敗しました: {}", e))?;
        temp_file
            .sync_all()
            .map_err(|e| format!("一時ファイルの同期に失敗しました: {}", e))?;
    }

    // Restore original file mode if it existed
    #[cfg(unix)]
    if let Some(mode) = original_mode {
        let _ = fs::set_permissions(&temp_path, fs::Permissions::from_mode(mode));
    }

    // Atomic rename
    if let Err(e) = fs::rename(&temp_path, &canonical_path) {
        let _ = fs::remove_file(&temp_path);
        return Err(format!("アトミック保存（名前変更）に失敗しました: {}", e));
    }

    // Retain 6-generation autosave history even after explicit save (preserves rewind capability)

    let message = if is_symlink {
        Some(format!(
            "[注意] シンボリックリンク先のファイルを保存しました: {}",
            canonical_path.display()
        ))
    } else {
        None
    };

    Ok(EditorSaveResult {
        saved_path: canonical_path.to_string_lossy().to_string(),
        is_symlink,
        message,
    })
}

/// Write current buffer to autosave cache directory (~/.cache/waddle/autosave/) as a snapshot.
#[tauri::command]
pub fn editor_save_autosave(path: String, content: String) -> Result<(), String> {
    editor_save_autosave_snapshot(path, content)
}

/// Save a timestamped autosave snapshot and rotate to keep at most 6 generations.
#[tauri::command]
pub fn editor_save_autosave_snapshot(path: String, content: String) -> Result<(), String> {
    let orig_p = Path::new(&path);
    let canonical_path = if orig_p.exists() {
        orig_p.canonicalize().unwrap_or_else(|_| orig_p.to_path_buf())
    } else {
        orig_p.to_path_buf()
    };

    save_autosave_snapshot(&canonical_path, &content)
}

/// Get autosave snapshot history (up to 6 newest, sorted descending).
#[tauri::command]
pub fn editor_get_autosave_history(path: String) -> Result<Vec<AutosaveEntry>, String> {
    let orig_p = Path::new(&path);
    let canonical_path = if orig_p.exists() {
        orig_p.canonicalize().unwrap_or_else(|_| orig_p.to_path_buf())
    } else {
        orig_p.to_path_buf()
    };

    get_autosave_history(&canonical_path)
}

/// Load the text content of a specific autosave cache snapshot.
#[tauri::command]
pub fn editor_load_autosave_content(cache_id: String) -> Result<String, String> {
    load_autosave_content(&cache_id)
}

/// Remove autosave cache file when buffer is cleanly saved or discarded.
#[tauri::command]
pub fn editor_remove_autosave(path: String) -> Result<(), String> {
    let orig_p = Path::new(&path);
    let canonical_path = if orig_p.exists() {
        orig_p.canonicalize().unwrap_or_else(|_| orig_p.to_path_buf())
    } else {
        orig_p.to_path_buf()
    };

    if let Ok(cache_file) = get_autosave_file_path(&canonical_path) {
        if cache_file.exists() {
            let _ = fs::remove_file(cache_file);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_path_to_autosave_filename() {
        let p = Path::new("/home/user/.config/fish/config.fish");
        let name = path_to_autosave_filename(p);
        assert_eq!(name, "%home%user%.config%fish%config.fish");
    }

    #[test]
    fn test_autosave_dir_creation_and_permissions() {
        let dir = get_autosave_dir().expect("Failed to get autosave dir");
        assert!(dir.exists());
        assert!(dir.is_dir());

        #[cfg(unix)]
        {
            let m = fs::metadata(&dir).unwrap();
            let mode = m.permissions().mode() & 0o777;
            assert_eq!(mode, 0o700);
        }
    }

    #[test]
    fn test_binary_detection() {
        let temp_dir = std::env::temp_dir().join(format!("waddle_test_bin_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(&temp_dir);

        let bin_file = temp_dir.join("test.bin");
        let mut data = vec![b'a'; 50];
        data[25] = 0u8; // embed null byte
        fs::write(&bin_file, &data).unwrap();

        let res = editor_open_file(bin_file.to_string_lossy().to_string());
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("[バイナリ検出]"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_file_size_limit() {
        let temp_dir = std::env::temp_dir().join(format!("waddle_test_size_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(&temp_dir);

        let big_file = temp_dir.join("big.txt");
        // Create 5MB + 1 byte file
        let file = fs::File::create(&big_file).unwrap();
        file.set_len(5 * 1024 * 1024 + 1).unwrap();

        let res = editor_open_file(big_file.to_string_lossy().to_string());
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("[サイズ超過]"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_virtual_fs_blocked() {
        let proc_path = Path::new("/proc/version");
        if proc_path.exists() {
            let res = validate_editor_security(proc_path);
            assert!(res.is_err());
            assert!(res.unwrap_err().contains("[オープン拒否]"));
        }
    }

    #[test]
    fn test_autosave_lifecycle() {
        let temp_dir = std::env::temp_dir().join(format!("waddle_test_as_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(&temp_dir);

        let target = temp_dir.join("sample.conf");
        fs::write(&target, "key = value\n").unwrap();

        let target_str = target.to_string_lossy().to_string();

        // 1. Save autosave snapshot
        assert!(editor_save_autosave(target_str.clone(), "key = new_value\n".to_string()).is_ok());

        let history = editor_get_autosave_history(target_str.clone()).unwrap();
        assert_eq!(history.len(), 1);
        let content = editor_load_autosave_content(history[0].id.clone()).unwrap();
        assert_eq!(content, "key = new_value\n");

        // Clean up test cache
        let dir = get_autosave_dir().unwrap();
        for entry in history {
            let _ = fs::remove_file(dir.join(entry.id));
        }

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_autosave_rotation_max_6() {
        let temp_dir = std::env::temp_dir().join(format!("waddle_test_rot_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(&temp_dir);

        let target = temp_dir.join("rotated.conf");
        fs::write(&target, "initial\n").unwrap();
        let target_str = target.to_string_lossy().to_string();

        // Save 8 snapshots with slight delay to ensure distinct timestamps
        for i in 1..=8 {
            assert!(editor_save_autosave(target_str.clone(), format!("version {}\n", i)).is_ok());
            std::thread::sleep(std::time::Duration::from_millis(5));
        }

        let history = editor_get_autosave_history(target_str.clone()).unwrap();
        // Should keep at most MAX_AUTOSAVE_GENERATIONS (6)
        assert_eq!(history.len(), 6);

        // First item should be the newest snapshot ("version 8")
        let newest_content = editor_load_autosave_content(history[0].id.clone()).unwrap();
        assert_eq!(newest_content, "version 8\n");

        // Last item should be "version 3" ("version 1" and "version 2" were rotated out)
        let oldest_content = editor_load_autosave_content(history[5].id.clone()).unwrap();
        assert_eq!(oldest_content, "version 3\n");

        // Clean up test snapshots
        let dir = get_autosave_dir().unwrap();
        for entry in history {
            let _ = fs::remove_file(dir.join(entry.id));
        }

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_autosave_path_traversal_protection() {
        assert!(editor_load_autosave_content("../etc/passwd".to_string()).is_err());
        assert!(editor_load_autosave_content("..".to_string()).is_err());
        assert!(editor_load_autosave_content("/etc/shadow".to_string()).is_err());
        assert!(editor_load_autosave_content("sub/path".to_string()).is_err());
        assert!(editor_load_autosave_content("".to_string()).is_err());
    }

    #[test]
    fn test_autosave_stale_gc() {
        let temp_dir = std::env::temp_dir().join(format!("waddle_test_gc_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(&temp_dir);

        let old_file = temp_dir.join("test_stale_gc_file.1000");
        fs::write(&old_file, "stale").unwrap();

        // Stale GC with 0 secs threshold in isolated temp_dir should clean up the file
        let removed = clean_stale_autosaves_in_dir(&temp_dir, 0);
        assert_eq!(removed, 1);
        assert!(!old_file.exists());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_symlink_detection_and_atomic_save() {
        if let Some(home) = dirs::home_dir() {
            let test_dir = home.join(".cache").join("waddle_test_symlink");
            let _ = fs::create_dir_all(&test_dir);

            let real_file = test_dir.join("real.toml");
            fs::write(&real_file, "[settings]\nenabled = true\n").unwrap();

            let symlink_file = test_dir.join("link.toml");
            #[cfg(unix)]
            {
                let _ = std::os::unix::fs::symlink(&real_file, &symlink_file);
                if symlink_file.exists() {
                    let open_res = editor_open_file(symlink_file.to_string_lossy().to_string());
                    assert!(open_res.is_ok());
                    let res = open_res.unwrap();
                    assert!(res.is_symlink);
                    assert_eq!(res.content, "[settings]\nenabled = true\n");

                    // Save through symlink
                    let save_res = editor_save_file(
                        symlink_file.to_string_lossy().to_string(),
                        "[settings]\nenabled = false\n".to_string(),
                    );
                    assert!(save_res.is_ok());
                    let s_res = save_res.unwrap();
                    assert!(s_res.is_symlink);
                    assert!(s_res.message.unwrap().contains("[注意] シンボリックリンク先のファイルを保存しました"));

                    // Verify real file updated and symlink intact
                    assert_eq!(fs::read_to_string(&real_file).unwrap(), "[settings]\nenabled = false\n");
                    assert!(fs::symlink_metadata(&symlink_file).unwrap().file_type().is_symlink());
                }
            }

            let _ = fs::remove_dir_all(&test_dir);
        }
    }

    #[test]
    fn test_is_shell_config() {
        let home = Path::new("/home/testuser");

        // 1. $HOME direct shell files
        let direct_files = [
            ".bashrc", ".bash_profile", ".bash_login", ".bash_logout", ".profile", ".shrc",
            ".zshrc", ".zprofile", ".zshenv", ".zlogin", ".zlogout",
            ".cshrc", ".tcshrc", ".kshrc",
        ];
        for f in &direct_files {
            assert!(
                is_shell_config(&home.join(f), home),
                "Should match shell config: {}",
                f
            );
        }

        // 2. Dotfile naming conventions (.bash_* or .zsh_*)
        assert!(is_shell_config(&home.join(".bash_aliases"), home));
        assert!(is_shell_config(&home.join(".bash_history"), home));
        assert!(is_shell_config(&home.join(".zsh_custom"), home));

        // 3. ~/.config/ standard shell config directories
        assert!(is_shell_config(&home.join(".config/fish/config.fish"), home));
        assert!(is_shell_config(&home.join(".config/fish/conf.d/alias.fish"), home));
        assert!(is_shell_config(&home.join(".config/fish/functions/fish_prompt.fish"), home));
        assert!(is_shell_config(&home.join(".config/zsh/.zshrc"), home));
        assert!(is_shell_config(&home.join(".config/bash/bashrc"), home));
        assert!(is_shell_config(&home.join(".config/nushell/config.nu"), home));

        // 4. Negative cases (normal files and configs that should NOT match)
        assert!(!is_shell_config(&home.join("main.rs"), home));
        assert!(!is_shell_config(&home.join("src/main.rs"), home));
        assert!(!is_shell_config(&home.join("notes.txt"), home));
        assert!(!is_shell_config(&home.join(".config/nvim/init.lua"), home));
        assert!(!is_shell_config(&home.join(".config/git/config"), home));
        assert!(!is_shell_config(&Path::new("/etc/bash.bashrc"), home));
        assert!(!is_shell_config(&Path::new("/etc/profile"), home));
    }

    #[test]
    fn test_editor_open_shell_config_warning_and_save() {
        if let Some(home) = dirs::home_dir() {
            let test_shell_file = home.join(".bash_test_waddle_tmp");
            let _ = fs::write(&test_shell_file, "# test shell config\nexport FOO=bar\n");

            let open_res = editor_open_file(test_shell_file.to_string_lossy().to_string());
            assert!(open_res.is_ok(), "Failed to open shell config: {:?}", open_res.err());

            let res = open_res.unwrap();
            assert!(!res.is_readonly, "Shell config should NOT be read-only");
            assert!(
                res.warning_message.is_some(),
                "warning_message should be set for shell config"
            );
            assert!(
                res.warning_message
                    .unwrap()
                    .contains("シェル設定ファイルです"),
                "warning_message should contain shell caution"
            );

            // Verify saving is permitted and not blocked
            let save_res = editor_save_file(
                test_shell_file.to_string_lossy().to_string(),
                "# test shell config updated\nexport FOO=baz\n".to_string(),
            );
            assert!(save_res.is_ok(), "Failed to save shell config: {:?}", save_res.err());

            let updated = fs::read_to_string(&test_shell_file).unwrap();
            assert_eq!(updated, "# test shell config updated\nexport FOO=baz\n");

            let _ = fs::remove_file(&test_shell_file);
        }
    }
}

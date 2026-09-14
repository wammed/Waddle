use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

pub fn resolve_canonical_path(path: &Path) -> PathBuf {
    if let Ok(c) = path.canonicalize() {
        return c;
    }
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

pub fn validate_safe_read(path: &Path) -> Result<(), String> {
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

pub fn validate_safe_write(path: &Path) -> Result<(), String> {
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
            if sys_dir == "/var" && canonical.starts_with("/var/tmp") {
                continue;
            }
            return Err(format!("EACCES: 安全上の理由によりシステム領域 ({}) 配下への書き込みは禁止されています。 (Access denied: writing to system directory is restricted)", sys_dir));
        }
    }

    Ok(())
}

pub fn validate_safe_deletion(path: &Path) -> Result<(), String> {
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
pub fn read_file(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    validate_safe_read(p)?;
    if !p.exists() {
        return Err(format!("File not found: {}", path));
    }
    fs::read_to_string(p).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    let p = Path::new(&path);
    validate_safe_write(p)?;
    if let Some(parent) = p.parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(p, content).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
pub fn read_directory(
    path: String,
    show_hidden: bool,
    limit: Option<usize>,
) -> Result<DirectoryListing, String> {
    let p = Path::new(&path);
    if !p.exists() || !p.is_dir() {
        return Ok(DirectoryListing {
            entries: Vec::new(),
            total_count: 0,
            has_more: false,
        });
    }

    let canonical = resolve_canonical_path(p);

    let path_str = canonical.to_string_lossy();
    if path_str.starts_with("/proc") || path_str.starts_with("/sys") || path_str.starts_with("/dev") {
        return Err("EACCES: 安全上の理由により仮想/システムディレクトリ (/proc, /sys, /dev) の参照は禁止されています。 (Access denied: browsing /proc, /sys, /dev is restricted)".to_string());
    }

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
pub fn create_file(path: String) -> Result<(), String> {
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
pub fn create_directory(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    validate_safe_write(p)?;
    fs::create_dir_all(p).map_err(|e| format!("Failed to create directory: {}", e))
}

#[tauri::command]
pub fn delete_entry(path: String) -> Result<(), String> {
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
pub fn rename_entry(old_path: String, new_path: String) -> Result<(), String> {
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
pub fn reveal_in_file_manager(path: String) -> Result<(), String> {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_tree_operations() {
        let temp_dir = std::env::temp_dir().join(format!("waddle_tree_test_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(&temp_dir);
        let dir_path = temp_dir.to_str().unwrap().to_string();

        let sub_dir = format!("{}/test_folder", dir_path);
        assert!(create_directory(sub_dir.clone()).is_ok());

        let file_a = format!("{}/alpha.txt", dir_path);
        let file_b = format!("{}/beta.py", dir_path);
        let hidden_file = format!("{}/.hidden", dir_path);
        assert!(create_file(file_a.clone()).is_ok());
        assert!(create_file(file_b.clone()).is_ok());
        assert!(create_file(hidden_file.clone()).is_ok());

        let listing = read_directory(dir_path.clone(), false, None).expect("read_directory failed");
        let names: Vec<String> = listing.entries.iter().map(|e| e.name.clone()).collect();
        assert!(names.contains(&"test_folder".to_string()));
        assert!(names.contains(&"alpha.txt".to_string()));
        assert!(names.contains(&"beta.py".to_string()));
        assert!(!names.contains(&".hidden".to_string()));

        assert!(listing.entries[0].is_dir);
        assert_eq!(listing.entries[0].name, "test_folder");

        let listing_with_hidden = read_directory(dir_path.clone(), true, None).expect("read_directory failed");
        let all_names: Vec<String> = listing_with_hidden.entries.iter().map(|e| e.name.clone()).collect();
        assert!(all_names.contains(&".hidden".to_string()));

        let file_renamed = format!("{}/gamma.txt", dir_path);
        assert!(rename_entry(file_b.clone(), file_renamed.clone()).is_ok());
        assert!(!Path::new(&file_b).exists());
        assert!(Path::new(&file_renamed).exists());

        assert!(delete_entry(file_a.clone()).is_ok());
        assert!(!Path::new(&file_a).exists());
        assert!(delete_entry(sub_dir.clone()).is_ok());
        assert!(!Path::new(&sub_dir).exists());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_forbidden_deletion_prevention() {
        assert!(delete_entry("/".to_string()).is_err());

        assert!(delete_entry("/etc".to_string()).is_err());
        assert!(delete_entry("/etc/hosts".to_string()).is_err());
        assert!(delete_entry("/usr".to_string()).is_err());
        assert!(delete_entry("/usr/bin".to_string()).is_err());
        assert!(delete_entry("/bin".to_string()).is_err());
        assert!(delete_entry("/boot".to_string()).is_err());

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
        assert!(write_file("/test_root_file.txt".to_string(), "malicious".to_string()).is_err());
        assert!(create_file("/test_root_file.txt".to_string()).is_err());

        assert!(write_file("/etc/malicious_cron".to_string(), "* * * * *".to_string()).is_err());
        assert!(create_file("/usr/bin/malicious_binary".to_string()).is_err());

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
        assert!(validate_safe_read(Path::new("/home/user/.ssh/id_rsa")).is_err());
        assert!(validate_safe_read(Path::new("/home/user/.ssh/id_ed25519")).is_err());
        assert!(validate_safe_read(Path::new("/home/user/.ssh/id_ecdsa")).is_err());

        assert!(validate_safe_read(Path::new("/tmp/some_script.py")).is_ok());
    }

    #[test]
    fn test_safe_read_custom_ssh_keys_and_keyrings() {
        if let Some(home) = dirs::home_dir() {
            let safe_config = home.join(".ssh").join("config");
            let safe_pub = home.join(".ssh").join("id_ed25519.pub");
            let safe_hosts = home.join(".ssh").join("known_hosts");
            assert!(validate_safe_read(&safe_config).is_ok());
            assert!(validate_safe_read(&safe_pub).is_ok());
            assert!(validate_safe_read(&safe_hosts).is_ok());

            let standard_key = home.join(".ssh").join("id_ed25519");
            let custom_key = home.join(".ssh").join("my_custom_deploy_key");
            let work_key = home.join(".ssh").join("work_rsa_backup");
            assert!(validate_safe_read(&standard_key).is_err());
            assert!(validate_safe_read(&custom_key).is_err());
            assert!(validate_safe_read(&work_key).is_err());

            let keyring = home.join(".local").join("share").join("keyrings").join("login.keyring");
            assert!(validate_safe_read(&keyring).is_err());
        }
    }

    #[test]
    fn test_read_directory_path_probing_protection() {
        assert!(read_directory("/proc".to_string(), true, None).is_err());
        assert!(read_directory("/proc/sys".to_string(), true, None).is_err());
        assert!(read_directory("/sys".to_string(), true, None).is_err());
        assert!(read_directory("/dev".to_string(), true, None).is_err());

        if let Some(home) = dirs::home_dir() {
            let gpg_private = home.join(".gnupg").join("private-keys-v1.d");
            let _ = fs::create_dir_all(&gpg_private);
            assert!(read_directory(gpg_private.to_string_lossy().to_string(), true, None).is_err());

            let keyrings_dir = home.join(".local").join("share").join("keyrings");
            let _ = fs::create_dir_all(&keyrings_dir);
            assert!(read_directory(keyrings_dir.to_string_lossy().to_string(), true, None).is_err());

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

        let res5 = read_directory(temp_dir.to_string_lossy().to_string(), false, Some(5)).unwrap();
        assert_eq!(res5.total_count, 12);
        assert_eq!(res5.entries.len(), 5);
        assert!(res5.has_more);

        let res15 = read_directory(temp_dir.to_string_lossy().to_string(), false, Some(15)).unwrap();
        assert_eq!(res15.total_count, 12);
        assert_eq!(res15.entries.len(), 12);
        assert!(!res15.has_more);

        let _ = fs::remove_dir_all(&temp_dir);
    }
}

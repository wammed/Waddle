use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PtySessionInfo {
    pub id: String,
    pub pid: u32,
    pub shell: String,
    pub cwd: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct GitFileEntry {
    pub path: String,
    pub status_code: String,
    pub staged: bool,
    pub unstaged: bool,
    pub is_untracked: bool,
    pub is_conflicted: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitStatus {
    pub is_repo: bool,
    pub branch: Option<String>,
    pub modified_count: usize,
    pub untracked_count: usize,
    pub staged_count: usize,
    pub conflicted_count: usize,
    pub ahead: usize,
    pub behind: usize,
    pub is_github_repo: bool,
    pub blocked_remote: Option<String>,
    pub files: Vec<GitFileEntry>,
}

#[allow(dead_code)]
struct Session {
    id: String,
    pid: u32,
    master: Arc<parking_lot::Mutex<Box<dyn MasterPty + Send>>>,
    writer: Arc<parking_lot::Mutex<Box<dyn Write + Send>>>,
    alive: Arc<AtomicBool>,
    last_known_cwd: String,
    shell: String,
    start_tx: Arc<parking_lot::Mutex<Option<std::sync::mpsc::Sender<()>>>>,
}

pub struct PtyManager {
    sessions: Arc<Mutex<HashMap<String, Session>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn create_pty(
        &self,
        app: AppHandle,
        rows: u16,
        cols: u16,
        cwd: Option<String>,
        shell: Option<String>,
    ) -> Result<PtySessionInfo, String> {
        let pty_system = native_pty_system();
        let pty_size = PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };

        let pair = pty_system
            .openpty(pty_size)
            .map_err(|e| format!("Failed to open PTY: {}", e))?;

        let shell_cmd = shell.unwrap_or_else(|| {
            std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
        });

        let target_cwd = match cwd {
            Some(c) if !c.is_empty() => PathBuf::from(c),
            _ => dirs::home_dir().unwrap_or_else(|| PathBuf::from("/")),
        };

        let mut cmd = CommandBuilder::new(&shell_cmd);
        cmd.cwd(&target_cwd);
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");
        cmd.env("WADDLE_TERMINAL", "1");

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn shell: {}", e))?;

        let pid = child.process_id().unwrap_or(0);
        let id = Uuid::new_v4().to_string();

        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to clone PTY reader: {}", e))?;
        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to take PTY writer: {}", e))?;

        let alive = Arc::new(AtomicBool::new(true));
        let alive_clone = Arc::clone(&alive);
        let app_clone = app.clone();
        let session_id_clone = id.clone();

        let (start_tx, start_rx) = std::sync::mpsc::channel::<()>();
        let start_tx = Arc::new(parking_lot::Mutex::new(Some(start_tx)));

        // Background thread for reading PTY output
        thread::spawn(move || {
            // Wait up to 1000ms for frontend to register its listener via start_pty.
            // If frontend calls start_pty immediately upon mounting, this wakes up in 0ms!
            // If not, timeout after 1000ms to ensure headless/background operations proceed.
            let _ = start_rx.recv_timeout(std::time::Duration::from_millis(1000));

            let mut reader = reader;
            let mut buffer = [0u8; 8192];
            let mut pending_bytes: Vec<u8> = Vec::new();
            let event_name = format!("pty-output-{}", session_id_clone);

            while alive_clone.load(Ordering::SeqCst) {
                match reader.read(&mut buffer) {
                    Ok(0) => {
                        // EOF
                        break;
                    }
                    Ok(n) => {
                        let chunk = &buffer[..n];
                        let to_process = if pending_bytes.is_empty() {
                            chunk.to_vec()
                        } else {
                            pending_bytes.extend_from_slice(chunk);
                            std::mem::take(&mut pending_bytes)
                        };

                        let mut slice = &to_process[..];
                        while !slice.is_empty() {
                            match std::str::from_utf8(slice) {
                                Ok(valid) => {
                                    if let Err(e) = app_clone.emit(&event_name, valid) {
                                        eprintln!("Error emitting PTY output: {}", e);
                                    }
                                    break;
                                }
                                Err(e) => {
                                    let valid_len = e.valid_up_to();
                                    if valid_len > 0 {
                                        if let Err(err) = app_clone.emit(&event_name, &slice[..valid_len]) {
                                            eprintln!("Error emitting PTY output: {}", err);
                                        }
                                        slice = &slice[valid_len..];
                                    }
                                    if let Some(err_len) = e.error_len() {
                                        // Actual invalid byte sequence (e.g. binary output)
                                        if let Err(err) = app_clone.emit(&event_name, "\u{FFFD}") {
                                            eprintln!("Error emitting PTY output: {}", err);
                                        }
                                        slice = &slice[err_len..];
                                    } else {
                                        // Incomplete multi-byte UTF-8 sequence at the end of buffer!
                                        // Retain in pending_bytes for next chunk
                                        pending_bytes.extend_from_slice(slice);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("PTY read error: {}", e);
                        break;
                    }
                }
            }

            // Flush any remaining pending bytes if EOF occurs
            if !pending_bytes.is_empty() {
                let remaining_text = String::from_utf8_lossy(&pending_bytes).to_string();
                let _ = app_clone.emit(&event_name, remaining_text);
            }

            alive_clone.store(false, Ordering::SeqCst);
            let exit_event = format!("pty-exit-{}", session_id_clone);
            let _ = app_clone.emit(&exit_event, ());
        });

        let session = Session {
            id: id.clone(),
            pid,
            master: Arc::new(parking_lot::Mutex::new(pair.master)),
            writer: Arc::new(parking_lot::Mutex::new(writer)),
            alive,
            last_known_cwd: target_cwd.to_string_lossy().to_string(),
            shell: shell_cmd.clone(),
            start_tx,
        };

        let session_info = PtySessionInfo {
            id: id.clone(),
            pid,
            shell: shell_cmd,
            cwd: session.last_known_cwd.clone(),
        };

        self.sessions.lock().await.insert(id, session);
        Ok(session_info)
    }

    pub async fn start_pty(&self, session_id: &str) -> Result<(), String> {
        let sessions = self.sessions.lock().await;
        if let Some(session) = sessions.get(session_id) {
            if let Some(tx) = session.start_tx.lock().take() {
                let _ = tx.send(());
            }
            Ok(())
        } else {
            Err("Session not found".to_string())
        }
    }

    pub async fn write(&self, session_id: &str, data: &str) -> Result<(), String> {
        let sessions = self.sessions.lock().await;
        if let Some(session) = sessions.get(session_id) {
            if let Some(tx) = session.start_tx.lock().take() {
                let _ = tx.send(());
            }
            let mut writer = session.writer.lock();
            writer
                .write_all(data.as_bytes())
                .map_err(|e| format!("Failed to write to PTY: {}", e))?;
            writer.flush().map_err(|e| format!("Flush error: {}", e))?;
            Ok(())
        } else {
            Err("Session not found".to_string())
        }
    }

    pub async fn resize(&self, session_id: &str, rows: u16, cols: u16) -> Result<(), String> {
        let sessions = self.sessions.lock().await;
        if let Some(session) = sessions.get(session_id) {
            let master = session.master.lock();
            master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| format!("Failed to resize PTY: {}", e))?;
            Ok(())
        } else {
            Err("Session not found".to_string())
        }
    }

    pub async fn get_cwd(&self, session_id: &str) -> Result<String, String> {
        let sessions = self.sessions.lock().await;
        if let Some(session) = sessions.get(session_id) {
            // Under Linux, read symlink /proc/<pid>/cwd
            if session.pid > 0 {
                let proc_cwd_path = format!("/proc/{}/cwd", session.pid);
                if let Ok(real_path) = std::fs::read_link(&proc_cwd_path) {
                    return Ok(real_path.to_string_lossy().to_string());
                }
            }
            Ok(session.last_known_cwd.clone())
        } else {
            Err("Session not found".to_string())
        }
    }

    pub async fn close(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().await;
        if let Some(session) = sessions.remove(session_id) {
            if let Some(tx) = session.start_tx.lock().take() {
                let _ = tx.send(());
            }
            session.alive.store(false, Ordering::SeqCst);
            // On Linux, kill child process and process group
            if session.pid > 0 {
                unsafe {
                    let pid = session.pid as libc::pid_t;
                    // First send SIGHUP to process group so interactive programs & subshells terminate cleanly
                    let _ = libc::kill(-pid, libc::SIGHUP);
                    let _ = libc::kill(pid, libc::SIGHUP);
                    // Send SIGTERM then SIGKILL to ensure no leaked background processes
                    let _ = libc::kill(-pid, libc::SIGTERM);
                    let _ = libc::kill(pid, libc::SIGTERM);
                    let _ = libc::kill(-pid, libc::SIGKILL);
                    let _ = libc::kill(pid, libc::SIGKILL);
                }
            }
            Ok(())
        } else {
            Err("Session not found".to_string())
        }
    }
}

pub fn resolve_repo_root(path_str: &str) -> Option<std::path::PathBuf> {
    use std::path::Path;
    let p = Path::new(path_str);
    if !p.exists() {
        return None;
    }
    let output = std::process::Command::new("git")
        .args(["rev-parse", "--show-toplevel"])
        .current_dir(path_str)
        .output();
    if let Ok(out) = output {
        if out.status.success() {
            let root = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !root.is_empty() {
                return Some(std::path::PathBuf::from(root));
            }
        }
    }
    None
}

pub fn inspect_github_remotes(repo_root: &std::path::Path) -> (bool, Option<String>) {
    let output = std::process::Command::new("git")
        .args(["remote", "-v"])
        .current_dir(repo_root)
        .output();
    if let Ok(out) = output {
        if out.status.success() {
            let text = String::from_utf8_lossy(&out.stdout);
            let mut has_remote = false;
            let mut is_all_github = true;
            let mut non_github_url = None;

            for line in text.lines() {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    has_remote = true;
                    let url = parts[1];
                    let is_gh = url.contains("github.com") || url.contains("github.io");
                    if !is_gh {
                        is_all_github = false;
                        if non_github_url.is_none() {
                            non_github_url = Some(url.to_string());
                        }
                    }
                }
            }

            if !has_remote {
                // Local only repository without remotes is considered safe
                return (true, None);
            }

            return (is_all_github, non_github_url);
        }
    }
    (true, None)
}

pub fn check_git_status(path: &str) -> GitStatus {
    let repo_root = match resolve_repo_root(path) {
        Some(r) => r,
        None => {
            return GitStatus {
                is_repo: false,
                branch: None,
                modified_count: 0,
                untracked_count: 0,
                staged_count: 0,
                conflicted_count: 0,
                ahead: 0,
                behind: 0,
                is_github_repo: true,
                blocked_remote: None,
                files: Vec::new(),
            };
        }
    };

    let (is_github_repo, blocked_remote) = inspect_github_remotes(&repo_root);

    let output = std::process::Command::new("git")
        .args(["--no-optional-locks", "status", "--porcelain=v1", "-b"])
        .env("GIT_OPTIONAL_LOCKS", "0")
        .current_dir(&repo_root)
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let text = String::from_utf8_lossy(&out.stdout);
            let mut branch = None;
            let mut ahead = 0;
            let mut behind = 0;
            let mut modified_count = 0;
            let mut untracked_count = 0;
            let mut staged_count = 0;
            let mut conflicted_count = 0;
            let mut files = Vec::new();

            for (i, line) in text.lines().enumerate() {
                if i == 0 && line.starts_with("## ") {
                    let branch_part = &line[3..];
                    let (name_part, sync_part) = if let Some(bracket_start) = branch_part.find('[') {
                        let name = &branch_part[..bracket_start];
                        let sync = branch_part[bracket_start..].trim_matches(|c| c == '[' || c == ']');
                        (name.trim(), Some(sync))
                    } else {
                        (branch_part.trim(), None)
                    };

                    let branch_name = name_part.split("...").next().unwrap_or(name_part).trim();
                    if branch_name.starts_with("HEAD") {
                        branch = Some("HEAD".to_string());
                    } else if let Some(b) = branch_name.strip_prefix("No commits yet on ") {
                        branch = Some(b.trim().to_string());
                    } else if let Some(b) = branch_name.strip_prefix("Initial commit on ") {
                        branch = Some(b.trim().to_string());
                    } else if !branch_name.is_empty() {
                        branch = Some(branch_name.to_string());
                    }

                    if let Some(sync_str) = sync_part {
                        for part in sync_str.split(',') {
                            let part = part.trim();
                            if let Some(num_str) = part.strip_prefix("ahead ") {
                                ahead = num_str.trim().parse().unwrap_or(0);
                            } else if let Some(num_str) = part.strip_prefix("behind ") {
                                behind = num_str.trim().parse().unwrap_or(0);
                            }
                        }
                    }
                } else if line.len() >= 3 {
                    let status_code = line[..2].to_string();
                    let status_x = line.chars().next().unwrap_or(' ');
                    let status_y = line.chars().nth(1).unwrap_or(' ');
                    let file_path = if line.len() >= 4 {
                        line[3..].trim().to_string()
                    } else {
                        "".to_string()
                    };

                    if file_path.is_empty() {
                        continue;
                    }

                    let is_conflicted = (status_x == 'U' || status_y == 'U')
                        || (status_x == 'A' && status_y == 'A')
                        || (status_x == 'D' && status_y == 'D');

                    let is_untracked = status_x == '?' && status_y == '?';
                    let staged = !is_untracked && !is_conflicted && status_x != ' ' && status_x != '?';
                    let unstaged = is_untracked || (!is_conflicted && status_y != ' ');

                    if is_conflicted {
                        conflicted_count += 1;
                    } else if is_untracked {
                        untracked_count += 1;
                    } else {
                        if staged {
                            staged_count += 1;
                        }
                        if status_y != ' ' {
                            modified_count += 1;
                        }
                    }

                    files.push(GitFileEntry {
                        path: file_path,
                        status_code,
                        staged,
                        unstaged,
                        is_untracked,
                        is_conflicted,
                    });
                }
            }

            GitStatus {
                is_repo: true,
                branch,
                modified_count,
                untracked_count,
                staged_count,
                conflicted_count,
                ahead,
                behind,
                is_github_repo,
                blocked_remote,
                files,
            }
        }
        _ => GitStatus {
            is_repo: false,
            branch: None,
            modified_count: 0,
            untracked_count: 0,
            staged_count: 0,
            conflicted_count: 0,
            ahead: 0,
            behind: 0,
            is_github_repo: true,
            blocked_remote: None,
            files: Vec::new(),
        },
    }
}

fn get_effective_repo_dir(path_str: &str) -> std::path::PathBuf {
    resolve_repo_root(path_str).unwrap_or_else(|| std::path::PathBuf::from(path_str))
}

pub fn git_stage_file(path_str: &str, file_path: &str) -> Result<(), String> {
    let repo_dir = get_effective_repo_dir(path_str);
    let output = std::process::Command::new("git")
        .args(["add", "--", file_path])
        .current_dir(&repo_dir)
        .output()
        .map_err(|e| format!("Failed to run git add: {}", e))?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn git_unstage_file(path_str: &str, file_path: &str) -> Result<(), String> {
    let repo_dir = get_effective_repo_dir(path_str);
    let output = std::process::Command::new("git")
        .args(["restore", "--staged", "--", file_path])
        .current_dir(&repo_dir)
        .output()
        .map_err(|e| format!("Failed to run git restore --staged: {}", e))?;
    if output.status.success() {
        Ok(())
    } else {
        let fallback = std::process::Command::new("git")
            .args(["reset", "HEAD", "--", file_path])
            .current_dir(&repo_dir)
            .output()
            .map_err(|e| format!("Failed to run git reset: {}", e))?;
        if fallback.status.success() {
            Ok(())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}

pub fn git_stage_all(path_str: &str) -> Result<(), String> {
    let repo_dir = get_effective_repo_dir(path_str);
    let output = std::process::Command::new("git")
        .args(["add", "-A"])
        .current_dir(&repo_dir)
        .output()
        .map_err(|e| format!("Failed to run git add -A: {}", e))?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn git_unstage_all(path_str: &str) -> Result<(), String> {
    let repo_dir = get_effective_repo_dir(path_str);
    let output = std::process::Command::new("git")
        .args(["restore", "--staged", "."])
        .current_dir(&repo_dir)
        .output()
        .map_err(|e| format!("Failed to run git restore --staged: {}", e))?;
    if output.status.success() {
        Ok(())
    } else {
        let fallback = std::process::Command::new("git")
            .args(["reset", "HEAD"])
            .current_dir(&repo_dir)
            .output()
            .map_err(|e| format!("Failed to run git reset: {}", e))?;
        if fallback.status.success() {
            Ok(())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}

pub fn git_discard_file(path_str: &str, file_path: &str) -> Result<(), String> {
    let repo_dir = get_effective_repo_dir(path_str);
    let status = std::process::Command::new("git")
        .args(["status", "--porcelain", "--", file_path])
        .current_dir(&repo_dir)
        .output();
    if let Ok(st) = status {
        let out = String::from_utf8_lossy(&st.stdout);
        if out.starts_with("??") {
            let p = repo_dir.join(file_path);
            if p.is_dir() {
                let _ = std::fs::remove_dir_all(&p);
            } else if p.is_file() {
                let _ = std::fs::remove_file(&p);
            }
            return Ok(());
        }
    }

    let output = std::process::Command::new("git")
        .args(["restore", "--worktree", "--staged", "--", file_path])
        .current_dir(&repo_dir)
        .output()
        .map_err(|e| format!("Failed to run git restore: {}", e))?;
    if output.status.success() {
        Ok(())
    } else {
        let _ = std::process::Command::new("git")
            .args(["checkout", "HEAD", "--", file_path])
            .current_dir(&repo_dir)
            .output();
        Ok(())
    }
}

pub fn git_commit(path_str: &str, message: &str) -> Result<String, String> {
    if message.trim().is_empty() {
        return Err("Commit message cannot be empty".to_string());
    }
    let repo_dir = get_effective_repo_dir(path_str);
    let output = std::process::Command::new("git")
        .args(["commit", "-m", message])
        .current_dir(&repo_dir)
        .output()
        .map_err(|e| format!("Failed to run git commit: {}", e))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn git_get_branches(path_str: &str) -> Result<Vec<String>, String> {
    let repo_dir = get_effective_repo_dir(path_str);
    let output = std::process::Command::new("git")
        .args(["branch", "--list", "--format=%(refname:short)"])
        .current_dir(&repo_dir)
        .output()
        .map_err(|e| format!("Failed to run git branch: {}", e))?;
    if output.status.success() {
        let text = String::from_utf8_lossy(&output.stdout);
        let branches: Vec<String> = text
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        Ok(branches)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn git_checkout_branch(path_str: &str, branch: &str) -> Result<String, String> {
    let repo_dir = get_effective_repo_dir(path_str);
    let output = std::process::Command::new("git")
        .args(["checkout", branch])
        .current_dir(&repo_dir)
        .output()
        .map_err(|e| format!("Failed to run git checkout: {}", e))?;
    if output.status.success() {
        let out = String::from_utf8_lossy(&output.stdout).to_string();
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        Ok(if !out.trim().is_empty() { out } else { err })
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn git_get_diff(path_str: &str, file_path: Option<&str>, staged: bool) -> Result<String, String> {
    let repo_dir = get_effective_repo_dir(path_str);
    let mut args = vec!["diff", "--no-color"];
    if staged {
        args.push("--cached");
    }
    if let Some(fp) = file_path {
        args.push("--");
        args.push(fp);
    }

    let output = std::process::Command::new("git")
        .args(&args)
        .current_dir(&repo_dir)
        .output()
        .map_err(|e| format!("Failed to run git diff: {}", e))?;
    if output.status.success() {
        let diff_str = String::from_utf8_lossy(&output.stdout).to_string();
        if diff_str.is_empty() {
            if let Some(fp) = file_path {
                let full_p = repo_dir.join(fp);
                if full_p.is_file() {
                    if let Ok(content) = std::fs::read_to_string(&full_p) {
                        let mut synthetic = format!(
                            "--- /dev/null\n+++ b/{}\n@@ -0,0 +1,{} @@\n",
                            fp,
                            content.lines().count()
                        );
                        for l in content.lines() {
                            synthetic.push('+');
                            synthetic.push_str(l);
                            synthetic.push('\n');
                        }
                        return Ok(synthetic);
                    }
                }
            }
        }
        Ok(diff_str)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

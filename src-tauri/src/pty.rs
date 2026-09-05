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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitStatus {
    pub is_repo: bool,
    pub branch: Option<String>,
    pub modified_count: usize,
    pub untracked_count: usize,
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

pub fn check_git_status(path_str: &str) -> GitStatus {
    let path = std::path::Path::new(path_str);
    if !path.exists() {
        return GitStatus {
            is_repo: false,
            branch: None,
            modified_count: 0,
            untracked_count: 0,
        };
    }

    // Fast check: only run git if .git exists in path or an immediate parent
    let mut has_git = false;
    let mut cur = Some(path);
    let mut depth = 0;
    while let Some(p) = cur {
        if p.join(".git").exists() {
            has_git = true;
            break;
        }
        depth += 1;
        if depth > 4 {
            break;
        }
        cur = p.parent();
    }

    if !has_git {
        return GitStatus {
            is_repo: false,
            branch: None,
            modified_count: 0,
            untracked_count: 0,
        };
    }

    let output = std::process::Command::new("git")
        .args(["--no-optional-locks", "status", "--porcelain", "-b"])
        .env("GIT_OPTIONAL_LOCKS", "0")
        .current_dir(path)
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let text = String::from_utf8_lossy(&out.stdout);
            let mut branch = None;
            let mut modified_count = 0;
            let mut untracked_count = 0;

            for (i, line) in text.lines().enumerate() {
                if i == 0 && line.starts_with("## ") {
                    let branch_part = &line[3..];
                    let branch_name = branch_part.split("...").next().unwrap_or(branch_part);
                    branch = Some(branch_name.trim().to_string());
                } else if line.starts_with("??") {
                    untracked_count += 1;
                } else if !line.trim().is_empty() {
                    modified_count += 1;
                }
            }

            GitStatus {
                is_repo: true,
                branch,
                modified_count,
                untracked_count,
            }
        }
        _ => GitStatus {
            is_repo: false,
            branch: None,
            modified_count: 0,
            untracked_count: 0,
        },
    }
}

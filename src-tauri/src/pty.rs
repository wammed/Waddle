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
    interrupt_requested: Arc<AtomicBool>,
    paused: Arc<AtomicBool>,
}

/// Scans output from the child process for Kitty Graphics Protocol escape sequences (`\x1b_G`).
///
/// 1. Protocol Capability Query (`a=q` with `s=1,v=1` or `i=1` probe):
///    Immediately writes the support acknowledgment `\x1b_Gi=<id>;ok\x1b\` back to the child PTY (stdin),
///    and strips the query sequence from `decoded` so it is not echoed or passed to the frontend.
/// 2. General `\x1b_G` sequences (e.g. image transmissions):
///    Extracts and logs the header parameters (`println!("[Kitty Graphics] Received header: {}", header)`)
///    to aid diagnostics and future decode/render architecture decisions.
/// 3. Incomplete headers at the end of `decoded` (< 256 bytes) are held in `pending_prefix`
///    and prepended to the next read chunk.
pub fn process_kitty_output<W: Write + ?Sized>(
    decoded: &mut String,
    writer: &mut W,
    pending_prefix: &mut String,
) {
    if !pending_prefix.is_empty() {
        decoded.insert_str(0, pending_prefix);
        pending_prefix.clear();
    }

    let has_apc = decoded.contains("\x1b_G");
    let has_csi_query = decoded.contains("\x1b[c")
        || decoded.contains("\x1b[0c")
        || decoded.contains("\x1b[16t")
        || decoded.contains("\x1b[?996n")
        || decoded.contains("\x1b[>q")
        || decoded.contains("\x1b[>0q")
        || decoded.contains("\x1b[5n");

    if !has_apc && !has_csi_query {
        if decoded.ends_with("\x1b_") {
            *pending_prefix = decoded.split_off(decoded.len() - 2);
        } else if decoded.ends_with("\x1b") {
            *pending_prefix = decoded.split_off(decoded.len() - 1);
        }
        return;
    }

    if has_apc {
        let mut search_idx = 0;
        while let Some(rel_start) = decoded[search_idx..].find("\x1b_G") {
            let start = search_idx + rel_start;
            let header_start = start + 3; // Length of "\x1b_G"
            let rest = &decoded[header_start..];

            // Find delimiter ending the header: ';' or ST '\x1b\' or BEL '\x07'
            let semi_pos = rest.find(';');
            let mut term_pos = None;
            let mut term_len = 0;

            if let Some(pos) = rest.find("\x1b\\") {
                term_pos = Some(pos);
                term_len = 2;
            }
            if let Some(pos) = rest.find('\x07') {
                if term_pos.is_none_or(|t| pos < t) {
                    term_pos = Some(pos);
                    term_len = 1;
                }
            }

            let header_end = match (semi_pos, term_pos) {
                (Some(s), Some(t)) => Some(s.min(t)),
                (Some(s), None) => Some(s),
                (None, Some(t)) => Some(t),
                (None, None) => None,
            };

            if let Some(h_end) = header_end {
                let header = &rest[..h_end];
                println!("[Kitty Graphics] Received header: {}", header);

                // Check if this is a query probe (a=q)
                let mut is_query = false;
                let mut query_id: Option<u32> = None;
                let mut medium: Option<char> = None;

                for part in header.split(',') {
                    let part = part.trim();
                    let mut kv = part.split('=');
                    if let (Some(k), Some(v)) = (kv.next(), kv.next()) {
                        let k = k.trim();
                        let v = v.trim();
                        if k.eq_ignore_ascii_case("a") && v.eq_ignore_ascii_case("q") {
                            is_query = true;
                        } else if k.eq_ignore_ascii_case("i") || k.eq_ignore_ascii_case("I") {
                            query_id = v.parse::<u32>().ok();
                        } else if k.eq_ignore_ascii_case("t") || k.eq_ignore_ascii_case("T") {
                            medium = v.chars().next();
                        }
                    }
                }

                if is_query {
                    let id = query_id.unwrap_or(1);
                    let is_shm = matches!(medium, Some('s') | Some('S'));
                    if !is_shm {
                        // Send uppercase "OK" as required by kitten's DetectSupport (g.ResponseMessage() == "OK")
                        let response = format!("\x1b_Gi={};OK\x1b\\", id);
                        if let Err(e) = writer.write_all(response.as_bytes()) {
                            eprintln!("[Kitty Graphics] Error writing query response: {}", e);
                        } else if let Err(e) = writer.flush() {
                            eprintln!("[Kitty Graphics] Error flushing query response: {}", e);
                        } else {
                            println!("[Kitty Graphics] Responded to query: \\x1b_Gi={};OK\\x1b\\", id);
                        }
                    } else {
                        let response = format!("\x1b_Gi={};ENOTSUP\x1b\\", id);
                        if let Err(e) = writer.write_all(response.as_bytes()) {
                            eprintln!("[Kitty Graphics] Error writing query refusal: {}", e);
                        } else if let Err(e) = writer.flush() {
                            eprintln!("[Kitty Graphics] Error flushing query refusal: {}", e);
                        } else {
                            println!("[Kitty Graphics] Refused probe for shared memory (t=s) with ENOTSUP: i={}", id);
                        }
                    }

                    // Remove the query sequence from decoded immediately
                    if let Some(t_pos) = term_pos {
                        let seq_end = header_start + t_pos + term_len;
                        decoded.replace_range(start..seq_end, "");
                        search_idx = start;
                        continue;
                    } else if let Some(s_pos) = semi_pos {
                        let after_semi = &rest[s_pos + 1..];
                        if after_semi.starts_with("\x1b\\") {
                            let seq_end = header_start + s_pos + 1 + 2;
                            decoded.replace_range(start..seq_end, "");
                            search_idx = start;
                            continue;
                        } else if after_semi.starts_with('\x07') {
                            let seq_end = header_start + s_pos + 1 + 1;
                            decoded.replace_range(start..seq_end, "");
                            search_idx = start;
                            continue;
                        }
                    }
                } else if matches!(medium, Some('t') | Some('T')) {
                    // Inline temporary file (t=t) to prevent race conditions when client unlinks file upon DSR reply
                    if let (Some(s_pos), Some(t_pos)) = (semi_pos, term_pos) {
                        if s_pos < t_pos {
                            let payload = &rest[s_pos + 1..t_pos];
                            match crate::kitty::read_and_unlink_temp_file_base64(payload, 16 * 1024 * 1024) {
                                Ok(inlined_data) => {
                                    // Replace t=t with t=d in header
                                    let mut new_parts = Vec::new();
                                    for part in header.split(',') {
                                        let trimmed = part.trim();
                                        let mut kv = trimmed.split('=');
                                        if let (Some(k), Some(_v)) = (kv.next(), kv.next()) {
                                            if k.trim().eq_ignore_ascii_case("t") {
                                                new_parts.push("t=d".to_string());
                                                continue;
                                            }
                                        }
                                        new_parts.push(trimmed.to_string());
                                    }
                                    let new_header = new_parts.join(",");
                                    let new_command = format!("\x1b_G{};{}\x1b\\", new_header, inlined_data);
                                    let seq_end = header_start + t_pos + term_len;
                                    decoded.replace_range(start..seq_end, &new_command);
                                    search_idx = start + new_command.len();
                                    println!("[Kitty Graphics] Successfully inlined temporary file (t=t -> t=d, {} bytes)", inlined_data.len());
                                    continue;
                                }
                                Err(e) => {
                                    eprintln!("[Kitty Graphics] Failed to inline temporary file: {}", e);
                                }
                            }
                        }
                    } else if term_pos.is_none() {
                        // Incomplete command at end of buffer, wait for subsequent chunks
                        break;
                    }
                }

                // For non-queries and non-inlined commands, advance search_idx past this header
                search_idx = header_start + h_end + 1;
            } else {
                // Header is incomplete at end of buffer (< 256 bytes)
                if rest.len() < 256 {
                    break;
                } else {
                    search_idx = header_start;
                }
            }
        }
    }

    // Check if XTVERSION query "\x1b[>q" or "\x1b[>0q" is present (used by timg and terminal capability analyzers)
    while let Some(xt_pos) = decoded.find("\x1b[>0q") {
        let response = b"\x1bP>|kitty(0.35.0)\x1b\\";
        if let Err(e) = writer.write_all(response) {
            eprintln!("[Kitty Graphics] Error writing XTVERSION (0q) response: {}", e);
        } else if let Err(e) = writer.flush() {
            eprintln!("[Kitty Graphics] Error flushing XTVERSION (0q) response: {}", e);
        } else {
            println!("[Kitty Graphics] Responded to XTVERSION (0q) query: \\x1bP>|kitty(0.35.0)\\x1b\\");
        }
        decoded.drain(xt_pos..xt_pos + 5);
    }
    while let Some(xt_pos) = decoded.find("\x1b[>q") {
        let response = b"\x1bP>|kitty(0.35.0)\x1b\\";
        if let Err(e) = writer.write_all(response) {
            eprintln!("[Kitty Graphics] Error writing XTVERSION query response: {}", e);
        } else if let Err(e) = writer.flush() {
            eprintln!("[Kitty Graphics] Error flushing XTVERSION query response: {}", e);
        } else {
            println!("[Kitty Graphics] Responded to XTVERSION query: \\x1bP>|kitty(0.35.0)\\x1b\\");
        }
        decoded.drain(xt_pos..xt_pos + 4);
    }

    // Check if DSR (Device Status Report) query "\x1b[5n" is present (used by viu and timg for render synchronization)
    while let Some(dsr_pos) = decoded.find("\x1b[5n") {
        // \x1b[0n = Terminal OK (Operating normally)
        let response = b"\x1b[0n";
        if let Err(e) = writer.write_all(response) {
            eprintln!("[Kitty Graphics] Error writing DSR response: {}", e);
        } else if let Err(e) = writer.flush() {
            eprintln!("[Kitty Graphics] Error flushing DSR response: {}", e);
        } else {
            println!("[Kitty Graphics] Responded to DSR (5n) query: \\x1b[0n");
        }
        decoded.drain(dsr_pos..dsr_pos + 4);
    }

    // Check if DA1 query "\x1b[c" or "\x1b[0c" is present in decoded (frequently sent at the end of Kitty capability probes)
    // NOTE: Official Kitty terminal responds with "\x1b[?62c". We must NOT include ";4;" (Sixel capability)
    // because tools like viu (viuer crate) prioritize Sixel if ";4;" is present in DA1 response.
    while let Some(da1_pos) = decoded.find("\x1b[c") {
        let response = b"\x1b[?62c";
        if let Err(e) = writer.write_all(response) {
            eprintln!("[Kitty Graphics] Error writing DA1 response: {}", e);
        } else if let Err(e) = writer.flush() {
            eprintln!("[Kitty Graphics] Error flushing DA1 response: {}", e);
        } else {
            println!("[Kitty Graphics] Responded to DA1 query: \\x1b[?62c");
        }
        decoded.drain(da1_pos..da1_pos + 3);
    }
    while let Some(da1_0_pos) = decoded.find("\x1b[0c") {
        let response = b"\x1b[?62c";
        if let Err(e) = writer.write_all(response) {
            eprintln!("[Kitty Graphics] Error writing DA1 (0c) response: {}", e);
        } else if let Err(e) = writer.flush() {
            eprintln!("[Kitty Graphics] Error flushing DA1 (0c) response: {}", e);
        } else {
            println!("[Kitty Graphics] Responded to DA1 (0c) query: \\x1b[?62c");
        }
        decoded.drain(da1_0_pos..da1_0_pos + 4);
    }

    // Check if cell size query "\x1b[16t" is present (used by Yazi/terminal graphics tools to determine cell dimensions)
    while let Some(cell_size_pos) = decoded.find("\x1b[16t") {
        // Response format: \x1b[6;<cell_height>;<cell_width>t (e.g. 18 height x 9 width)
        let response = b"\x1b[6;18;9t";
        if let Err(e) = writer.write_all(response) {
            eprintln!("[Kitty Graphics] Error writing cell size response: {}", e);
        } else if let Err(e) = writer.flush() {
            eprintln!("[Kitty Graphics] Error flushing cell size response: {}", e);
        } else {
            println!("[Kitty Graphics] Responded to cell size (16t) query: \\x1b[6;18;9t");
        }
        decoded.drain(cell_size_pos..cell_size_pos + 5);
    }

    // Check if Kitty Unicode placeholder support query "\x1b[?996n" is present
    while let Some(u_probe_pos) = decoded.find("\x1b[?996n") {
        // Response format: \x1b[?996;1n (1 = supported)
        let response = b"\x1b[?996;1n";
        if let Err(e) = writer.write_all(response) {
            eprintln!("[Kitty Graphics] Error writing unicode placeholder probe response: {}", e);
        } else if let Err(e) = writer.flush() {
            eprintln!("[Kitty Graphics] Error flushing unicode placeholder probe response: {}", e);
        } else {
            println!("[Kitty Graphics] Responded to unicode placeholder (?996n) query: \\x1b[?996;1n");
        }
        decoded.drain(u_probe_pos..u_probe_pos + 7);
    }

    // If an unclosed \x1b_G header remains at the end of decoded (< 256 bytes), hold it
    if let Some(start) = decoded.rfind("\x1b_G") {
        let rest = &decoded[start + 3..];
        if !rest.contains(';') && !rest.contains("\x1b\\") && !rest.contains('\x07') && rest.len() < 256 {
            *pending_prefix = decoded.split_off(start);
        }
    } else if decoded.ends_with("\x1b_") {
        *pending_prefix = decoded.split_off(decoded.len() - 2);
    } else if decoded.ends_with("\x1b") {
        *pending_prefix = decoded.split_off(decoded.len() - 1);
    }
}

pub struct PtyManager {
    sessions: Arc<Mutex<HashMap<String, Session>>>,
}

impl Default for PtyManager {
    fn default() -> Self {
        Self::new()
    }
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
        let pixel_width = cols.saturating_mul(9);
        let pixel_height = rows.saturating_mul(18);
        let pty_size = PtySize {
            rows,
            cols,
            pixel_width,
            pixel_height,
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
        cmd.env("TERM", "xterm-kitty");
        cmd.env("COLORTERM", "truecolor");
        cmd.env("WADDLE_TERMINAL", "1");
        cmd.env("KITTY_WINDOW_ID", "1");

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

        let writer = Arc::new(parking_lot::Mutex::new(writer));
        let writer_clone = Arc::clone(&writer);

        let alive = Arc::new(AtomicBool::new(true));
        let alive_clone = Arc::clone(&alive);
        let interrupt_requested = Arc::new(AtomicBool::new(false));
        let interrupt_requested_clone = Arc::clone(&interrupt_requested);
        let paused = Arc::new(AtomicBool::new(false));
        let paused_clone = Arc::clone(&paused);
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
            let mut buffer = [0u8; 32768];
            let mut pending_bytes: Vec<u8> = Vec::new();
            let mut pending_kitty_prefix = String::new();
            let mut saturated_streak: u32 = 0;
            let event_name = format!("pty-output-{}", session_id_clone);

            while alive_clone.load(Ordering::SeqCst) {
                // Backpressure flow control: if frontend is overwhelmed, wait until resumed.
                // If user presses Ctrl+C while paused, immediately unpause to let shell prompt through.
                while paused_clone.load(Ordering::SeqCst) && alive_clone.load(Ordering::SeqCst) {
                    if interrupt_requested_clone.load(Ordering::SeqCst) {
                        paused_clone.store(false, Ordering::SeqCst);
                        break;
                    }
                    thread::sleep(std::time::Duration::from_millis(5));
                }

                if interrupt_requested_clone.swap(false, Ordering::SeqCst) {
                    pending_bytes.clear();
                    pending_kitty_prefix.clear();
                    saturated_streak = 0;
                }

                match reader.read(&mut buffer) {
                    Ok(0) => {
                        // EOF
                        break;
                    }
                    Ok(n) => {
                        // Rate-limit runaway throughput when buffer is completely saturated (32KB),
                        // letting the kernel PTY buffer naturally throttle the child process.
                        // 16ms matches 60 FPS monitor refresh rate (~1.9 MB/s max).
                        // Normal interactive commands (< 32KB) have 0ms latency.
                        if n == buffer.len() {
                            saturated_streak = saturated_streak.saturating_add(1);
                            let sleep_ms = if saturated_streak > 5 { 20 } else { 16 };
                            thread::sleep(std::time::Duration::from_millis(sleep_ms));
                        } else {
                            saturated_streak = 0;
                        }

                        // If user sent Ctrl+C during read or sleep, discard this runaway chunk!
                        if interrupt_requested_clone.swap(false, Ordering::SeqCst) {
                            pending_bytes.clear();
                            pending_kitty_prefix.clear();
                            saturated_streak = 0;
                            continue;
                        }

                        let chunk = &buffer[..n];
                        let to_process = if pending_bytes.is_empty() {
                            chunk.to_vec()
                        } else {
                            pending_bytes.extend_from_slice(chunk);
                            std::mem::take(&mut pending_bytes)
                        };

                        let mut slice = &to_process[..];
                        let mut decoded = String::with_capacity(slice.len());

                        while !slice.is_empty() {
                            match std::str::from_utf8(slice) {
                                Ok(valid) => {
                                    decoded.push_str(valid);
                                    break;
                                }
                                Err(e) => {
                                    let valid_len = e.valid_up_to();
                                    if valid_len > 0 {
                                        if let Ok(s) = std::str::from_utf8(&slice[..valid_len]) {
                                            decoded.push_str(s);
                                        }
                                        slice = &slice[valid_len..];
                                    }
                                    if let Some(err_len) = e.error_len() {
                                        // Actual invalid byte sequence (e.g. binary output)
                                        decoded.push('\u{FFFD}');
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

                        if !decoded.is_empty() || !pending_kitty_prefix.is_empty() {
                            {
                                let mut w = writer_clone.lock();
                                process_kitty_output(&mut decoded, &mut *w, &mut pending_kitty_prefix);
                            }

                            if !decoded.is_empty() {
                                if let Err(e) = app_clone.emit(&event_name, &decoded) {
                                    eprintln!("Error emitting PTY output: {}", e);
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

            // Flush any remaining pending bytes or incomplete kitty prefix if EOF occurs
            if !pending_kitty_prefix.is_empty() {
                pending_bytes.extend_from_slice(pending_kitty_prefix.as_bytes());
            }
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
            writer,
            alive,
            last_known_cwd: target_cwd.to_string_lossy().to_string(),
            shell: shell_cmd.clone(),
            start_tx,
            interrupt_requested,
            paused,
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

    pub async fn pause_pty(&self, session_id: &str) -> Result<(), String> {
        let sessions = self.sessions.lock().await;
        if let Some(session) = sessions.get(session_id) {
            session.paused.store(true, Ordering::SeqCst);
            Ok(())
        } else {
            Err("Session not found".to_string())
        }
    }

    pub async fn resume_pty(&self, session_id: &str) -> Result<(), String> {
        let sessions = self.sessions.lock().await;
        if let Some(session) = sessions.get(session_id) {
            session.paused.store(false, Ordering::SeqCst);
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
            if data.contains('\x03') {
                session.interrupt_requested.store(true, Ordering::SeqCst);
                session.paused.store(false, Ordering::SeqCst);
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

    pub async fn resize(
        &self,
        session_id: &str,
        rows: u16,
        cols: u16,
        pixel_width: Option<u16>,
        pixel_height: Option<u16>,
    ) -> Result<(), String> {
        let sessions = self.sessions.lock().await;
        if let Some(session) = sessions.get(session_id) {
            let master = session.master.lock();
            let pw = pixel_width.unwrap_or(0);
            let ph = pixel_height.unwrap_or(0);
            let final_pixel_width = if pw > 0 { pw } else { cols.saturating_mul(9) };
            let final_pixel_height = if ph > 0 { ph } else { rows.saturating_mul(18) };
            master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: final_pixel_width,
                    pixel_height: final_pixel_height,
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

pub fn is_github_host(url: &str) -> bool {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return false;
    }

    // 1. Check scp-style SSH: git@github.com:owner/repo.git
    if let Some(rest) = trimmed.strip_prefix("git@") {
        if let Some(host_part) = rest.split(':').next() {
            let h = host_part.to_lowercase();
            return h == "github.com" || h == "gist.github.com" || h.ends_with(".github.io");
        }
    }

    // 2. Check URL syntax: https://, http://, ssh://, git://
    if let Some(scheme_pos) = trimmed.find("://") {
        let after_scheme = &trimmed[scheme_pos + 3..];
        // Strip userinfo if present: username:token@host
        let without_user = if let Some(at_pos) = after_scheme.find('@') {
            let first_slash = after_scheme.find('/').unwrap_or(after_scheme.len());
            if at_pos < first_slash {
                &after_scheme[at_pos + 1..]
            } else {
                after_scheme
            }
        } else {
            after_scheme
        };

        // Host is everything up to the first '/', ':', or '?'
        let host = without_user
            .split(['/', ':', '?'])
            .next()
            .unwrap_or("")
            .trim()
            .to_lowercase();

        return host == "github.com" || host == "gist.github.com" || host.ends_with(".github.io");
    }

    // 3. Fallback: check if format is host:path (e.g. github.com:owner/repo.git)
    if let Some(colon_pos) = trimmed.find(':') {
        let host_candidate = &trimmed[..colon_pos];
        if !host_candidate.contains('/') {
            let h = host_candidate.to_lowercase();
            return h == "github.com" || h == "gist.github.com" || h.ends_with(".github.io");
        }
    }

    false
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
                    let is_gh = is_github_host(url);
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
    // Security check: ensure file_path does not contain path traversal outside repo_dir
    let clean_path = std::path::Path::new(file_path);
    if clean_path.components().any(|c| c == std::path::Component::ParentDir) {
        return Err("EACCES: Path traversal detected in file_path".to_string());
    }
    let p = repo_dir.join(clean_path);
    if let (Ok(repo_canon), Ok(p_canon)) = (repo_dir.canonicalize(), p.canonicalize()) {
        if !p_canon.starts_with(&repo_canon) {
            return Err("EACCES: Attempted to discard file outside repository root".to_string());
        }
    }

    let status = std::process::Command::new("git")
        .args(["status", "--porcelain", "--", file_path])
        .current_dir(&repo_dir)
        .output();
    if let Ok(st) = status {
        let out = String::from_utf8_lossy(&st.stdout);
        if out.starts_with("??") {
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
    let branch = branch.trim();
    if branch.is_empty()
        || branch.starts_with('-')
        || branch.starts_with('/')
        || branch.ends_with('/')
        || branch.ends_with(".lock")
        || branch.contains('\0')
        || branch.contains('\n')
        || branch.contains('\r')
        || branch.contains("..")
        || branch.contains("@{")
        || branch.chars().any(|c| c.is_ascii_control() || matches!(c, ' ' | '~' | '^' | ':' | '?' | '*' | '[' | '\\'))
    {
        return Err("Invalid git branch ref format".to_string());
    }
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
            } else if !staged {
                // If diff is empty and no staged flag, check for untracked files
                let status_output = std::process::Command::new("git")
                    .args(["status", "--porcelain", "-uall"])
                    .current_dir(&repo_dir)
                    .output();
                if let Ok(st_out) = status_output {
                    if st_out.status.success() {
                        let stdout_str = String::from_utf8_lossy(&st_out.stdout);
                        let mut synthetic_all = String::new();
                        let mut untracked_count = 0;
                        for line in stdout_str.lines() {
                            if let Some(stripped) = line.strip_prefix("?? ") {
                                let untracked_path = stripped.trim().trim_matches('"');
                                let full_p = repo_dir.join(untracked_path);
                                if full_p.is_file() && untracked_count < 10 {
                                    untracked_count += 1;
                                    if let Ok(content) = std::fs::read_to_string(&full_p) {
                                        synthetic_all.push_str(&format!(
                                            "--- /dev/null\n+++ b/{}\n@@ -0,0 +1,{} @@\n",
                                            untracked_path,
                                            content.lines().count().min(50)
                                        ));
                                        for l in content.lines().take(50) {
                                            synthetic_all.push('+');
                                            synthetic_all.push_str(l);
                                            synthetic_all.push('\n');
                                        }
                                    } else {
                                        synthetic_all.push_str(&format!(
                                            "--- /dev/null\n+++ b/{}\n@@ -0,0 +1,1 @@\n+[untracked binary/non-utf8 file]\n",
                                            untracked_path
                                        ));
                                    }
                                }
                            }
                        }
                        if !synthetic_all.is_empty() {
                            return Ok(synthetic_all);
                        }
                    }
                }
            }
        }
        Ok(diff_str)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn git_push(path_str: &str, restrict_to_github: bool) -> Result<String, String> {
    let repo_dir = get_effective_repo_dir(path_str);
    if restrict_to_github {
        let (_, blocked) = inspect_github_remotes(&repo_dir);
        if let Some(blocked_url) = blocked {
            return Err(format!(
                "GitHub限定ポリシーにより、非GitHubリモート ({}) への push は遮断されています。",
                blocked_url
            ));
        }
    }

    let output = std::process::Command::new("git")
        .args(["push"])
        .env("GIT_TERMINAL_PROMPT", "0")
        .current_dir(&repo_dir)
        .output()
        .map_err(|e| format!("Failed to execute git push: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if output.status.success() {
        let msg = if !stdout.is_empty() {
            stdout
        } else if !stderr.is_empty() {
            stderr
        } else {
            "Push completed successfully".to_string()
        };
        Ok(msg)
    } else {
        let err = if !stderr.is_empty() {
            stderr
        } else if !stdout.is_empty() {
            stdout
        } else {
            "git push failed".to_string()
        };
        Err(err)
    }
}

pub fn git_pull(path_str: &str, restrict_to_github: bool) -> Result<String, String> {
    let repo_dir = get_effective_repo_dir(path_str);
    if restrict_to_github {
        let (_, blocked) = inspect_github_remotes(&repo_dir);
        if let Some(blocked_url) = blocked {
            return Err(format!(
                "GitHub限定ポリシーにより、非GitHubリモート ({}) への pull は遮断されています。",
                blocked_url
            ));
        }
    }

    let output = std::process::Command::new("git")
        .args(["pull"])
        .env("GIT_TERMINAL_PROMPT", "0")
        .current_dir(&repo_dir)
        .output()
        .map_err(|e| format!("Failed to execute git pull: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if output.status.success() {
        let msg = if !stdout.is_empty() {
            stdout
        } else if !stderr.is_empty() {
            stderr
        } else {
            "Pull completed successfully".to_string()
        };
        Ok(msg)
    } else {
        let err = if !stderr.is_empty() {
            stderr
        } else if !stdout.is_empty() {
            stdout
        } else {
            "git pull failed".to_string()
        };
        Err(err)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_git_get_diff_untracked_synthetic() {
        let temp_dir = std::env::temp_dir().join(format!("waddle_git_diff_{}", uuid::Uuid::new_v4()));
        let _ = std::fs::create_dir_all(&temp_dir);
        let path_str = temp_dir.to_str().unwrap();

        let _ = std::process::Command::new("git")
            .args(["init"])
            .current_dir(&temp_dir)
            .output();

        // Create an untracked file
        let file_path = temp_dir.join("sample.txt");
        std::fs::write(&file_path, "hello world\nsecond line").unwrap();

        // Staged diff should be empty
        let staged_diff = git_get_diff(path_str, None, true).unwrap();
        assert!(staged_diff.is_empty(), "Staged diff should be empty");

        // Unstaged diff should now pick up untracked file as synthetic diff
        let unstaged_diff = git_get_diff(path_str, None, false).unwrap();
        assert!(unstaged_diff.contains("--- /dev/null"));
        assert!(unstaged_diff.contains("+++ b/sample.txt"));
        assert!(unstaged_diff.contains("+hello world"));

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_git_discard_file_path_traversal() {
        let temp_dir = std::env::temp_dir().join(format!("waddle_discard_test_{}", uuid::Uuid::new_v4()));
        let _ = std::fs::create_dir_all(&temp_dir);

        // 1. Path containing .. must be rejected with EACCES
        let res = git_discard_file(temp_dir.to_str().unwrap(), "../secret.txt");
        assert!(res.is_err());
        let err = res.unwrap_err();
        assert!(err.starts_with("EACCES"), "Error must start with EACCES: got {}", err);

        // 2. Nested traversal
        let res2 = git_discard_file(temp_dir.to_str().unwrap(), "foo/../../secret.txt");
        assert!(res2.is_err());
        assert!(res2.unwrap_err().starts_with("EACCES"));

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_git_checkout_branch_ref_validation() {
        let dummy_dir = std::env::temp_dir();
        let path = dummy_dir.to_str().unwrap();

        // Invalid branch names must be rejected immediately without invoking git
        let invalid_cases = [
            "-b",
            "--orphan",
            "-D",
            "",
            "   ",
            "feature/../secret",
            "heads/branch@{1}",
            "feature branch",
            "feature\nbranch",
            "feature\0branch",
            "feature~1",
            "feature^2",
            "feature:name",
            "feature?test",
            "feature*glob",
            "feature[0]",
            "/leading-slash",
            "trailing-slash/",
            "branch.lock",
        ];

        for invalid in invalid_cases {
            let res = git_checkout_branch(path, invalid);
            assert!(res.is_err(), "Branch '{}' should have been rejected", invalid);
            assert_eq!(res.unwrap_err(), "Invalid git branch ref format");
        }
    }

    #[test]
    fn test_kitty_query_probe_fastfetch() {
        let mut decoded = "\x1b_Gi=1,s=1,v=1,a=q;\x1b\\".to_string();
        let mut writer = Vec::new();
        let mut pending = String::new();

        process_kitty_output(&mut decoded, &mut writer, &mut pending);

        assert_eq!(writer, b"\x1b_Gi=1;OK\x1b\\");
        assert_eq!(decoded, "");
        assert_eq!(pending, "");
    }

    #[test]
    fn test_kitty_query_probe_bel_terminator() {
        let mut decoded = "\x1b_Gi=1,s=1,v=1,a=q;\x07".to_string();
        let mut writer = Vec::new();
        let mut pending = String::new();

        process_kitty_output(&mut decoded, &mut writer, &mut pending);

        assert_eq!(writer, b"\x1b_Gi=1;OK\x1b\\");
        assert_eq!(decoded, "");
        assert_eq!(pending, "");
    }

    #[test]
    fn test_kitty_query_custom_id_and_key_order() {
        let mut decoded = "\x1b_Ga=q,s=1,v=1,i=42;\x1b\\".to_string();
        let mut writer = Vec::new();
        let mut pending = String::new();

        process_kitty_output(&mut decoded, &mut writer, &mut pending);

        assert_eq!(writer, b"\x1b_Gi=42;OK\x1b\\");
        assert_eq!(decoded, "");
        assert_eq!(pending, "");
    }

    #[test]
    fn test_kitty_query_embedded_in_stream() {
        let mut decoded = "Hello \x1b_Gi=1,s=1,v=1,a=q;\x1b\\World".to_string();
        let mut writer = Vec::new();
        let mut pending = String::new();

        process_kitty_output(&mut decoded, &mut writer, &mut pending);

        assert_eq!(writer, b"\x1b_Gi=1;OK\x1b\\");
        assert_eq!(decoded, "Hello World");
        assert_eq!(pending, "");
    }

    #[test]
    fn test_kitty_query_probe_kitten_icat_multi() {
        // kitten icat sends 3 probes: direct (i=1), temp file (i=2), shared memory (i=3) followed by DA1 (\x1b[c)
        let mut decoded = "\x1b_Ga=q,f=24,s=1,v=1,S=3,i=1;MTIz\x1b\\\x1b_Ga=q,f=24,t=t,s=1,v=1,S=46,i=2;L2Rldi9zaG0v...\x1b\\\x1b_Ga=q,f=24,t=s,s=1,v=1,S=18,i=3;aWNhdC0...\x1b\\\x1b[c".to_string();
        let mut writer = Vec::new();
        let mut pending = String::new();

        process_kitty_output(&mut decoded, &mut writer, &mut pending);

        // Expect OK for i=1, OK for i=2, refusal (ENOTSUP) for i=3 (shm), and DA1 response (without Sixel 4)
        assert_eq!(writer, b"\x1b_Gi=1;OK\x1b\\\x1b_Gi=2;OK\x1b\\\x1b_Gi=3;ENOTSUP\x1b\\\x1b[?62c");
        assert_eq!(decoded, "");
        assert_eq!(pending, "");
    }

    #[test]
    fn test_kitty_shm_query_rejection() {
        // Verify that standalone shared memory probe (t=s) is rejected with ENOTSUP for sandbox security
        let mut decoded = "\x1b_Ga=q,t=s,s=1,v=1,i=99;test\x1b\\".to_string();
        let mut writer = Vec::new();
        let mut pending = String::new();

        process_kitty_output(&mut decoded, &mut writer, &mut pending);

        assert_eq!(writer, b"\x1b_Gi=99;ENOTSUP\x1b\\", "Shared memory query (t=s) must be rejected with ENOTSUP");
        assert_eq!(decoded, "");
        assert_eq!(pending, "");
    }

    #[test]
    fn test_kitty_image_data_preservation() {
        let original = "\x1b_Ga=T,f=32,s=100,v=200,o=z,m=1;eNrsvQ==\x1b\\".to_string();
        let mut decoded = original.clone();
        let mut writer = Vec::new();
        let mut pending = String::new();

        process_kitty_output(&mut decoded, &mut writer, &mut pending);

        assert!(writer.is_empty(), "No response should be written for image data");
        assert_eq!(decoded, original, "Image sequence must be preserved for frontend");
        assert_eq!(pending, "");
    }

    #[test]
    fn test_kitty_chunk_split() {
        let mut chunk1 = "\x1b_Gi=1,s=1,".to_string();
        let mut writer = Vec::new();
        let mut pending = String::new();

        process_kitty_output(&mut chunk1, &mut writer, &mut pending);
        assert_eq!(chunk1, "");
        assert_eq!(pending, "\x1b_Gi=1,s=1,");
        assert!(writer.is_empty());

        let mut chunk2 = "v=1,a=q;\x1b\\".to_string();
        process_kitty_output(&mut chunk2, &mut writer, &mut pending);
        assert_eq!(chunk2, "");
        assert_eq!(pending, "");
        assert_eq!(writer, b"\x1b_Gi=1;OK\x1b\\");
    }

    #[test]
    fn test_kitty_query_yazi_probes() {
        let mut writer = Vec::new();
        let mut pending = String::new();

        // 1. Placeholder probe: \x1b[?996n
        let mut data = "\x1b[?996n".to_string();
        process_kitty_output(&mut data, &mut writer, &mut pending);
        assert_eq!(data, "");
        assert_eq!(writer, b"\x1b[?996;1n");

        // 2. Cell size probe: \x1b[16t
        writer.clear();
        let mut data2 = "\x1b[16t".to_string();
        process_kitty_output(&mut data2, &mut writer, &mut pending);
        assert_eq!(data2, "");
        assert_eq!(writer, b"\x1b[6;18;9t");

        // 3. DA1 probe: \x1b[0c
        writer.clear();
        let mut data3 = "\x1b[0c".to_string();
        process_kitty_output(&mut data3, &mut writer, &mut pending);
        assert_eq!(data3, "");
        assert_eq!(writer, b"\x1b[?62c");

        // 4. Combined with normal data
        writer.clear();
        let mut data4 = "hello\x1b[?996nworld".to_string();
        process_kitty_output(&mut data4, &mut writer, &mut pending);
        assert_eq!(data4, "helloworld");
        assert_eq!(writer, b"\x1b[?996;1n");
    }

    #[test]
    fn test_kitty_query_xtversion() {
        let mut writer = Vec::new();
        let mut pending = String::new();

        // Test \x1b[>q (timg terminal name probe)
        let mut data1 = "\x1b[>q".to_string();
        process_kitty_output(&mut data1, &mut writer, &mut pending);
        assert_eq!(data1, "");
        assert_eq!(writer, b"\x1bP>|kitty(0.35.0)\x1b\\");

        // Test \x1b[>0q
        writer.clear();
        let mut data2 = "prefix\x1b[>0qsuffix".to_string();
        process_kitty_output(&mut data2, &mut writer, &mut pending);
        assert_eq!(data2, "prefixsuffix");
        assert_eq!(writer, b"\x1bP>|kitty(0.35.0)\x1b\\");
    }

    #[test]
    fn test_kitty_query_dsr_5n() {
        let mut writer = Vec::new();
        let mut pending = String::new();

        // Test \x1b[5n (DSR query from viu/timg)
        let mut data = "\x1b[5n".to_string();
        process_kitty_output(&mut data, &mut writer, &mut pending);
        assert_eq!(data, "");
        assert_eq!(writer, b"\x1b[0n");
    }

    #[test]
    fn test_viu_combined_fifo_order() {
        // viu sends kitty probe + DA1 together: \x1b_Gi=31,s=1,v=1,a=q,t=d,f=24;AAAA\x1b\\\x1b[c
        // It requires the Kitty response FIRST, followed by DA1 response
        let mut data = "\x1b_Gi=31,s=1,v=1,a=q,t=d,f=24;AAAA\x1b\\\x1b[c".to_string();
        let mut writer = Vec::new();
        let mut pending = String::new();

        process_kitty_output(&mut data, &mut writer, &mut pending);
        assert_eq!(data, "");
        assert_eq!(writer, b"\x1b_Gi=31;OK\x1b\\\x1b[?62c");
    }

    #[test]
    fn test_pty_temp_file_inlining() {
        use base64::Engine;
        let temp_dir = std::env::temp_dir();
        let file_path = temp_dir.join(format!("waddle_pty_inlining_{}.bin", std::process::id()));
        let dummy_data = b"InlinedKittyImageData";
        std::fs::write(&file_path, dummy_data).unwrap();
        assert!(file_path.exists());

        let path_b64 = base64::engine::general_purpose::STANDARD.encode(file_path.to_str().unwrap().as_bytes());
        let mut data = format!("\x1b_Gf=32,s=10,v=10,a=T,t=t;{}\x1b\\\x1b[5n", path_b64);
        let mut writer = Vec::new();
        let mut pending = String::new();

        process_kitty_output(&mut data, &mut writer, &mut pending);

        // 1. \x1b[5n should be intercepted and replied with \x1b[0n
        assert_eq!(writer, b"\x1b[0n");

        // 2. data should now contain t=d with base64 encoded dummy_data
        let expected_payload = base64::engine::general_purpose::STANDARD.encode(dummy_data);
        assert!(data.contains("t=d"), "Command must be transformed from t=t to t=d: {}", data);
        assert!(data.contains(&expected_payload), "Payload must contain inlined base64 data");

        // 3. File must be deleted
        assert!(!file_path.exists(), "Temporary file must be deleted upon inlining!");
    }
}



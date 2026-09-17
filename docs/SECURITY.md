# 🔒 Security Policy & Multi-Layer Safety Guardrails

Waddle is architected with a **Defense-in-Depth** security philosophy designed for sensitive development environments, air-gapped workstations, and privacy-conscious Linux developers.

---

## 🛡️ Core Security Principles

1. **100% Offline & Local Execution**:
   - Zero telemetry, zero analytics tracking, and zero third-party cloud dependencies.
   - AI capabilities run locally via Ollama (`http://localhost:11434`). Your source code, terminal commands, and outputs never leave your workstation.
2. **Complete Data Sovereignty**:
   - Safe for use within strict enterprise boundaries, air-gapped networks, and confidential environments.
3. **Defense-in-Depth**:
   - Multiple independent layers of protection spanning Webview Content Security Policies, backend filesystem access boundaries, input/output sanitization, and destructive command interception.

---

## 📁 Filesystem & Path Traversal Protections

Waddle's Rust backend (`src-tauri/src/lib.rs`) enforces strict validation on all filesystem operations (`read_file`, `write_file`, `create_file`, `delete_entry`, `rename_entry`).

### 1. Prefix-Matched System Directory Guard
Waddle uses canonical path prefix matching (`canonical.starts_with(sys_dir)`) to prohibit writing to or deleting files within critical Linux system paths:
- `/etc`
- `/usr`
- `/bin` & `/sbin`
- `/boot`
- `/lib`, `/lib64`, & `/lib32`
- `/sys` & `/proc`
- `/dev`
- `/root`
- `/run`

*Note: Prefix matching guarantees that nested files and subdirectories (e.g. `/etc/nginx/nginx.conf` or `/usr/local/bin`) cannot be tampered with via symlink traversal or relative path manipulation.*

### 2. User Credential & Secret Protection
To prevent accidental exposure or malicious script extraction, Waddle completely blocks unauthorized reading, writing, and deletion of:
- **SSH Private Keys**: All private key files in `~/.ssh/` (standard names like `id_rsa`, `id_ed25519` as well as custom-named keys) are blocked from direct reading. Only safe files (`config`, `known_hosts*`, `authorized_keys*`, `*.pub`) can be opened in the embedded editor. Writing and deletion in `~/.ssh/` are blocked unconditionally.
- **GPG Private Keys**: `~/.gnupg/private-keys-v1.d/` and keyring stores
- **System Keyrings**: `~/.local/share/keyrings/` (reading, writing, and deletion strictly disallowed)
- **Shell Configuration Files**: `~/.bashrc`, `~/.bash_profile`, `~/.bash_login`, `~/.zshrc`, `~/.zprofile`, `~/.zshenv`, `~/.profile`
- **Config Root Protection**: Deletion of the `~/.config` root directory is strictly prohibited.

### 3. Advance Path Validation
Path validation is performed **before** checking file existence or invoking underlying system calls, preventing path probing and information disclosure attacks.

### 4. Large Directory Bounded Pagination (Client DoS Prevention)
Browsing massive directories (such as `node_modules` or system libraries with tens of thousands of entries) could cause client-side WebKitGTK DOM memory exhaustion and application hangs. Waddle's `read_directory` backend command enforces an initial hard cap of 500 entries with explicit pagination metadata (`DirectoryListing { entries, total_count, has_more }`). Clients must explicitly request user-driven incremental pagination (`limit`), preventing automated or accidental memory exhaustion DoS attacks.

### 5. Embedded Code Editor Security Boundaries & Non-Privileged Execution
- **Strict Non-Privileged Operation**: Root privilege escalation or execution (`libc::geteuid() == 0`) inside the editor is completely prohibited (`[権限エラー] エディタ内での root 権限操作（sudo等）は禁止されています。ターミナルをご利用ください。`).
- **Owner UID & `$HOME` Boundary Verification**: Editing and saving are strictly limited to files whose canonical real path resides under `$HOME` and whose file owner UID (`MetadataExt::uid()`) matches the process effective UID (`$USER`).
- **Forced Read-Only Protection**: Files outside `$HOME` (e.g. `/etc/hosts`), files owned by other system users, or filesystem write-protected files are mounted as forced `🔒 Read-Only` with tooltip explanation, preventing accidental or unauthorized modifications.
- **Symlink Canonicalization & Escape Defense**: Every file open and save verifies the resolved canonical path (`std::fs::canonicalize`). Links targeting files outside `$HOME` are blocked as traversal escapes (`[保存不可] このファイルはシンボリックリンクですが、リンク先の実ファイル (<実体パス>) が $HOME 外にあるため編集・保存は遮断されました。`). Links targeting files inside `$HOME` are safely saved directly to the real target file while preserving symlink structure and original file permissions.
- **File Pre-Validation**: Files larger than 5MB are refused with guidance to use terminal `less`, and binary files (containing null bytes `\0` in the first 1KB) are blocked from editor mounting.
- **Dedicated AutoSave Sandbox & 6-Generation Rotation**: AutoSave caches uncommitted changes to `~/.cache/waddle/autosave/` (directory permission `0700`, file permission `0600`), replacing path separators with `%` and appending millisecond timestamps (e.g., `%home%user%.config%fish%config.fish.1726500000000`). Up to 6 generations per file are rotated automatically.
- **AutoSave Path Traversal & Escape Prevention**: Cache file retrieval (`editor_load_autosave_content`) strictly rejects traversal components (`..`, `/`, `\`) and validates that resolved canonical paths reside strictly inside the autosave cache directory. Stale cache cleanup is bounded by a 7-day TTL (604,800s) preventing unbounded disk consumption.

### 6. Real-Time Secret Masking & Non-Destructive Visual Redaction (`SecretMasker`)
Waddle incorporates a multi-layer credential defense engine (`src/services/secretMasker.ts`) guarding against accidental secret leakage across live terminal streams, embedded editor views, session history persistence, and AI copilot context exchanges.
- **Modern Credential Signature Matrix**:
  - **GitHub Personal Access Tokens**: Classic (`gh[pousr]_[A-Za-z0-9_]{36,255}`) and Fine-Grained PATs (`github_pat_[A-Za-z0-9_]{22,255}`).
  - **AI Model & LLM API Keys**: OpenAI Classic (`sk-[A-Za-z0-9]{32,50}`), OpenAI Project (`sk-proj-[A-Za-z0-9_-]{40,160}`), OpenAI Admin (`sk-admin-`), Anthropic Claude (`sk-ant-[A-Za-z0-9_-]{40,120}`), and Google Cloud / Gemini (`AIza[0-9A-Za-z_-]{30,40}`).
  - **Cloud Infrastructure**: AWS Access Key IDs (`AKIA[0-9A-Z]{16}`) and AWS Secret Access Keys (`AWS_SECRET_ACCESS_KEY` assignments and 40-character Base64 values).
  - **Team Collaboration Tokens**: Slack Bot (`xoxb-`), User (`xoxp-`), App (`xoxa-`), Refresh (`xoxr-`), and Workspace (`xoxs-`) tokens.
  - **HTTP Authorization & Web Tokens**: Bearer Tokens (`Authorization: Bearer <token>`) and bare JSON Web Tokens (`eyJ...`).
  - **Cryptographic Private Keys**: Multi-line private key blocks (`-----BEGIN ... PRIVATE KEY-----` to `-----END ... PRIVATE KEY-----`).
  - **Prefixed Environment Variable Key-Value Pairs**: Any assignment with keys matching `[A-Za-z0-9_]*(?:SECRET|API_?KEY|AUTH_?TOKEN|ACCESS_?TOKEN|PASSWORD|PASSWD)[A-Za-z0-9_]*` or standalone `token=`, `base_key=`.
- **Embedded Editor Zero-Mutation Visual Masking**:
  - **Zero-Mutation Guarantee**: Replacing raw strings with `[REDACTED]` in an active text editor would corrupt real configuration and `.env` files upon saving (`Ctrl+S`). Waddle preserves 100% of raw content in memory and on disk.
  - **Dual-Layer Monospace Overlay**: An overlay `<pre>` sits immediately above the Prism syntax highlight layer and below the transparent `<textarea>`. It renders bullets `•` with `#181e2e` background and `outline: 1px dashed rgba(239, 68, 68, 0.7)` strictly over secret ranges, while replacing non-secret text with whitespace spaces. Monospace cursor alignment and syntax coloring are preserved with zero pixel drift.
  - **Toolbar Detection Badge & Toggle**: Displays `[🛡️ N Secrets Detected]` in the editor header with an interactive Eye / Eye-Off toggle button, allowing safe inspection when necessary.
- **Session Command History & AI Context Sanitization**:
  - **Storage Sanitization**: Commands and output snippets are automatically processed through `maskSecrets()` before serialization to browser `localStorage`.
  - **AI Copilot Boundaries**: Prior command context (`recent_command`) and output (`recent_output`) are sanitized before dispatching prompt streams to local Ollama endpoints. Chat export files (Markdown/JSON) are also redacted.

---

## ⚡ PTY Flow Control & Memory Exhaustion Defense

Terminal emulators are susceptible to Denial of Service (DoS) attacks when untrusted processes generate unbounded output streams at maximum CPU speed (e.g., `yes`, unbuffered `cat /dev/urandom`, or infinite loops). Without flow control, output saturates IPC queues and browser buffers, consuming gigabytes of RAM and locking up the UI thread.

### 1. Kernel-Cooperative Backpressure Flow Control (`pause_pty` / `resume_pty`)
- **Queue-Depth Monitoring**: The terminal view constantly monitors xterm.js unrendered buffer queue depth (`_pendingData`).
- **Producer Throttling**: When unrendered data exceeds **256 KB**, Waddle invokes `pause_pty`, suspending the Tokio PTY reader thread. Because the reader stops reading from the PTY master, the Linux kernel PTY master buffer (~64 KB) fills naturally.
- **Kernel-Level Process Blocking**: Once the kernel buffer is full, the Linux kernel automatically suspends the producer process in `TASK_INTERRUPTIBLE` sleep at the `write()` system call level. The process cannot generate any additional data until the buffer is drained.
- **Automatic Stream Resumption**: Once xterm.js renders the buffer and pending data drops below **64 KB**, Waddle calls `resume_pty`, awakening the reader thread.
- **Security & Resource Impact**: Physical memory is flat-capped at **266 MB–305 MB** (preventing runaway 1.5GB+ memory exhaustion) regardless of how fast or long the child process runs.

### 2. 0ms Instant `Ctrl+C` (SIGINT) Queue Purging
- When a user sends `\x03` (SIGINT), Waddle immediately zeroes xterm's internal `_writeBuffer`, `_callbacks`, and `_pendingData` in **0ms**.
- Saturated chunks in the PTY reader pipeline are discarded, and lagging IPC chunks (>256B) arriving within 150ms are dropped.
- Completely prevents the UI thread from locking up for 20–30 seconds while trying to render stale backlog after the user has already requested termination. Prompt returns within **60ms**, and CPU immediately drops to **0.7%–1.3%**.

### 3. Saturated Output Pacing
- The PTY reader paces continuous 32KB saturated bursts at 16–20ms (60 FPS) to ensure the WebKitGTK rendering pipeline remains responsive to user interaction and window events at all times.

---

## 🤖 AI Safety & Prompt Injection Defenses

### 1. Delimiter Escaping for Indirect Prompt Injections
Terminal outputs may contain untrusted data (e.g., outputs from `curl`, malicious log files, or adversarial Git commit messages) designed to manipulate the LLM.

Waddle wraps untrusted terminal outputs in explicit XML boundaries:
```
<untrusted_terminal_output>
[Raw terminal stream with escaped delimiters]
</untrusted_terminal_output>
```
Any raw occurrences of `<untrusted_terminal_output>` or `</untrusted_terminal_output>` (including case-insensitive variants like `</UNTRUSTED_TERMINAL_OUTPUT>` and internal whitespace variations like `</ untrusted_terminal_output >`) are sanitized via regex `(?i)</?\s*untrusted_terminal_output\s*>` to `[untrusted_tag_escaped]` before delivery to Ollama, completely neutralizing prompt breakout attempts.

### 2. Context Metadata Sanitization
Git branch names, recent command strings, and current working directory paths are sanitized to strip ANSI control sequences, shell escapes, and prompt injection delimiters before being assembled into system prompts.

---

## ⚠️ Word-Boundary Dangerous Command Interception

Waddle implements a deterministic command interception engine shared between the Rust backend (`src-tauri/src/ai.rs`) and the React frontend (`DangerousCommandModal.tsx`).

### Word-Boundary Precision Matching
Regex patterns utilize exact word boundary checks (`\b`) to eliminate false positives on harmless commands or variable names (e.g., `echo 'imparted wisdom'` or variables named `format_disk`).

### Intercepted Operations

| Category | Flagged Patterns / Commands |
| :--- | :--- |
| **Filesystem Deletion & Truncation** | `rm`, `rmdir`, `find ... -delete`, `find ... -exec rm`, `truncate -s 0`, `shutil.rmtree` |
| **Destructive Git Operations** | `git clean -f`, `git clean -fdx`, `git reset --hard`, `git push --force`, `git push --delete`, `git branch -D` |
| **Process Substitution & Dynamic Eval** | `bash <(`, `sh <(`, `zsh <(`, `eval "$(` |
| **Disk & Partition Manipulation** | `mkfs`, `dd if=`, `fdisk`, `parted`, `gdisk`, `wipefs`, `shred`, `mkswap`, `cryptsetup` |
| **Dangerous Redirections & Permissions** | `> /dev/`, `> /etc/`, `> /boot/`, `chmod -R`, `chmod 777`, `chown -R`, `iptables -F`, `ufw disable` |
| **System Shutdown & Fork Bombs** | `reboot`, `shutdown`, `poweroff`, `init 0`, `init 6`, `:(){ :|:& };:` |
| **Piped Script Execution** | `\| python`, `\| python3`, `\| bash`, `\| sh`, `\| zsh`, `\| perl`, `\| ruby`, `python <(...)` |

### User Intervention Options
When an intercepted command is generated by AI or triggered from the editor, Waddle suspends execution and displays an alert modal:
1. **Confirm & Execute**: Acknowledges the danger and runs the command.
2. **Safe Insert (Without Enter)**: Pastes the command into the prompt for manual inspection without executing.
3. **Cancel**: Safely drops the command.

---

## 🌐 Network Isolation & Content Security Policy (CSP)

### 1. Webview CSP
Waddle's `tauri.conf.json` enforces a restrictive Content Security Policy:
```
default-src 'self';
connect-src 'self' http://localhost:11434 https://github.com https://api.github.com;
img-src 'self' asset: https: data:;
style-src 'self' 'unsafe-inline';
font-src 'self' asset: data:;
```
- Arbitrary script injection and unauthorized third-party telemetry domains are blocked by the Webview engine.
- External connections are restricted exclusively to the local Ollama instance and GitHub APIs (when Git features are active).

### 2. Scoped Asset Protocol
Tauri's `assetProtocol.scope` is restricted to:
- `$CONFIG/waddle/**/*`
- `$PICTURE/**/*`
- `$DOWNLOAD/**/*`

Broad `$CONFIG/**/*` access is completely disallowed, shielding sensitive application data (e.g. browser profiles, Slack tokens, AWS credentials) from the asset server.

### 3. Remote Ollama Warning Banner
If an external or remote endpoint is configured instead of `localhost` / `127.0.0.1`, Waddle displays an amber warning banner in the Settings modal reminding users that data will traverse an external network.

### 4. GitHub-Only Push/Pull Policy
When the GitHub restriction policy is enabled, Waddle inspects `git remote -v` using strict host validation (`is_github_host`) before executing `git push` or `git pull`.
- Host must strictly match `github.com`, `gist.github.com`, or `*.github.io` (via SSH `git@github.com:...` or HTTPS/SSH URLs).
- Subdomain spoofing (e.g. `https://github.com.attacker.com/repo.git`) and path-embedded trick URLs (e.g. `https://attacker.com/user/github.com.git`) are definitively rejected.
- If the remote targets an external non-GitHub domain (e.g. GitLab, Bitbucket, or an unauthorized host), the operation is blocked to protect proprietary code.

---

## 🖼️ Wallpaper Binary Header Validation

All wallpaper uploads must pass binary magic byte inspection before being stored in `~/.config/waddle/wallpapers/`:
- **PNG**: `89 50 4E 47 0D 0A 1A 0A`
- **JPEG**: `FF D8 FF`
- **WebP**: `52 49 46 46 ... 57 45 42 50`
- **GIF**: `47 49 46 38`
- **BMP**: `42 4D`
- **SVG**: Valid XML header containing `<svg`

Executable scripts, shell payloads, or ELF binaries disguised with image extensions are rejected.

---

## 🖼️ Kitty Graphics Protocol Security & Resource Guards

The Kitty Graphics Protocol subsystem is hardened with multiple layers of sandboxing and resource limiters to prevent arbitrary file access, terminal denial-of-service, and GPU memory exhaustion:

### 1. Local & Temporary File Sandboxing (`t=f`, `t=t`)
- **Restricted Sandbox Directory (`t=f`)**: Local file loading via `t=f` is strictly restricted to **`$HOME/Pictures`** (and its subdirectories) by default.
- **Temporary File Isolation & Zero-Leak Auto-Deletion (`t=t`)**: Temporary file transmission via `t=t` is permitted only within system temp directories (`std::env::temp_dir()`, `/tmp`, `/var/tmp`) and the allowed directory. The PTY reader thread (`src-tauri/src/pty.rs`) intercepts `t=t` commands immediately upon arrival, reading and unlinking the file from disk via `std::fs::remove_file` in Rust memory before DSR response dispatch. Rewriting the payload to Base64 inline data (`t=d`) completely eliminates file deletion race conditions (`ENOENT`) and guarantees zero residual disk files. Crucially, if the file exceeds the maximum payload size (`EFBIG`), it is still deleted immediately from disk to prevent storage exhaustion.
- **Backend Path Canonicalization**: Enforced exclusively in Rust (`src-tauri/src/kitty.rs`) using `std::fs::canonicalize`.
- **Symlink & Traversal Escape Prevention**: Path traversal attempts using relative segments (`../`) or symlinks pointing outside the sandbox or into sensitive directories (such as `~/.ssh`, `/etc`, `/usr`, `/root`) are strictly rejected with `EACCES` or `ENOENT`.
- **System Root Protection**: The configuration manager and backend actively disallow selecting system-critical directories (`/`, `/etc`, `/usr`, `/dev`, `/proc`, `/sys`, `~/.ssh`) as the allowed directory.

### 2. Decompression Bomb & Resolution Limits
- **Max Image Dimensions**: Single image resolution is capped at **4096 × 4096 px** by default (configurable between 1024 and 8192 px).
- **Header Pre-Inspection**: PNG `IHDR` chunk and JPEG `SOF` segments are parsed directly from raw binary headers before full image memory allocation. Oversized images are immediately rejected with `EBADMSG`.
- **Zlib / Deflate Decompression Guard (`o=z`)**: Compressed payloads are streamed through Web Standard `DecompressionStream` with chunk-by-chunk cumulative byte accounting. If decompressed output exceeds `maxPayloadBytes`, decompression is aborted immediately (`reader.cancel()`) before uncompressed buffers are allocated, preventing zip-bomb memory exhaustion attacks.
- **Base64 Payload Limit & Parser Buffer Cap**: Cumulative payload for single requests or chunked streams (`m=1`) is capped at **16 MB** (configurable between 4 and 64 MB). In addition, incomplete APC streams lacking terminators (`\x1b\` or `\x07`) are bounded by `maxPayloadBytes` and safely flushed, preventing memory leaks on corrupted inputs.

### 3. Texture Cache & GPU VRAM Management (LRU)
- **VRAM Upper Bound**: Texture cache is capped at **256 MB** (RGBA 4 bytes/px, configurable between 64 and 1024 MB).
- **LRU Eviction**: Oldest textures are automatically evicted when cache limits are reached.
- **Explicit Memory Reclamation**: On eviction or image deletion (`a=d`), `ImageBitmap.close()` is explicitly invoked to immediately release GPU VRAM and WebKitGTK graphics buffers, preventing memory leaks.

### 4. PTY Stream Isolation & Command Serialization
- **PTY Stream Separation & Query Interception**: APC escape sequences (`\x1b_G...`) are intercepted by a streaming parser before terminal rendering. In addition, capability probes (`a=q`) from tools like Fastfetch are intercepted directly in the Rust PTY reader thread and answered immediately (`OK`) while being stripped from the terminal display stream, preventing escape sequence leakage or terminal parser stall.
- **PTY Window Pixel Sizing (`TIOCGWINSZ`)**: PTY windows are initialized and resized with non-zero pixel dimensions (`cols * 9`, `rows * 18`) to prevent client tool crashes or zero-division errors when querying cell pixel ratios.
- **Terminal Shell Escape Protection & TUI Key Storm Prevention (`q` Quiet Parameter)**: Adheres strictly to the Kitty quiet protocol.
  - Draw commands with an explicit image ID (`a=T, i=<id>`) receive an immediate `OK` reply to unblock synchronous clients (`ranger`).
  - Delete (`a=d`), place (`a=p`), and frame (`a=f`) operations are strictly silent on success by default. Because tools like `ranger`'s `clear()` do not read terminal replies, suppressing redundant `OK` responses prevents lingering escape sequences in stdin that curses would misinterpret as rapid keyboard input, completely eliminating screen flicker loops and UI hangs.
- **FIFO Command Serialization & In-Flight Tracking**: Commands are processed sequentially via a FIFO Promise queue, and placement commands (`a=p`) await in-flight decodes (`a=t`), preventing race conditions, cache desynchronization, and state manipulation vulnerabilities.

### 5. Buffer Occupancy Bounds & Cursor Integrity
- **Cell Dimension Clamping**: Allocated placeholder grid spans (`cols`, `rows`) are bounded against terminal geometries (`cols <= termCols`, `rows <= termRows * 2`). Images requesting excessive dimensions cannot cause out-of-bounds cursor jumps, integer overflow, or runaway line allocation.
- **Scrollback Buffer Stability**: Grid placeholder cells (`\r\n` and spaces) are driven through standard terminal VT linefeeds without artificial buffer displacement, maintaining stable scrollback indices (`baseY + cursorY`) and preventing screen corruption or desynchronization between canvas overlay rendering and terminal text.
- **Saved Cursor Isolation (`C=1`)**: When `C=1` is specified, the terminal cursor is protected via standard VT save/restore sequences (`\x1b[s` / `\x1b[u`), preventing runaway cursor positioning and arbitrary screen state corruption across command outputs.
### 6. Intentional Disabling of POSIX Shared Memory (`t=s`, `/dev/shm`) & Threat Defense
- **Threat Model for Shared Memory**:
  - POSIX Shared Memory (`/dev/shm`) on Linux is accessible to all processes running under the same UID.
  - Allowing untrusted terminal processes to pass arbitrary shared memory object names to Waddle creates critical attack vectors: cross-process memory inspection, symlink traversal, and confused deputy file access.
  - Furthermore, malicious scripts could allocate massive, un-reclaimed memory blocks via `shm_open`, exhausting system RAM and triggering OS-level Out-Of-Memory (OOM) denial-of-service crashes.
- **Architectural Security Trade-Off (Video Playback Limitation)**:
  - Guided by Waddle's privacy-first, zero-leakage security model, **POSIX Shared Memory transmission (`t=s`) is intentionally unsupported and disallowed**, and probe queries for `t=s` are safely refused.
  - Consequently, raw uncompressed high-FPS video streaming (such as `mpv --vo=kitty --vo-kitty-use-shm=yes`) is deliberately omitted in favor of ironclad sandbox security (resulting in smooth audio playback only, or jittery high-bandwidth Base64 streaming). Waddle is an engineering workstation, not a video player.
  - In contrast, static images, animated GIFs, `kitten icat`, `kitten diff`, and file manager previews render with 100% graphical fidelity via secure direct Base64 (`t=d`) and sandboxed temporary files (`t=t`, immediately unlinked from disk upon reading, with strict file size and dimension limits).

---

## 🔧 Subprocess Hardening

- **Git Lock Safety**: Background polling runs with `GIT_OPTIONAL_LOCKS=0` and `--no-optional-locks` to prevent index file conflicts.
- **Non-Interactive Execution**: Git subprocesses execute with `GIT_TERMINAL_PROMPT=0` to ensure operations fail safely with diagnostic feedback rather than hanging in the background.
- **Trusted Paths**: Native dialog callers verify absolute paths in `/usr/bin/` (e.g., `/usr/bin/zenity`, `/usr/bin/kdialog`).

---

## 📬 Reporting a Vulnerability

If you discover a security vulnerability within Waddle, please report it responsibly:
- **Email**: Create a confidential issue on the repository or contact the maintainer directly.
- **Scope**: Please include detailed steps to reproduce, sample payloads, and the affected version/environment.
- **Response**: Reports will be acknowledged within 48 hours, and security patches prioritized.

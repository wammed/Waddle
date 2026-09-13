# 🌟 Waddle Feature Guide & Specifications

Welcome to the comprehensive feature guide for **Waddle**, the AI-integrated, privacy-first Linux terminal emulator. This document provides an exhaustive breakdown of Waddle's 15 core features, their low-level internal mechanisms, and the complete keybindings reference.

---

## 📑 Table of Contents

1. [🤖 Natural Language Command Generator (`Ctrl + K`)](#1--natural-language-command-generator-ctrl--k)
2. [🖼️ Custom Background Wallpapers & Native File Picker (`Ctrl + ,`)](#2-️-custom-background-wallpapers--native-file-picker-ctrl--)
3. [📂 Left Sidebar: File Tree Explorer (`Ctrl + B`)](#3--left-sidebar-file-tree-explorer-ctrl--b)
4. [📝 Embedded Lightweight Code Editor & AI Code Assistant (`Ctrl + E`)](#4--embedded-lightweight-code-editor--ai-code-assistant-ctrl--e)
5. [🪟 Flexible Multi-Pane Split & Draggable Resizing (1 to 4 Panes)](#5--flexible-multi-pane-split--draggable-resizing-1-to-4-panes)
6. [🔎 In-Terminal Log Search (`Ctrl + Shift + F` / `Ctrl + F`)](#6--in-terminal-log-search-ctrl--shift--f--ctrl--f)
7. [🚨 Intelligent Error Diagnosis & Smart False-Positive Suppression](#7--intelligent-error-diagnosis--smart-false-positive-suppression)
8. [💬 Context-Aware AI Copilot Sidebar & Chat Session Export](#8--context-aware-ai-copilot-sidebar--chat-session-export)
9. [🦙 Auto-Discovery of Local Ollama Models & Line-Buffered Streaming](#9--auto-discovery-of-local-ollama-models--line-buffered-streaming)
10. [⚡ High-Performance PTY & Zero-Lag 2D Canvas Acceleration](#10--high-performance-pty--zero-lag-2d-canvas-acceleration)
11. [🎨 22 Premium Themes & High-Voltage Neon Collection](#11--22-premium-themes--high-voltage-neon-collection)
12. [🌐 Multi-Language Support (English US / UK, 日本語)](#12--multi-language-support-english-us--uk-日本語)
13. [🛡️ Hardened Multi-Layer Security & AI Safety Guardrails](#13-️-hardened-multi-layer-security--ai-safety-guardrails)
14. [🐙 Git & GitHub Integration, Local AI Commits & Push/Pull Policy](#14--git--github-integration-local-ai-commits--pushpull-policy)
15. [🔄 One-Click Workspace Refresh & Safe Confirmation Dialog](#15--one-click-workspace-refresh--safe-confirmation-dialog)
16. [🖼️ Kitty Graphics Protocol Support & Strict Security Sandboxing](#16--kitty-graphics-protocol-support--strict-security-sandboxing)
17. [🛡️ Real-Time Secret Masking (`SecretMasker`)](#17--real-time-secret-masking-secretmasker)
18. [⏳ Session Time Travel & Snapshot History (`Ctrl + Shift + H`)](#18--session-time-travel--snapshot-history-ctrl--shift--h)
19. [📊 Rich Data Visualizer (Markdown / CSV / JSON Preview)](#19--rich-data-visualizer-markdown--csv--json-preview)
20. [🐕 Autonomous AI Error Watchdog & 1-Click Fix](#20--autonomous-ai-error-watchdog--1-click-fix)
21. [🔗 Visual Pipeline Builder (`Ctrl + Shift + P`)](#21--visual-pipeline-builder-ctrl--shift--p)
22. [📜 Project-Specific & Global Common AI Rules (`.waddle/` & `~/.config/waddle/`)](#22--project-specific--global-common-ai-rules-waddle--configwaddle)
23. [⌨️ Complete Keybindings Reference](#️-complete-keybindings-reference)

---

### 1. 🤖 Natural Language Command Generator (`Ctrl + K`)

- **Overview**: Instant natural language to Linux command synthesis powered entirely by your local Ollama engine.
- **Workflow**:
  - Press `Ctrl + K` to open the modal overlay from anywhere in Waddle.
  - Type prompt in English or Japanese (e.g., *"Find all .log files larger than 100MB modified in the last 7 days"* or *"ポート8080を使っているプロセスを特定して強制終了"*).
  - The model streams the recommended shell command, an explanation of its flags, and potential caveats.
- **Safety Badges**:
  - The generated command is analyzed in real time. Commands containing destructive operations (e.g., `rm -rf`, disk wipes, force git pushes) trigger danger warning badges.
- **Action Hotkeys**:
  - `Enter`: Safe insert directly into active terminal prompt (without executing, allowing review and editing).
  - `Ctrl + Enter`: Immediate execution in active terminal.
  - `Esc`: Close modal without modifying terminal state.

---

### 2. 🖼️ Custom Background Wallpapers & Native File Picker (`Ctrl + ,`)

- **Native Linux File Dialog**:
  - Integration with Linux desktop environments (GNOME, KDE Plasma, Hyprland, Sway) using native file choosers (`zenity` / `kdialog`) via verified `/usr/bin/` paths.
- **Binary Header & Magic Byte Verification**:
  - Uploaded images undergo magic byte inspection in Rust before acceptance:
    - PNG (`89 50 4E 47 0D 0A 1A 0A`)
    - JPEG (`FF D8 FF`)
    - WebP (`52 49 46 46 ... 57 45 42 50`)
    - GIF (`47 49 46 38`)
    - BMP (`42 4D`)
    - SVG (XML header check `<svg`)
  - Prevents disguised scripts or executables from being stored.
- **Optimized Asset Protocol**:
  - Saved files are written directly to `~/.config/waddle/wallpapers/` and referenced via Tauri v2's secure `protocol-asset` URL scheme.
  - Keeps `~/.config/waddle/config.json` featherlight (~480 bytes) while automatically migrating legacy Base64 wallpaper strings.
- **Sub-Millisecond 0ms Startup**:
  - Asynchronous background image decoding (`decoding="async"`, `loading="eager"`) off the main thread with GPU hardware isolation (`contain: strict`).
- **Drag & Drop Wallpaper Application (`TC-THM-03`)**:
  - Drag and drop image files directly from your desktop or file manager into the dedicated drop zone in Settings (`getCurrentWebview().onDragDropEvent`).
- **60 FPS Real-Time Live Preview (`TC-THM-04`)**:
  - Slider adjustments for opacity (10%–100%) and frosted glass blur (0–20px) bind directly to CSS variables (`--live-wallpaper-opacity`, `--live-wallpaper-blur`) in real time behind the modal.
  - Automated contrast overlay (`rgba(10, 14, 22, alpha)`) ensures crisp terminal text readability across all background images.

---

### 3. 📂 Left Sidebar: File Tree Explorer (`Ctrl + B`)

- **Real-Time Directory Tracking**:
  - Reads the active terminal's current working directory directly from the Linux `/proc/<pid>/cwd` symlink.
  - Automatically loads and synchronizes file listings when switching tabs or navigating (`cd`).
- **Rich Visual Elements**:
  - **Language Badges**: Color-coded badges for 20+ file formats (TS, TSX, RS, PY, JSON, MD, CSS, HTML, SH, YML, TOML, SQL, GO, C, CPP, IMG, ZIP, CFG, LOCK).
  - **Interactive Breadcrumbs**: Visual path segments allowing one-click navigation to any parent folder.
  - **Tree Indent Guides**: Structural guide lines indicating folder nesting levels.
  - **Item Metadata & Dynamic Count Badges**: Displays formatted file sizes (e.g., `4.2 KB`) and folder child counts (e.g., `(12)` or `(500/600)` when capped).
- **Large Directory Safety Guard & Dynamic Pagination (`TC-FILE-04`)**:
  - Automatically caps directory listing to an initial safe limit of 500 items to prevent WebKitGTK DOM memory bloat when expanding massive directories (`node_modules`, `/usr/bin`).
  - Folders with remaining items display a cyber-styled interactive button `[+] Load more (N remaining)...` at the bottom of the listing.
  - Clicking "Load more" dynamically loads the next 500 items (+500 -> 1000 -> 1500...) on demand without UI freezes.
- **Embedded Search & Hidden File Filtering**:
  - Real-time search filter for file names.
  - Toggle dotfiles (`.gitignore`, `.env`, etc.) with one click.
- **Context Menu Actions**:
  - Right-click any file or folder to:
    - 📝 Open in Embedded Editor
    - 💻 Insert relative or absolute path into terminal
    - 📋 Copy relative or absolute path to clipboard
    - 📁 Reveal in OS file manager (`reveal_in_file_manager` via `xdg-open`)
    - ✏️ Inline rename (`rename_entry` with collision checks)
    - 🗑️ Safe deletion with confirmation
    - ➕ Create new file or folder

---

### 4. 📝 Embedded Lightweight Code Editor & AI Code Assistant (`Ctrl + E`)

- **Embedded Split Workspace**:
  - Toggles a side-by-side editing canvas directly within Waddle without switching windows.
- **Prism.js Syntax Highlighting (`TC-FILE-07`)**:
  - Integrated tokenization and color highlighting for 15+ programming languages (TS/JS, Rust, Python, Bash, JSON, Markdown, CSS, HTML, C/C++, etc.).
  - Dual-layer composition: background syntax-colored `<pre>` layer aligned pixel-perfectly underneath a transparent editable `<textarea>` (`-webkit-text-fill-color: transparent !important;`), delivering silky-smooth typing with full syntax rendering.
- **File Management**:
  - Quick open from working directory, path input, and shortcut saving (`Ctrl + S`).
- **Run in Terminal**:
  - Executes current file or selected buffer in the active terminal session.
  - Intercepted by `DangerousCommandModal` if script content matches destructive patterns.
- **AI Code Edit (`Ctrl + Shift + K`)**:
  - Instruct local Ollama models to refactor code, generate tests, add docstrings, or fix errors directly in the editor buffer.

---

### 5. 🪟 Flexible Multi-Pane Split & Draggable Resizing (1 to 4 Panes)

- **Independent Pseudo-Terminals**:
  - Split any tab into 2, 3, or 4 independent terminals. Each pane owns its PTY session, CWD tracking, and Git status monitoring.
- **10 Visual Layout Presets**:
  - **Single (1 Pane)**: `single`
  - **2-Pane**: Side-by-Side (`split-2-h`), Top & Bottom (`split-2-v`)
  - **3-Pane**: Left Main + 2 Right (`split-3-left-main`), Top Main + 2 Bottom (`split-3-top-main`), 3 Columns (`split-3-h`), 3 Rows (`split-3-v`)
  - **4-Pane**: 2×2 Grid (`grid-4`), Left Main + 3 Right (`split-4-left-main`), 4 Columns (`split-4-h`)
- **Draggable Neon Dividers**:
  - 16px wide grab hitboxes with luminous hover indicators.
  - Adjust pane split ratios dynamically from 15% to 85%.
  - Zero-flicker dragging: preserves xterm canvas during drag and refits via `@xterm/addon-fit` on mouse release.
- **Keyboard Split Resizing & Swapping**:
  - `Ctrl + Alt + Arrow Keys`: Adjust active split ratio in 5% increments.
  - `Ctrl + Shift + S`: Instant pane swapping (rotates positions among split panes).
  - `Alt + Z`: Zoom active pane to full-screen; press again to restore layout.

---

### 6. 🔎 In-Terminal Log Search (`Ctrl + Shift + F` / `Ctrl + F`)

- **Hardware-Accelerated Scrollback Search**:
  - Powered by `@xterm/addon-search`, enabling instant searching through 10,000+ lines of scrollback buffer.
- **Floating Search Bar**:
  - Glassmorphic top-right search overlay.
  - Navigate matches using `Enter` (next match) and `Shift + Enter` (previous match) or arrow buttons.
  - Search controls: Case-sensitive (`Aa`) and regular expression (`.*`) toggles.
  - Instant dismissal with `Esc`.

---

### 7. 🚨 Intelligent Error Diagnosis & Smart False-Positive Suppression

- **Automated Failure Detection**:
  - Monitors command execution and stdout/stderr streams for shell error signatures (`command not found`, `Permission denied`, `fatal: not a git repository`, non-zero exit codes).
- **False-Positive Noise Filter**:
  - Automatically suppresses alerts for informational and search commands (`grep`, `find`, `cat`, `echo`, `diff`, `git log`).
  - Prevents alert loops by tracking duplicate error outputs.
- **One-Click Local AI Remedy**:
  - Action banner displays error summary with a single-click "Analyze Error" button.
  - Ollama analyzes the exact failure reason and proposes a verified remediation command ready for execution.

---

### 8. 💬 Context-Aware AI Copilot Sidebar & Chat Session Export

- **Deep Context Awareness**:
  - Automatically packages system metadata into prompt context:
    - Operating System & Shell type
    - Current Working Directory (`pwd`)
    - Git Branch & Staged/Unstaged counts
    - Recent executed commands and terminal output buffer
- **Interactive Assistance**:
  - One-click insertion, execution, or clipboard copying for generated code blocks.
- **Session Export**:
  - Export full chat transcripts with timestamps, prompt context, and code blocks to **Markdown (`.md`)** or **JSON (`.json`)**.

---

### 9. 🦙 Auto-Discovery of Local Ollama Models & Line-Buffered Streaming

- **Model Auto-Detection**:
  - Dynamically queries `http://localhost:11434/api/tags` to populate installed models (`llama3.2`, `qwen2.5-coder`, `deepseek-r1`, `codellama`, etc.).
- **Line-Buffered Chunk Assembler**:
  - HTTP chunks from Ollama are accumulated into a buffer across TCP packet boundaries.
  - Incomplete JSON lines are reconstructed before deserialization, completely eliminating dropped tokens or truncated responses.
- **64KB Chunk Buffer Guard**:
  - Enforces a 64KB line length limit in `stream_ollama` to guard against memory exhaustion from malformed streaming streams.
- **100% Offline**:
  - Zero telemetry, zero external API keys, zero cloud egress.

---

### 10. ⚡ High-Performance PTY & Zero-Lag 2D Canvas Acceleration

- **Rust PTY Engine**:
  - Built on `portable-pty` with asynchronous read loops on Tokio background threads.
- **Kernel-Cooperative Backpressure Flow Control (`pause_pty`/`resume_pty`) (`TC-PTY-02`, `TC-PERF-03`)**:
  - Actively monitors xterm.js unrendered buffer queue (`_pendingData`).
  - When pending data exceeds 256KB, invokes `pause_pty` to pause the Rust reader thread. The Linux kernel PTY master buffer (~64KB) fills naturally, causing the Linux kernel to suspend the producer process (`yes`, unbuffered stream) in `TASK_INTERRUPTIBLE` sleep.
  - Once xterm.js finishes rendering and drops below 64KB, invokes `resume_pty` to resume stream consumption.
  - **Result**: Keeps application resident memory (RES) flat-capped at **266MB–305MB** (reducing memory usage by ~80% from 1.5GB) without memory bloat or IPC queue saturation.
- **0ms Instant `Ctrl+C` Queue Purge**:
  - Upon receiving `\x03` (SIGINT), immediately purges xterm's internal `_writeBuffer` and callbacks in 0ms, and drops lagging IPC packets (>256B) arriving within 150ms.
  - Eliminates 20–30 second UI freezes, returning to the prompt within **60ms** while dropping CPU utilization from 231% to **0.7%–1.3%**.
- **60 FPS Saturated Output Pacing**:
  - Rust reader paces continuous 32KB saturated bursts at 16–20ms (60 FPS refresh rate) while maintaining instantaneous 0ms response for interactive commands (<32KB).
- **UTF-8 Multi-Byte Boundary Protection**:
  - Uses `std::str::from_utf8` validation with `valid_up_to` to carry incomplete multi-byte slices across read cycles, preventing `\u{FFFD}` glyph corruption for Japanese, CJK, and emojis.
- **Process Group Termination**:
  - Signals the entire process group (`-pid`) with `SIGHUP` and `SIGTERM`/`SIGKILL` on tab/pane close, guaranteeing zero zombie processes or orphaned background tasks.
- **2D Canvas Acceleration**:
  - Uses `@xterm/addon-canvas` for instant 0ms startup without GPU shader compilation pauses or WebKitGTK Wayland transparency stalls.
  - Supports `@xterm/addon-unicode11` (`allowProposedApi: true`) for accurate double-width emoji rendering (`TC-PTY-03`).

---

### 11. 🎨 22 Premium Themes & High-Voltage Neon Collection

- **22 Built-in Color Themes**:
  - **High-Voltage Neon Group (11 Themes)**:
    - *Neon Overdrive* (Cyberpunk Pink & Electric Cyan)
    - *Toxic Matrix* (Radioactive Fluorescent Lime & Emerald)
    - *Outrun Sunset* (Blazing Orange, Gold & Twilight)
    - *Electric Violet* (Blacklight Ultraviolet & Magenta)
    - *Neo Tokyo 2099* (Aggressive Laser Red & Gold)
    - *Acid Cyber* (Highlighter Acid Yellow & Lime)
    - *Miami Vice Neon* (Turquoise & Flamingo Pink)
    - *Laser Glitch* (Glitch Magenta & White Strobe)
    - *Plasma Cyan* (Extreme Luminescence Plasma Cyan & Sapphire)
    - *Cyberpunk 2077* (Night City Yellow & Cyan)
    - *Synthwave '84* (Retro 80s Neon Purple & Grid)
  - **Classic & Pro Group (11 Themes)**:
    - *Waddle Cyber (Default)*, *Tokyo Night*, *Catppuccin Mocha*, *Dracula*, *Nord (Arctic)*, *Gruvbox Dark*, *One Dark Pro*, *Rosé Pine*, *Monokai Pro*, *Solarized Dark*, *Midnight Abyss (OLED Pure Black #000000)*
- **Dynamic Glow Synchronization**:
  - Terminal ANSI colors and window UI elements (titlebar, tab borders, status bar, modal borders) synchronize their glow aura via dynamic CSS variables (`--accent-rgb`, `--border-active`).
- **Typography & Nerd Fonts**:
  - Presets for JetBrainsMono Nerd Font, MesloLGS NF, FiraCode Nerd Font, and Hack Nerd Font, with custom local font support.

---

### 12. 🌐 Multi-Language Support (English US / UK, 日本語)

- **Selectable UI Languages**:
  - English (US), English (GB / UK), and Japanese (日本語).
- **Comprehensive Coverage**:
  - All dialogs, settings, error banners, tooltips, file tree context menus, and diff viewers adapt in real time without restarting.
- **Persistence**:
  - Language selection is saved to `~/.config/waddle/config.json`.

---

### 13. 🛡️ Hardened Multi-Layer Security & AI Safety Guardrails

- **System Directory Prefix Protection & Virtual FS Isolation**:
  - Prefixed canonical path validation blocks writing or deletion in `/etc`, `/usr`, `/bin`, `/sbin`, `/boot`, `/lib`, `/sys`, `/proc`, `/dev`, `/root`, `/run`.
  - Directory listing and path traversal into virtual kernel mounts (`/proc`, `/sys`, `/dev`) are blocked at the backend to prevent host process reconnaissance.
- **Sensitive Credential Shield**:
  - Completely blocks reading, writing, and deletion of SSH private keys (`~/.ssh/id_rsa`, `id_ed25519`, etc.), GPG private keys (`~/.gnupg/private-keys-v1.d`), Linux keyrings (`~/.local/share/keyrings`), shell startup files (`.bashrc`, `.zshrc`, etc.), and `~/.config` root. Public keys (`.pub`) and `known_hosts` remain safely readable.
- **Ollama SSRF & Cloud Metadata Defense**:
  - `validate_ollama_endpoint` strictly blocks local link-local and cloud metadata addresses (`169.254.169.254`, IPv6 `[fd00:ec2::254]`), preventing SSRF attacks aimed at exfiltrating AWS/GCP/Azure instance IAM credentials.
- **Git Branch Ref Strict Sanitization**:
  - `git_checkout_branch` and `git_create_branch` sanitize branch arguments, strictly rejecting leading hyphens (preventing CLI option injection like `-D` or `--help`), control characters, spaces, and `..` path sequences.
- **Indirect Prompt Injection Defense**:
  - Terminal output is escaped with XML delimiter wrappers (`<untrusted_terminal_output>`) to neutralize prompt breakout attacks.
- **Word-Boundary Dangerous Command Interception**:
  - Accurate regex token checks intercept destructive commands (`rm`, `mkfs`, `fdisk`, `dd`, `git reset --hard`, `iptables -F`, etc.) before execution.
- **Webview CSP & Scoped Asset Protocol**:
  - Strict Content Security Policy confines networking to local Ollama and GitHub.
- *(For comprehensive security specifications, see [SECURITY.md](../SECURITY.md))*

---

### 14. 🐙 Git & GitHub Integration, Local AI Commits & Push/Pull Policy

- **Status Bar Quick Git Popover**:
  - Click the Git branch badge to toggle an interactive popover with branch checkout, ahead/behind tracking, and staged/unstaged file lists.
- **One-Click Push & Pull**:
  - Background asynchronous execution (`spawn_blocking`) with `GIT_TERMINAL_PROMPT=0` ensures GUI and terminal never freeze during network requests.
  - Animated count badges indicate ahead (`↑`) and behind (`↓`) commits.
- **Local AI Conventional Commit Generator**:
  - Local Ollama analyzes staged diffs to draft semantic commit messages (`feat: ...`, `fix: ...`).
- **Visual Syntax-Highlighted Diff Viewer**:
  - Inspect unified diffs with side-by-side line numbers and diff hunks.
  - Stage, unstage, or discard changes directly from the viewer.
- **GitHub-Only Security Policy**:
  - When enabled, blocks push/pull operations to non-GitHub remotes to protect proprietary code from being pushed to unapproved servers.

---

### 15. 🔄 One-Click Workspace Refresh & Safe Confirmation Dialog

- **Titlebar Refresh Button**:
  - Dedicated `RotateCcw` button in the titlebar between Layout selection and Settings.
- **Safe Confirmation Dialog (`RefreshConfirmModal`)**:
  - Mounted via React Portal (`createPortal(..., document.body)`) to ensure top-level display immune to titlebar drag events.
  - Clearly summarizes the reset action:
    - 📑 Close all tabs and split panes
    - ⚡ Terminate running terminal processes
    - 💾 Clear saved session state (`localStorage`)
    - 📁 Reset working directory to home folder
  - Amber warning box highlights loss of unsaved terminal outputs.
  - Keyboard accessible: `Escape` to cancel, `Enter` to confirm.
- **Thorough Reset**:
  - Safely closes all PTY process groups, deletes `waddle_session_state`, starts a fresh single tab in user home directory, and re-mounts the File Tree Sidebar with cleared cache.

---

### 16. 🖼️ Kitty Graphics Protocol Support & Strict Security Sandboxing

- **Overview**:
  - Full native support for the **Kitty Graphics Protocol** directly within Waddle's accelerated Canvas viewport, enabling inline image rendering and graphics manipulation from CLI and TUI tools such as `fastfetch`, `yazi`, and Neovim (`image.nvim`).
- **APC Escape Sequence Parsing & Stream Interception**:
  - State machine parser handles `\x1b_G<control_keys>;<payload>\x1b\` and `\x07` sequences.
  - Strips megabytes of Base64 graphics data from the PTY stream before reaching `@xterm/xterm`, preventing terminal freezing or DEC parser degradation.
  - Chunked transfer support: smoothly reassembles multi-chunk transmissions (`m=1` followed by `m=0`).
  - **Zero-Latency (0ms) PTY Capability Probe Handshake (`a=q`)**:
    - Rust PTY background reader directly intercepts capability queries (`\x1b_Gi=1,s=1,v=1,a=q;\x1b\` or any sequence with `a=q`) and writes `\x1b_Gi=<id>;ok\x1b\` back to child stdin with 0ms latency.
    - Eliminates query timeout issues in CLI tools (`fastfetch`, `chafa`, `timg`), ensuring tools never fall back to ASCII art.
    - Strips capability query sequences from terminal output before reaching frontend xterm.
    - PTY window size handling (`TIOCGWINSZ`) reports non-zero cell pixel dimensions (`cols * 9`, `rows * 18`) so CLI font dimension detection (`getCharacterPixelDimensions()`) succeeds.
  - Diagnostic logging: all incoming `\x1b_G` headers are logged on the Rust backend (`println!("[Kitty Graphics] Received header: {}", header)`).
- **Web Standard zlib / Deflate Decompression (`o=z`)**:
  - Full support for zlib-compressed payloads (`o=z`), used by tools like `fastfetch` (`"type": "kitty"`) to conserve terminal I/O bandwidth.
  - Built-in streaming decompression using native `DecompressionStream('deflate')` with fallback to `'deflate-raw'`.
  - Seamlessly decompresses compressed Base64 RGBA, RGB, or PNG streams before rasterization.
  - Strictly enforces cumulative decompression bomb limits (`maxPayloadBytes`, default 16 MB) to protect system memory.
- **Quiet (`q`) Parameter Specification Compliance**:
  - Full compliance with the Kitty Graphics quiet response protocol to prevent PTY escape sequence leakage into the user's shell:
    - `q=0` or omitted: Completely silent. No ACK/NAK or error response is written back to PTY stdin.
    - `q=1`: Errors only. Failures (`EBADMSG`, `ENOENT`, `EACCES`, `EFBIG`) return diagnostic responses; successful operations (`OK`) remain silent.
    - `q=2`: Verbose. Both `OK` and error responses are written back.
    - Capability query probe (`a=q` with `s=1,v=1`): Always sends `\x1b_Gi=<id>;ok\x1b\` regardless of quiet level to ensure proper tool handshake.
- **Temporary File Auto-Deletion & Sandboxing (`t=t`)**:
  - CLI/TUI tools (such as Yazi and Neovim) transmit temporary files via `t=t`.
  - Waddle loads the file into memory and immediately unlinks it from disk (`std::fs::remove_file`) before dimension verification, preventing disk space accumulation or resource leaks even if decompression bomb limits fail.
  - Temporary files are securely restricted to system temp directories (`std::env::temp_dir()`, `/tmp`, `/var/tmp`) and the configured allowed directory, with sensitive system locations (`/etc`, `/root`, `~/.ssh`) strictly blocked.
- **Asynchronous Race Condition Elimination (`a=t` vs `a=p`)**:
  - Serialized command execution via a FIFO Promise queue (`commandQueue`) ensures commands from PTY streams are processed in strict chronological order.
  - In-flight image loading tracking (`loadingImages: Map<number, Promise<void>>`) ensures that immediate placement commands (`a=p`) cleanly await pending image decoding (`a=t`) before cache inspection, eliminating race-induced `ENOENT: Image ID not found in cache` errors.
- **Strict Security Sandboxing & Directory Jail (`t=f`)**:
  - Local file reading via `t=f` is strictly restricted to `$HOME/Pictures` (and its subdirectories) by default.
  - Rust backend enforces path canonicalization (`std::fs::canonicalize`).
  - Directory traversal (`../`) and symbolic links pointing outside the sandbox (such as `~/.ssh`, `/etc`, or `/usr`) are actively rejected with `EACCES` / `ENOENT`.
  - Configurable in Settings (`Ctrl + ,`), with real-time validation against sensitive system paths.
- **Decompression Bomb Defense**:
  - Image dimensions are capped at 4096×4096 px by default (configurable 1024–8192 px).
  - PNG IHDR and JPEG SOF headers are inspected before full memory allocation. Oversized images are discarded immediately with `EBADMSG`.
  - Single request cumulative Base64 payload is limited to 16 MB (configurable 4–64 MB).
- **VRAM & Memory Management (LRU Cache)**:
  - Cache size is capped at 256 MB (configurable 64–1024 MB).
  - When the upper limit is reached, least recently used textures are evicted.
  - Explicitly invokes `ImageBitmap.close()` upon eviction or image deletion (`a=d`), preventing GPU/VRAM and WebKitGTK memory leaks.
- **Cursor Advance & Buffer Space Allocation (`C` Key)**:
  - Full compliance with the Kitty Graphics cursor movement policy:
    - `C=0` (or omitted, default): Cursor advances to the right edge of the image on its final row (`start_col + cols` at row `start_row + rows - 1`). If the image reaches or exceeds terminal width, it wraps to column 0 on the line below. Text following the image (e.g. `<- TEXT HERE`) renders at the right of the image on the last row without overlapping image pixels, and shell prompts drop cleanly below the image area.
    - `C=1`: Cursor does not move; its position is preserved at `(start_col, start_row)`. When running TUI applications (such as `yazi`) or in the Alternate Screen buffer, zero buffer space and zero linefeeds (`\r\n`) are injected, completely preventing accidental scrolling and row-shift overlapping.
- **Placeholder Cell Allocation & Automatic Bottom Scrolling (`C=0` Standard Screen)**:
  - In standard CLI workflows (`fastfetch`, `kitten icat`), automatically allocates the `cols x rows` grid in xterm's buffer at the exact stream position of `\x1b_G...` using space characters and linefeeds (`\r\n`).
  - When an image is placed near the bottom of the screen (`start_row + rows > termRows`), linefeeds trigger native terminal scrolling, shifting preceding lines into scrollback and ensuring the full image height is visible without clipping.
- **Partial Clipping & Scissoring (AABB Intersection & UV Mapping)**:
  - Supports smooth partial rendering when multi-row images cross the top or bottom viewport boundaries:
    - **AABB Intersection**: Checks overlap between the image bounds `[col..col+c, row..row+r]` and the visible terminal viewport `[0..termCols, 0..termRows]`. If even a single row or column is visible, the image remains actively rendered rather than popping out of existence.
    - **Viewport Scissoring (Approach A)**: Applies hardware-accelerated clipping bounds matching viewport dimensions `[0..width, 0..height]`.
- **Anchor Cell Synchronization, CUP Cursor Parsing & Uppercase Deletion (`d=A`)**:
  - Maintains zero-latency synchronous PTY streaming (`term.write`), guaranteeing instantaneous 0ms rendering for shell startup, `fish_greetings`, and terminal prompts.
  - Precisely captures true anchor coordinates `(start_col, start_row)` even when preceded by text or ANSI cursor movements in the same chunk via `calculateCursorOffset(textBefore)` (supporting full CSI codes: `CUF \x1b[..C`, `CUB \x1b[..D`, `CHA \x1b[..G`, and absolute `CUP \x1b[<row>;<col>H` / `HVP \x1b[<row>;<col>f` positioning utilized by Yazi).
  - Deletion action `a=d` fully supports `d=a` and `d=A` (uppercase: wipe all images and placements from memory and screen), ensuring instantaneous zero-leak cleanup during Yazi preview switching and exiting.
  - Renderer coordinates adhere strictly to `render_x = padding_left + col * cell_width` and `render_y = padding_top + (row - scroll_offset) * cell_height`, preventing default (0, 0) collisions over previous output.
  - Animation frame transmissions (`a=f`) update frame textures in cache while strictly inheriting and preserving the placement anchor coordinates established during initial placement.
- **Delta Frame 32-bit RGBA Auto-Detection & Alpha Compositing**:
  - Automatically identifies whether an incoming animation delta frame (`a=f`) is 32-bit RGBA or 24-bit RGB based on exact byte length and pixel count arithmetic ($S = s \times v \times 4$), adhering strictly to the Kitty specification default (`f=32`).
  - Prevents byte stride skew, pixel misalignment, and opaque black-and-white static noise by never forcing base RGB formats onto RGBA delta frames.
  - Composes rectangular delta patches (`x, y, s, v`) seamlessly over previous frames (`c=<frame_index>`) via offscreen canvas alpha blending (`ctx.drawImage`).
- **Ghost Layer Prevention & Single Active Canvas Stacking**:
  - Prunes stale `.xterm-kitty-graphics-layer` elements before re-attaching canvases, preventing ghost image doubling during split layout changes or tab switches.
  - Graphics layer is mounted with `zIndex: 1` directly above `TextRenderLayer` (`zIndex: 0`) and beneath `SelectionRenderLayer` (`zIndex: 1` in DOM order) and `CursorRenderLayer` (`zIndex: 3`).
- **Animation Loop Count (`v`) Specification Compliance & Resilient Timer Scheduling**:
  - **Loop Count Default**: Parameter `v` defaults to `0` (Infinite Loop) per Kitty Graphics Protocol specification.
  - **Infinite Playback (`v=0`)**: Automatically loops back to frame 1 (index 0) upon expiration of the final frame's delay (`z` ms), continually rescheduling the frame timer to sustain perpetual animation.
  - **Finite Count Playback (`v>0`)**: Accurately tracks completed cycles (`loopsCompleted`); when the requested loop count is reached, halts the timer and freezes on the final frame.
  - **Animation Control (`a=a`)**: Supports playback state (`s=1` stop, `s=3` run), seeking to designated frame (`r`), dynamic frame gap delay updates (`z`), and dynamic loop count reconfiguration (`v`).
  - **Dedicated 60 FPS Graphics Loop**: `advanceFrame` directly re-renders the Kitty graphics canvas without triggering full text layer refreshes (`term.refresh()`), maintaining high animation smoothness with low CPU usage.
  - **Resource Management**: Automatically cleans up and unregisters active animation timers upon LRU cache eviction, image deletion (`a=d`), or terminal disposal to prevent memory or timer leaks.
- **Sub-Rectangle Source Clipping (`x, y, w, h`)**:
  - Full support for source texture clipping parameters: `x` (source X offset in pixels), `y` (source Y offset in pixels), `w` (source rectangle width in pixels), and `h` (source rectangle height in pixels).
  - Automatically calculates normalized UV bounds (`u_min = x / texture_width`, `v_min = y / texture_height`, `u_max = (x + w) / texture_width`, `v_max = (y + h) / texture_height`), seamlessly combining source sub-rectangles with viewport boundary scissoring.
- **Unicode Graphic Placeholder (`U+10EEEE`) & Virtual Placements (`U=1`)**:
  - Intercepts the private-use Unicode graphic placeholder codepoint `U+10EEEE` directly in character rendering, completely suppressing "tofu" (□) missing-glyph boxes.
  - **Rendering Responsibility Separation, Multi-Layer Glyph Suppression & 100% Regular Text Preservation**: Hooks `TextRenderLayer.prototype._drawForeground`, `BaseRenderLayer` (`_drawChars`), and `CursorRenderLayer` to skip character rasterization, glyph lookup, and font drawing for placeholder cells. Actual image rendering is unified exclusively onto the dedicated Kitty graphics canvas (`renderVisiblePlaceholders()`) using predetermined grid geometry (`cols` / `rows`). This completely eliminates dynamic scaling errors during cell-by-cell passes (which caused row-by-row distortion and shift-stacking) as well as duplicate drawing between font and graphics layers. Furthermore, guards against stale `workCell.combinedData` residue in xterm's memory pool via strict `cell.isCombined()` verification, guaranteeing normal terminal text (file lists, borders, status bars) is never misidentified as placeholders or hidden from view.
  - Automatically parses combining diacritic marks attached to `U+10EEEE` from the 297 standard combining marks defined by the Kitty Graphics Protocol to determine the grid row and column index of the slice.
  - Supports diacritic omission with left-to-right inheritance and 3rd-diacritic high byte extension for 32-bit image IDs.
  - Extracts image IDs from cell foreground colors (24-bit TrueColor RGB or 256-color palette index) with automatic fallback to the most recently transmitted image.
  - Seamlessly handles virtual placements (`U=1`), suppressing buffer space reservation while holding placement dimensions and source sub-rectangles for Unicode placeholders.
- **Official `kitten icat` & Kitty Ecosystem Integration (`kitten diff`, `yazi`, `image.nvim`)**:
  - Full native compatibility with Kitty's official `kitten icat` image display command (and `kitty +kitten icat`).
  - **Dynamic `TIOCGWINSZ` Pixel Dimensions Reporting**:
    - Queries actual rendered font cell dimensions (`cellWidth`, `cellHeight`) from xterm.js Canvas and dynamically updates the Linux kernel PTY window size structure (`pixel_width`, `pixel_height` as `cols * cellWidth`, `rows * cellHeight`).
    - Enables accurate aspect ratio calculations for `kitten icat`, supporting grid placement `--place <W>x<H>@<X>x<Y>`, `--fit contain`, and pixel reporting `kitten icat --print-window-size`.
  - **Multi-Probe Handshake (`a=q`) & Uppercase `OK` Compliance**:
    - Fully adheres to Kitty's official Go implementation (`DetectSupport`) requiring `g.ResponseMessage() == "OK"` (uppercase `OK`).
    - Immediately replies with `\x1b_Gi=<id>;OK\x1b\` to direct memory (`i=1`) and sandboxed temp file (`i=2`) queries.
  - **Yazi CSI Probes & DA1 Zero-Latency Emulation**:
    - Instantly acknowledges and drains `\x1b[?996n` (placeholder support query) with `\x1b[?996;1n`, `\x1b[16t` (cell size query) with `\x1b[6;18;9t`, and `\x1b[c` / `\x1b[0c` (DA1 device attributes) with `\x1b[?62;4;22c`, enabling 0ms graphics capability detection in Yazi and fastfetch.
  - **Full Yazi TUI Preview Compatibility (`C=1`, CUP Coordinates, `d=A`)**:
    - Complete protection against extraneous newline (`\r\n`) injection under `C=1` or Alternate Screen buffers, pixel-perfect image placement within the preview pane, and instant cleanup via `d=A` on preview navigation or file change.
- **Security Architecture: Intentional Omission of Shared Memory (`t=s`, `/dev/shm`) & Video Playback Trade-Off**:
  - **Threat Model & Design Rationale**:
    - POSIX Shared Memory (`/dev/shm`) on Linux is accessible to all processes running under the same UID. Supporting arbitrary shared memory handles creates dangerous attack vectors, including cross-process memory inspection, symlink traversal, and memory-exhaustion denial of service (OOM crashes).
  - **Security-First Architecture Trade-Off**:
    - Guided by Waddle's privacy-first, zero-leakage security model, POSIX Shared Memory (`t=s`) is **intentionally unsupported and disallowed**.
    - Consequently, raw uncompressed high-FPS video streaming (such as `mpv --vo=kitty --vo-kitty-use-shm=yes`) is deliberately omitted in favor of ironclad sandbox security (resulting in smooth audio playback only, or jittery high-bandwidth Base64 streaming). Waddle is an engineering workstation, not a video player.
    - In contrast, static images, animated GIFs, `kitten diff`, and file manager previews render with 100% graphical fidelity via secure direct Base64 (`t=d`) and sandboxed temporary files (`t=t`, immediately unlinked from disk upon reading, with strict file size and dimension limits).
- **Layering Order**:
  - Render pipeline: **Terminal Background / Wallpaper → Kitty Graphics Canvas Layer → Text/Glyphs Layer → Cursor Layer**.
  - Text glyphs and the terminal cursor render crisp and clear on top of displayed graphics.

---

---

### 17. 🛡️ Real-Time Secret Masking (`SecretMasker`)

- **Automated Credential Detection**:
  - Intercepts live terminal PTY streams and runs high-speed regex evaluation against common credential formats:
    - GitHub Personal Access Tokens (`ghp_...`, `gho_...`, `ghu_...`, `ghs_...`, `ghr_...`)
    - AWS Access Key IDs (`AKIA...`, `ASIA...`) & Secret Access Keys
    - OpenAI API Keys (`sk-...`, `sk-proj-...`)
    - Slack Tokens (`xoxb-...`, `xoxp-...`)
    - JSON Web Tokens (JWT)
    - Private key blocks (`-----BEGIN OPENSSH PRIVATE KEY-----`, etc.)
- **Redaction**:
  - Matches are instantly replaced in the terminal display buffer with `***MASKED_KEY***` or asterisks.
  - Can be toggled on/off in the Settings modal under "Terminal Secret Masking".
  - Neutralizes credential leakage during screen sharing, live streams, and video recordings.

---

### 18. ⏳ Session Time Travel & Snapshot History (`Ctrl + Shift + H`)

- **Timeline Interface (`SessionHistoryModal`)**:
  - Activated via `Ctrl + Shift + H`. Displays chronological history of executed commands with execution timestamps, exit status (success: green, failure: red), working directory, and terminal output snapshots.
- **State Restoration & Replay**:
  - Select any historical command to re-run it in the active terminal pane or copy it to the clipboard with one click.
  - Session history records persist automatically to `localStorage` across app launches.

---

### 19. 📊 Rich Data Visualizer (Markdown / CSV / JSON Preview)

- **Dedicated Preview Modal (`RichPreviewModal`)**:
  - Accessible via the file tree right-click context menu or the "Rich Preview" button in the embedded editor.
- **Format-Specific Visualizers**:
  - **Markdown**: Clean typographic layout with headers, lists, syntax-highlighted code blocks, and tables.
  - **CSV**: Interactive data grid with auto-detected headers, sortable columns (ascending/descending), and instant full-text filtering.
  - **JSON**: Collapsible/expandable hierarchical tree view with syntax color-coding and fast search.

---

### 20. 🐕 Autonomous AI Error Watchdog & 1-Click Fix (`TC-ENH-04`)

- **Detection Engine**:
  - Automatically captures non-zero process exit codes and common CLI error patterns (`error:`, `fatal:`, `command not found`, `syntax error`, `Traceback`, `ModuleNotFoundError`, `failed to push`) in the PTY output stream.
  - **Command Output Slicing**: Scans only output generated after the most recent command prompt, eliminating false positives from historical scrollback.
- **Diagnosis & Fix**:
  - An unobtrusive diagnostic toast/banner appears at the bottom of the active terminal with root-cause analysis.
  - The AI Copilot sidebar displays a quick action card (`⚠️ Last Error: {cmd} [Fix with AI]`) enabling instant 1-click remediation prompt dispatch to Ollama.

---

### 21. 🔗 Visual Pipeline Builder (`Ctrl + Shift + P`)

- **Workflow Orchestration (`PipelineBuilderModal`)**:
  - Open with `Ctrl + Shift + P`. Graphically configure sequential build, test, lint, and deploy workflows.
- **Execution & Controls**:
  - Reorder steps, toggle steps on/off, and specify "Stop on Error" thresholds.
  - Clicking "Run Pipeline" streams outputs directly to the active terminal pane with live progress tracking.

---

### 22. 📜 Project-Specific & Global Common AI Rules (`.waddle/` & `~/.config/waddle/`)

Waddle's local AI subsystem (`Ctrl+K` command generator, error diagnostic watchdog, Copilot chat, and in-editor refactoring) features a powerful **Two-Tier Hierarchical Rule Discovery Architecture**.

```mermaid
flowchart TD
    Cwd["Working Directory (e.g., Rooney/src/components)"] --> CheckProject["1. Ancestor Traversal (Up to 12 levels / .git root)"]
    CheckProject -->|"Found: Rooney/.waddle/"| ProjectRules["[Top Priority] Project-Specific Rules Active\n(Rooney/.waddle/rules.md / rules_ja.md)"]
    CheckProject -->|"Not Found (outside repo e.g., cd ~)"| CheckGlobal["2. Global Common Directory Search\n(~/.config/waddle/)"]
    CheckGlobal --> GlobalRules["[Fallback] Global Common Rules Active\n(~/.config/waddle/rules.md / rules_ja.md)"]
    
    ProjectRules --> AIContext["AI System Prompt Injection\n& Status Bar / Ctrl+K Badge Illumination"]
    GlobalRules --> AIContext
```

#### 1. Two-Tier Hierarchical Discovery
1. **Tier 1 (Top Priority): Project-Specific Rules (`<PROJECT_ROOT>/.waddle/`)**:
   - Traverses upwards from current directory up to 12 ancestor levels or the Git repository root (`.git`).
   - **Concrete Example (Project `Rooney`)**:
     - Place your project-specific rules in the project root at `Rooney/.waddle/`:
       - English locales (`en-US`, `en-GB`): `Rooney/.waddle/rules.md`
       - Japanese locale (`ja`): `Rooney/.waddle/rules_ja.md`
     - Even when working inside deep subdirectories (e.g. `cd Rooney/src/components`), **Waddle automatically walks up ancestors and resolves `Rooney/.waddle/rules.md`**, ensuring project constraints are never lost while moving around inside the codebase.
2. **Tier 2 (Fallback & Default): Global Common Rules (`~/.config/waddle/`)**:
   - When navigating outside any repository (e.g. `cd ~` or `/tmp`), or inside projects without `.waddle/`, **Waddle automatically loads global common rules from `~/.config/waddle/`**:
     - English locales: `~/.config/waddle/rules.md`
     - Japanese locale: `~/.config/waddle/rules_ja.md`
   - On application startup or rule discovery, if these files do not exist, high-quality sample templates are automatically seeded under `~/.config/waddle/`.

#### 2. Full Locale Synchronization (`en-US`, `en-GB`, `ja`)
- **When Japanese (`ja`) is selected**:
  - Prioritizes `rules_ja.md`. Falls back to `rules.md` if absent.
- **When English (`en-US`, `en-GB`) is selected**:
  - Prioritizes `rules.md`. Falls back to `rules_ja.md` if absent.

#### 3. Visual Feedback & UI Indicators
- **Status Bar (Right Indicator)**:
  - Display Label:
    - Project-specific: `📖 Private Rules`
    - Global common: `📖 Global Rules`
  - Tooltip:
    - Project-specific: `Private Rules JA (.waddle/rules_ja.md)` / `Private Rules US (.waddle/rules.md)` / `Private Rules UK (.waddle/rules.md)`
    - Global common: `Global Rules JA (~/.config/waddle/rules_ja.md)` / `Global Rules US (~/.config/waddle/rules.md)` / `Global Rules UK (~/.config/waddle/rules.md)`
- **AI Command Modal (`Ctrl + K`)**:
  - Header badge illuminates `Private Rules JA` (or `Global Rules JA` / `US` / `UK`) with detailed path on hover.
- **Pre-Configured Sample Templates**:
  - `.waddle/rules.md` (English) and `.waddle/rules_ja.md` (Japanese) provide complete, battle-tested templates covering tech stack overview, command policies, coding guidelines, Conventional Commits, and security guardrails.

---

## ⌨️ Complete Keybindings Reference

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `Ctrl + K` | Global | Open **AI Command Generator** modal |
| `Ctrl + B` | Global | Toggle **File Tree Sidebar** |
| `Ctrl + E` | Global | Toggle **Embedded Code Editor** |
| `Ctrl + S` | Editor | Save currently open file |
| `Ctrl + Shift + K` | Editor | Open **AI Code Edit / Refactor** |
| `Ctrl + Shift + F` / `Ctrl + F` | Terminal | Toggle **In-Terminal Log Search** |
| `Ctrl + Shift + H` | Global | Open **Session Timeline & History Restoration** modal |
| `Ctrl + Shift + P` | Global | Open **Visual Pipeline Builder** modal |
| `Enter` | Search Bar | Find next match in scrollback buffer |
| `Shift + Enter` | Search Bar | Find previous match in scrollback buffer |
| `Ctrl + T` | Global | Open a new terminal tab |
| `Ctrl + W` | Global | Close active terminal tab |
| `Ctrl + Shift + W` | Global | Close active split pane |
| `Ctrl + Shift + S` | Global | **Swap panes** in current split tab |
| `Ctrl + Alt + ↑ / ↓ / ← / →` | Split Tab | **Resize active split ratio** by 5% increments |
| `Alt + 1` | Global | Switch to **Single Pane (1画面)** layout |
| `Alt + 2` | Global | Switch to **2-Split Side-by-Side (左右2分割)** layout |
| `Alt + 3` | Global | Switch to **3-Split Left Main (左メイン3分割)** layout |
| `Alt + 4` | Global | Switch to **4-Split Grid (2×2グリッド)** layout |
| `Alt + Z` | Split Tab | Toggle **Zoom / Maximize active pane** |
| `Alt + ↑ / ↓ / ← / →` | Split Tab | Navigate focus across directional split panes |
| `Ctrl + ,` | Global | Open **Settings** (Theme, Font, Ollama, Wallpaper, Language, Git) |
| `Git Badge (Status Bar)` | Status Bar | Toggle **Git Quick Popover** |
| `Ctrl + Enter` | Git Popover | Commit staged changes |
| `Enter` | AI Modal | Insert generated command into terminal prompt |
| `Ctrl + Enter` | AI Modal | Execute generated command in terminal immediately |
| `Esc` | Global | Dismiss active modal, search overlay, or popover |

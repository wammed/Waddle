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
16. [⌨️ Complete Keybindings Reference](#️-complete-keybindings-reference)

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
- **Display Adjustments**:
  - Slider controls for opacity (10%–100%) and frosted glass blur (0–20px).
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
  - **Item Metadata**: Displays formatted file sizes (e.g., `4.2 KB`) and folder child counts (e.g., `(12)`).
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
- **32KB Output Coalescing**:
  - PTY output buffer coalesces high-throughput terminal stream into 32KB chunks, minimizing Tauri IPC overhead while keeping interactive keystroke latency at 0ms.
- **UTF-8 Multi-Byte Boundary Protection**:
  - Uses `std::str::from_utf8` validation with `valid_up_to` to carry incomplete multi-byte slices across read cycles, preventing `\u{FFFD}` glyph corruption for Japanese, CJK, and emojis.
- **Process Group Termination**:
  - Signals the entire process group (`-pid`) with `SIGHUP` and `SIGTERM`/`SIGKILL` on tab/pane close, guaranteeing zero zombie processes or orphaned background tasks.
- **2D Canvas Acceleration**:
  - Uses `@xterm/addon-canvas` for instant 0ms startup without GPU shader compilation pauses or WebKitGTK Wayland transparency stalls.

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

- **System Directory Prefix Protection**:
  - Prefixed canonical path validation blocks writing or deletion in `/etc`, `/usr`, `/bin`, `/sbin`, `/boot`, `/lib`, `/sys`, `/proc`, `/dev`, `/root`, `/run`.
- **Sensitive Credential Shield**:
  - Completely blocks reading, writing, and deletion of SSH keys (`~/.ssh/*`), GPG keys (`~/.gnupg/*`), Linux keyrings, shell startup files (`.bashrc`, `.zshrc`, etc.), and `~/.config` root.
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

## ⌨️ Complete Keybindings Reference

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `Ctrl + K` | Global | Open **AI Command Generator** modal |
| `Ctrl + B` | Global | Toggle **File Tree Sidebar** |
| `Ctrl + E` | Global | Toggle **Embedded Code Editor** |
| `Ctrl + S` | Editor | Save currently open file |
| `Ctrl + Shift + K` | Editor | Open **AI Code Edit / Refactor** |
| `Ctrl + Shift + F` / `Ctrl + F` | Terminal | Toggle **In-Terminal Log Search** |
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

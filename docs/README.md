<div align="center">

# 🐧⚡ Waddle
### AI-Integrated Next-Generation Linux Terminal Emulator

![Banner](../images/waddle-banner.svg)

[![Built with Tauri](https://img.shields.io/badge/Tauri-2.0-24C8D8?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.98+-orange?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Ollama](https://img.shields.io/badge/Ollama-Local_AI-white?style=for-the-badge&logo=ollama&logoColor=black)](https://ollama.com/)
[![Platform](https://img.shields.io/badge/Platform-Linux_(Wayland_/_X11)-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://www.kernel.org/)
[![Vibe Coding](https://img.shields.io/badge/Built_with-AI_Vibe_Coding-8A2BE2?style=for-the-badge&logo=sparkles&logoColor=white)](#-about-this-project-ai-vibe-coding)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](../LICENSE)

<p align="center">
  <strong>Ultra-Fast PTY Terminal × 100% Local AI (Ollama) × Embedded Lightweight Editor × Custom Wallpapers</strong><br>
  A private, intelligent, and customizable terminal emulator for Linux that never sends your data to the cloud.
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.ja.md">日本語</a>
</p>

</div>

---

## 📸 Screenshots

| 🐧 Ultra-Fast Terminal with Custom Wallpaper | 🤖 AI Command Generator (`Ctrl + K`) |
| :---: | :---: |
| ![Terminal View](../images/screenshots/waddle-ss01.png) | ![AI Command Assistant](../images/screenshots/waddle-ss02.png) |
| *CachyOS, Fish Shell, Powerline Nerd Fonts & Transparent Cyberpunk Wallpaper* | *Natural language command generation with safety tags and instant execution* |

| 📝 Embedded Code Editor (`Ctrl + E`) | 💬 Context-Aware AI Copilot Sidebar |
| :---: | :---: |
| ![Embedded Editor](../images/screenshots/waddle-ss03.png) | ![AI Copilot Sidebar](../images/screenshots/waddle-ss04.png) |
| *Side-by-side editing, Quick Open, AI Refactor (`Ctrl + Shift + K`), Run in Terminal* | *Interactive chat assistant with live CWD, Git branch, and command context* |

---

## 💡 Highlights

- 🤖 **100% Local AI Intelligence**: Instant natural language command synthesis (`Ctrl + K`), automated error remedies, and context-aware Copilot chat powered completely offline by Ollama. ([Details](FEATURES.md#1--natural-language-command-generator-ctrl--k))
- ⚡ **Zero-Lag Terminal Core**: Rust PTY engine with 32KB output coalescing, kernel-cooperative backpressure flow control (`pause_pty`/`resume_pty`), 0ms instant `Ctrl+C` queue purge, and memory flat-capped at <300MB even during million-line bursts (`yes`). ([Details](FEATURES.md#10--high-performance-pty--zero-lag-2d-canvas-acceleration))
- 🪟 **Flexible Multi-Pane Splits**: Split any tab into 2, 3, or 4 terminals across 10 visual presets with draggable neon dividers and keyboard resizing. ([Details](FEATURES.md#5--flexible-multi-pane-split--draggable-resizing-1-to-4-panes))
- 📝 **Hardened Embedded Code Editor (`Ctrl + E`)**: Linux config-focused multi-tab editor (up to 5 tabs with lazy rendering), 6-generation AutoSave rotation with permanent header restore UI (`Restore (N)`), non-destructive undo rollback (`Ctrl + Z`), zero-mutation visual secret protection with `[🛡️ N Secrets Detected]` badge and Eye toggle, soft tabs (4 spaces), bracket/quote auto-close, ReDoS-free exact search/replace (`Ctrl + F` / `Ctrl + H`), symlink resolution within `$HOME`, non-root owner UID verification, forced read-only guards, and automated 120s backup cache (`~/.cache/waddle/autosave/` [0700]). ([Details](FEATURES.md#4--embedded-lightweight-code-editor--ai-code-assistant-ctrl--e))
- 📂 **Rich File Tree Explorer**: Real-time CWD tracking (`/proc/<pid>/cwd`), large directory 500-item safety guard with dynamic on-demand pagination (`+ Load more`), language-colored badges, clickable breadcrumbs, indent guides, and right-click context menu. ([Details](FEATURES.md#3--left-sidebar-file-tree-explorer-ctrl--b))
- 🐙 **Integrated Git & GitHub Hub**: Status bar quick popover, one-click push/pull, local AI conventional commit generator, and syntax-highlighted diff viewer. ([Details](FEATURES.md#14--git--github-integration-local-ai-commits--pushpull-policy))
- 🖼️ **Full Kitty Graphics Protocol & Universal TUI/CLI Ecosystem Integration**: Complete support for inline images and animated GIFs across all Linux CLI/TUI tools including `yazi`, `ranger`, `lf`, `fastfetch`, `kitten icat`, `chafa`, `timg`, `viu`, and Neovim (`image.nvim`). Features 100% normal text preservation (file lists, borders, code), CUP absolute coordinate tracking, Alternate Screen zero-allocation (TUI fixed-grid protection), kernel-cooperative pixel resolution reporting (`TIOCGWINSZ`), XTVERSION auto-detection (`timg`), clean DA1 & DSR 5n synchronization, PTY-level temporary file inlining (`t=t` -> `t=d`; eliminating `viu` deletion race conditions for instant raster rendering), explicit ID draw OK synchronization (resolving `ranger` first-frame freeze), and spec-compliant silent delete handling (`a=d`; eliminating `ranger` multi-image flicker and UI hangs), `TERM=xterm-kitty` environment propagation (`ranger`), and 0ms instant probe handshake (`a=q` uppercase `OK` / DA1 / CSI probes). *Note: To ensure uncompromising sandbox security against shared memory (`/dev/shm`) tampering and OOM denial-of-service, POSIX Shared Memory (`t=s`) is intentionally omitted, consciously prioritizing security over high-FPS video streaming.* ([Details](FEATURES.md#16--kitty-graphics-protocol-complete-subsystem--strict-security-sandbox))
- 🛡️ **Real-Time Secret Masking (`SecretMasker`)**: Multi-layer credential defense engine (GitHub Fine-Grained & Classic PATs, OpenAI/Anthropic/Google AI keys, Slack tokens, AWS keys, prefixed env vars) protecting live terminal PTY streams, embedded editor views (zero-mutation visual mask), session history persistence, and AI context. ([Details](FEATURES.md#17--real-time-secret-masking-secretmasker))
- ⏳ **Session Time Travel (`Ctrl + Shift + H`)**: Visual command history and snapshot timeline with exit codes, timestamps, CWD, and 1-click state restoration or command replay. ([Details](FEATURES.md#18--session-time-travel--snapshot-history-ctrl--shift--h))
- 📊 **Rich Data Visualizer**: In-pane Markdown formatted typography, sortable/filterable interactive CSV tables, and collapsible JSON syntax trees directly from the file tree or editor. ([Details](FEATURES.md#19--rich-data-visualizer-markdown--csv--json-preview))
- 🐕 **Autonomous AI Error Watchdog**: Monitors terminal failures in real time, auto-diagnoses root causes via local LLM, and provides a 1-click quick fix button. ([Details](FEATURES.md#20--autonomous-ai-error-watchdog--1-click-fix))
- 🔗 **Visual Pipeline Builder (`Ctrl + Shift + P`)**: Visually chain multi-step build, test, lint, and deploy workflows with stop-on-error control and live terminal stream execution. ([Details](FEATURES.md#21--visual-pipeline-builder-ctrl--shift--p))
- 📜 **Project-Specific & Global Common AI Rules (`~/.config/waddle/` & `.waddle/`)**: Automatically prioritizes project-level rules (`.waddle/rules.md` / `rules_ja.md`) within repositories and seamlessly falls back to global common guidelines under `~/.config/waddle/` outside repositories, fully synchronized with selected language. ([Details](FEATURES.md#22--project-specific--global-common-ai-rules-waddlerulesmd--configwaddlerulesmd))
- 🎨 **22 Cyberpunk & Neon Themes**: Vibrant UI glow synchronization, native drag-and-drop custom wallpapers with 60 FPS real-time blur/opacity preview, and built-in Nerd Font typography. ([Details](FEATURES.md#11--22-premium-themes--high-voltage-neon-collection))

> 📖 **Looking for in-depth feature specifications?** See the full [Feature Guide (FEATURES.md)](FEATURES.md).

---

## 🚀 Quick Start

### 1. Prerequisites

- [Rust (Cargo)](https://rustup.rs/) (1.70+)
- [Node.js & npm](https://nodejs.org/) (Node 18+)
- [Ollama](https://ollama.com/) (Local AI engine)

### 2. Set Up Ollama

```bash
# Start Ollama daemon
ollama serve

# Pull your preferred local model(s)
ollama pull llama3.2
# Or coding-specialized model
ollama pull qwen2.5-coder
```

### 3. Run in Development Mode

```bash
# Clone the repository
git clone https://github.com/wammed/Waddle.git
cd Waddle

# Install dependencies & start development server
npm install
npm run tauri dev
```

### 4. Production Build & Packaging

```bash
# Build native Arch Linux Pacman package (.pkg.tar.zst)
npm run package

# Install directly on Arch Linux / CachyOS / Manjaro:
sudo pacman -U src-tauri/target/release/bundle/pacman/waddle-0.1.0-1-x86_64.pkg.tar.zst
```
*Standalone binary output: `src-tauri/target/release/waddle` (~18 MB).*

---

## ⌨️ Keybindings

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + K` | Open **AI Command Generator** |
| `Ctrl + E` | Toggle **Hardened Embedded Code Editor** (Multi-tab, Soft Tab, AutoSave) |
| `Ctrl + F` / `Ctrl + H` (Editor) | Open **Exact Match Search / Replace Mini-bar** (ReDoS-free) |
| `Ctrl + Shift + F` | Toggle **In-Terminal Log Search** |
| `Ctrl + Shift + H` | Open **Session Timeline & History Restoration** modal |
| `Ctrl + Shift + P` | Open **Visual Pipeline Builder** modal |
| `Ctrl + T` | Open new terminal tab |
| `Ctrl + W` | Close active terminal tab |
| `Ctrl + Shift + S` | **Swap panes** in current split tab |
| `Alt + 1 ~ 4` | Switch layout (**Single, 2-Split, 3-Split, 4-Split Grid**) |
| `Ctrl + Enter` | **Execute Git Commit** / **Run AI Command Immediately** |
| `Ctrl + ,` | Open **Settings** (Themes, Fonts, Ollama, Wallpapers, Git) |
| `Esc` | Close active modal, search overlay, or popover |

> 💡 For the complete keybindings list, see [FEATURES.md](FEATURES.md#️-complete-keybindings-reference).

---

## 🔒 Security & Architecture (Overview)

Waddle operates under a strict **100% offline, local-first** model:
- **Zero Cloud Leakage**: No telemetry, analytics, or external API keys; all AI prompts and terminal streams remain on your local machine.
- **Multi-Layer Defense**: System directory prefix guards (`/etc`, `/usr`), virtual filesystem isolation (`/proc`, `/sys`, `/dev`), user credential shields (`~/.ssh`, `~/.gnupg`, `~/.local/share/keyrings`), Ollama SSRF protection (blocking cloud metadata `169.254.169.254`), Git Branch Ref strict sanitization, indirect prompt injection delimiters, and word-boundary destructive command interception.
- **Real-Time Secret Masking**: Credentials and API keys (GitHub, AWS, OpenAI, etc.) in terminal streams are automatically redacted in real time (`***MASKED_KEY***`) to protect against video recording and screen sharing leakage.
- **Robust POSIX PTY**: Memory-safe Rust core with 32KB output coalescing, UTF-8 multi-byte carry-over, and clean process group termination (`SIGHUP`/`SIGTERM`).

> 📐 Explore the system design in the [Architecture Guide (ARCHITECTURE.md)](ARCHITECTURE.md).  
> 🛡️ Review our comprehensive safety policies in [SECURITY.md](SECURITY.md).

---

## 🤖 About This Project (AI Vibe Coding)

> [!IMPORTANT]
> ### 💡 AI Vibe Coding Project
> **Waddle** is an **AI Vibe Coding** project created through real-time interactive pair programming with **Google DeepMind's Antigravity (Gemini)**.
> Combining human architectural vision with agentic AI pair programming, the entire system—from low-level Rust PTY process management, Linux `/proc/<pid>/cwd` tracking, WebKitGTK Wayland optimizations, React 19 UI, transparent Canvas rendering, local Ollama streaming client, to the embedded code editor—was designed and built in full flow.

---

## 📄 License

This project is licensed under the [MIT License](../LICENSE).

<p align="center">
  Crafted via <strong>AI Vibe Coding</strong> 🐧⚡ · Built with ❤️ for Linux Developers
</p>

<div align="center">

# 🐧⚡ Waddle
### AI-Integrated Next-Generation Linux Terminal Emulator

![Banner](../images/waddle-banner.svg)

[![Built with Tauri](https://img.shields.io/badge/Tauri-2.0-24C8D8?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.98+-orange?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Ollama](https://img.shields.io/badge/Ollama-Local_AI-white?style=for-the-badge&logo=ollama&logoColor=black)](https://ollama.com/)
[![Platform](https://img.shields.io/badge/Platform-Linux_(Wayland_/_X11)-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://www.kernel.org/)
[![Tested On](https://img.shields.io/badge/Tested_On-CachyOS_(COSMIC)-00C49F?style=for-the-badge&logo=archlinux&logoColor=white)](#environment-notice)
[![Vibe Coding](https://img.shields.io/badge/Built_with-AI_Vibe_Coding-8A2BE2?style=for-the-badge&logo=sparkles&logoColor=white)](#vibe-coding)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](../LICENSE)

<p align="center">
  <strong>Ultra-Fast PTY Terminal × 100% Local AI (Ollama) × Embedded Lightweight Editor × Custom Wallpapers</strong><br>
  A private, intelligent, and customizable terminal emulator for Linux that never sends your data to the cloud.
</p>

<p align="center">
  <strong>English</strong> | <a href="README.ja.md">日本語</a>
</p>

</div>

---

<a id="environment-notice"></a>
> [!WARNING]
> ### Important Notice on Supported Environments
> All development, validation, and automated/manual testing for Waddle are conducted exclusively on **CachyOS with the COSMIC Desktop Environment**.  
> **Compatibility with other desktop environments (such as KDE Plasma, GNOME, XFCE) or other Linux distributions has not been tested or verified.** Due to variations in window management, compositors, Wayland protocol behavior, and font rendering, unexpected visual or functional discrepancies may occur on unverified platforms.

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
- 📝 **Config-Focused & Hardened Embedded Editor (`Ctrl + E`)**: Dedicated to rapid editing and quick inspection of Linux configuration files (dotfiles, YAML, TOML, JSON, ini, conf, .env, etc.) and scripts. Strictly hardened and deliberately scoped (not a full IDE replacement) to uphold security requirements (root editing elimination, ReDoS prevention, sensitive file blocking), ultra-lightweight performance (no Monaco, 0ms startup, 5-tab lazy DOM limit), and syntax preservation (no smart auto-indentation). Features 6-generation AutoSave rotation with permanent header restore UI (`Restore (N)`), non-destructive undo rollback (`Ctrl + Z`), zero-mutation visual secret protection with `[🛡️ N Secrets Detected]` badge and Eye toggle, soft tabs (4 spaces), bracket/quote auto-close, ReDoS-free exact search/replace (`Ctrl + F` / `Ctrl + H`), symlink resolution within `$HOME`, non-root owner UID verification, forced read-only guards, and automated 120s backup cache (`~/.cache/waddle/autosave/` [0700]). ([Details](FEATURES.md#4--embedded-lightweight-code-editor--ai-code-assistant-ctrl--e))
- 📂 **Rich File Tree Explorer**: Real-time CWD tracking (`/proc/<pid>/cwd`), large directory 500-item safety guard with dynamic on-demand pagination (`+ Load more`), language-colored badges, clickable breadcrumbs, indent guides, and right-click context menu. ([Details](FEATURES.md#3--left-sidebar-file-tree-explorer-ctrl--b))
- 🐙 **Integrated Git & GitHub Hub**: Status bar quick popover, one-click push/pull, local AI conventional commit generator, and syntax-highlighted diff viewer. ([Details](FEATURES.md#14--git--github-integration-local-ai-commits--pushpull-policy))
- 🖼️ **Full Kitty Graphics Protocol & Universal TUI/CLI Ecosystem Integration**: Complete support for inline images and animated GIFs across all Linux CLI/TUI tools including `yazi`, `ranger`, `lf`, `fastfetch`, `kitten icat`, `chafa`, `timg`, `viu`, and Neovim (`image.nvim`). Features 100% normal text preservation (file lists, borders, code), CUP absolute coordinate tracking, Alternate Screen zero-allocation (TUI fixed-grid protection), kernel-cooperative pixel resolution reporting (`TIOCGWINSZ`), XTVERSION auto-detection (`timg`), clean DA1 & DSR 5n synchronization, PTY-level temporary file inlining (`t=t` -> `t=d`; eliminating `viu` deletion race conditions for instant raster rendering), explicit ID draw OK synchronization (resolving `ranger` first-frame freeze), and spec-compliant silent delete handling (`a=d`; eliminating `ranger` multi-image flicker and UI hangs), `TERM=xterm-kitty` environment propagation (`ranger`), and 0ms instant probe handshake (`a=q` uppercase `OK` / DA1 / CSI probes). *Note: To ensure uncompromising sandbox security against shared memory (`/dev/shm`) tampering and OOM denial-of-service, POSIX Shared Memory (`t=s`) is intentionally omitted, consciously prioritizing security over high-FPS video streaming.* ([Details](FEATURES.md#16--kitty-graphics-protocol-complete-subsystem--strict-security-sandbox))
- 🛡️ **Rust Trust Boundary & CommandPolicy Engine**: Absolute security perimeter enforced at the Rust core—categorizing all commands into `Safe`, `Review`, and `Block`. Catastrophic commands (`rm -rf /`, `mkfs`, fork bombs) are irreversibly blocked at the kernel PTY entry point regardless of frontend state, while risky operations mandate explicit user confirmation. ([Details](FEATURES.md#24--rust-centric-trust-boundary--commandpolicy-engine))
- 🛡️ **Real-Time Secret Masking (`SecretMasker`)**: Multi-layer credential defense engine (GitHub Fine-Grained & Classic PATs, OpenAI/Anthropic/Google AI keys, Slack tokens, AWS keys, prefixed env vars) protecting live terminal PTY streams, embedded editor views (zero-mutation visual mask), session history persistence, and AI context. ([Details](FEATURES.md#17--real-time-secret-masking-secretmasker))
- ⏳ **Session Time Travel (`Ctrl + Shift + H`)**: Visual command history and snapshot timeline with exit codes, timestamps, CWD, and 1-click state restoration or command replay. ([Details](FEATURES.md#18--session-time-travel--snapshot-history-ctrl--shift--h))
- 📊 **Rich Data Visualizer**: In-pane Markdown formatted typography, sortable/filterable interactive CSV tables, and collapsible JSON syntax trees directly from the file tree or editor. ([Details](FEATURES.md#19--rich-data-visualizer-markdown--csv--json-preview))
- 🐕 **Autonomous AI Error Watchdog**: Monitors terminal failures in real time, auto-diagnoses root causes via local LLM, and provides a 1-click quick fix button. ([Details](FEATURES.md#20--autonomous-ai-error-watchdog--1-click-fix))
- 🔗 **Visual Pipeline Builder (`Ctrl + Shift + P`)**: Visually chain multi-step build, test, lint, and deploy workflows with stop-on-error control and live terminal stream execution. ([Details](FEATURES.md#21--visual-pipeline-builder-ctrl--shift--p))
- 📜 **Project-Specific & Global Common AI Rules (`~/.config/waddle/` & `.waddle/`)**: Automatically prioritizes project-level rules (`.waddle/rules.md` / `rules_ja.md`) within repositories and seamlessly falls back to global common guidelines under `~/.config/waddle/` outside repositories, fully synchronized with selected language. ([Details](FEATURES.md#22--project-specific--global-common-ai-rules-waddlerulesmd--configwaddlerulesmd))
- 🎨 **22 Cyberpunk & Neon Themes**: Vibrant UI glow synchronization, native drag-and-drop custom wallpapers with 60 FPS real-time blur/opacity preview, and built-in Nerd Font typography. ([Details](FEATURES.md#11--22-premium-themes--high-voltage-neon-collection))

### 📝 Embedded Editor Scope & Intentional Design Trade-offs (Config-Focused & Secure)

Waddle's embedded editor is not intended as a replacement for heavy, full-featured IDEs like VS Code or complex Neovim environments. Rather, it is designed specifically for **"editing configuration files (dotfiles, YAML, TOML, JSON, ini, conf, .env, etc.)"** and **"quick inspection & minor script edits"** directly within the terminal context without switching windows.

Features have been deliberately omitted to satisfy security requirements (elimination of root/elevated editing, ReDoS prevention, plugin engine exclusion, sensitive file blocking), ultra-lightweight performance (no Monaco, 5-tab lazy DOM limit, no background LSP daemons), and configuration syntax preservation (no smart auto-indentation):

| Category | What It Can Do (Supported) | What It Cannot Do / Deliberately Omitted |
| :--- | :--- | :--- |
| **Primary Scope & File Operations** | ・Rapid editing of configuration files in `$HOME` (dotfiles, YAML, TOML, JSON, conf, .env, etc.) and scripts<br>・Multi-tab editing up to 5 tabs with lazy DOM rendering for low memory<br>・Symlink resolution within `$HOME` with safe atomic saving to the canonical target<br>・Rich previews for Markdown, CSV, and JSON | ・Full-stack software engineering (large-scale IDE workflows, full debugging suites)<br>・Editing large files (>5MB) or massive logs (terminal `less` recommended)<br>・Editing binary files (blocked via 1KB null-byte inspection)<br>・Unlimited tab sprawl (hard-capped at 5 tabs) |
| **Security & Privilege Boundaries** | ・Safe atomic saving strictly for files matching the unprivileged UID<br>・Forced Read-Only protection for paths outside `$HOME` or files owned by other users<br>・Zero-mutation visual secret protection (masks API keys with `•` overlay while keeping raw bytes intact)<br>・Blocking saves for hazardous symlinks pointing outside `$HOME` | ・Direct editing or overwriting system files (`/etc`, etc.) via root/elevation (`sudo`, `pkexec`)<br>・Viewing or editing sensitive credentials (SSH/GPG keys, OS keyrings)<br>・Inspecting virtual kernel files (`/proc`, `/sys`, `/dev`) |
| **Editing & Input Assistance** | ・Soft tabs (4 spaces) insertion and multi-line indent/unindent<br>・Auto-closing bracket and quote pairs (`[`, `{`, `(`, `"`, `'`) and selection wrapping<br>・Self-contained Undo/Redo (`Ctrl+Z`, `Ctrl+Y` / `Ctrl+Shift+Z`)<br>・Exact plain-text Search & Replace (`Ctrl+F`, `Ctrl+H`, navigation, Replace All) | ・Smart auto-indentation (intentionally omitted to prevent YAML/TOML syntax corruption)<br>・Regular expression search/replace (eliminated to prevent ReDoS freeze risks)<br>・Multi-cursor editing, columnar selection, macro recording |
| **Code Intelligence & Extensibility** | ・Syntax highlighting for major languages & config formats via Prism.js<br>・Local Ollama AI assistance for refactoring and explanations (`Ctrl + Shift + K`)<br>・Direct script execution in active terminal (Play button with dangerous command warnings) | ・LSP (Language Server Protocol) definition jumping, type checking, renaming (avoids background daemon bloat)<br>・Third-party plugins/extensions (eliminating supply-chain vulnerabilities)<br>・Integrated visual debugger (breakpoints, stepping) |
| **Data Protection & Recovery** | ・First-input anchored 120-second automated backup rotation (AutoSave)<br>・Up to 6-generation snapshot retention with permanent header `Restore (N)` UI<br>・Safe sandboxed backup directory (`~/.cache/waddle/autosave/` [0700/0600])<br>・Crash recovery prompt on startup if uncommitted snapshots exist | ・Real-time collaborative editing<br>・In-editor Git branch graph exploration (handled by dedicated Git Popover & Diff Viewer) |

> 📖 **Looking for in-depth feature specifications?** See the full [Feature Guide (FEATURES.md)](FEATURES.md).

---

## 🚀 Quick Start

### 1. Prerequisites

- **Verified Desktop Environment**: **CachyOS + COSMIC Desktop Environment**
  - *Note: Other desktop environments (e.g., KDE Plasma, GNOME, XFCE) or other distributions have not been tested or verified.*
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

## 🧪 Integrated Testing & Quality Assurance Suite

Waddle features a multi-tiered test and audit pipeline orchestrated via a single command and Git hooks (Lefthook):

```bash
# Run full automated test pipeline (Security + Unit/Coverage + Visual + Memory)
npm run test:all

# Individual audit layers
npm run test:unit      # Vitest (V8 coverage HTML report) + Cargo test
npm run test:security  # Gitleaks + Secretlint + cargo-audit + cargo-deny
npm run test:visual    # Playwright visual regression (Kitty graphics, Unicode placeholder, Neon themes)
npm run test:memory    # CDP streaming stress (300MB memory ceiling & zero lingering DOM leaks)

# Run Git hooks manually (Lefthook)
npx lefthook run pre-commit
```

*For comprehensive test suites and evidence logs, see the [Test Plan (TEST_PLAN.md)](TEST_PLAN.md).*

---

## 🔒 Security & Architecture (Overview)

Waddle operates under a strict **100% offline, local-first** model:
- **Zero Cloud Leakage**: No telemetry, analytics, or external API keys; all AI prompts and terminal streams remain on your local machine.
- **Rust-Centric Trust Boundary (`CommandPolicy`)**: Security decisions are finalized in native Rust, not browser JS. Commands are evaluated as `Safe`, `Review`, or `Block`, preventing malicious or destructive execution (`rm -rf /`, `mkfs`, fork bombs) via IPC, UI, or AI prompt injections.
- **SSRF, DNS Rebinding & Redirect Defense**: Ollama endpoints undergo pre-flight DNS resolution with all resolved IP addresses validated against link-local and cloud metadata blocks (`169.254.0.0/16`, `[fd00:ec2::254]`, `fe80::/10`). HTTP redirect following is strictly disabled.
- **Untrusted Context Isolation**: Project rules (`.waddle/rules.md`) are sanitized and quarantined in `<untrusted_project_rules>` blocks with explicit LLM guardrails, and generated commands are deterministically overridden by Rust `CommandPolicy`.
- **Multi-Layer Defense**: System directory prefix guards (`/etc`, `/usr`), virtual filesystem isolation (`/proc`, `/sys`, `/dev`), user credential shields (`~/.ssh`, `~/.gnupg`, `~/.local/share/keyrings`), Git Branch Ref strict sanitization, and real-time credential masking (`SecretMasker`).
- **Robust POSIX PTY & Zero-Zombie Guarantee**: Memory-safe Rust core with 32KB output coalescing, UTF-8 multi-byte carry-over, process group signaling (`libc::killpg`), and active `libc::waitpid(..., WNOHANG)` zombie reclamation loops (proven leak-free over 1,000 stress cycles).

> 📐 Explore the system design in the [Architecture Guide (ARCHITECTURE.md)](ARCHITECTURE.md).  
> 🛡️ Review our comprehensive safety policies in [SECURITY.md](SECURITY.md).

---

<a id="vibe-coding"></a>
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

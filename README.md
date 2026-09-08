<div align="center">

# 🐧⚡ Waddle
### AI-Integrated Next-Generation Linux Terminal Emulator

![Banner](./images/waddle-banner.svg)

[![Built with Tauri](https://img.shields.io/badge/Tauri-2.0-24C8D8?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.98+-orange?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Ollama](https://img.shields.io/badge/Ollama-Local_AI-white?style=for-the-badge&logo=ollama&logoColor=black)](https://ollama.com/)
[![Platform](https://img.shields.io/badge/Platform-Linux_(Wayland_/_X11)-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://www.kernel.org/)
[![Vibe Coding](https://img.shields.io/badge/Built_with-AI_Vibe_Coding-8A2BE2?style=for-the-badge&logo=sparkles&logoColor=white)](#-about-this-project-ai-vibe-coding)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

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
| ![Terminal View](./images/screenshots/waddle-ss01.png) | ![AI Command Assistant](./images/screenshots/waddle-ss02.png) |
| *CachyOS, Fish Shell, Powerline Nerd Fonts & Transparent Cyberpunk Wallpaper* | *Natural language command generation with safety tags and instant execution* |

| 📝 Embedded Code Editor (`Ctrl + E`) | 💬 Context-Aware AI Copilot Sidebar |
| :---: | :---: |
| ![Embedded Editor](./images/screenshots/waddle-ss03.png) | ![AI Copilot Sidebar](./images/screenshots/waddle-ss04.png) |
| *Side-by-side editing, Quick Open, AI Refactor (`Ctrl + Shift + K`), Run in Terminal* | *Interactive chat assistant with live CWD, Git branch, and command context* |

---

## 💡 Highlights

- 🤖 **100% Local AI Intelligence**: Instant natural language command synthesis (`Ctrl + K`), automated error remedies, and context-aware Copilot chat powered completely offline by Ollama. ([Details](docs/FEATURES.md#1--natural-language-command-generator-ctrl--k))
- ⚡ **Zero-Lag Terminal Core**: Rust PTY engine with 32KB output coalescing, multi-byte UTF-8 boundary protection, and 2D Canvas acceleration for immediate 0ms startup. ([Details](docs/FEATURES.md#10--high-performance-pty--zero-lag-2d-canvas-acceleration))
- 🪟 **Flexible Multi-Pane Splits**: Split any tab into 2, 3, or 4 terminals across 10 visual presets with draggable neon dividers and keyboard resizing. ([Details](docs/FEATURES.md#5--flexible-multi-pane-split--draggable-resizing-1-to-4-panes))
- 📝 **Embedded Code Editor**: Side-by-side editing (`Ctrl + E`), quick file open, AI code refactoring (`Ctrl + Shift + K`), and in-terminal script execution with safety checks. ([Details](docs/FEATURES.md#4--embedded-lightweight-code-editor--ai-code-assistant-ctrl--e))
- 📂 **Rich File Tree Explorer**: Real-time CWD tracking (`/proc/<pid>/cwd`), language-colored badges, clickable breadcrumbs, indent guides, and right-click context menu. ([Details](docs/FEATURES.md#3--left-sidebar-file-tree-explorer-ctrl--b))
- 🐙 **Integrated Git & GitHub Hub**: Status bar quick popover, one-click push/pull, local AI conventional commit generator, and syntax-highlighted diff viewer. ([Details](docs/FEATURES.md#14--git--github-integration-local-ai-commits--pushpull-policy))
- 🖼️ **Kitty Graphics Protocol**: Native inline image rendering and graphics support for CLI/TUI tools (`fastfetch`, `yazi`, Neovim `image.nvim`) with strict `$HOME/Pictures` sandboxing and decompression bomb protection. ([Details](docs/FEATURES.md#16--kitty-graphics-protocol-support--strict-security-sandboxing))
- 🎨 **22 Cyberpunk & Neon Themes**: Vibrant UI glow synchronization, custom wallpaper support with frosted glass blur, and built-in Nerd Font typography. ([Details](docs/FEATURES.md#11--22-premium-themes--high-voltage-neon-collection))

> 📖 **Looking for in-depth feature specifications?** See the full [Feature Guide (docs/FEATURES.md)](docs/FEATURES.md).

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
| `Ctrl + B` | Toggle **File Tree Sidebar** |
| `Ctrl + E` | Toggle **Embedded Code Editor** |
| `Ctrl + Shift + F` | Toggle **In-Terminal Log Search** |
| `Ctrl + T` | Open new terminal tab |
| `Ctrl + W` | Close active terminal tab |
| `Ctrl + Shift + S` | **Swap panes** in current split tab |
| `Alt + 1 ~ 4` | Switch layout (**Single, 2-Split, 3-Split, 4-Split Grid**) |
| `Ctrl + ,` | Open **Settings** (Themes, Fonts, Ollama, Wallpapers, Git) |
| `Esc` | Close active modal, search overlay, or popover |

> 💡 For the complete keybindings list, see [docs/FEATURES.md](docs/FEATURES.md#️-complete-keybindings-reference).

---

## 🔒 Security & Architecture (Overview)

Waddle operates under a strict **100% offline, local-first** model:
- **Zero Cloud Leakage**: No telemetry, analytics, or external API keys; all AI prompts and terminal streams remain on your local machine.
- **Multi-Layer Defense**: System directory prefix guards (`/etc`, `/usr`, etc.), user credential shields (`~/.ssh`, `~/.gnupg`), indirect prompt injection delimiters, and word-boundary destructive command interception.
- **Robust POSIX PTY**: Memory-safe Rust core with 32KB output coalescing, UTF-8 multi-byte carry-over, and clean process group termination (`SIGHUP`/`SIGTERM`).

> 📐 Explore the system design in the [Architecture Guide (docs/ARCHITECTURE.md)](docs/ARCHITECTURE.md).  
> 🛡️ Review our comprehensive safety policies in [SECURITY.md](SECURITY.md).

---

## 🤖 About This Project (AI Vibe Coding)

> [!IMPORTANT]
> ### 💡 AI Vibe Coding Project
> **Waddle** is an **AI Vibe Coding** project created through real-time interactive pair programming with **Google DeepMind's Antigravity (Gemini)**.
> Combining human architectural vision with agentic AI pair programming, the entire system—from low-level Rust PTY process management, Linux `/proc/<pid>/cwd` tracking, WebKitGTK Wayland optimizations, React 19 UI, transparent Canvas rendering, local Ollama streaming client, to the embedded code editor—was designed and built in full flow.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

<p align="center">
  Crafted via <strong>AI Vibe Coding</strong> 🐧⚡ · Built with ❤️ for Linux Developers
</p>

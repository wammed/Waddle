<div align="center">

# 🐧⚡ Waddle
### AI-Integrated Next-Generation Linux Terminal Emulator

![Banner](./images/waddle-banner.svg)

[![Built with Tauri](https://img.shields.io/badge/Tauri-2.0-24C8D8?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.98+-orange?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Ollama](https://img.shields.io/badge/Ollama-Local_AI-white?style=for-the-badge&logo=ollama&logoColor=black)](https://ollama.com/)
[![Platform](https://img.shields.io/badge/Platform-Linux_(Wayland_/_X11)-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://www.kernel.org/)
[![Vibe Coding](https://img.shields.io/badge/Built_with-AI_Vibe_Coding-8A2BE2?style=for-the-badge&logo=sparkles&logoColor=white)](#-about-this-project--ai-vibe-coding)
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

## 🤖 About This Project (AI Vibe Coding)

> [!IMPORTANT]
> ### 💡 AI Vibe Coding Project
> **Waddle** is an **AI Vibe Coding** project created through real-time interactive pair programming with **Google DeepMind's Antigravity (Gemini)**.
> Combining human architectural design with agentic AI pair-programming, the entire project—from low-level Rust PTY management, Linux `/proc/<pid>/cwd` tracking, WebKitGTK Wayland optimization, React 19 UI, transparent xterm.js rendering, local Ollama streaming client, to the embedded code editor—was designed and implemented in full flow.

---

## 🌟 Key Features

### 1. 🤖 Natural Language Command Generator (`Ctrl + K`)
- Type your intent in natural language (English, Japanese, etc.), and local Ollama models instantly generate the exact Linux command with clear explanations.
- Destructive commands (e.g., `rm -rf`, disk partitioning) are automatically flagged with danger warning badges.
- Press `Enter` to insert into the terminal, or `Ctrl + Enter` to execute immediately.

### 2. 🖼️ Custom Background Wallpapers & Native File Picker (`Ctrl + ,`)
- **Native OS File Dialog**: Browse and pick any local image (PNG, JPG, SVG, WebP, GIF, BMP) directly using the Linux native file chooser (`zenity` / `kdialog`).
- **Optimized Asset Protocol & Dedicated Storage**: Images are saved and loaded directly from `~/.config/waddle/wallpapers/` using Tauri v2's secure `protocol-asset`, keeping `config.json` featherlight (~480 bytes).
- **Sub-Millisecond 0ms Startup**: Asynchronous image decoding (`decoding="async"`) off the main thread with GPU hardware isolation (`contain: strict`) ensures instantaneous terminal launch even with 4K wallpapers.
- **Opacity & Blur Controls**: Real-time slider adjustments for image opacity (10%–100%) and frosted glass blur (0–20px) with automatic contrast overlay for crystal-clear terminal text readability.

### 3. 📝 Embedded Lightweight Editor & AI Code Assistant (`Ctrl + E`)
- Seamlessly toggle a side-by-side code editor right inside your terminal.
- **Quick Open & Save**: Browse files in the current working directory, open by path, and save changes (`Ctrl + S`).
- **Run in Terminal**: Send scripts (Python, Bash, JS/TS, Rust, etc.) directly into the active shell with one click.
- **AI Edit (`Ctrl + Shift + K`)**: Instruct Ollama to refactor, add error handling, or generate code directly inside the editor.

### 4. 🚨 Intelligent Error Diagnosis & One-Click Fixes
- Automatically detects failed commands (non-zero exit codes or stderr keywords) and displays an actionable smart banner.
- With one click, local AI analyzes why the command failed and suggests a verified remedy command you can run instantly.

### 5. 💬 Context-Aware AI Copilot Sidebar
- Interactive chat assistant with real-time awareness of your terminal context: CWD (`pwd`), Git branch & dirty status, and recent command history.
- Run, insert, or copy code snippets directly from Markdown response blocks.

### 6. 🦙 Auto-Discovery of Local Ollama Models (100% Private & Offline)
- Automatically detects installed Ollama models (`llama3.2`, `deepseek-r1`, `qwen2.5-coder`, `codellama`, `mistral`, etc.).
- Switch models on the fly from the Settings modal (`Ctrl + ,`).
- **Zero API keys, zero cloud dependencies, zero data leakage.**

### 7. ⚡ High-Performance PTY & Hardware-Accelerated Canvas Rendering
- Native Rust pseudo-terminal manager (`portable-pty`) with sub-millisecond latency.
- Accurate real-time directory tracking via Linux `/proc/<pid>/cwd` with smart fast-path Git discovery.
- Hardware-accelerated 2D Canvas rendering (`@xterm/addon-canvas`) over transparent background, TrueColor (24-bit), and full Nerd Fonts & Powerline glyph support.
- Synchronous `localStorage` state cache for instant Frame 0 render without IPC delay.

### 8. 🎨 13 Premium Themes & Dynamic UI Color Sync
- **13 Built-in Designer Themes**:
  - **Waddle Cyber (Default)**, **Tokyo Night**, **Catppuccin Mocha**, **Dracula**
  - **Nord (Arctic)**, **Gruvbox Dark**, **One Dark Pro**, **Rosé Pine**
  - **Monokai Pro**, **Cyberpunk 2077**, **Solarized Dark**, **Synthwave '84**, **Midnight Abyss (OLED Pure Black)**
- **Full UI Synchronization**: Window titlebar, tabs, borders, status bar, and modal accents dynamically adapt to the selected theme.
- **Nerd Fonts**: Presets for **JetBrainsMono Nerd Font**, **MesloLGS NF**, **FiraCode Nerd Font**, **Hack Nerd Font**, or custom local fonts with automatic glyph fallback.

---

## ⌨️ Keybindings

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + K` | Open **AI Command Generator** |
| `Ctrl + E` | Toggle **Embedded Code Editor** |
| `Ctrl + S` *(in editor)* | Save file |
| `Ctrl + Shift + K` *(in editor)* | Open **AI Code Edit / Refactor** |
| `Ctrl + T` | Open new terminal tab |
| `Ctrl + W` | Close current terminal tab |
| `Ctrl + ,` | Open **Settings** (Ollama model, wallpaper, themes, fonts) |
| `Enter` *(in AI modal)* | Insert generated command into terminal |
| `Ctrl + Enter` *(in AI modal)* | Execute generated command immediately |
| `Esc` | Close active modal / popup |

---

## 🏗️ Architecture

```mermaid
graph TD
    subgraph UI_Layer [Frontend: Tauri 2.0 Webview / React 19 + TypeScript]
        TermView[Terminal View: xterm.js + WebLinks + Fit + Transparency]
        WallLayer[Wallpaper Layer: Custom Image + Blur + Opacity Overlay]
        Editor[Embedded Editor: Quick Open + Run in Terminal]
        AIOverlay[AI Command Modal Ctrl+K / Smart Error Banner]
        Copilot[AI Copilot Sidebar: Context-Aware Chat]
        Settings[Settings Modal: Ollama Model & Wallpaper & Fonts]
    end

    subgraph Rust_Backend [Backend: Rust + Tauri Core]
        PtyMgr[PTY Manager: portable-pty + /proc/PID/cwd]
        AiCore[Ollama Client: Streaming / Tags / Generate]
        FileIO[File System: Read / Write / List]
        ConfigMgr[Config Manager: ~/.config/waddle/config.json]
    end

    subgraph System_Layer [Local Linux Environment]
        Shell[Linux Shell: /bin/bash, zsh, fish]
        Ollama[Local Ollama: http://localhost:11434]
    end

    TermView <-->|Tauri IPC Events| PtyMgr
    PtyMgr <--> Shell
    Editor <-->|File Commands| FileIO
    AIOverlay & Copilot & Editor <-->|AI Commands| AiCore
    AiCore <-->|REST / SSE Stream| Ollama
```

---

## 🚀 Quick Start

### 1. Prerequisites

- [Rust (Cargo)](https://rustup.rs/) (1.70+)
- [Node.js & npm](https://nodejs.org/) (Node 18+)
- [Ollama](https://ollama.com/) (Local AI engine)

### 2. Set Up Ollama

```bash
# Start Ollama server
ollama serve

# Pull your preferred local model(s)
ollama pull llama3.2
# Or coding-specialized model
ollama pull qwen2.5-coder
# Or reasoning model
ollama pull deepseek-r1
```

### 3. Run in Development Mode

```bash
# Clone the repository
git clone https://github.com/your-username/Waddle.git
cd Waddle

# Install dependencies
npm install

# Start development server
npm run tauri dev
```

---

## 📦 Production Build

To package Waddle into an optimized standalone binary or Linux bundle:

```bash
# Build all bundles (AppImage, deb, rpm)
npm run build:all

# Or build standalone AppImage only
npm run build:appimage
# (Note: NO_STRIP=true is set to ensure compatibility with modern Arch/CachyOS binutils)
```

### Output Artifacts:
- **Standalone Binary (~12–19 MB)**: `src-tauri/target/release/waddle`
- **AppImage Package**: `src-tauri/target/release/bundle/appimage/`
- **Debian/Ubuntu Package**: `src-tauri/target/release/bundle/deb/`

### System Installation Example:
```bash
sudo cp src-tauri/target/release/waddle /usr/local/bin/
```

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | [Tauri 2.0](https://tauri.app/) (with `protocol-asset`, `tray-icon`) |
| **Backend** | Rust, `portable-pty`, `tokio`, `reqwest`, `serde`, `base64` |
| **Frontend** | React 19, TypeScript, Vite, Vanilla CSS |
| **Terminal Core** | `@xterm/xterm`, `@xterm/addon-canvas`, `@xterm/addon-fit`, `@xterm/addon-web-links` |
| **Local AI Engine** | [Ollama](https://ollama.com/) (`/api/generate`, `/api/chat`, `/api/tags`) |
| **Native Integration** | GTK / Wayland Native File Chooser (`zenity` / `kdialog`), Linux `/proc` filesystem |
| **Icons & Markdown** | `lucide-react`, `react-markdown`, `remark-gfm` |

---

## 🔒 Privacy & Security

- **100% Offline & Local**: No telemetry, no third-party cloud API keys, and no command/log transmissions over the internet.
- **Complete Data Sovereignty**: Safe to use in enterprise, air-gapped, or sensitive internal networks.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Crafted via <strong>AI Vibe Coding</strong> 🐧⚡<br>
  Built with ❤️ for Linux Developers
</p>

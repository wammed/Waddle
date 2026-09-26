<div align="center">

# 🐧⚡ Waddle
### Next-Generation Linux Terminal Emulator with 100% Local AI Integration

![Banner](images/waddle-banner1.svg)

[![Built with Tauri](https://img.shields.io/badge/Tauri-2.0-24C8D8?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.80+-orange?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Ollama](https://img.shields.io/badge/Ollama-Local_AI-white?style=for-the-badge&logo=ollama&logoColor=black)](https://ollama.com/)
[![Platform](https://img.shields.io/badge/Platform-Linux_(Wayland_/_X11)-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://www.kernel.org/)
[![Tested On](https://img.shields.io/badge/Tested_On-CachyOS_(COSMIC)-00C49F?style=for-the-badge&logo=archlinux&logoColor=white)](#environment-notice)
[![Vibe Coding](https://img.shields.io/badge/Built_with-AI_Vibe_Coding-8A2BE2?style=for-the-badge&logo=sparkles&logoColor=white)](#vibe-coding)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<p align="center">
  <strong>Ultra-Fast PTY Core × 100% Local AI (Ollama) × Lightweight Embedded Editor × Dynamic Neon Themes</strong><br>
  A private, intelligent Linux terminal emulator that never leaks your data to external clouds.
</p>

<p align="center">
  <strong>English</strong> | <a href="README.ja.md">日本語</a>
</p>

</div>

---

<a id="environment-notice"></a>
> [!WARNING]
> ### ⚠️ Critical Environment Notice
> Waddle is developed, tested, and validated exclusively on **CachyOS with the COSMIC Desktop Environment**.  
> **Other desktop environments (KDE Plasma, GNOME, XFCE, etc.) or distributions are untested.** Due to differences in window managers, compositors, Wayland protocols, and font rendering, behavior and UI appearance may vary.

---

## 📸 Screenshots

| 🐧 Ultra-Fast Terminal & Background Wallpaper | 🤖 AI Command Assistant (`Ctrl + K`) |
| :---: | :---: |
| ![Terminal View](images/screenshots/waddle-ss01.png) | ![AI Command Assistant](images/screenshots/waddle-ss02.png) |
| *CachyOS, Fish Shell, Powerline Nerd Fonts & Transparent Cyberpunk Wallpaper* | *Natural language command generation, destructive action warnings & instant execution* |

| 📝 Lightweight Embedded Editor (`Ctrl + E`) | 💬 Context-Aware AI Copilot Sidebar |
| :---: | :---: |
| ![Embedded Editor](images/screenshots/waddle-ss03.png) | ![AI Copilot Sidebar](images/screenshots/waddle-ss04.png) |
| *2-pane split editing, quick file open, AI refactoring (`Ctrl + Shift + K`)* | *Interactive assistant aware of CWD, Git branch, and recent command history* |

---

## 🚀 Quick Start

### 1. Prerequisites

- **Validated OS**: **CachyOS + COSMIC Desktop Environment**
  - *Note: Other desktop environments or distributions are untested.*
- [Rust (Cargo)](https://rustup.rs/) (1.80+, latest Stable recommended / Tested: 1.98.1)
- [Node.js & npm](https://nodejs.org/) (Node 18+, recommended: Node 20 LTS)
- **Tauri 2.0 / WebKitGTK System Build Dependencies**:
  - **Arch Linux / CachyOS**:
    ```bash
    sudo pacman -S base-devel webkit2gtk-4.1 openssl
    ```
  - **Debian / Ubuntu / Pop!_OS**:
    ```bash
    sudo apt install build-essential libwebkit2gtk-4.1-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
    ```
  - *See also: [Tauri 2.0 Linux Prerequisites](https://v2.tauri.app/start/prerequisites/#linux)*
- [Ollama](https://ollama.com/) (Local AI Engine)
- **Nerd Fonts (Recommended)**: Waddle does not bundle fonts. For optimal icon and powerline glyph rendering, installing JetBrainsMono NF or FiraCode NF on your host system is recommended (see [Fonts & Licensing](#fonts--licensing)).

### 2. Ollama Setup

```bash
# Start the Ollama daemon
ollama serve

# Pull recommended model (fast & lightweight)
ollama pull llama3.2

# Or pull a coding-specialized model
ollama pull qwen2.5-coder
```

### 3. Launch Development Mode

```bash
# Clone repository
git clone https://github.com/wammed/Waddle.git
cd Waddle

# Install dependencies & launch dev server
npm install
npm run tauri dev
```

### 4. Production Build & Packaging

```bash
# Build native Pacman package (.pkg.tar.zst) for Arch Linux / CachyOS
npm run package

# Install package (Arch Linux / CachyOS / Manjaro):
sudo pacman -U src-tauri/target/release/bundle/pacman/waddle-0.1.0-1-x86_64.pkg.tar.zst
```
*Standalone binary output: `src-tauri/target/release/waddle` (~18 MB).*

---

## 💡 Key Features

- 🤖 **100% Local AI Integration**: Powered by Ollama with zero external telemetry. Provides command generation (`Ctrl + K`), autonomous error diagnostics (Watchdog), and context-aware chat.
- ⚡ **Zero-Latency PTY Core**: 32KB output coalescing and kernel-coordinated flow control guarantee instant responsiveness and sub-300MB memory usage even under high-throughput streaming.
- 📝 **Lightweight Config-Focused Editor (`Ctrl + E`)**: Purpose-built for config files (dotfiles, YAML, TOML, JSON, env) and scripts. Fast dual-layer architecture, ReDoS prevention, UID ownership verification, and 6-generation AutoSave.
- 🪟 **Flexible Multi-Pane Splitting**: 1 to 4 split panes with 10 presets, keyboard/drag resizing, pane swapping, and instant zoom (`Alt + Z`).
- 🖼️ **Kitty Graphics Protocol Support**: Direct in-terminal image rendering for CLI/TUI tools (`yazi`, `ranger`, `fastfetch`) protected by a strict security sandbox.
- 🛡️ **Rust-Native Security Boundary (`CommandPolicy`)**: Deterministic evaluation (`Safe`, `Review`, `Block`) on every command, SSRF prevention with static DNS Pinning, and live secret masking (`SecretMasker`).
- 🎨 **22 Neon Themes & Custom Wallpapers**: 60 FPS real-time blur/opacity preview and seamless compatibility with locally installed Nerd Fonts.

> 📖 **For exhaustive specifications of all 24 features and the editor design matrix, see [💡 Feature Specifications (docs/FEATURES.md)](docs/FEATURES.md).**

---

## ⌨️ Essential Shortcuts

| Shortcut | Description |
| :--- | :--- |
| `Ctrl + K` | Open **AI Command Generator** modal |
| `Ctrl + E` | Toggle **Lightweight Embedded Editor** |
| `Ctrl + B` | Toggle **File Tree Sidebar** |
| `Alt + 1 ~ 4` | Switch Layout (**Single, 2-Split, 3-Split, 2x2 Grid**) |
| `Alt + Z` | **Zoom / Unzoom** active split pane |
| `Ctrl + T` / `Ctrl + W` | Open new terminal tab / Close active tab |
| `Ctrl + Shift + H` | Open **Session Timeline & History** modal |
| `Ctrl + Shift + F` | Toggle **Terminal Log Search** bar |
| `Ctrl + ,` | Open **Settings Modal** (theme, fonts, AI, wallpaper, etc.) |

> 📖 **For complete keybindings including editing shortcuts, clipboard synchronization, and split-pane fine tuning, see [⌨️ Shortcuts & Operations Guide (docs/SHORTCUTS.md)](docs/SHORTCUTS.md).**

---

## 📚 Documentation Portal

Detailed technical documentation and guides are organized under `docs/`:

- **[📚 Documentation Portal (docs/PORTAL.md)](docs/PORTAL.md)**: Central hub and index of all project documentation
- **[💡 Feature Specifications (docs/FEATURES.md)](docs/FEATURES.md)**: Comprehensive deep dive into all 24 features & architecture decisions
- **[⌨️ Shortcuts Guide (docs/SHORTCUTS.md)](docs/SHORTCUTS.md)**: Complete keybinding reference and navigation guide
- **[📐 Architecture Guide (docs/ARCHITECTURE.md)](docs/ARCHITECTURE.md)**: PTY engine, IPC boundaries, WebKitGTK optimization
- **[🛡️ Security Policy (docs/SECURITY.md)](docs/SECURITY.md)**: Threat modeling, defense-in-depth, SSRF/DNS Pinning specs
- **[🧪 Test Plan & QA (docs/TEST_PLAN.md)](docs/TEST_PLAN.md)**: Multi-layer testing suite, coverage dashboards, memory audit

---

## 🧪 Testing & Quality Assurance

Waddle includes an automated multi-layer test suite connected with Git hooks (Lefthook):

```bash
# Run the full automated test suite (Security + Unit/Coverage + Visual + Memory)
npm run test:all

# Run individual test layers
npm run test:unit      # Vitest (V8 coverage) + Cargo test
npm run test:security  # Gitleaks + Secretlint + cargo-audit + cargo-deny
```

*See [Test Plan (docs/TEST_PLAN.md)](docs/TEST_PLAN.md) for full verification details.*

---

<a id="vibe-coding"></a>
## 🤖 About This Project (AI Vibe Coding)

> [!IMPORTANT]
> ### 💡 Built with AI Vibe Coding
> **Waddle** was built through interactive pair-programming (AI Vibe Coding) with **Google DeepMind's Antigravity (Gemini)**.
> Combining human architectural direction with AI-driven implementation and optimization, every component was built from scratch — from low-level Rust POSIX PTY process supervision and `/proc/<pid>/cwd` live path tracking to WebKitGTK tuning, React 19 frontend, transparent xterm.js rendering, local Ollama streaming, and safe in-terminal editing.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

For detailed information regarding our source-code-only distribution policy, third-party dependency compliance (`cargo-deny` permissive policy), dynamic linking of system libraries (GTK3, WebKitGTK), and guidance on extracting dependency notices for redistributable packaging, please see [LICENSES.md](LICENSES.md). An in-app **About / Licenses** section is also available directly in the application Settings (`Ctrl + ,`).

### Fonts & Licensing

Waddle **supports Nerd Fonts** but **does not bundle or redistribute font files**.

The application references fonts installed on the user's host operating system through local `font-family` declarations. Users who wish to utilize Nerd Font presets or icon glyphs should install the corresponding fonts themselves on their host system. For the best compatibility with predefined settings, installing font families listed in Waddle's Presets is recommended:

* JetBrains Mono / JetBrainsMono Nerd Font
* MesloLGS NF / MesloLGS Nerd Font
* Fira Code / FiraCode Nerd Font
* Hack / Hack Nerd Font
* Cascadia Code / CaskaydiaCove Nerd Font
* Source Code Pro / SauceCodePro Nerd Font
* Symbols Nerd Font Mono / Symbols Nerd Font

Waddle also supports standard system UI font stacks such as `Inter`, `Outfit`, `system-ui`, and platform-provided sans-serif/monospace fonts.

These font files are **not included in the Waddle source repository or distribution packages**. Users who install third-party fonts are responsible for obtaining and using them in accordance with their respective licenses.

Because Waddle does not redistribute these font binaries, their individual font licenses are not incorporated into the Waddle distribution.

<p align="center">
  Crafted via <strong>AI Vibe Coding</strong> 🐧⚡ · Built with ❤️ for Linux Developers
</p>

# Waddle Project AI Rules & Context (Private Rules)
> **Location**: `.waddle/rules.md`  
> **Target Locales**: English (`en-US`, `en-GB`)  
> **Scope**: Applied with top priority when working within this repository and all of its subdirectories.  
> *Note: When navigating outside this repository, Waddle automatically falls back to `~/.config/waddle/rules.md` (Global Rules).*

---

## 1. Project Overview & Tech Stack Context
This project is **Waddle**, a high-performance, privacy-first, 100% offline developer terminal and workstation.

- **Core Technology Stack**:
  - **Desktop Core**: Tauri v2 (Rust + WebKitGTK / WebView2)
  - **Backend (Rust)**: Tokio async runtime, `portable-pty` (PTY & process lifecycle), `flate2` (zlib decompression for Kitty graphics)
  - **Frontend (TypeScript / React)**: React 18, Vite, xterm.js (Canvas renderer), Lucide React
  - **AI Integration**: Ollama (local LLM HTTP client with line-buffered SSE streaming)
- **Standard Toolchain & Build Commands**:
  - Node.js / Frontend: `npm` (`npm run build`, `npm run dev`)
  - Rust Backend: `cargo` (`cargo test --manifest-path src-tauri/Cargo.toml`, `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets`)
  - Release Packaging: `npm run tauri build`

---

## 2. Command Execution Policy (for AI / `Ctrl + K`)
When proposing terminal commands in `Ctrl + K`, the Autonomous Watchdog, or Visual Pipeline Builder, the AI must strictly obey these safety rules:

- **Strict Ban on Destructive Operations**:
  - Never propose wipe commands like `rm -rf /`, wiping the root filesystem, or deleting the root of `$HOME`.
  - Never propose formatting drives (`mkfs.*`, raw `dd if=... of=/dev/sd*`) or writing to unverified block devices.
- **Safe Git Practices**:
  - Always prefer `--force-with-lease` over raw `--force` when force pushes are requested.
  - Suggest inspecting changes with `git diff` or `git status -s` prior to committing.
- **Least Privilege Principle**:
  - Avoid unnecessary `sudo` invocations; prefer user-space operations whenever possible.

---

## 3. Coding Standards & Architectural Guidelines
When proposing or modifying Waddle's codebase (Rust or TypeScript), adhere to these standards:

- **Rust Backend (`src-tauri/src/`)**:
  - Avoid unhandled `.unwrap()` or `.expect()` in production code. Use pattern matching or `?` with `Result<T, E>` and `Option<T>`.
  - Implement backpressure and size limits for PTY streams and filesystem operations to prevent memory exhaustion (DoS).
  - Ensure all code compiles cleanly with zero `cargo clippy` warnings.
- **TypeScript / React Frontend (`src/`)**:
  - Use functional components with React Hooks, keeping state modular and types strict (avoid arbitrary `any`).
  - Rely on CSS Custom Properties (`--theme-*`) for theming, neon glows, and real-time wallpaper integration.
  - Maintain smooth 60 FPS interactions with proper debouncing and lightweight event handlers.

---

## 4. Git Commit Conventions (Conventional Commits)
When generating commit messages, strictly follow the Conventional Commits specification:

- **Format**: `<type>(<scope>): <short description in imperative mood>`
- **Standard Types**:
  - `feat`: A new feature
  - `fix`: A bug fix
  - `refactor`: Code changes that neither fix a bug nor add a feature
  - `perf`: Performance improvements
  - `docs`: Documentation updates
  - `test`: Adding or correcting tests
  - `style`: Formatting, whitespace, or visual styling changes (no logic changes)
  - `chore`: Maintenance, build tasks, dependency updates
- **Language**: English or Japanese concise summary in line with repository commit history.

---

## 5. Security Guardrails & Privacy
- **100% Offline, Privacy First**:
  - Never send telemetry, user prompts, or logs to external cloud APIs. All AI interactions must target local Ollama endpoints.
- **Secret Redaction**:
  - Never leak API keys (GitHub, AWS, OpenAI, etc.), private keys (`id_rsa`, `id_ed25519`), or access tokens into generated code, logs, or commit messages.
- **Filesystem Isolation**:
  - Never write to or delete protected shell profiles (`~/.bashrc`, `~/.zshrc`, `~/.profile`) or keyring/SSH stores (`~/.ssh`, `~/.gnupg`).
  - Respect large directory safety boundaries (500-item pagination) to prevent UI thread freezing.
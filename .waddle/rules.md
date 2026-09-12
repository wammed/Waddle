# Waddle Project AI Rules & Context
> **Location**: `<PROJECT_ROOT>/.waddle/rules.md`  
> **Target Locales**: English (`en-US`, `en-GB`)  
> This file is referenced by Waddle's local AI (`Ctrl + K` command generation, Copilot chat, and Git commit generator).  
> Customize the rules below to fit your project requirements.

## 1. Project Overview & Tech Stack
- Project Type: Tauri 2.0 + React 19 + Rust Desktop Application
- Core Languages: Rust 1.70+, TypeScript / JavaScript (Node 18+)
- Package Manager: npm (Note: do NOT use yarn, pnpm, or bun)
- Build Tools: Cargo, Vite

## 2. Command Execution Policy (Ctrl + K / Pipelines)
When the AI proposes or generates terminal commands, strictly adhere to the following rules:
- Package Management:
  - Always use npm when adding packages or running scripts (e.g., `npm install <pkg>`, `npm run dev`).
  - When suggesting system package installation commands, prioritize Arch Linux / CachyOS and use `sudo pacman -S <pkg>`.
- Destructive Command Restrictions:
  - Never suggest `rm -rf /` or deleting the entire current directory (`rm -rf ./*`).
  - Do not suggest `git push --force`; explicitly specify `--force-with-lease` if force-push is necessary.
- Formatting & Linting:
  - Frontend: `npm run lint` / `npm run format`
  - Backend: `cargo fmt --check` / `cargo clippy`

## 3. Coding Standards & Architectural Guidelines (Ctrl + E / Copilot)
Guidelines for in-editor refactoring (`Ctrl + Shift + K`) and Copilot chat code suggestions:
- Rust (Backend):
  - Avoid `unwrap()`; use `Result` / `Option` alongside `anyhow` / `thiserror` for idiomatic error handling.
  - Comply with tokio runtime conventions for asynchronous tasks.
  - When handling PTY and OS processes, ensure zombie process prevention and reliable cleanup.
- React / TypeScript (Frontend):
  - Use function components + Hooks exclusively (class components are deprecated).
  - Styling must follow Tailwind CSS or the project's CSS Modules guidelines.
  - Avoid excessive inline styles; make active use of CSS Custom Properties (theme variables).

## 4. Git Commit & Branching Conventions (Conventional Commits)
Rules for automated commit message generation via the status bar Git integration hub:
- Commit Message Format:
  `<type>(<scope>): <short description in imperative mood>`

  `[optional body]`
- Types:
  - `feat`: A new feature
  - `fix`: A bug fix
  - `refactor`: Code refactoring without behavioral changes
  - `perf`: Performance improvements
  - `style`: Code style or formatting adjustments
  - `docs`: Documentation changes
  - `chore`: Build process, tooling, or dependency updates
- Branch Prefixes:
  - Feature development: `feature/`
  - Bug fixes: `fix/`
  - Maintenance & research: `chore/`

## 5. Security & Privacy Guardrails
- Secret Masking & Credentials:
  - Never include API keys, passwords, private keys (`.pem`, `.key`), or access tokens in generated code, commit messages, or shell logs.
- Sandbox Awareness:
  - When manipulating files or paths, ensure suggestions avoid unintended directory traversal (`../`) outside the project root.

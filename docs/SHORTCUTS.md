# ⌨️ Waddle Keyboard Shortcuts & Operations Guide

Complete reference of keyboard shortcuts and interactions available in Waddle.  
Quickly access terminal navigation, local AI assistance, multi-pane splitting, lightweight configuration editing, and Git controls.

> 🌐 **English** | [日本語](SHORTCUTS.ja.md)

---

## 📑 Contents
1. [🤖 AI Assistance & Command Generation](#1--ai-assistance--command-generation)
2. [🪟 Terminal & Multi-Pane Management](#2--terminal--multi-pane-management)
3. [📋 Copy & Paste (Clipboard Synchronization)](#3--copy--paste-clipboard-synchronization)
4. [📝 Lightweight Embedded Editor (`Ctrl + E`)](#4--lightweight-embedded-editor-ctrl--e)
5. [🔍 Search & Session History](#5--search--session-history)
6. [🐙 Git & Settings](#6--git--settings)
7. [⌨️ Complete Shortcuts Reference Table](#7-️-complete-shortcuts-reference-table)

---

## 1. 🤖 AI Assistance & Command Generation

Powered by your local Ollama instance with zero external cloud dependencies.

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `Ctrl + K` | Global | Open **AI Command Generator modal** |
| `Enter` | AI Modal | Insert generated command into the terminal prompt (review/edit before running) |
| `Ctrl + Enter` | AI Modal | **Execute generated command immediately** in the active terminal |
| `Esc` | AI Modal | Close modal |

> 💡 **Safety by Design**: Dangerous commands (e.g. `rm -rf /`) are flagged with warning badges evaluated deterministically by the native Rust `CommandPolicy` engine.

---

## 2. 🪟 Terminal & Multi-Pane Management

Waddle supports 1 to 4 split panes with 10 built-in layout presets.

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `Ctrl + T` | Global | Open a new terminal tab |
| `Ctrl + W` | Global | Close the current terminal tab |
| `Ctrl + Shift + W` | Split Pane | Close **only the active split pane** |
| `Ctrl + Shift + S` | Split Pane | **Swap pane positions** |
| `Alt + 1` | Global | Switch to **Single Pane (1-up)** layout |
| `Alt + 2` | Global | Switch to **Horizontal Split (2-up)** layout |
| `Alt + 3` | Global | Switch to **Left Main Split (3-up)** layout |
| `Alt + 4` | Global | Switch to **2x2 Grid (4-up)** layout |
| `Alt + Z` | Split Pane | **Zoom / Unzoom active pane** (maximize & restore) |
| `Alt + Arrow Keys` | Split Pane | Shift focus between split panes |
| `Ctrl + Alt + Arrow Keys` | Split Pane | Fine-tune split ratios in 5% increments |

---

## 3. 📋 Copy & Paste (Clipboard Synchronization)

Full clipboard parity across terminal sessions, embedded editor, and host applications (Firefox, VS Code, Wayland/XWayland).

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `Ctrl + C` (with selection) | Terminal | **Copy selection to clipboard** |
| `Ctrl + C` (without selection)| Terminal | Send standard **SIGINT (`^C`)** to interrupt running process |
| `Ctrl + Shift + C` | Terminal | Force copy selection |
| `Ctrl + V` / `Ctrl + Shift + V` | Terminal | Paste from clipboard into terminal |
| `Ctrl + Shift + A` | Terminal | Select all text in the terminal buffer |

---

## 4. 📝 Lightweight Embedded Editor (`Ctrl + E`)

Fast and safe in-terminal editing for config files (dotfiles, YAML, TOML, JSON, env) and scripts.

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `Ctrl + E` | Global | Toggle **Embedded Editor** drawer |
| `Ctrl + S` | Editor | Save active file (UID verification & atomic file write) |
| `Ctrl + A` | Editor | Select all text in active file |
| `Ctrl + C` / `X` / `V` | Editor | Copy / Cut / Paste |
| `Ctrl + Z` | Editor | Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Editor | Redo |
| `Ctrl + F` | Editor | Open **Exact Match Find bar** (ReDoS-free) |
| `Ctrl + H` | Editor | Open **Replace bar** |
| `Ctrl + Shift + K` | Editor | Trigger **AI Code Refactoring** |
| `Tab` / `Shift + Tab` | Editor | Soft tab (4 spaces) indent / unindent |

---

## 5. 🔍 Search & Session History

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `Ctrl + Shift + F` | Terminal | Toggle **Terminal Log Search** bar |
| `Enter` / `Shift + Enter` | Search Bar | Find next / previous match |
| `Ctrl + Shift + H` | Global | Open **Session Timeline & History Recovery** modal |
| `Ctrl + Shift + P` | Global | Open **Visual Pipeline Builder** modal |
| `Ctrl + B` | Global | Toggle **File Tree Sidebar** |

---

## 6. 🐙 Git & Settings

| Shortcut / Action | Context | Action |
| :--- | :--- | :--- |
| `Click Git Badge` | Status Bar | Open **Git Quick Popover** |
| `Ctrl + Enter` | Git Commit Input | Commit staged changes |
| `Ctrl + ,` | Global | Open **Settings Modal** (theme, AI, wallpaper, fonts, language) |
| `Esc` | Global | Close active modal, search bar, or popover |

---

## 7. ⌨️ Complete Shortcuts Reference Table

| Key | Context | Description |
| :--- | :--- | :--- |
| `Ctrl + K` | Global | 🤖 AI Command Generator |
| `Ctrl + E` | Global | 📝 Embedded Code Editor |
| `Ctrl + B` | Global | 📂 File Tree Sidebar |
| `Ctrl + T` / `W` | Global | New Tab / Close Tab |
| `Alt + 1 ~ 4` | Global | Layout Preset (Single / 2-Split / 3-Split / 2x2 Grid) |
| `Alt + Z` | Split Pane | Maximize / Restore Active Pane |
| `Ctrl + Shift + S` | Split Pane | Swap Pane Positions |
| `Ctrl + Shift + H` | Global | ⏳ Session Timeline & History |
| `Ctrl + Shift + P` | Global | 🔗 Visual Pipeline Builder |
| `Ctrl + Shift + F` | Terminal | 🔍 Search Terminal Output |
| `Ctrl + ,` | Global | ⚙️ Open Settings |
| `Esc` | Global | Close Modals & Popups |

---

> 📖 **To learn more about internal architecture, security models, and features, visit the [Documentation Portal (docs/PORTAL.md)](PORTAL.md).**

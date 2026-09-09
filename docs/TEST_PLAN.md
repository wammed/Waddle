# 🧪 Waddle Comprehensive Pre-Release Test Plan

This document provides a comprehensive, end-to-end test plan for **Waddle**, covering every feature implemented from initial development through the complete **Kitty Graphics Protocol** subsystem, as well as all **Defense-in-Depth Security Controls**.

---

## 1. Scope & Objectives

### 1.1 Objectives
- Systematically verify all core terminal functionality, split layouts, AI integrations, Git workflows, visual customizers, Kitty graphics rendering, and security guardrails against functional specifications.
- Provide exhaustive, reproducible verification criteria to uncover potential resource leaks, memory bloat, zombie processes, unauthorized filesystem access, prompt injections, and glyph rendering conflicts (tofu artifacts) prior to release.

### 1.2 Testing Scope
1. **PTY & Terminal Core** (10 Test Cases)
2. **Tabs, 10-Split Layouts & Session Persistence** (8 Test Cases)
3. **File Tree Sidebar & Embedded Editor** (8 Test Cases)
4. **AI Assistant & Context Integration** (6 Test Cases)
5. **Git Integration & Remote Guardrails** (8 Test Cases)
6. **Theming, UI Glow, Wallpapers & Icons** (6 Test Cases)
7. **Kitty Graphics Protocol (Complete Subsystem)** (14 Test Cases)
8. **Security Policy & Multi-Layer Safety Guardrails** (12 Test Cases)
9. **Performance, Resource Bounds & Leak Prevention** (5 Test Cases)
**Total: 77 Comprehensive Test Cases**

### 1.3 Prerequisites & Environment
- **Operating System**: Linux (Ubuntu 22.04+, Debian 12+, Arch Linux, etc., WebKitGTK 4.1 / 4.0)
- **Runtimes**: Node.js >= 20, Rust >= 1.75
- **Local Services**: Ollama (`http://localhost:11434`, Recommended: `qwen2.5-coder` or `llama3`)
- **CLI Tools**: `git`, `fastfetch`, `timg`, or bundled test harnesses (`scratch/*.mjs`)

---

## 2. Test Execution Methodology & Criteria

| Tier | Method | Pass Criteria |
| :--- | :--- | :--- |
| **Automated Tests** | `cargo test`, `npm run build`, `npx tsx scratch/*.mjs` | 0 errors, all test assertions PASS, 0 TypeScript compile errors |
| **Manual / Interactive** | UI interactions, keyboard shortcuts, mouse dragging | Smooth 60fps rendering, no UI freezes, exact state transitions |
| **Security Verification** | Adversarial boundary inputs (path traversal, dangerous commands) | All unauthorized actions blocked/warned at Rust / CSP / UI layers |

---

## 3. Detailed Test Cases

### Suite 1: PTY & Terminal Core

| ID | Feature Under Test | Execution Procedure | Expected Result | Type |
| :--- | :--- | :--- | :--- | :--- |
| **TC-PTY-01** | 0ms Synchronous Startup Handshake (`start_pty`) | Launch application and inspect initial prompt render time. | No race condition or initial blank frame; shell prompt and `fish_greeting` appear instantaneously at Frame 0. | Manual |
| **TC-PTY-02** | High-Throughput Streaming & 32KB Coalescing | Run `yes "Waddle High Speed Output Test 1234567890"` and interrupt with `Ctrl+C`. | Stream coalesces in 32KB chunks without UI freezing; `Ctrl+C` halts execution immediately with 0ms latency. | Manual |
| **TC-PTY-03** | UTF-8 Multibyte Boundary Slicing | Execute `python3 -c "print('🦀Terminal🚀JapaneseTextTest'*500)"`. | Multibyte characters split across chunk boundaries render cleanly with zero replacement glyphs (``) or corruption. | Manual |
| **TC-PTY-04** | CanvasAddon Hardware Rendering | Verify 2D Canvas renderer initialization and font clarity over wallpaper. | Zero WebGL shader compile delay; CanvasAddon delivers crisp, performant glyph rendering. | Manual |
| **TC-PTY-05** | Flicker-Free Resizing & FitAddon | Rapidly drag window borders to resize continuously. | Zero black frame blinking or canvas reconstruction; terminal rows/cols recalculate smoothly. | Manual |
| **TC-PTY-06** | Process Group Termination (POSIX) | Launch `sleep 500 &`, then close tab or app. Verify with `ps aux \| grep sleep`. | `libc::killpg` signals the entire process group (`SIGHUP`/`SIGTERM`/`SIGKILL`); no zombie processes persist. | Automated / Manual |
| **TC-PTY-07** | In-Terminal Log Search (`Ctrl+F`) | Press `Ctrl+F`, enter search query, and navigate with `Enter` / `Shift+Enter`. | Matches in scrollback buffer highlight yellow; match index counter (e.g. `2 / 8`) updates accurately. | Manual |
| **TC-PTY-08** | Clickable Hyperlinks (`WebLinksAddon`) | Print `https://github.com/wammed/Waddle` and `Ctrl+Click` the link. | Underline appears on hover; URL opens securely in default system desktop browser. | Manual |
| **TC-PTY-09** | Titlebar Refresh All (`#btn-refresh-all`) | Click `#btn-refresh-all` with multiple running tabs/panes; confirm in modal. | Modal dialog renders at top layer; on confirmation, terminates all PTYs and resets to single home pane cleanly. | Manual |
| **TC-PTY-10** | Working Directory (CWD) Tracking | Run `cd /var/log` in the active terminal. | Tab title, file tree view, and AI context sync immediately to new directory. | Manual |

---

### Suite 2: Tabs, 10-Split Layouts & Session Persistence

| ID | Feature Under Test | Execution Procedure | Expected Result | Type |
| :--- | :--- | :--- | :--- | :--- |
| **TC-TAB-01** | Tab Creation, Closing & Navigation | Press `Ctrl+T` to open 5 tabs, cycle through, and close active tab with `Ctrl+W`. | Each tab maintains independent PTY state; closed tab's PTY is cleanly killed without leaks. | Manual |
| **TC-TAB-02** | All 10 Split Layout Modes | Cycle through Single, 2-Split (V/H), 3-Split (4 modes), and 4-Split (3 modes) via toolbar. | All panes allocate correct viewport dimensions and accept simultaneous, independent input. | Manual |
| **TC-TAB-03** | 16px Wide Split Divider Mouse Resizing | Hover over divider line between panes and drag horizontally / vertically. | 16px wide hitbox enables effortless grab; split ratio transitions smoothly between 0.15 and 0.85. | Manual |
| **TC-TAB-04** | Keyboard Ratio Adjustment (`Ctrl+Alt+Arrows`) | Press `Ctrl+Alt+Left/Right/Up/Down` inside a split tab. | Split ratio resizes in precise 5% increments in the specified direction. | Manual |
| **TC-TAB-05** | Pane Swapping (`Ctrl+Shift+S`) | Press `Ctrl+Shift+S` inside a multi-pane split tab. | Panes swap positions instantly while preserving running PTY sessions, scrollback, and cursor state. | Manual |
| **TC-TAB-06** | Individual Pane Closing (`Ctrl+Shift+W`) | Focus one pane in a split layout and press `Ctrl+Shift+W`. | Only target pane's PTY terminates; sibling panes expand smoothly to fill vacated space. | Manual |
| **TC-TAB-07** | Session Auto-Save & Restoration | Configure multiple tabs, a 3-split layout, and distinct CWDs; quit and relaunch Waddle. | Complete session state restores from `localStorage`: tabs, layout, split ratios, and CWDs respawn automatically. | Manual |
| **TC-TAB-08** | Single-Pane Reset Shortcut (`Alt+1`) | Press `Alt+1` while in any multi-pane split layout. | Layout collapses instantly to a maximized single-pane view for the active terminal. | Manual |

---

### Suite 3: File Tree Sidebar & Embedded Editor

| ID | Feature Under Test | Execution Procedure | Expected Result | Type |
| :--- | :--- | :--- | :--- | :--- |
| **TC-FILE-01** | Sidebar Toggle & Breadcrumb Navigation (`Ctrl+B`) | Press `Ctrl+B` to toggle sidebar; click parent directory pill in top breadcrumb. | Smooth slide animation toggles sidebar; breadcrumb pills navigate directly to target directory. | Manual |
| **TC-FILE-02** | Language Badges & Icon Decorations | Inspect files with extensions: `.ts`, `.rs`, `.py`, `.json`, `.md`, `.sh`, `.css`, `.html`. | Dedicated colored badges (e.g. TS=blue, RS=orange) and matching Lucide icons display correctly. | Manual |
| **TC-FILE-03** | File Size & Child Count Badges with Indent Guides | Expand deeply nested folders in the tree. | File sizes (e.g. `4.2 KB`), child counts (e.g. `(12)`), and vertical Zed-style indent guides display cleanly. | Manual |
| **TC-FILE-04** | Large Directory 500-Item Guard | Expand folder containing >500 entries (e.g. `node_modules` or `/usr/bin`). | UI remains responsive; items are capped safely at 500 without crashing or hanging. | Manual |
| **TC-FILE-05** | Context Menu & Hover Actions | Right-click file; select "Insert Path into Terminal" or "Reveal in File Manager". | File path inserts into active terminal; OS file manager (e.g. Nautilus) opens target location. | Manual |
| **TC-FILE-06** | New File Creation & Inline Rename | Create new file/folder and rename existing entry inline in the tree. | Disk operations reflect immediately in UI; empty names and illegal characters are rejected. | Manual |
| **TC-FILE-07** | Embedded Editor Toggle & Save (`Ctrl+E`, `Ctrl+S`) | Open file in editor, modify content, and press `Ctrl+S`. | Syntax highlighting applies; changes persist to disk safely via backend filesystem command. | Manual |
| **TC-FILE-08** | AI Code Edit / Refactor (`Ctrl+Shift+K`) | Select code block in editor and press `Ctrl+Shift+K` with instructions. | AI diff viewer shows proposed additions/deletions; apply button updates code in-place. | Manual |

---

### Suite 4: AI Assistant & Context Integration

| ID | Feature Under Test | Execution Procedure | Expected Result | Type |
| :--- | :--- | :--- | :--- | :--- |
| **TC-AI-01** | Natural Language to Command (`Ctrl+K`) | Press `Ctrl+K` and enter: "Kill the process occupying port 8080". | Ollama streams back valid shell command (e.g. `fuser -k 8080/tcp`) with explanatory note. | Manual |
| **TC-AI-02** | Contextual Awareness (CWD, History, Git) | On a Git branch with uncommitted changes, ask to commit current work. | Branch name and change context populate prompt; generated command matches repository status. | Manual |
| **TC-AI-03** | Conversation Export (Markdown / JSON) | Click export button in AI modal and choose Markdown / JSON formats. | Blob download completes cleanly in WebKitGTK; formatted `.md` or `.json` saves to disk. | Manual |
| **TC-AI-04** | 64KB Memory Buffer Guard | Simulate excessive streaming response without newline breaks. | Buffer truncates at 64KB, neutralizing potential Denial of Service (DoS) memory exhaustion. | Automated |
| **TC-AI-05** | Remote Ollama Warning Banner | Set Ollama host to external address (e.g. `http://192.168.1.50:11434`). | Amber warning banner displays in Settings alerting user that data leaves local boundary. | Manual |
| **TC-AI-06** | Offline Graceful Degradation | Terminate local Ollama service and trigger `Ctrl+K`. | App handles failure gracefully, displaying user-friendly guide to run `ollama serve`. | Manual |

---

### Suite 5: Git Integration & Remote Guardrails

| ID | Feature Under Test | Execution Procedure | Expected Result | Type |
| :--- | :--- | :--- | :--- | :--- |
| **TC-GIT-01** | Status Bar Git Indicator & Popover | Modify files in a Git repository and click the branch indicator in status bar. | Dirty counts and Ahead/Behind badges illuminate; Git Quick Popover opens. | Manual |
| **TC-GIT-02** | GUI Diff Viewer | Select a modified file from popover to view diff. | Line additions (green) and deletions (red) render with syntax-highlighted side-by-side / unified view. | Manual |
| **TC-GIT-03** | AI Conventional Commit Generator | With staged/unstaged changes, click "Generate Commit Message". | Valid Conventional Commit message (e.g. `feat(scope): ...`) populates input field. | Manual |
| **TC-GIT-04** | Interactive `git push` & `git pull` | Click Push / Pull buttons when Ahead / Behind counts are non-zero. | Spinner animates; toast notification confirms success; Ahead/Behind counters reset to 0. | Manual |
| **TC-GIT-05** | Authentication Guidance (SSH / CLI) | Trigger Push without configured credentials. | Error banner displays clear steps to run `gh auth login` or add an SSH key. | Manual |
| **TC-GIT-06** | GitHub-Only Remote Policy (`restrict_to_github`) | Attempt Push/Pull in a repository pointing to non-GitHub remote (e.g. GitLab). | Operation aborts before invocation; warning confirms restriction to GitHub endpoints. | Automated / Manual |
| **TC-GIT-07** | Git Path Traversal Prevention (`git_discard_file`) | Request file discard with `../` escaping repo root. | Backend detects traversal attempt and returns `EACCES` error. | Automated |
| **TC-GIT-08** | Git Toggle & Zero-Polling Mode | Toggle "Enable Git Integration" OFF in Settings. | Background `git status` polling ceases entirely; status bar Git badge hides. | Manual |

---

### Suite 6: Theming, UI Glow, Wallpapers & Icons

| ID | Feature Under Test | Execution Procedure | Expected Result | Type |
| :--- | :--- | :--- | :--- | :--- |
| **TC-THM-01** | 22 Theme Switcher & Neon Glow Sync | Select each theme (including all 11 High-Voltage Neon themes) in Settings. | Terminal ANSI palette and app UI accent colors (`--accent-rgb`, borders, badges) sync instantly. | Manual |
| **TC-THM-02** | Swatch Ribbon & Live Terminal Preview | Open theme cards in Settings. | 16-color ANSI swatch ribbon and live mini-terminal preview card render accurately. | Manual |
| **TC-THM-03** | Custom Wallpaper Drag & Drop | Drop image file into Wallpaper settings drop zone. | File saves to `~/.config/waddle/wallpapers/` and displays beneath transparent terminal panes. | Manual |
| **TC-THM-04** | Wallpaper Opacity & Blur Sliders | Adjust opacity and blur sliders in Settings. | Wallpaper transparency and backdrop blur effects update in real-time. | Manual |
| **TC-THM-05** | Wallpaper Magic Byte Validation | Upload text/script file disguised with `.png` extension. | Rust backend magic byte check rejects upload with error banner. | Automated / Manual |
| **TC-THM-06** | Application Icon Fidelity | Verify app icon in desktop launcher, window dock, and titlebar. | Crisp rendering of `waddle-matte-icon.svg` without pixelation or outdated iconography. | Manual |

---

### Suite 7: Kitty Graphics Protocol (Complete Subsystem)

| ID | Feature Under Test | Execution Procedure | Expected Result | Type |
| :--- | :--- | :--- | :--- | :--- |
| **TC-KITTY-01** | APC Sequence Parsing & 0ms Stream Separation | Run `fastfetch --logo-type kitty` or `timg -pk`. | Base64 image payload extracts before xterm; terminal exhibits 0ms lag and zero frame drops. | Manual |
| **TC-KITTY-02** | Inline Image Rendering (`f=100`, `f=32`, `f=24`) | Transmit image sequences in PNG, RGBA, and RGB formats. | Graphic draws pixel-perfect on Canvas overlay layer beneath terminal text. | Scripted / Manual |
| **TC-KITTY-03** | Chunked Streaming (`m=1`, `m=0`) | Transmit image split into 4096-byte chunks with `m=1`. | Reassembles in memory buffer and renders complete graphic upon `m=0` terminator. | Scripted |
| **TC-KITTY-04** | Query Handshake (`a=q`) & Quiet Modes (`q`) | Transmit `a=q` sequence; test with `q=0` and `q=2`. | Terminal replies immediately with `OK` on `a=q`. `q=0` remains silent; `q=2` replies always. | Scripted / Manual |
| **TC-KITTY-05** | Temporary File Auto-Deletion (`t=t`) | Write image to `/tmp` and display via `t=t`. | Memory decodes image and Rust unlinks file immediately; zero leftover files on disk. | Automated |
| **TC-KITTY-06** | Cursor Advancement (`C=0` vs `C=1`) | Display image with `C=0` and `C=1`, followed by text output. | `C=0` advances cursor to bottom-right of graphic; `C=1` preserves initial cursor location. | Scripted |
| **TC-KITTY-07** | Automatic Bottom-Edge Scrolling | Display multi-row graphic near bottom row of terminal. | xterm automatically scrolls upward to ensure full graphic visibility within viewport. | Scripted |
| **TC-KITTY-08** | Viewport Boundary Partial Clipping | Scroll graphic partially beyond top or bottom viewport edges. | AABB intersection and UV sub-sampling scissor graphic smoothly without popping or disappearing. | Scripted |
| **TC-KITTY-09** | Texture Anchor Coordinate Tracking | Transmit title text and graphic within the same PTY chunk. | Graphic renders exactly at anchor coordinates following text, not offset at (0,0). | Scripted |
| **TC-KITTY-10** | Animation Loop (`v=0`) & Controls (`a=a`) | Display animated Kitty GIF; send pause/resume commands. | Loops perpetually on `v=0`; responds to `s=1` (stop) and `s=3` (run); clears timer on eviction. | Scripted |
| **TC-KITTY-11** | Source Sub-Rectangle Cropping (`x, y, w, h`) | Render sub-rectangle from sprite sheet via `x`, `y`, `w`, `h`. | Only the specified source pixel sub-rect scales and draws inside allocated cells. | Scripted |
| **TC-KITTY-12** | Virtual Placements (`U=1`) | Transmit graphic with `U=1`. | Image loads and retains slice metadata without reserving text buffer grid space. | Scripted |
| **TC-KITTY-13** | Unicode Placeholder (`U+10EEEE`) Decoding | Output `U+10EEEE` with 297 diacritics or TrueColor foreground. | Row/col index and image ID resolve; texture slice binds to corresponding placeholder cells. | Scripted |
| **TC-KITTY-14** | Placeholder Tofu (□) Glyph Suppression | Output `U+10EEEE` and inspect rendered character layer. | `TextRenderLayer._drawForeground` skips character pass; graphic renders without tofu box overwrite. | Scripted / Manual |

---

### Suite 8: Security Policy & Multi-Layer Safety Guardrails

| ID | Feature Under Test | Execution Procedure | Expected Result | Type |
| :--- | :--- | :--- | :--- | :--- |
| **TC-SEC-01** | System Directory Prefix Guard | Attempt writing/deleting in `/etc/hosts`, `/usr/bin/`, `/boot/`. | Rust canonical prefix check rejects operation immediately with `EACCES`. | Automated |
| **TC-SEC-02** | User Credential & Secret Protection | Attempt access to `~/.ssh/id_rsa`, `~/.gnupg/`, `~/.local/share/keyrings/`. | Advance validation rejects request before filesystem probing; zero data leakage. | Automated |
| **TC-SEC-03** | Shell Profile Protection | Attempt modifying `~/.bashrc`, `~/.zshrc`, or `~/.profile`. | Action blocked unconditionally; shell configuration tampering prevented. | Automated |
| **TC-SEC-04** | Word-Boundary Dangerous Command Interception | Issue `rm -rf /`, `mkfs`, `dd if=`, `git reset --hard`, `git push --force`. | `DangerousCommandModal` intercepts command and suspends execution. Harmless names (e.g. `format_disk`) pass. | Automated / Manual |
| **TC-SEC-05** | Piped Script Execution Detection | Issue `curl ... \| bash`, `wget ... \| python3`, `bash <(...)`. | Flagged as dangerous execution pattern; warning modal displays user confirmation options. | Automated / Manual |
| **TC-SEC-06** | AI Prompt Injection Defense | Feed output containing `</untrusted_terminal_output>` and trigger `Ctrl+K`. | XML delimiter sanitizes safely; LLM does not execute injected instructions. | Automated |
| **TC-SEC-07** | Webview Content Security Policy (CSP) | Attempt `fetch('https://unauthorized-domain.com')` from developer console. | Webview engine blocks connection under CSP `connect-src` restriction. | Manual |
| **TC-SEC-08** | Tauri Scoped Asset Protocol | Request `asset://localhost/home/user/.ssh/id_rsa`. | Asset protocol scope disallows path; access denied. | Automated |
| **TC-SEC-09** | Kitty Local File Sandbox (`$HOME/Pictures`) | Attempt loading `/etc/shadow` or `~/.ssh/` via `t=f`. | Rust `canonicalize` check fails sandbox validation; returns `EACCES`. | Automated |
| **TC-SEC-10** | Kitty Symlink Escape Prevention | Symlink `$HOME/Pictures/escape` to `/etc` and request via `t=f`. | Resolved path falls outside allowed sandbox; request rejected. | Automated |
| **TC-SEC-11** | Kitty Decompression Bomb Defense | Submit image with dimensions exceeding 4096×4096 px or malformed IHDR. | Header check catches violation prior to memory allocation; image discarded. | Automated |
| **TC-SEC-12** | Kitty Cumulative Payload Limit (16MB) | Transmit continuous Base64 payload exceeding 16MB. | Buffer terminates upon reaching threshold, neutralizing memory DoS attacks. | Automated |

---

### Suite 9: Performance, Resource Bounds & Leak Prevention

| ID | Feature Under Test | Execution Procedure | Expected Result | Type |
| :--- | :--- | :--- | :--- | :--- |
| **TC-PERF-01** | GPU VRAM / 256MB LRU & `bitmap.close()` | Stream >500MB of distinct images consecutively. | Textures evict upon exceeding 256MB; `ImageBitmap.close()` frees VRAM immediately. | Automated / Manual |
| **TC-PERF-02** | 0ms PTY Keystroke Latency | Measure typing latency and keystroke responsiveness under load. | Real-time 0ms response with zero perceived typing lag or input buffering delay. | Manual |
| **TC-PERF-03** | Long-Session Memory Stability | Run Waddle over extended session with active tabs, Kitty images, and Git polling. | Memory saturates at steady state without runaway heap growth or listener leaks. | Manual |
| **TC-PERF-04** | Idle CPU Consumption (0.0%) | Monitor CPU usage via `top` / `htop` while terminal is idle. | Zero polling overhead; CPU usage remains steady at 0.0% - 0.1%. | Manual |
| **TC-PERF-05** | Automated Tests & Static Lints | Run `cargo test`, `cargo clippy --all-targets`, and `npm run build`. | All 24 Rust tests PASS, 0 Clippy warnings, 0 TypeScript compile errors. | Automated |

---

## 4. Test Execution Commands Quick Reference

```bash
# 1. Run all backend security and Kitty unit tests (24 tests pass)
cargo test --manifest-path src-tauri/Cargo.toml

# 2. Run backend static analysis (Verify 0 warnings)
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets

# 3. TypeScript compilation & frontend production bundle (Verify 0 errors)
npm run build

# 4. Kitty Graphics sub-rectangle source clipping test
npx tsx scratch/test_sub_clipping.mjs

# 5. Kitty Graphics Unicode placeholder (U+10EEEE) & tofu suppression test (11 assertions)
npx tsx scratch/test_unicode_placeholder.mjs

# 6. Automated Security Enhancements validation test (dangerous commands & APC buffer cap)
npx tsx scratch/test_security_enhancements.mjs

# 7. Launch interactive desktop development environment
npm run tauri dev
```

---

## 5. Verification Sign-Off Template

```markdown
### Verification Sign-Off
- **Date**: YYYY-MM-DD
- **Tester / Evaluator**: [Name / Agent]
- **Environment**: Linux [Kernel / Distribution], WebKitGTK [Version], Node [Version], Rust [Version]
- **Overall Result**: [PASS / FAIL]

| Test Suite | Total | Passed | Failed | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Suite 1: PTY & Terminal Core | 10 | 10 | 0 | 0ms sync startup, 32KB coalescing verified |
| Suite 2: Tabs, 10-Split & Session | 8 | 8 | 0 | 16px divider, auto-restore verified |
| Suite 3: File Tree & Editor | 8 | 8 | 0 | 500-item guard, language badges verified |
| Suite 4: AI & Context Integration | 6 | 6 | 0 | 64KB guard, prompt context injection verified |
| Suite 5: Git Integration & Guardrails | 8 | 8 | 0 | GitHub-only policy, Diff preview verified |
| Suite 6: Theming, UI & Wallpapers | 6 | 6 | 0 | 11 neon themes glow sync, MagicBytes verified |
| Suite 7: Kitty Graphics Protocol | 14 | 14 | 0 | Tofu suppression, clipping, animations verified |
| Suite 8: Security & Guardrails | 12 | 12 | 0 | Path traversal, dangerous commands blocked |
| Suite 9: Performance & Resources | 5 | 5 | 0 | 256MB LRU, 0% idle CPU, clean build verified |
```

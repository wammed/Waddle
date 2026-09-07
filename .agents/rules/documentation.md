# Documentation Synchronization Policy

Whenever adding new features, fixing bugs, or updating security specifications in Waddle, **always update both the English and Japanese documentation symmetrically** according to this 8-document structure:

1. **Root Overview READMEs (Maintain slim & scannable format, ~150 lines)**:
   - `README.md` & `README.ja.md`
   - Add/update 1-2 line summarized bullets under Highlights with links to `docs/FEATURES.md` / `docs/FEATURES.ja.md`.
   - Keep keybindings table to essential ~10 shortcuts with link to complete list.
2. **Feature Specifications & Full Keybindings**:
   - `docs/FEATURES.md` & `docs/FEATURES.ja.md`
   - Document complete low-level mechanisms (Tauri asset protocol, magic bytes, PTY coalescing, UTF-8 buffering, process group signal kills, etc.).
   - Update complete keybindings table.
3. **Architecture & Subsystem Designs**:
   - `docs/ARCHITECTURE.md` & `docs/ARCHITECTURE.ja.md`
   - Update Mermaid system diagrams, PTY/Ollama/Git subsystems, and Tech Stack reference tables.
4. **Security Specifications & Guardrails**:
   - `SECURITY.md` & `SECURITY.ja.md`
   - Update path traversal guards, protected directories/credentials, dangerous command regex patterns, and CSP rules.
5. **Session Handover**:
   - `SESSION_HANDOVER.md`
   - Record chronological user requests, implementation details, key files, and build/test commands.

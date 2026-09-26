# 📚 Waddle Documentation Portal

A centralized technical knowledge hub covering Waddle's architecture, design philosophy, feature specifications, security models, and verification suites.

> 🌐 **English** | [日本語](PORTAL.ja.md)

---

## 🧭 Documentation Index

| Document | Languages | Scope & Purpose | Target Audience |
| :--- | :--- | :--- | :--- |
| **[💡 Feature Specifications (FEATURES)](FEATURES.md)** | [EN](FEATURES.md) / [JA](FEATURES.ja.md) | Exhaustive specifications for all 24 features, editor limitations matrix, and Kitty Graphics Protocol integration | All Users / Developers |
| **[⌨️ Shortcuts & Operations Guide (SHORTCUTS)](SHORTCUTS.md)** | [EN](SHORTCUTS.md) / [JA](SHORTCUTS.ja.md) | Complete keybinding reference, multi-pane controls, editor shortcuts, and clipboard sync details | All Users |
| **[📐 Architecture Guide (ARCHITECTURE)](ARCHITECTURE.md)** | [EN](ARCHITECTURE.md) / [JA](ARCHITECTURE.ja.md) | Rust PTY core, kernel-coordinated flow control, WebKitGTK engine, transparent canvas rendering, process lifecycle | Developers / Architects |
| **[🛡️ Security Policy (SECURITY)](SECURITY.md)** | [EN](SECURITY.md) / [JA](SECURITY.ja.md) | Native Rust `CommandPolicy` boundaries, SSRF/DNS Pinning, live secret masking, threat model | Security Auditors / Devs |
| **[🔍 Security Status (SECURITY STATUS)](SECURITY_STATUS.md)** | [EN](SECURITY_STATUS.md) / [JA](SECURITY_STATUS_ja.md) | Pre-release verification results: Gitleaks, Secretlint, cargo-audit, cargo-deny, and fuzzing logs | Security / Maintainers |
| **[🧪 Test Plan & QA Suite (TEST PLAN)](TEST_PLAN.md)** | [EN](TEST_PLAN.md) / [JA](TEST_PLAN.ja.md) | Automated testing pipeline, memory leak auditing with CDP, Playwright visual regression, coverage | Contributors / QA |
| **[📊 Test Execution Evidence](Waddle_Test_Execution_Evidence_ja.md)** | [JA](Waddle_Test_Execution_Evidence_ja.md) | Test suite execution evidence and coverage dashboard artifacts | Core Team |
| **[🤝 Session Handover Notes](SESSION_HANDOVER.md)** | [EN](SESSION_HANDOVER.md) | Project origin, architectural decisions, known issues, and future roadmap | Core Team / Contributors |

---

## 🎯 Quick Navigation

### For New Users
1. Check the [Root README](../README.md) for project highlights and quick start.
2. Review the [Shortcuts Guide](SHORTCUTS.md) for day-to-day keybindings.
3. Dive into the [Feature Specifications](FEATURES.md) to explore specialized capabilities.

### For Contributors & Developers
1. Read the [Architecture Guide](ARCHITECTURE.md) to understand backend-frontend IPC boundaries.
2. Review the [Security Policy](SECURITY.md) before implementing new commands or system interactions.
3. Validate all changes using the test suites documented in the [Test Plan](TEST_PLAN.md) via `npm run test:all`.

---

[← Back to Root README](../README.md)

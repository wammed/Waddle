# Licensing & Third-Party Notice

<p align="center">
  <strong>English</strong> | <a href="LICENSES.ja.md">日本語</a>
</p>

---

This document provides a comprehensive overview of the licensing policies, source code distribution model, third-party dependency governance, and asset clearance rules for the **Waddle** project.

---

## 1. Project License (Waddle)

The core source code of **Waddle** is released under the **MIT License**.

- The full text of the license is available in the root [LICENSE](LICENSE) file.
- You are free to use, modify, distribute, sublicense, and create derivative works from Waddle's source code, provided that the original copyright notice and permission notice are preserved in substantial portions of the software.

---

## 2. Distribution & Build Model

Waddle adheres strictly to a **source-code-only distribution policy** on GitHub:

- **No Pre-compiled Binaries**: This repository hosts only human-readable source code, build configuration files, documentation, and lightweight visual assets. It does **not** bundle or redistribute pre-compiled binary executables, static library archives, or installer packages.
- **User-Side Local Compilation**: Users and downstream developers build the application locally from source (e.g., via `npm run tauri dev` for development or `npm run package` / `bash scripts/build-pacman.sh` for Arch Linux native packaging).
- **Direct Registry Fetching**: During the build and installation process, all third-party dependencies (Rust crates and npm modules) are downloaded directly from their respective official upstream package registries ([crates.io](https://crates.io/) and [npmjs.com](https://www.npmjs.com/)). Waddle does not vendor or redistribute these external libraries in this repository.

---

## 3. Third-Party Dependencies & Compliance

### Permissive License Policy
To maintain license hygiene and avoid viral licensing constraints for downstream builders, all dependencies in Waddle are strictly governed by our license configuration in [`src-tauri/deny.toml`](src-tauri/deny.toml):

- **Permitted Licenses**: Only permissive open-source licenses and weak copyleft licenses with clear dynamic linking boundaries are permitted:
  - `MIT`
  - `Apache-2.0` / `Apache-2.0 WITH LLVM-exception`
  - `BSD-2-Clause` / `BSD-3-Clause`
  - `ISC`
  - `Unicode-DFS-2016` / `Unicode-3.0`
  - `CC0-1.0`
  - `OpenSSL`
  - `Zlib`
  - `BSL-1.0` (Boost Software License)
  - `MPL-2.0` (Mozilla Public License 2.0)
- **Copyleft Exclusion**: Strong copyleft licenses (such as GPL-2.0, GPL-3.0, and AGPL) are intentionally forbidden across all bundled Rust crates and JavaScript packages.

### Automated CI/CD Auditing
Every pull request and build undergoes continuous license and security compliance testing (runnable locally via `npm run test:security`):
- **`cargo-deny`**: Verifies that all transitive Rust dependencies strictly conform to the allowed license list in `src-tauri/deny.toml`, denies untrusted git/registry sources, and checks for banned packages.
- **`cargo-audit`**: Scans the dependency graph against the RustSec Advisory Database for known CVEs and vulnerabilities.
- **`secretlint` & `gitleaks`**: Ensures zero API keys, secrets, or confidential credentials are inadvertently committed.

### System Libraries & Dynamic Linking
Waddle leverages standard Linux desktop system libraries through Tauri and WebKitGTK bindings:
- Libraries such as **GTK 3** and **WebKitGTK** (commonly licensed under LGPL-2.1+ / LGPL-3.0) are **not bundled or statically linked** into this repository.
- They are resolved at runtime as shared dynamic libraries (`.so`) provided by the user's host operating system distribution (e.g., via `gtk3` and `webkit2gtk-4.1` packages on Arch Linux, Fedora, or Ubuntu). This ensures compliance with dynamic linking requirements without imposing LGPL obligations on the Waddle codebase itself.

---

## 4. Fonts & Visual Assets

### Fonts Clearance Policy
- **Nerd Fonts**: Waddle natively supports glyph and icon rendering from [Nerd Fonts](https://www.nerdfonts.com/) (e.g., JetBrainsMono NF, MesloLGS NF, FiraCode NF, Hack NF, CaskaydiaCove NF, SauceCodePro NF, Symbols NF Mono).
- **No Font Binary Redistribution**: Font binary files (`.ttf`, `.otf`, `.woff`, `.woff2`) are **never bundled or redistributed** within the Waddle repository or build artifacts.
- **Host OS Font Resolution**: Waddle references fonts purely via CSS `font-family` declarations. Users wishing to utilize Nerd Font glyphs must install their chosen font on their host operating system.
- **Font Licenses**: Individual fonts retain their respective upstream licenses (e.g., SIL Open Font License, Apache 2.0). Downstream users are responsible for complying with the licenses of any fonts installed on their system.

### Visual Assets & Icons
- **Application Icon & Wallpapers**: Custom SVG artwork and wallpapers located in `src/assets/`, `images/`, and `src-tauri/icons/` are original project assets released under the MIT License of this repository.
- **UI Icons**: General UI icons are rendered using [Lucide Icons](https://lucide.dev/) (`lucide-react`), which is licensed under the permissive **MIT License**.

---

## 5. How to Extract Dependency Licenses for Packaging

If you compile Waddle into a redistributable package (e.g., an AppImage, Flatpak, Debian `.deb`, or Fedora `.rpm`) and need to generate a full consolidated third-party license notice, you can use the following open-source tools:

### For Rust Dependencies (`src-tauri`)
Install and run [`cargo-about`](https://github.com/EmbarkStudios/cargo-about) or [`cargo-bundle-licenses`](https://github.com/sstadick/cargo-bundle-licenses):

```bash
# Using cargo-about to generate a single consolidated HTML or Markdown license report
cargo install cargo-about
cd src-tauri
cargo about generate about.hbs > THIRD_PARTY_LICENSES_RUST.html

# Alternatively, bundle all raw license files:
cargo install cargo-bundle-licenses
cd src-tauri
cargo bundle-licenses --format yaml --output THIRDPARTY.yaml
```

### For Node.js / NPM Dependencies
Install and run [`license-checker`](https://www.npmjs.com/package/license-checker) or [`license-checker-rseidelsohn`](https://www.npmjs.com/package/license-checker-rseidelsohn):

```bash
# Generate a summary or markdown list of production npm dependencies
npx license-checker --production --summary
npx license-checker --production --markdown > THIRD_PARTY_LICENSES_NPM.md
```

---

## Summary

| Component | License / Policy | Notes |
| :--- | :--- | :--- |
| **Waddle Source Code** | MIT License | See [LICENSE](LICENSE) |
| **Rust Crates** | Permissive (MIT, Apache-2.0, BSD, etc.) | Enforced via [src-tauri/deny.toml](src-tauri/deny.toml) |
| **NPM Packages** | Permissive (MIT, ISC, Apache-2.0) | React 19, xterm.js, Lucide Icons |
| **System Shared Libs** | LGPL (GTK 3, WebKitGTK) | Dynamically linked from user's host OS |
| **Nerd Fonts** | Upstream Licenses (SIL OFL, etc.) | Zero font binaries bundled; host OS resolved |
| **App Icons & Assets** | MIT License | Original SVG assets + Lucide Icons |

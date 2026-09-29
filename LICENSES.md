# Licensing & Third-Party Notice

<p align="center">
  <a href="docs/PORTAL.md">Documentation Portal</a> | <strong>English</strong> | <a href="LICENSES.ja.md">日本語</a>
</p>

---

This document outlines the licensing policies, source code distribution model, third-party dependency governance, and font/visual asset handling guidelines for the **Waddle** project.

Waddle is distributed in source code form. Third-party dependencies are not vendored within the repository; instead, they are retrieved from official package registries or upstream repositories at build time.

---

## 1. Project License (Waddle)

The core source code of **Waddle** is released under the **MIT License**.

- The full text of the license is available in the root [LICENSE](LICENSE) file.
- When redistributing, the copyright notice and permission notice must be retained.
- Under the terms of the MIT License, you are free to use, modify, redistribute, sublicense, and create derivative works from the software for both commercial and non-commercial purposes.

---

## 2. Distribution & Build Model

### Distribution in Source Code Form
Waddle currently adopts a distribution model that publishes **source code only** on GitHub:

- **No Pre-compiled Binaries**: This repository does not bundle or redistribute pre-compiled executable binaries, static libraries, or installer packages as source distribution artifacts.
- **Local Builds**: Users and downstream distributors build Waddle using the project's build and packaging workflows tailored to their respective environments (e.g., via `npm run tauri dev` during development, or `npm run package` / `bash scripts/build-pacman.sh` for native package creation).
- **Direct Fetching of Dependencies**: Rust crates and npm packages are fetched directly from their respective official registries ([crates.io](https://crates.io/), [npmjs.com](https://www.npmjs.com/)) or upstream repositories during dependency installation and builds.
- **No Vendoring of Third-Party Libraries**: Waddle does not copy third-party dependency source trees into its repository for redistribution.

This represents the distribution policy of the Waddle project and does not mean that the licenses of Waddle or its dependent components prohibit binary distribution.

When downstream distributors redistribute Waddle as packages, they bear the responsibility to satisfy all applicable license notices and redistribution conditions for the generated packages and each component contained therein.

---

## 3. Third-Party Dependencies & License Compliance

### Permissive License Policy
Waddle's Rust dependencies are audited by `cargo-deny` and the project's dependency and security verification workflows.

The project permits the following licenses (and licenses with similar permissive terms or clear dynamic linking boundaries) for dependencies:
- `MIT`
- `Apache-2.0`
- `Apache-2.0 WITH LLVM-exception`
- `BSD-2-Clause`
- `BSD-3-Clause`
- `ISC`
- `Unicode-DFS-2016`
- `Unicode-3.0`
- `CC0-1.0`
- `OpenSSL`
- `Zlib`
- `BSL-1.0`
- `MPL-2.0`

Strong copyleft licenses such as GPL and AGPL are intentionally excluded from the project's approved dependency policy.

For the actual dependency graph and current license metadata, refer to the respective lockfiles and [`src-tauri/deny.toml`](src-tauri/deny.toml). External frameworks or libraries not used by Waddle (such as `libcosmic`) are not part of Waddle's dependency tree.

### Continuous License and Security Auditing via CI/CD
Waddle's security pipeline (runnable locally via `npm run test:security`) performs automated inspections on dependencies and the repository, including:
- **`cargo-deny`** — Verifies dependency licenses, sources, security advisories, and bans.
- **`cargo-audit`** — Audits known vulnerabilities against the RustSec Advisory Database.
- **`secretlint`** — Detects inadvertently committed secrets.
- **`gitleaks`** — Scans the repository for sensitive credentials.

These automated checks are utilized as part of release and regression verification.

---

## 4. System Shared Libraries

Waddle utilizes Linux desktop system libraries through the Tauri and WebKitGTK runtime environment.

Libraries such as GTK and WebKitGTK are provided by the host operating system as shared libraries (`.so`); their source code is neither bundled nor statically linked within the Waddle repository.

Downstream package maintainers must verify the applicable licensing requirements for the system libraries provided by their target distribution.

---

## 5. Fonts & Visual Assets

### Fonts
Waddle supports locally installed fonts, and its font presets allow the use of multiple Nerd Font families.

Examples:
- JetBrainsMono Nerd Font
- MesloLGS Nerd Font
- FiraCode Nerd Font
- Hack Nerd Font
- CaskaydiaCove Nerd Font
- SauceCodePro Nerd Font
- Symbols Nerd Font Mono

Waddle does not bundle or redistribute these font files.

Font files such as `.ttf`, `.otf`, `.woff`, `.woff2` corresponding to these presets are not included in Waddle's source distribution.

Waddle references fonts installed in the user's host OS via CSS `font-family` declarations. To use Nerd Font glyphs, users must install the necessary fonts on their system.

Each font is governed by the license of its respective upstream project. Users and downstream distributors are responsible for complying with the license terms applicable to the fonts they install or redistribute.

### Visual Assets and Icons
Project-original application assets (such as custom SVG graphics, wallpapers, and logos in `src/assets/`, `images/`, and `src-tauri/icons/`) are provided under the Waddle project's MIT License unless otherwise noted.

Waddle also uses third-party icons governed by upstream open-source licenses, such as [Lucide Icons](https://lucide.dev/) (`lucide-react`, MIT License).

The licensing of third-party assets is governed by their respective upstream licenses rather than determined solely by Waddle's license.

---

## 6. Acknowledgements

Waddle is built leveraging the achievements of numerous open-source projects.

Key projects used or serving as foundational platforms in Waddle include:
- **Tauri** (MIT / Apache-2.0)
- **React** (MIT)
- **Prism.js** (MIT) - Syntax highlighting engine for the embedded editor
- **xterm.js** (MIT) - Terminal emulation component
- **Lucide Icons** (MIT) - UI icon library
- **Vite** (MIT) - Frontend build tool and development server
- **Rust** (MIT / Apache-2.0) - Systems programming language
- And all respective dependencies and upstream projects

This section serves as an acknowledgement of the open-source projects utilized by Waddle. It does not replace the authoritative license notices provided by each project.

The exact dependency graph may evolve across specific releases. Therefore, the lockfiles and dependency manifests of the target source revision serve as the authoritative record for the versions actually used.

---

## 7. In-App About & License Information

Waddle provides an **About / Licenses** section in the application Settings UI.

- The in-app About section displays user-facing acknowledgements of major open-source projects utilized by Waddle.
- The Licenses section provides a convenient entry point to view Waddle's license and third-party licensing information.
- The information displayed in-app is provided for convenience and does not replace the authoritative license files and licensing documentation included in the source tree.
- The in-app English and Japanese versions are designed to provide equivalent information and coverage.

---

## 8. Extracting Dependency License Information for Packaging

When building or packaging Waddle as a redistributable package, downstream distributors can generate consolidated third-party license reports from the dependency graph.

*Note: This repository does not bundle pre-generated third-party license dump files (such as `THIRD_PARTY_LICENSES/*.txt`).*

### Rust Dependencies
You can collect dependency license information using [`cargo-about`](https://github.com/EmbarkStudios/cargo-about) or [`cargo-bundle-licenses`](https://github.com/sstadick/cargo-bundle-licenses).

Example:
```bash
cargo install cargo-about
cd src-tauri
cargo about generate about.hbs > THIRD_PARTY_LICENSES_RUST.html
```

Or:
```bash
cargo install cargo-bundle-licenses
cd src-tauri
cargo bundle-licenses --format yaml --output THIRDPARTY.yaml
```

### Node.js / npm Dependencies
You can use license reporting tools such as [`license-checker`](https://www.npmjs.com/package/license-checker) or [`license-checker-rseidelsohn`](https://www.npmjs.com/package/license-checker-rseidelsohn).

Example:
```bash
npx license-checker --production --summary
npx license-checker --production --markdown > THIRD_PARTY_LICENSES_NPM.md
```

These generated reports are intended to assist with packaging and do not replace the authoritative license texts provided by upstream projects.

---

## 9. Summary

| Component | License / Policy | Notes |
| :--- | :--- | :--- |
| **Waddle Source Code** | MIT License | See root [LICENSE](LICENSE) |
| **Rust Dependencies** | Approved Permissive / Weak Copyleft | Audited via [src-tauri/deny.toml](src-tauri/deny.toml) |
| **npm Dependencies** | Upstream Package Licenses (MIT, ISC, Apache-2.0, etc.) | See `package.json` / `package-lock.json` |
| **System Shared Libraries** | Host Distribution Licenses (LGPL, etc.) | Dynamically provided by user OS (not bundled/statically linked) |
| **Nerd Fonts** | Respective Upstream Licenses (SIL OFL, etc.) | Not bundled; uses fonts installed on host OS |
| **Waddle Original Assets** | MIT License | Unless otherwise noted (see [IP_COMPLIANCE.md](IP_COMPLIANCE.md) & [ICON_DESIGN_HISTORY.md](ICON_DESIGN_HISTORY.md)) |
| **Lucide Icons** | Upstream Open-Source License (MIT License) | Third-party icon library |
| **Acknowledgements** | Informational | See in-app About / Licenses |

---

## 10. Scope & Disclaimer

- **Scope**: This document outlines the licensing and dependency management policies based on Waddle's source tree and dependency configurations.
- **Disclaimer**:
  - This document does not constitute legal advice and does not guarantee that all downstream distributions will automatically satisfy every licensing obligation.
  - Downstream distributors are responsible for verifying their own distributions with respect to the actual dependency graph, package contents, system libraries, third-party assets, and applicable licensing obligations.

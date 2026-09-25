# ライセンスおよびサードパーティ通知 (Licensing & Third-Party Notice)

<p align="center">
  <a href="LICENSES.md">English</a> | <strong>日本語</strong>
</p>

---

本書は、**Waddle** プロジェクトにおけるライセンスポリシー、ソースコード配布モデル、サードパーティ製依存関係の管理方針、およびフォント・アセットの取り扱い基準について包括的に説明するドキュメントです。

---

## 1. プロジェクトライセンス (Waddle)

**Waddle** 本体のソースコードは、**MIT License** のもとで公開されています。

- ライセンス全文はリポジトリルートの [LICENSE](LICENSE) ファイルに記載されています。
- 著作権表示および許諾表示を保持する限り、商用・非商用を問わず、複製、改変、再配布、サブライセンス付与、および派生著作物の作成を自由に行うことができます。

---

## 2. 配布およびビルドモデル (Distribution & Build Model)

Waddle は、GitHub 上において**ソースコードのみを公開する配布方針（Source-Code-Only Policy）**を厳格に採用しています：

- **コンパイル済みバイナリの非同梱**: 本リポジトリでは人間可読なソースコード、ビルド設定ファイル、ドキュメント、および軽量アセットのみを管理しています。コンパイル済みの実行可能バイナリ、静的ライブラリ、インストーラーパッケージは同梱・再配布していません。
- **ユーザー環境でのローカルビルド**: 利用者および下流の開発者は、自身のホスト環境においてソースからビルドを行います（開発時は `npm run tauri dev`、Arch Linux ネイティブパッケージ作成時は `npm run package` / `bash scripts/build-pacman.sh` など）。
- **公式レジストリからの直接取得**: ビルドおよびパッケージングの実行時、すべてのサードパーティ製依存関係（Rust クレートおよび npm モジュール）は各公式レジストリ（[crates.io](https://crates.io/) および [npmjs.com](https://www.npmjs.com/)）から直接ダウンロードされます。本リポジトリ内に外部ライブラリのコードをベンダー同梱（Vendor）して再配布することはありません。

---

## 3. サードパーティ製依存関係とライセンス適合性 (Third-Party Dependencies & Compliance)

### パーミッシブライセンス方針 (Permissive Policy)
下流でのビルドや利用におけるライセンス上の制約（感染性）を排除するため、Waddle の全依存関係は [`src-tauri/deny.toml`](src-tauri/deny.toml) にて厳格に管理されています：

- **許可されているライセンス**: パーミッシブ（寛容型）オープンソースライセンス、および動的リンクの境界が明確なウィークコピーレフトライセンスのみを許可しています：
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
- **強力なコピーレフトライセンスの排除**: GPL-2.0、GPL-3.0、AGPL などの強力なコピーレフトライセンスを持つクレートやパッケージは、すべての依存ツリーから意図的に排除されています。

### CI/CD パイプラインによる継続的監査
すべてのプルリクエストおよびビルドにおいて、ライセンスとセキュリティの自動適合性監査が実施されます（ローカルでは `npm run test:security` で検証可能）：
- **`cargo-deny`**: すべての推移的 Rust 依存関係が `src-tauri/deny.toml` の許可リストに完全適合しているか検証し、未承認の git/レジストリソースや禁止パッケージを検知・遮断。
- **`cargo-audit`**: RustSec Advisory Database と照合し、依存クレートに既知の脆弱性（CVE）が存在しないかを監査。
- **`secretlint` & `gitleaks`**: リポジトリ内に API キーやシークレット情報が誤ってコミットされていないかを監視。

### システム共有ライブラリの動的リンク解決
Waddle は Tauri および WebKitGTK バインディングを介して標準的な Linux デスクトップシステムライブラリを利用しています：
- **GTK 3** や **WebKitGTK** などのライブラリ（一般に LGPL-2.1+ / LGPL-3.0 等でライセンス）は、**本リポジトリに同梱されたり静的リンクされたりすることはありません**。
- これらはユーザーのホスト OS（Arch Linux、Fedora、Ubuntu 等の `gtk3`, `webkit2gtk-4.1` パッケージ）が提供する共有ライブラリ（`.so`）として実行時に動的リンクされます。これにより、LGPL の動的リンク要件に完全適合し、Waddle 本体のコードベースに LGPL の義務が波及することはありません。

---

## 4. フォントおよびビジュアルアセット方針 (Fonts & Visual Assets)

### フォントクリアランス方針
- **Nerd Fonts**: Waddle は [Nerd Fonts](https://www.nerdfonts.com/) のアイコン・グリフ表示を標準でサポートしています（JetBrainsMono NF, MesloLGS NF, FiraCode NF, Hack NF, CaskaydiaCove NF, SauceCodePro NF, Symbols NF Mono など）。
- **フォントバイナリの非同梱**: フォントファイルの実体（`.ttf`, `.otf`, `.woff`, `.woff2` 等）は、Waddle のリポジトリやビルド生成物に**一切同梱・再配布していません**。
- **ホスト OS フォントの参照**: アプリケーションは CSS の `font-family` 宣言を通じて、ユーザーのホスト OS にローカルインストールされたフォントを直接参照します。Nerd Font グリフを利用したい場合は、ユーザー自身が好みのフォントをホスト OS に導入して使用します。
- **フォントライセンスの遵守**: 各フォントは各開発元の上流ライセンス（SIL Open Font License, Apache 2.0 等）に準拠します。インストールしたフォントの利用規約は利用者が遵守する責任を負います。

### ビジュアルアセット & アイコン
- **アプリアイコン & 壁紙**: `src/assets/`, `images/`, `src-tauri/icons/` に配置された独自 SVG アイコンおよび壁紙は、本リポジトリの MIT License のもとで提供されるオリジナル成果物です。
- **UI アイコン**: UI 内で使用される汎用アイコンは、パーミッシブな **MIT License** で提供される [Lucide Icons](https://lucide.dev/) (`lucide-react`) を採用しています。

---

## 5. パッケージ作成時の依存ライセンス抽出方法 (How to Extract Dependency Licenses for Packaging)

利用者が Waddle を再配布可能なパッケージ（AppImage, Flatpak, Debian `.deb`, Fedora `.rpm` 等）としてビルドし、サードパーティ製ライセンス一覧を同梱する必要がある場合は、以下のオープンソースツールを利用して一括抽出・生成できます：

### Rust 依存関係 (`src-tauri`) の抽出
[`cargo-about`](https://github.com/EmbarkStudios/cargo-about) または [`cargo-bundle-licenses`](https://github.com/sstadick/cargo-bundle-licenses) を使用します：

```bash
# cargo-about を使用して HTML / Markdown 形式の統合ライセンスレポートを生成
cargo install cargo-about
cd src-tauri
cargo about generate about.hbs > THIRD_PARTY_LICENSES_RUST.html

# または、すべての生のライセンスファイルを一括収集する場合:
cargo install cargo-bundle-licenses
cd src-tauri
cargo bundle-licenses --format yaml --output THIRDPARTY.yaml
```

### Node.js / NPM 依存関係の抽出
[`license-checker`](https://www.npmjs.com/package/license-checker) または [`license-checker-rseidelsohn`](https://www.npmjs.com/package/license-checker-rseidelsohn) を使用します：

```bash
# 本番環境（production）で使用される npm パッケージのサマリーまたは Markdown 一覧を生成
npx license-checker --production --summary
npx license-checker --production --markdown > THIRD_PARTY_LICENSES_NPM.md
```

---

## 6. アプリ内のAbout / License情報 (In-App About & License Information)

Waddleは、アプリケーションのSettings UIにAbout / Licensesセクションを提供しています。

Aboutセクションでは、Waddleで使用している主要なオープンソースプロジェクトへの謝辞を掲載しています。Licensesセクションでは、Waddle自身のライセンスおよび第三者ライセンス情報を確認するための導線を提供しています。

アプリ内に表示される情報は利便性のために提供されるものであり、ソースツリーに含まれる正式なライセンスファイルおよびライセンス関連ドキュメントに代わるものではありません。

---

## サマリー (Summary)

| 構成要素 | ライセンス / 適用方針 | 補足 |
| :--- | :--- | :--- |
| **Waddle 本体のソースコード** | MIT License | [LICENSE](LICENSE) 参照 |
| **Rust 依存クレート** | パーミッシブ (MIT, Apache-2.0, BSD 等) | [src-tauri/deny.toml](src-tauri/deny.toml) で強制検証 |
| **NPM 依存パッケージ** | パーミッシブ (MIT, ISC, Apache-2.0) | React 19, xterm.js, Lucide Icons |
| **システム共有ライブラリ** | LGPL (GTK 3, WebKitGTK) | ユーザーのホスト OS より動的リンク |
| **Nerd Fonts** | 上流ライセンス (SIL OFL 等) | フォントバイナリ非同梱（ホスト OS 参照） |
| **アプリアイコン & アセット** | MIT License | 独自 SVG アセット + Lucide Icons |

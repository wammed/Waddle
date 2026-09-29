# ライセンスおよびサードパーティ通知 (Licensing & Third-Party Notice)

<p align="center">
  <a href="docs/PORTAL.ja.md">ドキュメンテーションポータル</a> | <a href="LICENSES.md">English</a> | <strong>日本語</strong>
</p>

---

本書は、**Waddle** プロジェクトにおけるライセンスポリシー、ソースコード配布モデル、サードパーティ製依存関係の管理方針、およびフォント・ビジュアルアセットの取り扱い基準について説明するドキュメントです。

Waddle はソースコード形式で配布されます。サードパーティ製依存関係は、リポジトリ内にベンダー同梱するのではなく、ビルド時に各パッケージレジストリまたは上流リポジトリから取得します。

---

## 1. プロジェクトライセンス (Waddle)

Waddle 本体のソースコードは、**MIT License** のもとで公開されています。

- ライセンス全文はリポジトリルートの [LICENSE](LICENSE) ファイルに記載されています。
- 再配布する場合は、著作権表示および許諾表示を保持する必要があります。
- MIT License の条件に従う限り、商用・非商用を問わず、利用、改変、再配布、サブライセンス付与、および派生著作物の作成が認められています。

---

## 2. 配布およびビルドモデル (Distribution & Build Model)

### ソースコード形式での配布
Waddle は現在、GitHub において**ソースコードのみを公開する配布モデル**を採用しています：

- **コンパイル済みバイナリの非同梱**: 本リポジトリには、コンパイル済み実行ファイル、静的ライブラリ、インストーラーパッケージをソース配布物として同梱・再配布していません。
- **ローカルビルド**: 利用者および下流のディストリビューターは、それぞれの環境に合わせてプロジェクトのビルド・パッケージング手順を使用して Waddle をビルドします（開発時は `npm run tauri dev`、ネイティブパッケージ作成時は `npm run package` / `bash scripts/build-pacman.sh` など）。
- **依存関係の直接取得**: Rust クレートおよび npm パッケージは、依存関係のインストール・ビルド時に、それぞれの公式レジストリ（[crates.io](https://crates.io/)、[npmjs.com](https://www.npmjs.com/)）または上流リポジトリから取得します。
- **第三者ライブラリのベンダー同梱なし**: 第三者依存ライブラリのソースツリーを Waddle リポジトリへコピーして再配布することは行っていません。

これは Waddle プロジェクトの配布方針であり、Waddle 自身または依存コンポーネントのライセンスがバイナリ配布を禁止していることを意味するものではありません。

Waddle を下流ディストリビューターがパッケージとして再配布する場合、そのディストリビューターは、生成されたパッケージおよびそこに含まれる各コンポーネントについて、適用されるライセンス表示および再配布条件を満たす責任を負います。

---

## 3. サードパーティ製依存関係とライセンス適合性 (Third-Party Dependencies & License Compliance)

### パーミッシブライセンス方針
Waddle の Rust 依存関係は、`cargo-deny` およびプロジェクトの依存関係・セキュリティ検証ワークフローによって監査されています。

プロジェクトでは、依存関係に適用可能なライセンスとして、以下を含むライセンスを許可しています：
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

GPL や AGPL などの強力なコピーレフトライセンスは、プロジェクトの承認済み依存ポリシーから意図的に除外されています。

実際の依存関係グラフおよび現在のライセンスメタデータについては、各ロックファイルおよび [`src-tauri/deny.toml`](src-tauri/deny.toml) を確認してください。Waddle 自身が使用していない外部フレームワークやライブラリ（`libcosmic` など）は、Waddle の依存関係ツリーには一切含まれません。

### CI/CD による継続的なライセンス・セキュリティ監査
Waddle のセキュリティパイプライン（ローカル検証: `npm run test:security`）では、依存関係およびリポジトリについて、以下を含む自動検査を実施しています：
- **`cargo-deny`** — 依存関係のライセンス、取得元、アドバイザリ、およびポリシーを検査します。
- **`cargo-audit`** — RustSec Advisory Database と照合し、既知の脆弱性を監査します。
- **`secretlint`** — 誤ってコミットされたシークレットを検出します。
- **`gitleaks`** — リポジトリ内のシークレットを走査します。

これらの検査は、リリースおよび回帰検証の一部として使用されています。

---

## 4. システム共有ライブラリ (System Shared Libraries)

Waddle は、Tauri / WebKitGTK 環境を通じて Linux デスクトップのシステムライブラリを利用します。

GTK や WebKitGTK などのライブラリは、ホスト OS が共有ライブラリ（`.so`）として提供するものであり、Waddle リポジトリ内に第三者ライブラリのソースコードとして同梱・静的リンクしているものではありません。

下流のパッケージメンテナーは、対象ディストリビューションが提供するシステムライブラリについて、適用されるライセンス要件を確認する必要があります。

---

## 5. フォントおよびビジュアルアセット方針 (Fonts & Visual Assets)

### フォント
Waddle はローカルにインストールされたフォントをサポートしており、フォントプリセットでは複数の Nerd Font ファミリーを利用できます。

例:
- JetBrainsMono Nerd Font
- MesloLGS Nerd Font
- FiraCode Nerd Font
- Hack Nerd Font
- CaskaydiaCove Nerd Font
- SauceCodePro Nerd Font
- Symbols Nerd Font Mono

Waddle はこれらのフォントファイルをバンドルまたは再配布していません。

これらのプリセットに対応する `.ttf`、`.otf`、`.woff`、`.woff2` 等のフォントファイルは、Waddle のソース配布物には含まれていません。

Waddle は CSS の `font-family` 宣言を通じて、ユーザーのホスト OS にインストールされたフォントを参照します。Nerd Font のグリフを利用したい場合、ユーザー自身が必要なフォントをシステムへインストールしてください。

各フォントには、それぞれの上流プロジェクトのライセンスが適用されます。ユーザーおよび下流ディストリビューターは、自身がインストールまたは再配布するフォントに適用されるライセンス条件を遵守する責任を負います。

### ビジュアルアセットおよびアイコン
Waddle 独自のアプリケーションアセット（`src/assets/`、`images/`、`src-tauri/icons/` などにあるプロジェクト独自の SVG アセットや壁紙など）は、特に別途記載がない限り、Waddle プロジェクトの MIT License のもとで提供されます。

Waddle では、[Lucide Icons](https://lucide.dev/) (`lucide-react`) など、上流のオープンソースライセンス（MIT License）に基づく第三者アイコンも使用しています。

第三者アセットのライセンスは、Waddle 本体のライセンスだけから判断するものではなく、それぞれの上流ライセンスが適用されます。

---

## 6. 謝辞 (Acknowledgements)

Waddle は、多数のオープンソースプロジェクトの成果を利用して構築されています。

Waddle で使用または主要な基盤として利用している代表的なプロジェクトには、以下があります：
- **Tauri** (MIT / Apache-2.0)
- **React** (MIT)
- **Prism.js** (MIT) - 内蔵エディタの構文ハイライトエンジン
- **xterm.js** (MIT) - ターミナルエミュレーションコンポーネント
- **Lucide Icons** (MIT) - UI アイコンライブラリ
- **Vite** (MIT) - フロントエンド開発・ビルドツール
- **Rust** (MIT / Apache-2.0) - システムプログラミング言語
- その他、それぞれの依存関係および上流プロジェクト

このセクションは、Waddle が利用しているオープンソースプロジェクトへの謝辞を目的とするものです。各プロジェクトが提供する正式なライセンス情報に代わるものではありません。

特定のリリースにおける正確な依存関係グラフは変更される可能性があります。そのため、実際に使用されるバージョンについては、対象ソースリビジョンのロックファイルおよび依存関係マニフェストを正式な記録として扱います。

---

## 7. アプリ内About / License情報 (In-App About & License Information)

Waddle は、アプリケーションの Settings UI に **About / Licenses** セクションを提供します。

- アプリ内の About セクションでは、Waddle が利用している主要なオープンソースプロジェクトへのユーザー向けの謝辞を表示します。
- Licenses セクションでは、Waddle 自身のライセンスおよび第三者ライセンス情報を確認するための便利な導線を提供します。
- アプリ内に表示される情報は利便性のために提供されるものであり、ソースツリーに含まれる正式なライセンスファイルおよびライセンス関連ドキュメントに代わるものではありません。
- アプリ内の英語版・日本語版は、同等の情報および網羅範囲を提供することを基本とします。

---

## 8. パッケージ作成時の依存ライセンス抽出方法 (Extracting Dependency License Information for Packaging)

Waddle を再配布用パッケージとしてビルド・パッケージングする場合、下流ディストリビューターは依存関係グラフから第三者ライセンスの統合レポートを生成できます。

※本リポジトリ内には、生成済みの第三者ライセンスファイル（`THIRD_PARTY_LICENSES/*.txt` など）を直接同梱していません。

### Rust 依存関係
[`cargo-about`](https://github.com/EmbarkStudios/cargo-about) または [`cargo-bundle-licenses`](https://github.com/sstadick/cargo-bundle-licenses) を利用して、依存関係のライセンス情報を収集できます。

例:
```bash
cargo install cargo-about
cd src-tauri
cargo about generate about.hbs > THIRD_PARTY_LICENSES_RUST.html
```

または:
```bash
cargo install cargo-bundle-licenses
cd src-tauri
cargo bundle-licenses --format yaml --output THIRDPARTY.yaml
```

### Node.js / npm 依存関係
[`license-checker`](https://www.npmjs.com/package/license-checker) または [`license-checker-rseidelsohn`](https://www.npmjs.com/package/license-checker-rseidelsohn) などのライセンスレポートツールを利用できます。

例:
```bash
npx license-checker --production --summary
npx license-checker --production --markdown > THIRD_PARTY_LICENSES_NPM.md
```

これらの生成レポートはパッケージングを補助するためのものであり、上流プロジェクトが提供する正式なライセンス本文に代わるものではありません。

---

## 9. サマリー (Summary)

| 構成要素 | ライセンス / 適用方針 | 補足 |
| :--- | :--- | :--- |
| **Waddle 本体のソースコード** | MIT License | [LICENSE](LICENSE) 参照 |
| **Rust 依存クレート** | 承認済みのパーミッシブ / ウィークコピーレフト | [src-tauri/deny.toml](src-tauri/deny.toml) で検証 |
| **npm 依存パッケージ** | 各パッケージの上流ライセンス (MIT, ISC, Apache-2.0 等) | `package.json` / `package-lock.json` 参照 |
| **システム共有ライブラリ** | ホストディストリビューションのライセンス (LGPL 等) | ユーザー OS から動的提供（同梱・静的リンクなし） |
| **Nerd Fonts** | 各上流フォントのライセンス (SIL OFL 等) | 非同梱、ホスト OS にインストールされたものを使用 |
| **Waddle 独自アセット** | MIT License | 特に別途記載がない場合（詳細は [IP_COMPLIANCE.ja.md](IP_COMPLIANCE.ja.md) および [ICON_DESIGN_HISTORY.ja.md](ICON_DESIGN_HISTORY.ja.md) を参照） |
| **Lucide Icons** | 上流オープンソースライセンス (MIT License) | 第三者アイコンライブラリ |
| **Acknowledgements** | 情報提供 | アプリ内 About / Licenses を参照 |

---

## 10. 適用範囲および免責 (Scope & Disclaimer)

- **適用範囲 (Scope)**: 本書は、Waddle のソースツリーおよび依存関係設定に基づくライセンスおよび依存関係管理方針を説明するものです。
- **免責 (Disclaimer)**:
  - 本書は法的助言ではなく、すべての下流配布物があらゆるライセンス上の義務を自動的に満たすことを保証するものではありません。
  - 下流ディストリビューターは、自身の配布物について、実際の依存関係グラフ、パッケージ内容、システムライブラリ、第三者アセット、および適用されるライセンス義務を確認する責任を負います。

<div align="center">

# 🐧⚡ Waddle
### 完全ローカルAI統合型 次世代 Linux ターミナルエミュレータ

![Banner](../images/waddle-banner.svg)

[![Built with Tauri](https://img.shields.io/badge/Tauri-2.0-24C8D8?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.98+-orange?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Ollama](https://img.shields.io/badge/Ollama-Local_AI-white?style=for-the-badge&logo=ollama&logoColor=black)](https://ollama.com/)
[![Platform](https://img.shields.io/badge/Platform-Linux_(Wayland_/_X11)-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://www.kernel.org/)
[![Vibe Coding](https://img.shields.io/badge/Built_with-AI_Vibe_Coding-8A2BE2?style=for-the-badge&logo=sparkles&logoColor=white)](#-このプロジェクトについて-ai-vibe-coding)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](../LICENSE)

<p align="center">
  <strong>超高速 PTY ターミナル × 完全ローカル AI（Ollama） × 簡易内蔵エディタ × 背景壁紙カスタマイズ</strong><br>
  外部クラウドにデータを一切送信しない、プライベートかつインテリジェントな Linux 向けターミナルエミュレータ
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.ja.md">日本語</a>
</p>

</div>

---

## 📸 スクリーンショット

| 🐧 超高速ターミナル & 背景壁紙 | 🤖 AI コマンド生成アシスタント (`Ctrl + K`) |
| :---: | :---: |
| ![Terminal View](../images/screenshots/waddle-ss01.png) | ![AI Command Assistant](../images/screenshots/waddle-ss02.png) |
| *CachyOS, Fish Shell, Powerline Nerd Fonts & 透過サイバーパンク壁紙* | *自然言語でのコマンド生成・危険コマンド警告・即時実行* |

| 📝 簡易内蔵コードエディタ (`Ctrl + E`) | 💬 コンテキスト認識型 AI Copilot サイドバー |
| :---: | :---: |
| ![Embedded Editor](../images/screenshots/waddle-ss03.png) | ![AI Copilot Sidebar](../images/screenshots/waddle-ss04.png) |
| *2画面分割編集、クイックオープン、AIリファクタリング (`Ctrl + Shift + K`)* | *カレントディレクトリ・Gitブランチ・コマンド履歴を把握した対話アシスタント* |

---

## 💡 主な特徴

- 🤖 **100% 完全ローカル AI**: 自然言語からのコマンド自動生成（`Ctrl + K`）、自動エラー診断・修復、コンテキスト認識型 Copilot チャットをすべて Ollama による完全オフラインで提供。([詳細](FEATURES.ja.md#1--自然言語からのコマンド自動生成-ctrl--k))
- ⚡ **遅延ゼロのターミナルコア**: 32KB 出力コアレッシング、カーネル協調フロー制御（`pause_pty`/`resume_pty`）、`Ctrl+C` 瞬時キューパージ、および `yes` などの百万行バースト時でもメモリを 300MB 未満に完全制限する健全な Rust PTY。([詳細](FEATURES.ja.md#10--高性能-pty--遅延ゼロの-2d-canvas-アクセラレーション))
- 🪟 **柔軟なマルチペイン分割**: 1〜4分割（全10プリセット）に対応し、ネオン発光のドラッグ境界線やキーボード操作による比率微調整・ペインスワップを完備。([詳細](FEATURES.ja.md#5--柔軟なマルチペイン分割--ドラッグによるリサイズ14分割--10種類のレイアウト))
- 📝 **堅牢化内蔵コードエディタ (`Ctrl + E`)**: Linux 設定ファイル特化のマルチタブ編集（最大5タブ・遅延マウント）、ソフトタブ4文字、括弧・クォート自動補完、完全一致検索・置換（`Ctrl + F` / `Ctrl + H`、ReDoS排除）、$HOME内シンボリックリンク解決、非特権所有者UID検証・強制Read-Onlyガード、120秒自動退避キャッシュ（`~/.cache/waddle/autosave/` [0700]）。([詳細](FEATURES.ja.md#4--簡易内蔵エディタ--ai-コード支援-ctrl--e))
- 📂 **高機能ファイルツリー**: `/proc/<pid>/cwd` によるカレントディレクトリ自動追跡、巨大フォルダ 500 件制限と動的オンデマンド展開（`+ さらに読み込む`）、言語別カラーバッジ、ブレッドクラム、インデントガイド、右クリックメニュー。([詳細](FEATURES.ja.md#3--左側ファイルツリーサイドバー-ctrl--b))
- 🐙 **Git & GitHub 統合ハブ**: ステータスバー連動ポップオーバー、1クリック Push/Pull、ローカル AI による Conventional Commit 自動生成、GUI Diff ビューワー。([詳細](FEATURES.ja.md#14--git--github-連携ローカル-ai-コミット生成--pushpull-ポリシー))
- 🖼️ **Kitty 画像プロトコル完全対応 & 全 TUI / CLI エコシステム連携**: `yazi`, `ranger`, `lf`, `fastfetch`, `kitten icat`, `chafa`, `timg`, `viu`, Neovim (`image.nvim`) などの全 CLI/TUI ツールからのターミナル直接画像・アニメーション描画に完全対応。通常テキスト（ファイル一覧・枠線・コード等）の 100% 描画保証、CUP 絶対座標追従、Alternate Screen ゼロアロケーション（TUI 固定グリッド保護）、カーネル協調のピクセル解像度報告（`TIOCGWINSZ`）、XTVERSION 応答（`timg` 自動検出）、DA1 Sixel 排除 & DSR 5n 同期、PTY レベル一時ファイル即時 Base64 インライン化（`viu` の一時ファイル削除レースコンディション根絶）、明示的 ID による描画 OK 応答同期（`ranger` 初回フリーズ解消）および削除コマンド（`a=d`）の公式サイレント準拠（`ranger` 2枚目選択時のキー誤爆・画面点滅・ハング根絶）、`TERM=xterm-kitty`（`ranger` ハードコードチェック通過）、0ms 即時プローブ応答（`a=q` 大文字 `OK` / DA1 / CSI プローブ）を完備。※セキュリティ上の要請（`/dev/shm` 共有メモリ汚染・OOM DoS 防御）から共有メモリ（`t=s`）を意図的に無効化し、堅牢なサンドボックス保護を最優先（動画の超高速ストリーミングは安全のため割り切り）。([詳細](FEATURES.ja.md#16--kitty-画像プロトコル-kitty-graphics-protocol-完全対応--厳格なセキュリティサンドボックス))
- 🛡️ **リアルタイム機密情報マスク (Secret Masking)**: APIキー（GitHub, AWS, OpenAI等）やトークンを自動検知・即時マスクし、画面共有や動画撮影時の漏洩を防止。([詳細](FEATURES.ja.md#17--リアルタイム機密情報マスク-secret-masking))
- ⏳ **セッション タイムトラベル & 履歴復元 (`Ctrl + Shift + H`)**: 過去の実行コマンド、終了コード、CWD、出力をタイムライン形式でビジュアル化し、1クリックで状態復元やコマンド再実行。([詳細](FEATURES.ja.md#18--セッション-タイムトラベル--スナップショット履歴-ctrl--shift--h))
- 📊 **リッチデータ ビジュアライザ (Markdown / CSV / JSON)**: Markdown 組版、CSV ソート・検索テーブル、JSON 折りたたみツリーをエディタおよびツリーから1クリックで瞬時プレビュー。([詳細](FEATURES.ja.md#19--リッチデータ-ビジュアライザ-markdown--csv--json-プレビュー))
- 🐕 **自律型 AI エラー監視 (Autonomous Watchdog)**: コマンド失敗を自動検知し、AI が原因を即時診断してワンクリックで修正コマンドを提示・実行。([詳細](FEATURES.ja.md#20--自律型-ai-エラー監視--1-click-クイック修正-autonomous-watchdog))
- 🔗 **ビジュアル パイプライン ビルダー (`Ctrl + Shift + P`)**: ビルド、テスト、デプロイなどの複数コマンドを視覚的にステップ構成し、条件付きで自動連続実行。([詳細](FEATURES.ja.md#21--ビジュアル-パイプライン-ビルダー-ctrl--shift--p))
- 📜 **プロジェクト個別 & グローバル共通 AI ルール (`~/.config/waddle/` & `.waddle/`)**: リポジトリ内では上位ルートの個別規約（`.waddle/rules_ja.md` / `rules.md`）、リポジトリ外ではグローバル共通規約（`~/.config/waddle/`）を自動適用。選択言語（日本語/英語）に完全連動。([詳細](FEATURES.ja.md#22--プロジェクト個別--グローバル共通-ai-ルール連携-waddlerulesmd--configwaddlerulesmd))
- 🎨 **全22種のネオン & 洗練テーマ**: UI 全体の動的ネオン発光同期、デスクトップからのドラッグ＆ドロップ壁紙設定と 60 FPS リアルタイムぼかし/透過プレビュー、Nerd Fonts タイポグラフィ。([詳細](FEATURES.ja.md#11--全22種類の洗練されたテーマ--高電圧ネオンコレクション))

> 📖 **各機能の詳しい技術仕様や内部機構は** [機能仕様書 (FEATURES.ja.md)](FEATURES.ja.md) をご覧ください。

---

## 🚀 クイックスタート

### 1. 必要環境

- [Rust (Cargo)](https://rustup.rs/) (1.70 以上)
- [Node.js & npm](https://nodejs.org/) (Node 18 以上)
- [Ollama](https://ollama.com/) (ローカル AI エンジン)

### 2. Ollama のセットアップ

```bash
# Ollama デーモンを起動
ollama serve

# 推奨モデルをダウンロード
ollama pull llama3.2
# またはコーディング特化モデル
ollama pull qwen2.5-coder
```

### 3. 開発モードでの起動

```bash
# リポジトリのクローン
git clone https://github.com/wammed/Waddle.git
cd Waddle

# 依存パッケージのインストール & 開発サーバー起動
npm install
npm run tauri dev
```

### 4. プロダクションビルド & パッケージング

```bash
# Arch Linux 向けネイティブ Pacman パッケージ (.pkg.tar.zst) をビルド
npm run package

# システムへのインストール (Arch Linux / CachyOS / Manjaro):
sudo pacman -U src-tauri/target/release/bundle/pacman/waddle-0.1.0-1-x86_64.pkg.tar.zst
```
*スタンドアロン実行ファイル出力先: `src-tauri/target/release/waddle` (~18 MB)。*

---

## ⌨️ 主なショートカットキー

| ショートカット | 動作 |
| :--- | :--- |
| `Ctrl + K` | **AI コマンド自動生成** モーダルを開く |
| `Ctrl + E` | **堅牢化内蔵コードエディタ**（マルチタブ、ソフトタブ、AutoSave）の表示切替 |
| `Ctrl + F` / `Ctrl + H`（エディタ内） | **完全一致 検索 / 置換ミニバー**（ReDoS排除）の開閉 |
| `Ctrl + Shift + F` | **ターミナル内ログ検索** の表示/非表示を切り替え |
| `Ctrl + Shift + H` | **セッション タイムライン & 履歴復元** モーダルを開く |
| `Ctrl + Shift + P` | **ビジュアル パイプライン ビルダー** モーダルを開く |
| `Ctrl + T` | 新規ターミナルタブを開く |
| `Ctrl + W` | 現在のターミナルタブを閉じる |
| `Ctrl + Shift + S` | 分割ペインの**スワップ（配置入れ替え）** |
| `Alt + 1 ~ 4` | レイアウト切り替え（**単一、左右2分割、左メイン3分割、2×2グリッド**） |
| `Ctrl + Enter` | **Git コミット実行** / **AI コマンド即時実行** |
| `Ctrl + ,` | **設定画面**（テーマ、フォント、AI、壁紙、言語、Git）を開く |
| `Esc` | 開いているモーダル・検索バー・ポップアップを閉じる |

> 💡 すべてのショートカットキー一覧は [FEATURES.ja.md](FEATURES.ja.md#️-ショートカットキー一覧-完全版) をご覧ください。

---

## 🔒 セキュリティ & アーキテクチャ (概要)

Waddle は **100% 完全オフライン・ローカルファースト** で動作します：
- **ゼロクラウド流出**: テレメトリ、外部クラウド API、トラッキングは一切ありません。プロンプトもターミナルログもすべて PC 内で処理されます。
- **多層防御ガードレール**: システムディレクトリ（`/etc`, `/usr` 等）および仮想ファイルシステム（`/proc`, `/sys`, `/dev`）のトラバーサル遮断、GPG/Keyring/SSH秘密鍵の絶対保護、Ollama SSRF防御（クラウドメタデータ `169.254.169.254` 遮断）、Git Branch Ref 厳格サニタイズ、XMLタグ境界エスケープ、単語境界による破壊的コマンド検知を完備。
- **機密情報保護 (Secret Masking)**: ターミナル出力中の API キーやアクセストークンを正規表現で即時マスクし、画面共有や録画での意図せぬ資格情報露出を防止。
- **堅牢な POSIX PTY**: 32KB 出力コアレッシング、UTF-8 マルチバイト境界繰り越し、およびプロセスグループ（`-pid`）の安全なシグナル終了。

> 📐 システム全体の構造設計は [アーキテクチャ解説 (ARCHITECTURE.ja.md)](ARCHITECTURE.ja.md) をご覧ください。  
> 🛡️ 網羅的なセキュリティ仕様は [セキュリティポリシー (SECURITY.ja.md)](SECURITY.ja.md) をご覧ください。

---

## 🤖 このプロジェクトについて (AI Vibe Coding)

> [!IMPORTANT]
> ### 💡 AI Vibe Coding による開発
> **Waddle** は、**Google DeepMind の Antigravity (Gemini)** との対話的ペアプログラミング（AI Vibe Coding）によって作成されたプロジェクトです。
> 人間による設計方針・アイデアの提示と、AI による実装・デバッグ・最適化のフローを組み合わせ、低レイヤの Rust PTY プロセス管理、Linux `/proc/<pid>/cwd` によるリアルタイムパス追跡、WebKitGTK 最適化、React 19 フロントエンド、透明 xterm.js レンダリング、ローカル Ollama ストリーミングクライアント、簡易コードエディタに至るまでフルスクラッチで実装されました。

---

## 📄 ライセンス

本プロジェクトは [MIT License](../LICENSE) のもとで公開されています。

<p align="center">
  Crafted via <strong>AI Vibe Coding</strong> 🐧⚡ · Built with ❤️ for Linux Developers
</p>

# 🐧⚡ Waddle

**完全ローカル AI（Ollama）統合型 Linux ターミナルエミュレータ**

Waddle のアイコンイメージ

Waddle は、Linux（Wayland / X11）環境向けに設計された次世代ターミナルエミュレータです。**ローカル LLM（Ollama）**および**簡易内蔵エディタ**をターミナルへと完全に統合し、外部クラウド API（Gemini / OpenAI 等）を一切使わず、すべての AI 処理を**ご自身の PC （ローカル）**で完結させるプライバシー保護＆オフライン対応のターミナルです。 🐧⚡

> Waddle の "🦙" は、迷い虫（Goofy-Goober）を元気に導く、ふかふかのぬくもりのある友です。

---

## ✨ 主な特徴（Key Features）

### 🤖 自然言語からコマンドを自動生成（`Ctrl + K`）

日本語でも英語でも好きな言葉でやりたいことを入力するだけで、ローカルの Ollama モデルが最適な Linux コマンドとその解説を瞬時に生成します。

- 例：`直近のコミットを取り消したい`、`8080 番ポートを使っているプロセスを終了`
- 生成されたコマンドを `Enter` でターミナルに挿入し、`Ctrl + Enter` で即座に実行可能
- 危険なコマンド（`rm -rf`、パーティション操作等）は**警告バッジ付き**でハイライト表示

### 📝 簡易内蔵エディタ & AI コード支援（`Ctrl + E`）

ターミナル画面とシームレスに連携するスライドイン / スプリット型エディタです。

- **クイックオープン & 保存**：カレントディレクトリ内のファイル選択・パス入力・保存をサポート（`Ctrl + S`）
- **Run in Terminal**：編集中のスクリプト（Python、Bash、JS/TS、Rust 等）をワンクリックでターミナルに送信して即時実行
- **AI Edit（`Ctrl + Shift + K`）**：Ollama を活用し「エラー処理を追加して」「TypeScript にリファクタリングして」のようないndiceを与えてコードを自動更新

### 🚨 インテリジェント・エラー自動診断 & ワンクリック修正

コマンド実行がエラー（終了コードが `!= 0` またはエラーログが検出された）ことで終了した場合、直感的なスマートバナーを表示します。

- ワンクリックで「なぜ失敗したか」「修正するための推奨コマンド」をローカル AI が分析・提示
- 推奨修正コマンドもワンクリックで実行可能

### 💬 コンテキスト連動型 AI Copilot サイドバー

`pwd`（カレントディレクトリ）、Git ブランチ・変更状態、直近のコマンドと実行ログを自動で把握した対話型アシスタントです。

- 回答内のコードブロックから直接「ターミナルへ挿入」「即座に実行」「クリップボードにコピー」が可能

### 🦙 Ollama ローカルモデルの自動検出 & 簡単切替

ローカルの Ollama にインストールされているモデル（`llama3.2`、`deepseek-r1`、`qwen2.5-coder`、`codellama`、`mistral` 等）を自動検出します。

- 設定画面（`Ctrl + ,`）でワンクリックでモデル一覧を再取得し、ドロップダウンから選択可
- Ollama の接続状態・バージョンをリアルタイムで表示

### ⚡ 超高速 PTY & xterm.js レンダリング

Rust 製 PTY マネージャー（`portable-pty`）による低レイテンシ・高信頼な疑似端末と、高性能な xterm.js レンダリングによって滑らかな入出力体験を実現します。

- WebGL / Canvas アクセラレーション描画
- TrueColor（24bit）対応
- Nerd Fonts 対応

### 🎨 美しいモダンテーマ

4 つの美しいテーマから選べます。

- **Waddle Cyber Dark**（デフォルト）
- **Tokyo Night**
- **Catppuccin Mocha**
- **Dracula**

---

## ⌨️ キーボードショートカット

| ショートカット | 機能 |
| :--- | :--- |
| `Ctrl + K` | **AI Command Generator** を開く |
| `Ctrl + E` | **簡易内蔵エディタ** の開閉トグル |
| `Ctrl + S`（エディタ内） | ファイルの保存 |
| `Ctrl + Shift + K`（エディタ内） | **AI コード編集・自動生成** を開く |
| `Ctrl + T` | 新しいターミナルタブを開く |
| `Ctrl + W` | 現在のタブを閉じる |
| `Ctrl + ,` | 設定画面（Ollama モデル選択、テーマ設定）を開く |
| `Enter`（AI Modal 内） | 生成されたコマンドをターミナルに挿入 |
| `Ctrl + Enter`（AI Modal 内） | 生成されたコマンドを即時実行 |
| `Esc` | モーダルを閉じる |

---

## 🏗️ テクノロジー（Tech Stack）

- **Tauri 2** — リッチなデスクトップアプリを軽量な Rust バックエンドで構築
- **React 19 + TypeScript** — 型安全性を考慮したフロントエンド開発
- **Vite** — 高速なビルドツール
- **xterm.js + xterm-webgl / xterm-canvas** — 高性能なターミナル描画
- **xterm-fit / xterm-web-links** — 自動スクリーンフィット・リンク表示
- **portable-pty（Rust）** — 低レイテンシな疑似 PTY
- **Ollama** — 完全ローカルの AI 処理エンジン
- **lucide-react + react-markdown（GFM）** — アイコンと副作用のあるマークダウンレンダリング

---

## 🚀 クイック開始

### 1. 依存項の確認

Waddle を構築する前に、以下のツールをインストール済みか確認してください。

| ツール | 必須バージョン |
| :--- | :--- |
| [Rust](https://rustup.rs/) | 安定版（Stable） |
| [Node.js](https://nodejs.org/) | v18 以上 |
| [Clang/LLVM](https://clang.llvm.org/) | x86_64-linux-gnu 版 |
| Ollama | 1.0 以上（[公式サイト](https://ollama.com/download)） |

### 2. Ollama の起動とモデルのダウンロード

Waddle は Ollama を中心にローカルで活用しますので、事前に Ollama とモデルを準備します。

```bash
# Ollama サーバーを起動（バックグラウンドで稼働させます）
ollama serve

# お好みのモデルをダウンロード
# 例: llama3.2 や deepseek-r1、qwen2.5-coder
ollama pull llama3.2
```

### 3. Waddle の開発ビルド

```bash
# 依存パッケージのインストール
npm install

# 開発用で起動（http://localhost:1420 を開いてください）
npm run tauri dev
```

> 💡 依存パッケージのインストール（`npm install`）は初めてを使う度に一度だけ実行してください。

### 4. Waddle のパッケージ化 & 配布ビルド

正式リリース版をビルドしたい場合は、以下のいずれかを実行します。

```bash
# OS に依存しないフロントエンドのアセットをビルド
npm run build

# OS 別パッケージ（deb / rpm / AppImage / dmg / msi / nsis 等）を生成
npm run tauri build
```

> 💡 バイナリ生成の最初のビルドでは、バックエンドのコンパイルを含むため数分かかります。ご耐心ください。

---

## 📊 開発ワークフロー

```
       ┌─────────────────────────────────────────────┐
       │           npm run tauri dev                    │
       └───────────────┬───────────────────┬──────────┘
                       │                   │
              ┌────────▼─────────┐   ┌─────▼──────────┐
              │   Vite + React    │   │  Rust (Tauri)  │
              │   Frontend        │   │   Backend       │
              │   (xterm, Ollama) │   │  (portable-pty) │
              └────────┬──────────┘   └────────┬────────┘
                       └───────────┬───────────┘
                                   │
                        ┌──────────▼──────────┐
                        │   Waddle ウィンドウ   │
                        │  (ターミナル + エディタ  │
                        │   + AI Copilot サイドバー)│
                        └───────────────────────┘
```

---

## 🖥️ プロジェクト構成

```text
.
├── index.html          # Vite の HTML エントリポイント
├── package.json        # フロントエンド依存とスクリプト
├── tsconfig.json       # TypeScript 設定
├── vite.config.ts      # Vite 設定
├── public/             # ビルド時にそのまま含めるリソース
├── src/                # React / TypeScript フロントエンド
│   ├── main.tsx        # アプリエントリー
│   ├── index.css       # グローバル CSS
│   ├── App.css         # コンポーネント固有の CSS
│   ├── App.tsx         # ルートコンポーネント
│   ├── theme.ts        # テーマ定義
│   ├── types.ts        # 型定義
│   ├── components/     # React コンポーネント
│   ├── services/       # Ollama / Tauri などのロジック
│   └── assets/         # 画像・フォント等
└── src-tauri/          # Rust バックエンド (Tauri)
    ├── tauri.conf.json # Tauri アプリ設定
    ├── Cargo.toml      # Rust 依存
    ├── build.rs        # Tauri ビルドフック
    ├── icons/          # アプリアイコン
    └── src/            # Rust 実装
```

---

## 🔒 プライバシー & セキュリティ

Waddle は以下の原則に基づいて設計されています。

- **一切クラウドに依存しない**：AI 処理（コマンド生成、エラー診断、チャット支援、コード自動編集）はすべてローカルで完結します
- **外部 API 不使用**：Gemini / OpenAI 等の第三者 API を一切利用しません
- **データは手元を守る**：すべての処理をご自身の環境内で実行しますので、プロンプトやコードは一切外部に出ません

---

## 🤝 貢献（Contributing）

Waddle はオープンで透明性のある開発を方針としています。コードの改善、バグフィクス、新機能の提案など、誰でも参加できます。新しい機能を開発する際は、必ず PR を作成し、関連するテストを記述してください。

---

## 📄 ライセンス

Waddle は MIT ライセンスで公開されています。`LICENSE`（別途整備予定）を参照してください。

---

## 🙋 質問への答え（FAQ）

### Q: インストールには Ollama は必須ですか？
A: Waddle の AI 機能を利用するには Ollama のインストール＆動作が必須です。ターミナル機能そのものは利用できますが、AI 機能が正常に機能しない場合は Ollama の稼働をご確認の上、再度お試しください。

### Q: Windows / macOS は動くでしょうか？
A: Waddle は現在 Linux（Wayland / X11）環境を対象として設計されています。将来的に他 OS への対応を検討しておりますので、ご意見は Welcome です（[#29](#)）。

### Q: どの Ollama モデルが推奨されますか？
A: ターミナル・コード関連のタスクにはコードに特化したモデル（例：`qwt2.5-coder`、`codellama`）を推奨しつつ、汎用的な会話には `llama3.2` や `deepseek-r1` でも十分に活用可能です。

---

<p align="center">
  Made with 💛🐧 by <strong>Susie</strong>.
  <br>
  迷い虫も、あなたと一緒にどこかへ向かいます。
</p>

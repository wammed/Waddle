# Waddle プロジェクト個別 AI ルール & コンテキスト (Private Rules)
> **配置場所**: `.waddle/rules_ja.md`  
> **対象言語**: 日本語 (`ja`)  
> **適用範囲**: 本リポジトリ（およびすべてのサブディレクトリ）配下の作業時に最優先適用  
> ※ リポジトリ外に移動した際は自動的に `~/.config/waddle/rules_ja.md` (Global Rules) へ切り替わります。

---

## 1. プロジェクト概要 & 技術スタック (Overview & Tech Stack)
本プロジェクトは、プライバシー重視・100% オフライン稼働を特徴とする次世代ターミナル & 開発者ワークステーション **Waddle** です。

- **コア技術スタック**:
  - **デスクトップ基盤**: Tauri v2 (Rust + WebKitGTK / WebView2)
  - **バックエンド (Rust)**: Tokio 非同期ランタイム、`portable-pty` (疑似端末管理)、`flate2` (Kitty 画像 zlib 解凍)
  - **フロントエンド (TypeScript / React)**: React 18, Vite, xterm.js (Canvas レンダラー), Lucide React
  - **AI 連携**: Ollama (ローカル LLM HTTP クライアント、行バッファリング SSE ストリーミング)
- **推奨パッケージマネージャ & ビルドコマンド**:
  - Node.js / フロントエンド: `npm` (`npm run build`, `npm run dev`)
  - Rust バックエンド: `cargo` (`cargo test --manifest-path src-tauri/Cargo.toml`, `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets`)
  - リリースビルド: `npm run tauri build`

---

## 2. コマンド実行ポリシー (Command Execution Policy for AI)
`Ctrl + K` による AI コマンド生成、自律型エラー監視 (`Autonomous Watchdog`)、パイプラインビルダーにおいて、AI は以下の安全原則を厳守すること：

- **破壊的コマンドの完全禁止**:
  - `rm -rf /` やルートファイルシステム、ホームディレクトリ直下の一括削除は絶対に提案しないこと。
  - ディスクフォーマット (`mkfs.*`, `dd if=... of=/dev/sd*`) や未確認のデバイスブロック書き込みは禁止。
- **Git 操作の安全基準**:
  - 強制プッシュが必要な場合は、`--force` ではなく必ず安全な `--force-with-lease` を提案すること。
  - コミット前の差分確認には `git diff` や `git status -s` を推奨すること。
- **権限昇格の最小化**:
  - 不要な `sudo` は避け、ユーザー権限で実行可能な操作を優先すること。

---

## 3. コーディング規約 & 設計方針 (Coding Standards & Architecture)
Waddle のソースコード（Rust / TypeScript）を変更・生成する際は以下の規約を遵守すること：

- **Rust バックエンド (`src-tauri/src/`)**:
  - 本番コードにおいて無警戒な `.unwrap()` や `.expect()` は禁止。`Result<T, E>` および `Option<T>` を適切にパターンマッチまたは `?` でハンドリングすること。
  - PTY やファイル操作では、メモリ枯渇 (DoS) やバッファあふれを防ぐためバックプレッシャー制御とサイズ上限チェックを設けること。
  - Clippy の警告が 0 件を維持するようにコードを記述すること。
- **TypeScript / React フロントエンド (`src/`)**:
  - 関数コンポーネントと React Hooks を採用し、厳格な型定義（TypeScript strict mode）を行うこと（`any` 型の安易な使用禁止）。
  - CSS はテーマ変数（CSS Custom Properties / `--theme-*`）を活用し、ネオン発光やリアルタイム壁紙プレビューと調和させること。
  - 描画パフォーマンスを意識し、60 FPS を維持できるイベントハンドリングやデバウンスを行うこと。

---

## 4. Git コミット規約 (Conventional Commits)
AI がコミットメッセージを生成・提案する際は、Conventional Commits 仕様に厳格に従うこと：

- **形式**: `<type>(<scope>): <要約>`
- **主要 Type**:
  - `feat`: 新機能の追加
  - `fix`: バグ修正
  - `refactor`: 機能変更を伴わないコード改善
  - `perf`: パフォーマンス向上
  - `docs`: ドキュメントの追加・更新
  - `test`: テストコードの追加・改善
  - `style`: フォーマットやスタイルの修正（ロジック変更なし）
  - `chore`: ビルドツールやパッケージ更新などの雑務
- **言語方針**:
  - 本リポジトリの履歴方針（日本語または英語の簡潔な要約）に準拠すること。

---

## 5. セキュリティガードレール & プライバシー保護 (Security Guardrails)
- **100% オフライン・プライバシー最優先**:
  - 外部クラウド API への無断テレメトリ送信やデータ流出は一切禁止。ローカル Ollama のみを使用すること。
- **機密情報の完全隔離 (Secret Redaction)**:
  - API キー (GitHub, OpenAI, AWS 等)、秘密鍵 (`id_rsa`, `id_ed25519`)、トークンを生成コードやコミットメッセージ、ターミナルログに出力しないこと。
- **パストラバーサル & サンドボックス防御**:
  - シェル設定ファイル (`~/.bashrc`, `~/.zshrc`, `~/.profile`) や秘密鍵ディレクトリ (`~/.ssh`, `~/.gnupg`) への不正な書き込み・削除を提案・実行しないこと。
  - ディレクトリ走査時は 500 件上限のページネーションガードを遵守し、大量ファイルによるメモリ枯渇を防止すること。
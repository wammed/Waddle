# Waddle プロジェクト個別 AI ルール & コンテキスト
> **配置場所**: `<PROJECT_ROOT>/.waddle/rules_ja.md`  
> **対象言語**: 日本語 (`ja`)  
> このファイルは Waddle のローカル AI (`Ctrl + K` コマンド生成、Copilot チャット、Git コミット生成) が参照します。  
> プロジェクトの要件に合わせて以下のルールを編集・カスタマイズしてご利用ください。

## 1. プロジェクト概要 & 技術スタック
- プロジェクト種別: Tauri 2.0 + React 19 + Rust デスクトップアプリ
- 主要言語: Rust 1.70+, TypeScript / JavaScript (Node 18+)
- パッケージマネージャ: npm (※ yarn, pnpm, bun は使用しない)
- ビルドツール: Cargo, Vite

## 2. コマンド実行ポリシー (Ctrl + K / パイプライン)
AI がターミナルコマンドを提案・生成する際は、以下のルールを最優先で適用してください。
- パッケージ管理:
  - パッケージの追加やスクリプト実行には必ず npm を使用すること (例: `npm install <pkg>`, `npm run dev`)。
  - システムパッケージのインストールコマンドを提案する場合は、Arch Linux / CachyOS 系を優先し `sudo pacman -S <pkg>` を用いること。
- 破壊的コマンドの禁止・制限:
  - `rm -rf /` やカレントディレクトリ全削除 (`rm -rf ./*`) は絶対に提案しないこと。
  - Git の強制プッシュ (`git push --force`) は提案せず、必要なら `--force-with-lease` を明示すること。
- フォーマット・リント:
  - フロントエンド: `npm run lint` / `npm run format`
  - バックエンド: `cargo fmt --check` / `cargo clippy`

## 3. コーディング規約 & 設計方針 (Ctrl + E / Copilot)
エディタ内リファクタリング (`Ctrl + Shift + K`) や Copilot チャットでのコード生成方針です。
- Rust (バックエンド):
  - エラーハンドリングは `unwrap()` を避け、`Result` / `Option` や `anyhow` / `thiserror` を適切に使用する。
  - 非同期処理は tokio ランタイムの規約に従う。
  - PTY やプロセスを操作する際は、ゾンビプロセスの防止と確実なクリーンアップを行う。
- React / TypeScript (フロントエンド):
  - 関数コンポーネント + Hooks のみを使用する (クラスコンポーネントは非推奨)。
  - CSS は Tailwind CSS もしくはプロジェクト内 CSS Modules 規約に従う。
  - インラインスタイルの過剰な多用は避け、テーマ変数 (CSS Custom Properties) を活用する。

## 4. Git コミット & ブランチ規約 (Conventional Commits)
ステータスバー連動 Git ハブでの自動コミットメッセージ生成ルールです。
- コミットメッセージ形式:
  `<type>(<scope>): <short description in Japanese or English>`
  
  `[optional body]`
- Type 一覧:
  - `feat`: 新機能の追加
  - `fix`: バグ修正
  - `refactor`: リファクタリング (機能変更なし)
  - `perf`: パフォーマンス改善
  - `style`: コードスタイル・フォーマット修正
  - `docs`: ドキュメントの修正
  - `chore`: ビルドツールや設定ファイルの変更
- ブランチプレフィックス:
  - 機能開発: `feature/`
  - バグ修正: `fix/`
  - ドキュメント/調査: `chore/`

## 5. セキュリティ & プライバシー保護
- 機密情報の排除:
  - API キー、パスワード、秘密鍵 (`.pem`, `.key`)、トークンをコードやコミットメッセージ、ログ出力に含めない。
- サンドボックス意識:
  - ファイルアクセスやパス操作時は、プロジェクトルート外への意図しないディレクトリトラバーサル (`../`) を避けるコードを提案すること。
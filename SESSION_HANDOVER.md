# Waddle 開発引き継ぎサマリー (Session Handover & Continuation Guide)

本ドキュメントは、これまでの開発・改修内容の全履歴、技術的決定事項、アーキテクチャの変更点、および今後の開発再開時にスムーズに作業を継続できるようにまとめた包括的な引き継ぎ資料です。

---

## 1. プロジェクト概要 & 技術構成

- **アプリケーション名**: Waddle (AI-Integrated Next-Generation Linux Terminal Emulator)
- **リポジトリパス**: `/home/susie/GitHUB/wammed/Waddle`
- **フレームワーク**: Tauri v2 + Vite + React 19 + TypeScript + Rust
- **主要ライブラリ**:
  - フロントエンド: `@xterm/xterm` (v5), `@xterm/addon-canvas`, `@xterm/addon-fit`, `@xterm/addon-web-links`, `@xterm/addon-search`, `lucide-react`
  - バックエンド (Rust): `portable_pty`, `tokio`, `serde`, `libc`, `reqwest` (Ollama AI API)

---

## 2. これまでのユーザー要望と対応履歴（時系列）

1. **最新実装に沿った README.md / README.ja.md の更新**:
   - 多言語（日英）ドキュメントを最新のショートカット、レイアウト仕様、アーキテクチャ図に同期。
2. **アプリアイコン差し替え場所の調査**:
   - `src-tauri/icons/`（各サイズ PNG, ICNS, ICO）およびフロントエンドの `src/assets/waddle-icon.svg`, `public/waddle-icon.svg` を案内。
3. **会話履歴エクスポートの出力先確認 & 保存ダイアログ不具合対応**:
   - WebKitGTK 環境下での Blob ダウンロード挙動を修正し、Markdown (`.md`) / JSON (`.json`) 形式でのローカル保存を確実に動作するよう改修。
4. **プロジェクト全体のコードレビューと改善提案の実施**:
   - 信頼性・セキュリティ・パフォーマンス・拡張性に関する 13 項目の課題を特定し、全項目を実装。
5. **起動時描画遅延・入力ブロック & 背景画像非表示の緊急対応**:
   - GPU シェーダーコンパイルで同期ブロックを起こしていた WebGL を CanvasAddon へ移行し 0ms 起動化。
   - `terminal-area` 直下に壁紙レイヤーを再配置し、透過ターミナルの背景表示を復元。
6. **起動速度のばらつき、リサイズ時の画面ちらつき、3・4分割ペインのグラブ不能の解決**:
   - PTY レースコンディションを `start_pty` 同期ハンドシェイクで解消し、Frame 0 から常にプロンプトを瞬時描画。
   - ドラッグ中の Canvas 再生成・クリアを抑止し、フリッカーフリーのリサイズを実現。
   - 3分割（4種）、4分割（3種）を含む全10レイアウトに 16px 広域当たり判定ディバイダーを実装。
7. **会話履歴のまとめ書き出し**:
   - ここまでの経緯・アーキテクチャ・検証結果を `SESSION_HANDOVER.md` に集約。
8. **Git 連携強化の提案と全項目実装**:
   - ステータスバー連動 Git Quick Popover、ローカル Ollama による Conventional Commit 自動生成、GUI Diff ビューワー、ファイルツリーの Git 状態装飾、Ahead/Behind 同期追跡を実装。
9. **Git アクション不具合解消 & 設定画面 ON/OFF & GitHub 特化接続制限**:
   - Tauri コマンド引数名の不一致（`path` vs `repoPath`）、`GitFileEntry` 構造体フィールドの乖離、カレントディレクトリの解決（`resolve_repo_root`）を修正。
   - 設定画面に「Git 連携の有効化」トグルを新設し、OFF 時はバックグラウンド Git ポーリングを全停止するローカル完結モードを実装。
   - GitHub 限定セキュリティポリシー（`restrict_to_github`）を新設。非 GitHub リモートの検知・警告、CSP `connect-src` の厳格制限（Ollama + GitHub のみに限定）を実装。
10. **Git ポップオーバー内での `git push` / `git pull` 実装**:
    - クイックポップオーバー内にインタラクティブな Pull（↓）/ Push（↑）ボタンを配置。
    - Ahead / Behind のコミット件数バッジ発光、プログレススピナー、完了トースト、エラーバナー、多言語表示を完備。
    - GitHub 限定ポリシーに基づき非 GitHub リモートへの push/pull を事前遮断するガードレールを組み込み。
11. **高電圧ネオンテーマの大幅拡充 & UI 発光同期・プレビュー機能の実装**:
    - ユーザー要望「neon系のハデハデテーマをもっと増やして」に応え、9種の新規超高輝度ネオンテーマを追加（全22テーマ中、ネオン11種）。
    - CSS変数（`--accent-rgb`, `--border-active`, `--accent-blue`）を全テーマ同期させ、UI全体がネオン発光するよう強化。
    - 設定画面に「⚡ High-Voltage Neon Themes」カテゴリ分類、`⚡ NEON` アニメーションバッジ、リアルタイムカラー見本＆ミニターミナルプレビューカードを新設。
12. **アプリアイコンの完全差し替え（waddle-matte-icon.svg）**:
    - ユーザー指定の `images/waddle-matte-icon.svg` に基づき、フロントエンド（`src/assets/waddle-icon.svg`, `public/waddle-icon.svg`, `images/waddle-icon.svg`）、Tauriバンドルアイコン全種（`src-tauri/icons/` 配下の ICO, ICNS, 各サイズPNG, iOS/Android）、Linuxデスクトップ環境（`~/.local/share/icons/hicolor/` 配下の scalable SVG および 512px/256px/128px PNG）を全件差し替え更新。
    - `generate_icons.py` の生成元パスを更新し、`npm run build` を再実行して `dist/` 配下の配信用アセットも同期完了。

13. **包括的なセキュリティ強化・パフォーマンス最適化・セッション永続化・超リッチファイルツリーの実装**:
    - ユーザー要望「全体のレビュー・セキュリティ評価」および「すべての改善、拡充を実行して。あと、左側ファイルツリーの表示をもっとリッチにして」に基づき、バックエンドからフロントエンドまで網羅的に実装・検証。
14. **タイトルバーへのワークスペース全リフレッシュボタン設置 & 確認ダイアログの実装**:
    - ユーザー要望「tab,pane,current directory等、すべてをリフレッシュするボタンをタイトルバーに設置して ボタンクリック時に確認ダイアログが挟まれるように」に基づき実装。
    - タイトルバー右側のレイアウト選択と設定ボタンの間に `RotateCcw` アイコン付きの「リフレッシュ（Refresh）」ボタン（`#btn-refresh-all`）を新設。
    - ボタン押下時に誤操作を防止するモーダル確認ダイアログ（`RefreshConfirmModal`）を `createPortal` 経由で最前面に表示。
    - 確認ダイアログでは、全タブ・分割ペインの終了、実行中プロセスの停止、セッション保存情報（`localStorage`）のクリア、ホームディレクトリへのリセットを視覚的バッジ付きで明示し、`Escape` キーまたはキャンセルボタンで安全に中断可能。
    - 実行時は、すべての PTY プロセスを確実に終了させ、初期ホームディレクトリでの単一タブ・単一ペインを生成。さらにファイルツリーのキャッシュ・展開状態・エディタ・各種モーダルを完全クリアして初期状態へ復帰。
15. **ドキュメント構造の体系化 & README (日英) のスリム化・リファクタリング**:
    - ユーザー要望「Waddleのドキュメント構造を整理し、ルートの `README.md` をスリム化・リファクタリング」「日本語版README.ja.mdも再構成」に基づき実施。
    - 内部実装・詳細仕様・アーキテクチャ・セキュリティポリシーを専門ドキュメントへ完全移行：
      - `docs/FEATURES.md` & `docs/FEATURES.ja.md`: 全15機能の詳細解説、内部仕様、全ショートカット一覧。
      - `docs/ARCHITECTURE.md` & `docs/ARCHITECTURE.ja.md`: Mermaid システム構成図、PTY 32KB コアレッシング、UTF-8 境界処理、プロセスグループ終了、CWD 追跡、Tech Stack テーブル。
      - `SECURITY.md` & `SECURITY.ja.md`: システムディレクトリ前方一致保護、認証情報保護、プロンプトインジェクション対策、危険コマンド検知一覧、CSP、GitHub 限定ポリシー。
    - ルートの `README.md` および `README.ja.md` をそれぞれ 350行超から 148行へスリム化し、訪問者が主要価値を短時間で把握できる scannable な構成（Highlights, Quick Start, Keybindings, Overview, Callout, License）に再構築。
16. **Kitty Graphics Protocol の完全実装と厳格なセキュリティ制御の統合**:
    - `fastfetch`, `yazi`, Neovim (`image.nvim`) などの CLI/TUI ツールからターミナル Canvas への直接画像描画・操作をフルサポート。
    - APC シーケンス解析 (`\x1b_G...` / ST `\x1b\` / BEL `\x07`)、アクション (`a=t, T, p, d, q`)、形式 (`f=100 PNG, 32 RGBA, 24 RGB`)、転送 (`t=d, f`)、チャンク化 (`m=1, 0`)、即時ハンドシェイク応答 (`\x1b_Gi=<id>;OK\x1b\`) を実装。
    - `$HOME/Pictures` へのローカルファイル直接参照 (`t=f`) サンドボックス（Rust canonicalize による脱出遮断）。
    - 展開爆弾 (Decompression Bomb) 防御 (最大 4096px、ヘッダー事前検査)。
    - 累積 Base64 ペイロード制限 (16MB)。
    - テクスチャキャッシュ & GPU/VRAM 上限管理 (256MB LRU, 明示的 `bitmap.close()`)。
    - 描画パイプラインの分離: 「セル背景色 → 画像レイヤー (`ctx.drawImage`) → セルテキスト/グリフ → カーソル」。
    - 設定画面 (`Ctrl + ,`) への画像プロトコル制御項目追加。
    - 8ドキュメント（EN/JA）の完全対称同期更新。

---

## 3. 実施された主要な改善と技術的解決策

### A. セキュリティ防御とファイル保護の厳格化
- **対象ファイル**: [`src-tauri/src/pty.rs`](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/pty.rs), [`src-tauri/src/ai.rs`](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/ai.rs), [`src-tauri/src/lib.rs`](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/lib.rs)
- **Git パストラバーサル防止**: `git_discard_file` で `ParentDir` (`..`) および正規化パスがリポジトリルート外を指す場合のファイル破棄・削除を厳格拒否。
- **Git 引数インジェクション防止**: `git_checkout_branch` に `--` デリミタを適用し、`-b` や `--track` などのフラグ偽装によるコマンド誤爆を抑止。
- **シェル起動設定ファイルの保護**: `validate_safe_write` および `validate_safe_deletion` において、`~/.bashrc`, `~/.bash_profile`, `~/.bash_login`, `~/.zshrc`, `~/.zprofile`, `~/.zshenv`, `~/.profile` への直接書き込み・削除を物理遮断。
- **Ollama 64KB バッファガード**: `stream_ollama` で改行なしの長大ストリームによるメモリ枯渇 (DoS) を防止する 64KB リミットを導入。
- **危険コマンド検出パターンの拡張**: `mkswap`, `cryptsetup`, `iptables -F`, `ufw disable`, `git push --delete`, `git branch -D`, パイプ/リダイレクト経由のスクリプト実行（`| python`, `| python3`, `| perl`, `| ruby`, `python <(...)` など）を網羅。

### B. PTY 出力コアレッシング & 大規模ディレクトリ防御
- **対象ファイル**: [`src-tauri/src/pty.rs`](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/pty.rs), [`src-tauri/src/lib.rs`](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/lib.rs)
- PTY リーダーバッファを 32KB に拡張し、UTF-8 デコード結果を1回の IPC イベントにコアレッシングして一括送信。大量ログ出力時の IPC 負荷を劇的に削減しつつ、キー入力の 0ms レイテンシを維持。
- `read_directory` で最大読み取り件数を 500 件に制限し、巨大フォルダ（node_modules 等）展開時の UI フリーズを防止。

### C. セッション状態・分割比率・作業ディレクトリの完全永続化 (Auto-Restore)
- **対象ファイル**: [`src/hooks/useTerminalTabs.ts`](file:///home/susie/GitHUB/wammed/Waddle/src/hooks/useTerminalTabs.ts), [`src/types.ts`](file:///home/susie/GitHUB/wammed/Waddle/src/types.ts)
- `localStorage` (`waddle_session_state`) を活用し、アプリ終了時のタブ構成、各ペインのレイアウト、CWD（カレントディレクトリ）、分割比率、アクティブタブを自動保存。
- 次回起動時に保存セッションを自動復元し、それぞれの作業ディレクトリで PTY プロセスを再生成。

### D. 全10レイアウトの分割ペイン境界ドラッグ & キーボードリサイズ & スワップ
- **対象ファイル**: [`src/components/TerminalPane.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/TerminalPane.tsx), [`src/hooks/useGlobalShortcuts.ts`](file:///home/susie/GitHUB/wammed/Waddle/src/hooks/useGlobalShortcuts.ts), [`src/hooks/useTerminalTabs.ts`](file:///home/susie/GitHUB/wammed/Waddle/src/hooks/useTerminalTabs.ts), [`src/index.css`](file:///home/susie/GitHUB/wammed/Waddle/src/index.css)
- マウスドラッグによる境界リサイズに加え、`Ctrl+Alt+ArrowLeft/Right/Up/Down` によるキーボード駆動の微細リサイズ（5%刻み、0.15〜0.85クランプ）、および `Ctrl+Shift+S` による分割ペイン間スワップを実装。

### E. 左側ファイルツリーの超リッチ全面改修
- **対象ファイル**: [`src/components/FileTreeSidebar.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/FileTreeSidebar.tsx), [`src/index.css`](file:///home/susie/GitHUB/wammed/Waddle/src/index.css), [`src/i18n/translations.ts`](file:///home/susie/GitHUB/wammed/Waddle/src/i18n/translations.ts), [`src/services/tauriApi.ts`](file:///home/susie/GitHUB/wammed/Waddle/src/services/tauriApi.ts), [`src-tauri/src/lib.rs`](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/lib.rs)
- **言語別カラフルバッジ & アイコン**: TypeScript (TS/TSX), Rust (RS), Python (PY), JSON, Markdown, CSS, HTML, Shell (SH) など20種以上のファイル形式に応じた専用カラーバッジとアイコンを表示。
- **クリック可能ブレッドクラム**: サイドバー上部にパス階層をピル形式で表示し、任意の親フォルダへワンクリックでジャンプ。
- **ツリーガイドライン**: 入れ子フォルダの階層構造を Zed / VS Code 風のインデントガイドラインで視覚化。
- **ファイルサイズ & 子要素数バッジ**: ファイル行にサイズ（例: `4.2 KB`）、フォルダ行にアイテム数（例: `(12)`）を表示。
- **右クリックコンテキストメニュー**:
  - 📝 エディタで開く
  - 💻 ターミナルへパス挿入
  - 📋 相対パス / 絶対パスのコピー
  - 📁 OS標準ファイルマネージャーで表示 (`reveal_in_file_manager`)
  - ✏️ 名前の変更 (`rename_entry` / インラインプロンプト)
  - 🗑️ 削除
  - ➕ フォルダ配下への新規ファイル/フォルダ作成
- **ホバークイックアクション**: 行ホバー時にエディタ、パスコピー、ターミナル挿入、削除の各ボタンを配置。

### F. Git 認証エラーガイダンス
- **対象ファイル**: [`src/components/GitQuickPopover.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/GitQuickPopover.tsx), [`src/i18n/translations.ts`](file:///home/susie/GitHUB/wammed/Waddle/src/i18n/translations.ts)
- `git push` / `git pull` で公開鍵認証やクレデンシャルエラーが発生した場合、SSH 秘密鍵の登録や `gh auth login` を促すフレンドリーなガイダンスバナーを表示。

### G. Kitty 画像プロトコル (Kitty Graphics Protocol) 完全サポート & 厳格なセキュリティ制御
- **対象ファイル**: [`src-tauri/src/kitty.rs`](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/kitty.rs), [`src-tauri/src/lib.rs`](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/lib.rs), [`src/services/kittyGraphics/`](file:///home/susie/GitHUB/wammed/Waddle/src/services/kittyGraphics/), [`src/components/SingleTerminalView.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/SingleTerminalView.tsx), [`src/components/SettingsModal.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/SettingsModal.tsx)
- **ゼロ遅延ストリーム分離パーサー**: PTY バイナリストリームから APC エスケープシーケンス (`\x1b_G...`) を xterm 描画前に事前分離。数メガバイトに及ぶ Base64 データを xterm に通さず、ターミナルの描画遅延やフリーズを根絶。
- **ローカルファイル直接参照 (`t=f`) サンドボックス**: 初期設定で `$HOME/Pictures` 配下に限定し、Rust 側の `std::fs::canonicalize` で `../` パストラバーサル脱出や外部シンボリックリンク経由のアクセスを `EACCES` / `ENOENT` で厳格遮断。
- **展開爆弾 (Decompression Bomb) 対策**: 最大解像度 4096×4096 px、最大 Base64 ペイロード 16MB に制限。PNG IHDR / JPEG SOF ヘッダーをデコード前に直接検証し、超過画像を即時破棄。
- **GPU/VRAM 上限管理 (LRU)**: 256MB キャッシュ総枠内で LRU 管理。解放時・削除時 (`a=d`) に必ず明示的に `ImageBitmap.close()` を呼び出し、WebKitGTK および GPU メモリリークを防止。
- **合成パイプライン**: `.xterm-screen` の最背面にキャンバスをマウントし、「セル背景色 → 画像レイヤー → セルテキスト/グリフ → カーソル」の階層合成を実現。

---

## 4. 変更された重要ファイル一覧

| ファイルパス | 主な役割・変更内容 |
|---|---|
| `src-tauri/src/kitty.rs` | Kitty サンドボックスファイルリーダー、パス正規化、シンボリックリンク脱出防止、ヘッダー検査、単体テスト |
| `src-tauri/src/config.rs` | `KittyGraphicsConfig` 構造体（有効化、最大寸法、ペイロード上限、キャッシュ上限、許可ディレクトリ） |
| `src-tauri/src/lib.rs` | `kitty_read_file` Tauri コマンドの登録および公開 |
| `src/types.ts` | `KittyGraphicsConfig` TypeScript インターフェース定義 |
| `src/services/tauriApi.ts` | `kittyReadFile` フロントエンド API ラッパー |
| `src/services/kittyGraphics/types.ts` | Kitty Graphics プロトコルキー・配置・画像レコードの型定義 |
| `src/services/kittyGraphics/parser.ts` | APC ストリーミングパーサー（ST/BEL対応、Base64分離、チャンク化結合バッファリング） |
| `src/services/kittyGraphics/decoder.ts` | 画像デコーダー（PNG/RGBA/RGB/ファイル参照、展開爆弾検証、ImageBitmap生成） |
| `src/services/kittyGraphics/lruCache.ts` | LRU テクスチャキャッシュ（256MB上限、明示的 `bitmap.close()` メモリ解放） |
| `src/services/kittyGraphics/manager.ts` | Kitty Graphics マネージャー（Canvasマウント、スクロール連動、クエリ即時応答、配置管理） |
| `src/components/SingleTerminalView.tsx` | PTY ストリームの APC インターセプト、Canvas オーバーレイ統合、ライフサイクル管理 |
| `src/components/SettingsModal.tsx` | Kitty Graphics 設定セクション（トグル、最大寸法、ペイロード、キャッシュ、許可パス、危険パス警告） |
| `src/i18n/translations.ts` | 日英多言語辞書（Kitty 画像プロトコル設定文言・説明・警告） |
| `docs/FEATURES.md` & `.ja.md` | 機能仕様書への第16項「Kitty Graphics Protocol」詳細解説の追加 |
| `docs/ARCHITECTURE.md` & `.ja.md` | アーキテクチャ図および第5項「Kitty Graphics Subsystem & Pipeline」設計の追加 |
| `SECURITY.md` & `.ja.md` | セキュリティ仕様書への「Kitty Graphics Protocol Security & Resource Guards」の追加 |
| `README.md` & `.ja.md` | ルート README への Kitty Graphics Protocol ハイライト追加 |

---

## 5. ビルド・検証コマンド

```bash
# フロントエンドの型検査 & 本番ビルド (Vite + TypeScript) - 警告/エラー0件でビルド完了
npm run build

# Rust バックエンドの単体テスト (全18件すべてパス、うち Kitty セキュリティテスト6件)
cargo test --manifest-path src-tauri/Cargo.toml

# Rust の Clippy 静的解析 (警告0件)
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets

# デスクトップアプリの開発起動
npm run tauri dev
```

---

## 6. 次回再開時の検討・作業候補（Next Steps）

1. **ファイルツリーのドラッグ＆ドロップ移動**:
   - ファイルやフォルダを別のディレクトリへドラッグして移動する操作の追加。
2. **GitHub Issue / PR 参照連携**:
   - GitHub 限定ポリシーの枠組みの中で、GitHub CLI (`gh`) または GitHub API 経由でカレントブランチに関連する Issue や PR の簡易ステータスを表示する拡張。
3. **エディタペインのタブ化**:
   - 複数ファイルを同時に開いて切り替えられるタブ型エディタへの発展。

---

## 7. 今後の機能追加・修正時におけるドキュメント同期方針 (Documentation Policy)

ユーザー指示に基づき、今後**機能追加（Feature）**、**バグ修正（Bug Fix）**、**セキュリティ強化（Security Fix）**を実施した際は、以下の 8 ドキュメント構成に従って**英語版・日本語版を必ずセットで同期更新**します：

1. **ルート概要ドキュメント（スリム・Scannable構成を維持）**:
   - [`README.md`](file:///home/susie/GitHUB/wammed/Waddle/README.md) & [`README.ja.md`](file:///home/susie/GitHUB/wammed/Waddle/README.ja.md)
   - 新機能や主要変更の 1〜2 行要約バレット（Highlights）の追加・更新。
   - 変更に関連する詳細ドキュメントへのリンク付与。
   - 日常使用ショートカット一覧の同期。
2. **機能詳細・内部仕様・全キーバインド**:
   - [`docs/FEATURES.md`](file:///home/susie/GitHUB/wammed/Waddle/docs/FEATURES.md) & [`docs/FEATURES.ja.md`](file:///home/susie/GitHUB/wammed/Waddle/docs/FEATURES.ja.md)
   - 機能の低レイヤ内部仕様、Tauri/Rust/React 連携機構、API/通信仕様の詳細追記。
   - 完全版ショートカットキーテーブルへの反映。
3. **アーキテクチャ・システム設計**:
   - [`docs/ARCHITECTURE.md`](file:///home/susie/GitHUB/wammed/Waddle/docs/ARCHITECTURE.md) & [`docs/ARCHITECTURE.ja.md`](file:///home/susie/GitHUB/wammed/Waddle/docs/ARCHITECTURE.ja.md)
   - Mermaid 構成図の更新、PTY・IPC・各サブシステムの設計変更追記、技術スタック一覧の更新。
4. **セキュリティ仕様・ガードレール**:
   - [`SECURITY.md`](file:///home/susie/GitHUB/wammed/Waddle/SECURITY.md) & [`SECURITY.ja.md`](file:///home/susie/GitHUB/wammed/Waddle/SECURITY.ja.md)
   - パストラバーサル防止、保護対象パス、危険コマンド検知パターン、Webview CSP、ネットワーク境界ポリシーの更新。
5. **開発履歴・引き継ぎ**:
   - [`SESSION_HANDOVER.md`](file:///home/susie/GitHUB/wammed/Waddle/SESSION_HANDOVER.md)
   - ユーザー要望、時系列開発履歴、変更重要ファイル、ビルド検証結果の追記。


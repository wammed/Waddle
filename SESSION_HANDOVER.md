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

---

## 3. 実施された主要な改善と技術的解決策

### A. 全10レイアウトの分割ペイン境界ドラッグリサイズ
- **対象ファイル**: [`src/components/TerminalPane.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/TerminalPane.tsx), [`src/index.css`](file:///home/susie/GitHUB/wammed/Waddle/src/index.css)
- **対応内容**:
  - **全レイアウト網羅**: 単一 (`single`)、2分割 (`split-2-h`, `split-2-v`)、3分割 (`split-3-left-main`, `split-3-top-main`, `split-3-h`, `split-3-v`)、4分割 (`grid-4`, `split-4-left-main`, `split-4-h`) の全レイアウトにインタラクティブなディバイダーを配置。
  - **センタリング & 16px ヒット領域**: `.pane-divider-x` に `margin-left: -8px;`、`.pane-divider-y` に `margin-top: -8px;` を適用し、境界線を中心とする ±8px の余裕あるグラブ領域を確保。
  - **2×2 グリッド交差点の 4方向リサイズハンドル**: `grid-4` では水平線を左右独立分割し垂直線との干渉を排除。中央交差点に 20×20px の `.pane-divider-corner` を配置し、斜めドラッグで縦横を同時に伸縮可能に。
  - **動的 CSS グリッド計算**: 各レイアウトのギャップを考慮した正確な `gridTemplateColumns` / `gridTemplateRows` スタイルを生成。

### B. ペインリサイズ時のフリッカー（ちらつき）完全解消
- **対象ファイル**: [`src/components/TerminalPane.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/TerminalPane.tsx), [`src/components/SingleTerminalView.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/SingleTerminalView.tsx)
- **対応内容**:
  - ドラッグ中フラグ `isResizing={Boolean(activeDrag !== null)}` を `SingleTerminalView` へ伝達。
  - ドラッグ中は `ResizeObserver` 内の `fitTerminal()` および `term.resize()` の実行を完全停止。CSS グリッドの GPU クリッピング伸縮のみで描画し、HTML5 Canvas のクリアによる白化/透明化をゼロに抑止。
  - マウスを離した瞬間（ドラッグ完了時）にのみ 1 回だけ `fitTerminal()` を実行して文字セルを確定。
  - 行・列サイズが変わらない微小な変動でのシェル `SIGWINCH` 再描画スパムを `lastDimensionsRef` で遮断。

### C. 起動速度の安定化 & 初期プロンプト取りこぼし防止
- **対象ファイル**: [`src-tauri/src/pty.rs`](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/pty.rs), [`src-tauri/src/lib.rs`](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/lib.rs), [`src/services/tauriApi.ts`](file:///home/susie/GitHUB/wammed/Waddle/src/services/tauriApi.ts), [`src/components/SingleTerminalView.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/SingleTerminalView.tsx)
- **対応内容**:
  - **`start_pty` 同期ハンドシェイク**: Rust の PTY リーダースレッドに `recv_timeout` 同期チャンネルを新設。
  - フロントエンドがマウントされ、`onPtyOutput` イベントリスナーの登録が完了した瞬間に `TauriApi.startPty(sessionId)` をコールしてストリームを開始。
  - シェル起動直後のプロンプト（Linux カーネルの PTY バッファに保持）がリスナー登録後に 100% 確実にフロントエンドへ届くよう保証。起動時の黒画面待機を解消。

### D. Git & GitHub 連携の統合 (Quick Popover, Conventional Commits, Diff, Push/Pull)
- **対象ファイル**:
  - [`src/components/GitQuickPopover.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/GitQuickPopover.tsx), [`src/components/GitDiffModal.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/GitDiffModal.tsx), [`src/components/FileTreeSidebar.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/FileTreeSidebar.tsx)
  - [`src-tauri/src/pty.rs`](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/pty.rs), [`src-tauri/src/lib.rs`](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/lib.rs), [`src/services/tauriApi.ts`](file:///home/susie/GitHUB/wammed/Waddle/src/services/tauriApi.ts)
- **対応内容**:
  - **Quick Git Popover**: ステータスバーの Git バッジをクリックして展開。ブランチ切替、ステージ/アンステージ（ファイル単体および一括）、変更破棄、コミット入力欄。
  - **1クリック Pull & Push**: ヘッダー同期エリアから直接 `git pull` / `git push` を実行。遅延（Behind）はアンバー、先行（Ahead）はシアンのバッジで件数を強調表示。非同期実行（`spawn_blocking`）と `GIT_TERMINAL_PROMPT=0` により UI フリーズを防止。
  - **ローカル Ollama AI による Conventional Commit 自動生成**: ステージ済みの差分からコミットメッセージ（`feat:`, `fix:` 等）を完全ローカルで自動生成。
  - **内蔵 GUI Diff ビューワー**: unified diff を色分け表示。新規未追跡ファイルにも対応し、差分画面から直接ステージングや破棄が可能。
  - **ファイルツリー Git 状態装飾**: M（変更）、U（未追跡）、S（ステージ済）、C（競合）バッジ、および親フォルダへの点灯インジケータードット。

### E. ローカル完結ポリシー & GitHub 限定セキュリティ保護
- **対象ファイル**:
  - [`src-tauri/src/config.rs`](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/config.rs), [`src/components/SettingsModal.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/SettingsModal.tsx), [`src-tauri/tauri.conf.json`](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/tauri.conf.json)
- **対応内容**:
  - **Git 連携 ON/OFF 設定**: 設定画面から Git 連携を無効化可能。無効時は `git status` ポーリングが一切走らず、ステータスバーやファイルツリーの Git UI が非表示化され、純粋な超軽量ローカルターミナルとして動作。
  - **GitHub 特化リモート検証 (`inspect_github_remotes`)**: リポジトリのリモートが `github.com`（または `github.io`）以外（GitLab, Bitbucket, 独自外部サーバー等）である場合に遮断・警告。
  - **Push / Pull 実行時のポリシー強制**: 非 GitHub リモートに対する push/pull は Rust 側で事前に拒否。
  - **厳格な CSP 設定**: Webview の `connect-src` を `localhost:11434` (Ollama) および `https://api.github.com https://github.com` のみに制限し、外部への不用意な通信を物理遮断。

---

## 4. 変更された重要ファイル一覧

| ファイルパス | 主な役割・変更内容 |
|---|---|
| `src-tauri/src/pty.rs` | PTY 管理、`start_pty` 受信チャンネル、Git 操作（`git_status`, `git_push`, `git_pull`, `git_commit`, `git_get_diff` 等）、`resolve_repo_root`、`inspect_github_remotes` |
| `src-tauri/src/lib.rs` | Tauri コマンド公開（`repo_path` 統一、`git_push`, `git_pull`）、非同期タスク管理、セキュリティユニットテスト |
| `src-tauri/src/config.rs` | `GitIntegrationConfig`（`enabled`, `restrict_to_github`）、壁紙設定、設定永続化 |
| `src-tauri/tauri.conf.json` | CSP `connect-src` の GitHub & Ollama 限定化 |
| `src/services/tauriApi.ts` | フロントエンド Tauri API ラッパー（`gitPush`, `gitPull`, `gitCommit`, `gitGetDiff` 等） |
| `src/components/GitQuickPopover.tsx` | Git フローティングパネル（ブランチ切替、ステージング、AIコミット、Pull/Push アクション、Ahead/Behind バッジ、警告バナー） |
| `src/components/GitDiffModal.tsx` | シンタックスハイライト付き内蔵差分ビューワー |
| `src/components/SettingsModal.tsx` | Git & GitHub 連携設定セクション（有効化トグル、GitHub限定ポリシートグル） |
| `src/components/StatusBar.tsx` | Git ステータスバッジ（Ahead/Behind、競合警告、非GitHub遮断バッジ）、GitPopver トリガー |
| `src/components/FileTreeSidebar.tsx` | ファイルツリーの Git ステータス装飾（M, U, S, C）およびフォルダ変更ドット |
| `src/components/TerminalPane.tsx` | 全10レイアウトのディバイダー描画、ドラッグ座標計算、`isResizing` の伝達 |
| `src/components/SingleTerminalView.tsx` | `isResizing` ガード（Canvasクリア抑止）、`startPty` ハンドシェイク、Git ポーリング制御 |
| `src/i18n/translations.ts` | 日英多言語辞書（Git 設定、Git ポップオーバー、Diff ビューワー、Pull/Push メッセージ） |
| `src/index.css` | ディバイダー、Git ポップオーバー、Pull/Push ボタンスタイル、Diff ビューワー、テーマ定義 |
| `src/types.ts` | `GitConfig`, `GitStatus`, `GitFileEntry` 型定義 |

---

## 5. ビルド・検証コマンド

```bash
# フロントエンドの型検査 & 本番ビルド (Vite + TypeScript)
npm run build

# Rust バックエンドの単体テスト (全12件)
cargo test --manifest-path src-tauri/Cargo.toml

# Rust の Clippy 静的解析 (警告0件)
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets

# デスクトップアプリの開発起動
npm run tauri dev
```

---

## 6. 次回再開時の検討・作業候補（Next Steps）

現時点でユーザー様からご指示いただいた改善・拡張要望（パフォーマンス、描画ちらつき、ドラッグ境界、Git連携、設定画面、セキュリティ接続制限、Push/Pull）はすべて正常に実装・検証済みです。今後さらに拡張・改善を進める場合の推奨テーマ：

1. **ペイン比率の永続化**:
   - 現在はレイアウト切り替え時にデフォルト比率にリセットされるため、ユーザーがドラッグ調整した比率をタブ状態やローカルストレージに保存・復元する機能。
2. **ショートカットによるリサイズ**:
   - キーボードのみ（例: `Ctrl+Alt+Left/Right/Up/Down`）でアクティブペインを伸縮できる機能の追加。
3. **ペインのスワップ・並び替え（ドラッグ＆ドロップ）**:
   - ペインヘッダーをドラッグして、分割されたスロット間でターミナルセッションを入れ替える操作の拡充。
4. **GitHub Issue / PR 参照連携**:
   - ローカル完結かつ GitHub 限定ポリシーの枠組みの中で、GitHub CLI (`gh`) または GitHub API 経由でカレントブランチに関連する Issue や PR の簡易ステータスを表示する拡張。

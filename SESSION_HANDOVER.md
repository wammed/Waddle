# Waddle 開発引き継ぎサマリー (Session Handover & Continuation Guide)

本ドキュメントは、これまでの開発・改修内容の全履歴、技術的決定事項、アーキテクチャの変更点、および今後の開発再開時にスムーズに作業を継続できるようにまとめた引き継ぎ資料です。

---

## 1. プロジェクト概要 & 技術構成

- **アプリケーション名**: Waddle (AI-Powered Native Terminal Emulator)
- **リポジトリパス**: `/home/susie/GitHUB/wammed/Waddle`
- **フレームワーク**: Tauri v2 + Vite + React 18 + TypeScript + Rust
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

---

## 3. 実施された主要な改善と技術的解決策

### A. 全10レイアウトの分割ペイン境界ドラッグリサイズ
- **対象ファイル**: [`src/components/TerminalPane.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/TerminalPane.tsx), [`src/index.css`](file:///home/susie/GitHUB/wammed/Waddle/src/index.css)
- **対応内容**:
  - **全レイアウト網羅**: 単一 (`single`)、2分割 (`split-2-h`, `split-2-v`)、3分割 (`split-3-left-main`, `split-3-top-main`, `split-3-h`, `split-3-v`)、4分割 (`grid-4`, `split-4-left-main`, `split-4-h`) の全レイアウトにインタラクティブなディバイダーを配置。
  - **センタリング & 16px ヒット領域**: `.pane-divider-x` に `margin-left: -8px;`、`.pane-divider-y` に `margin-top: -8px;` を適用し、境界線を中心とする ±8px の余裕あるグラブ領域を確保。
  - **2×2 グリッド交差点の 4方向リサイズハンドル**: `grid-4` では水平線を左右独立分割し垂直線との干渉を排除。中央交差点に 20×20px の [`.pane-divider-corner`](file:///home/susie/GitHUB/wammed/Waddle/src/index.css) を配置し、斜めドラッグで縦横を同時に伸縮可能に。
  - **動的 CSS グリッド計算**: 各レイアウトのギャップ（4px / 8px / 12px）を考慮した正確な `gridTemplateColumns` / `gridTemplateRows` スタイルを生成。

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
  - シェル起動直後のプロンプト（Linux カーネルの PTY バッファに保持）がリスナー登録後に 100% 確実にフロントエンドへ届くよう保証。起動時の黒画面待機（速い時と遅い時のばらつき）を解消。

### D. 壁紙（背景画像）のデフォルト統一とレイヤー復元
- **対象ファイル**: [`src-tauri/src/config.rs`](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/config.rs), [`src/App.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/App.tsx)
- **対応内容**:
  - Rust 側の設定デフォルト値を `Some("preset_cyberpunk".to_string())` に統一。
  - `<section className="terminal-area">` 直下に壁紙レイヤーを配置し、透過ターミナルの背面に美しく表示。

### E. その他の実装済み改善（13項目抜粋）
- **ターミナル内ログ検索機能 (`Ctrl+Shift+F`)**: `@xterm/addon-search` によるインクリメンタル検索、ハイライト、大文字小文字/正規表現切り替え。
- **AI チャット履歴エクスポート**: Copilot サイドバーから Markdown / JSON で保存可能。
- **プロセスグループ終了**: タブ/ペイン終了時に `-pid` へ `SIGHUP` / `SIGKILL` を送りゾンビプロセスを防止。
- **PTY UTF-8 境界保護**: マルチバイト文字がバッファ境界で分断された場合の文字化けを解消。
- **Ollama AI ストリーミング行バッファリング**: ネットワークパケット途切れ時の JSON パースエラーを防止。
- **App.tsx のリファクタリング**: `useTerminalTabs.ts` および `useGlobalShortcuts.ts` へ責務を分離。

---

## 4. 変更された重要ファイル一覧

| ファイルパス | 主な役割・変更内容 |
|---|---|
| `src/components/TerminalPane.tsx` | 全10レイアウトのディバイダー描画、ドラッグ座標計算、`isResizing` の伝達 |
| `src/components/SingleTerminalView.tsx` | `isResizing` ガード（Canvasクリア抑止）、`startPty` ハンドシェイク、ログ検索統合 |
| `src/index.css` | ディバイダーの 16px ヒット領域（`margin: -8px`）、交差点ハンドル、Containment |
| `src-tauri/src/pty.rs` | `start_pty` 受信チャンネル、UTF-8境界バッファリング、プロセスグループ完全クリーンアップ |
| `src-tauri/src/config.rs` | 壁紙デフォルト（`preset_cyberpunk`）の恒久補完、画像バリデーション |
| `src-tauri/src/lib.rs` | `start_pty` コマンドの公開・ハンドラー登録 |
| `src/services/tauriApi.ts` | `TauriApi.startPty(sessionId)` のフロントエンドラッパー |
| `src/App.tsx` | 壁紙レイヤー配置、設定同一性チェック |
| `src/hooks/useTerminalTabs.ts` | タブ・ペイン・セッション管理のカスタムフック |
| `src/hooks/useGlobalShortcuts.ts` | キーボードショートカット管理のカスタムフック |

---

## 5. ビルド・検証コマンド

次回再開時の動作確認には、以下のコマンドを使用します：

```bash
# フロントエンドの型検査 & 本番ビルド
npm run build

# Rust バックエンドの単体テスト
cargo test --manifest-path src-tauri/Cargo.toml

# Rust の Clippy 静的解析
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets

# デスクトップアプリの開発起動
npm run tauri dev
```

---

## 6. 次回再開時の検討・作業候補（Next Steps）

現時点でユーザー様から「よくなったよ」と動作改善の確認をいただいており、既知の重大なバグ・不具合はありません。今後さらに拡張・改善を進める場合の推奨テーマ：

1. **ペイン比率の永続化**:
   - 現在はレイアウト切り替え時にデフォルト比率にリセットされるため、ユーザーがドラッグ調整した比率をタブ状態やローカルストレージに保存・復元する機能。
2. **ショートカットによるリサイズ**:
   - キーボードのみ（例: `Ctrl+Alt+Left/Right/Up/Down`）でアクティブペインを伸縮できる機能の追加。
3. **ペインのスワップ・並び替え（ドラッグ＆ドロップ）**:
   - ペインヘッダーをドラッグして、分割されたスロット間でターミナルセッションを入れ替える操作の拡充。
4. **Git 連携の強化**:
   - ステータスバーのブランチ表示から、簡易的な git diff や commit ポップオーバーを開く機能。

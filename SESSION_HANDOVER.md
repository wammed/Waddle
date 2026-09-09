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
17. **Kitty Graphics Protocol の静音仕様準拠・一時ファイル自動削除・非同期競合解消**:
    - **`q` (Quiet) パラメータ仕様準拠**: デフォルト（`q=0` または未指定）で完全無音化。シェルプロンプトへのエスケープシーケンス漏洩（`\x1b_Gi=...;OK\x1b\` 等）を完全根絶。`q=1` はエラー時のみ返信、`q=2` は常時返信、`a=q`（問い合わせ）は無条件即時返信とする仕様完全準拠を達成。
    - **一時ファイル自動削除 (`t=t`)**: Yazi / Neovim 等が生成する一時ファイルに対し、Rust 側でメモリ展開直後に `std::fs::remove_file` を実行し即座にアンリンク。寸法エラー時も含めディスクに残骸を残さないゼロリーク機構を実装。サンドボックスはシステム一時ディレクトリ（`/tmp`, `/var/tmp`, `std::env::temp_dir()`）を許可しつつ `/etc`, `/root`, `~/.ssh` などの重要パスを厳格ブロック。
    - **非同期レースコンディション根絶**: `a=t`（画像読み込み・デコード）の直後に `a=p`（配置）が送信された場合に発生していた `ENOENT: Image ID not found in cache` を、FIFO コマンドキュー（`commandQueue`）による直列化と `loadingImages`（インフライト Promise マップ）の明示的 `await` により完全解消。
18. **Kitty Graphics Protocol のカーソル前進 (`C=0`/`C=1`)・セル占有領域確保・画面最下部自動スクロール**:
    - **カーソル前進処理 (`C=0` デフォルト)**: 画像配置（`a=T`, `a=p`）時に、画像の占有サイズ（`cols` 列 × `rows` 行）に応じてターミナルカーソルを正確に前進。画像最下行（`start_row + rows - 1`）の右端（`start_col + cols`）にカーソルを位置付け、画像直後に出力されるテキスト（`<- TEXT HERE` 等）が画像先頭行に重ならず、画像直後のプロンプトも画像下部に正しく描画されるよう完全修正。
    - **カーソル非前進 (`C=1`)**: `C=1` 指定時は VT エスケープシーケンス（`\x1b[s` / `\x1b[u`）で初期カーソル位置を厳格に保持。
    - **プレースホルダーセルによる領域確保 & スクロール同期**: xterm.js のターミナルバッファに対して画像が占有する `cols × rows` のグリッド領域（改行 `\r\n` およびスペース）を透過的に挿入。画像配置位置がターミナルバッファのスクロール履歴（Scrollback）と完全に同期。
    - **画面最下部での自動スクロール (`start_row + rows > termRows`)**: 画面下端を超える画像配置時に、xterm 内部の VT 改行エンジンが安全に上方向へ自動スクロールを行い、画像全体が画面内に確実に収まるよう制御。
    - **統合テスト・ビルド検証**: `scratch/test_cursor_advance.mjs` による 3 パターンのテスト（`C=0` 前進、`C=1` 保持、画面下部スクロール）が全件成功、Rust テスト 21 件パス、TypeScript/Vite ビルド 0 エラー。
19. **Kitty Graphics Protocol のビューポート境界部分描画（Partial Clipping / Scissoring & UV 計算）**:
    - **AABB 交差判定 (AABB Intersection)**: 画像の描画判定を従来の「起点セル判定」から、画像全体の矩形 `[col..col+c, row..row+r]` とビューポートの可視矩形 `[0..termCols, 0..termRows]` との AABB 交差判定へ刷新。複数行（例: 4行占有）画像がスクロール時に画面境界をまたぐ際、1行でも画面内に残っていれば描画対象を維持し、起点行が画面外へ出た瞬間に画像全体がカクついて消失する問題を解消。
    - **シザー矩形によるハードウェアクリッピング (Approach A)**: `ctx.save()`, `ctx.rect(0, 0, width, height)`, `ctx.clip()` を適用し、ターミナルビューポート外へのピクセルラスタライズを物理遮断。
    - **テクスチャ UV & 頂点座標オフセット計算 (Approach B)**: 画面上端を `k` 行はみ出している場合（`rawY < 0`）、描画先 Y 座標をビューポート上端 `destY = 0` に固定し、テクスチャ V 座標（垂直成分）を `v1 = k / r` だけ正確にオフセットして残存領域のみを描画。`destX, destY, destW, destH` および `srcX, srcY, srcW, srcH` を浮動小数点単位で算出し、スムーズスクロールやセル内ピクセルオフセット（`keys.X`, `keys.Y`）にも追従。
    - **検証**: `scratch/test_partial_clipping.mjs` による 7 パターン（完全可視、上端 k=2 行クリップ、上端 1 行クリップ、上端完全外 AABB 除外、下端 2 行クリップ、下端完全外 AABB 除外、サブピクセル offset 追従）の単体テストが全件合格。TypeScript / Vite ビルド 0 エラー。
20. **Kitty Graphics Protocol のテクスチャ配置座標アンカー連動 & アニメーションフレーム座標保持**:
    - **ゼロレイテンシ同期 PTY ストリーミング**: `term.write` を即時実行する同期パイプラインを維持し、起動時・リフレッシュ時の `fish_greetings` やシェルプロンプトの超高速 0ms 描画を保証。同一チャンク内の先行テキスト（タイトル行等）に対しても `calculateCursorOffset(textBefore)` により真のアンカー行・列 `(start_col, start_row)` を正確にキャプチャ。
    - **ピクセル描画座標の厳密計算**: レンダラー描画座標を `render_x = padding_left + col * cell_width (+ xOffset)`、`render_y = padding_top + (row - scroll_offset) * cell_height (+ yOffset)` に修正。画面左上 (0, 0) への誤配置やタイトル行への上書き衝突を根絶。
    - **アニメーションフレーム更新 (`a=f`) の座標保持**: `a=f` 受信時に画像 ID に紐づくテクスチャフレームを更新しつつ、第1フレーム（`a=T` / `a=p`）配置時に確定したプレースホルダーアンカー座標 `(col, bufferLine)` をそのまま引き継いで描画を維持。
    - **統合テスト・ビルド検証**: `scratch/test_anchor_coords.mjs` によるタイトル行直後画像配置・アニメーションフレーム座標保持テスト全件合格、Rust テスト 21 件合格、TypeScript/Vite ビルド 0 エラー。
21. **Kitty Graphics Protocol のアニメーションループカウント (`v`) 仕様準拠 & 恒久タイマー制御**:
    - **ループカウント初期値 (`v=0` デフォルト)**: アニメーションのループ回数パラメータ `v` のデフォルト初期値を `0`（無限ループ / Infinite Loop）として初期化。
    - **無限ループ (`v=0`) のラップアラウンド再生**: 最終フレームの表示遅延（ディレイ `z` ms）経過後に自動的に第1フレーム（frame 1, index 0）へ戻り、フレーム更新タイマーを継続して再スケジュールすることで恒久的に再生をループ。
    - **指定回数再生 (`v>0`)**: 再生周回数をカウントし、指定された回数に達した時点でアニメーションタイマーを停止して最終フレームで固定。
    - **アニメーション制御 (`a=a`)**: 再生状態切り替え（`s=1` 停止, `s=3` 再開）、特定フレームへのジャンプ（`r`）、フレーム間隔の動的変更（`z`）、ループカウントの動的変更（`v`）をフルサポート。
    - **リソース管理**: キャッシュ削除時（LRU 追い出しや `a=d`）およびターミナル破棄時にすべてのアニメーションタイマーを確実に解除し、タイマーリークを防止。
    - **統合テスト・ビルド検証**: `scratch/test_animation_loop.mjs` による 5 パターン（Parser 解析、`v=0` 無限ループ、`v=1` 単一周回停止、`v=2` 2周回停止、キャッシュ削除時タイマー解除）の単体テストが全件合格、Rust テスト 21 件合格、TypeScript/Vite ビルド 0 エラー。
22. **Kitty Graphics Protocol のサブ矩形切り抜き (`x, y, w, h`) & Unicode プレースホルダー (`U+10EEEE`) 完全対応**:
    - **サブ矩形切り抜き (Source Clipping: `x, y, w, h`)**:
      - APC コントロールキー `x`, `y`（切り抜き開始ピクセル）、`w`, `h`（切り抜き幅・高さピクセル）を抽出・保持。
      - 正規化 UV 座標境界（`u_min = x / texture_width`, `v_min = y / texture_height`, `u_max = (x + w) / texture_width`, `v_max = (y + h) / texture_height`）を算出し、ビューポート境界のパーシャルシザリングと完全合成して描画。
      - `computeSpans` において `w` および `h` の指定を優先し、切り抜き寸法に応じた正確なグリッド専有（`cols`, `rows`）を計算。
    - **Unicode グラフィックプレースホルダー (`U+10EEEE`) & 仮想配置 (`U=1`)**:
      - `TextRenderLayer._drawChars` を直接インターセプトし、外字コードポイント `0x10EEEE` を検出した際に標準の「豆腐」（□: 未定義文字グリフ枠）描画を完全に抑止。
      - セルデータ `cell.getChars()` に結合された Kitty 公式仕様の 297 種のダイアクリティカルマーク（`ROW_COLUMN_DIACRITICS`）から、タイルの行（第1ダイアクリティック）・列（第2ダイアクリティック）・32-bit 画像 ID 上位バイト（第3ダイアクリティック）をデコード。
      - ダイアクリティック省略時の左から右への値自動継承、およびセルの前景色（24-bit TrueColor RGB または 256 色パレット）からの画像 ID 抽出と直近画像への自動フォールバックを完備。
      - 仮想配置 (`U=1`) 時はテキストバッファへの空白シーケンス出力を抑止し、プレースホルダー用スライス情報のメタデータ（寸法・切り抜き）を管理。
      - 画像デコード完了時およびフレーム更新時に `term.refresh()` を発火し、遅延なく瞬時にプレースホルダーセルへ画像を同期レンダリング。
    - **統合テスト・ビルド検証**: `scratch/test_sub_clipping.mjs`（全件合格）、`scratch/test_unicode_placeholder.mjs`（全7項目合格）、Rust テスト 21 件合格、TypeScript/Vite ビルド 0 エラー。
23. **Kitty Graphics Protocol の Unicode プレースホルダー (`U+10EEEE`) 未定義グリフ（豆腐）上書き防止 & レンダラーフック完全対応**:
    - **原因究明**: xterm.js (v5) の `_renderService._renderer` が `MutableDisposable` ラッパーオブジェクトであるため、従来のフック取得処理で `renderer._renderLayers` が `undefined` となり登録処理が毎回早期リターンしていた根本原因を解明。`core._renderService._renderer.value` および `CanvasAddon._renderer` から真の `CanvasRenderer` を確実に解決する多重解決機構へ刷新。
    - **テキスト描画ループ (Font/Glyph Render Pass: `_drawForeground`) のスキップ & 排他制御**:
      - `TextRenderLayer.prototype._drawForeground` およびインスタンスフックにおいて、セルが `0x10EEEE` またはプレースホルダーフラグを持つ場合、プレースホルダーテクスチャ（`drawPlaceholderCell`）を描画した上で、`_drawChars`（フォントグリフ検索・アトラスラスタライズ・文字描画）を完全に `return`（セル走査ループ内での `continue`）してバイパス。
    - **多層防御フック**:
      - `BaseRenderLayer.prototype._drawChars` および `BaseRenderLayer.prototype._fillCharTrueColor` においても、`0x10EEEE` を検知した場合はグリフ検索や `fillText` を行わず早期リターン。
      - `TextRenderLayer.prototype._isOverlapping` を常に `false` とし、外字による 2 セル幅誤認や隣接セル破壊を防止。
      - `CursorRenderLayer` において、プレースホルダーセルの上にカーソルが重なった場合でもテクスチャを消去する不透明ベタ塗りや豆腐文字 `fillText` を行わず、アウトラインカーソルのみを描画。
      - DOM レンダラーフォールバック時も `DomRendererRowFactory.prototype.createRow` で `U+10EEEE` を含む span のテキストを透明スペースに置換し豆腐の露出を完全遮断。
    - **セルデータの純粋性**:
      - `isPlaceholderCell` で再利用される共有 `CellData`（`_workCell`）に対する破壊的フラグ代入を排除し、後続通常セルへの誤伝播を解消。
    - **統合テスト・ビルド検証**: `scratch/test_unicode_placeholder.mjs`（全11項目合格、xterm v5 MutableDisposable 構造に対する `_drawForeground` スキップ検証を含む）、Rust 単体テスト 21 件合格、TypeScript/Vite ビルド 0 エラー。
24. **完成前検証用 包括的テスト計画書 (77項目) の策定**:
    - 初期から実装されたコア PTY・UI から Kitty Graphics Protocol、多層防御セキュリティガードレールに至る全機能を完成前に検証するための包括的テスト計画を策定。
    - 9 つのテストスイート（PTY基盤 10項目、タブ・分割 8項目、ファイルツリー・エディタ 8項目、AI連携 6項目、Git連携 8項目、テーマ・UI 6項目、Kitty画像 14項目、セキュリティ 12項目、パフォーマンス 5項目、計 77項目）に分類し、各項目に対してテスト手順・期待される結果・判定基準・自動/手動種別を網羅。
    - 日英ドキュメント（[`docs/TEST_PLAN.md`](file:///home/susie/GitHUB/wammed/Waddle/docs/TEST_PLAN.md) & [`docs/TEST_PLAN.ja.md`](file:///home/susie/GitHUB/wammed/Waddle/docs/TEST_PLAN.ja.md)）および専用アーティファクトとして体系化。
25. **包括的セキュリティレビューに基づく多層防御の徹底強化（6項目全改修）**:
    - **GitHub リモート厳格ホスト検証 (`is_github_host`)**: `inspect_github_remotes` の部分一致（`contains("github.com")`）を廃止し、ホスト名が `github.com`、`gist.github.com`、`*.github.io` に厳格一致するかを判定するパーサーを実装。サブドメイン詐称やパス埋め込み偽装（`attacker.com/user/github.com.git` 等）を完全遮断。
    - **危険コマンド検知パターンのフロント/バックエンド完全同期**: `DangerousCommandModal.tsx` にバックエンド（`ai.rs`）の全最新パターン（`mkswap`, `cryptsetup`, `| python`, `| python3`, `| perl`, `| ruby`, `python <(`, `iptables -f`, `ufw disable`, `git push --delete`, `git branch -d` 等）を同期反映。
    - **Kitty APC 未終端バッファ上限ガード (DoS防止)**: `KittyApcParser` において、終端子（`\x1b\` / `\x07`）が欠落した破損ストリームを受信した際に `this.buffer` が `maxPayloadBytes`（16MB）を超過した場合、バッファを破棄・強制フラッシュしてメモリ肥大化を防止。
    - **Kitty 一時ファイル (`t=t`) の EFBIG 自動削除**: `read_kitty_file` において、一時ファイルが `max_bytes` を超過した場合でも直ちに `fs::remove_file` を呼び出してディスクから抹消し、`/tmp` のストレージ枯渇を阻止。
    - **秘密鍵・システムキーリング読取保護のスコープ拡充**: `validate_safe_read` において、`~/.ssh/` 配下の全秘密鍵（カスタム名含む）の直接読み出しを遮断（`config`, `known_hosts`, `authorized_keys`, `*.pub` のみ閲覧許可）。さらに `~/.local/share/keyrings/` の読み出しを完全遮断。
    - **AI プロンプトインジェクションの正規表現サニタイズ**: `sanitize_untrusted_output` において、大文字混在（`</UNTRUSTED_TERMINAL_OUTPUT>`）や空白混入（`</ untrusted_terminal_output >`）によるタグ脱出を正規表現 `(?i)</?\s*untrusted_terminal_output\s*>` で完全に無力化。
    - **単体テスト & ビルド検証**: Rust テスト 24 件全パス（+3件新規テスト追加）、TypeScript/Vite ビルド 0 エラー、Clippy 警告 0 件。
26. **包括的テスト検証入力フォームの実装（スタンドアロン HTML ツール & Waddle アプリ内モーダル）**:
    - ユーザー要望「テストの入力フォームを作って」に基づき、`docs/TEST_PLAN.ja.md` および `docs/TEST_PLAN.md` の全 80 項目（Suite 1〜9）を網羅するテスト入力フォームを 2 つの形態で実装。
    - **スタンドアロン HTML ツール (`tools/test_form.html`)**: 外部サーバーやネットワーク接続不要で、ブラウザから直接開ける単一完結型 Web フォーム。全 80 項目の合否判定（PASS/FAIL/SKIP/PENDING）、エビデンスメモ入力、動的統計ダッシュボード（合格率・プログレスバー）、スイート/ステータス別フィルタ、全文検索、コマンドコピー、`localStorage` 自動保存、Markdown レポート（Section 5 準拠）および JSON のエクスポート・インポートを完備。
    - **Waddle デスクトップ組み込みモーダル (`src/components/TestPlanModal.tsx`)**: タイトルバー右側のクイックボタン（`#btn-test-plan`）からワンクリックで呼び出せるサイバーパンク/ネオン調のフル機能検証モーダル。アプリを操作しながらリアルタイムに検証結果を記録可能。
    - **共有テストデータ (`src/data/testPlanData.ts`)**: 全 80 テストケースの型定義・データセット・Markdown レポート生成ロジックを集約。
    - **ビルド・検証**: `npm run build`（型エラー0件）、`cargo test`（24件全パス）、`cargo clippy`（警告0件）。

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
| `src/components/TestPlanModal.tsx` | Waddle アプリ内組み込みテスト検証モーダル（全80項目、リアルタイム合否記録、コマンドコピー、localStorage連携） |
| `src/data/testPlanData.ts` | テスト計画全80項目のデータ定義、集計、エビデンス Markdown レポート生成ユーティリティ |
| `tools/test_form.html` | ブラウザで単体稼働するスタンドアロン包括的テスト検証 Web フォーム（全80項目、Markdown/JSONエクスポート） |
| `src/i18n/translations.ts` | 日英多言語辞書（Kitty 画像プロトコル設定文言・テストフォーム文言） |
| `docs/FEATURES.md` & `.ja.md` | 機能仕様書への第16項「Kitty Graphics Protocol」詳細解説の追加 |
| `docs/ARCHITECTURE.md` & `.ja.md` | アーキテクチャ図および第5項「Kitty Graphics Subsystem & Pipeline」設計の追加 |
| `docs/TEST_PLAN.md` & `.ja.md` | 完成前検証用 包括的テスト計画書（全80テストケース・期待結果・検証手順・セキュリティ強化項目） |
| `SECURITY.md` & `.ja.md` | セキュリティ仕様書への「Kitty Graphics Protocol Security & Resource Guards」および最新6大セキュリティ強化項目の追加 |
| `README.md` & `.ja.md` | ルート README への Kitty Graphics Protocol ハイライト追加 |

---

## 5. ビルド・検証コマンド

```bash
# フロントエンドの型検査 & 本番ビルド (Vite + TypeScript) - 警告/エラー0件でビルド完了
npm run build

# Rust バックエンドの単体テスト (全24件すべてパス、うち Kitty セキュリティテスト7件)
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
5. **包括的検証テスト計画書**:
   - [`docs/TEST_PLAN.md`](file:///home/susie/GitHUB/wammed/Waddle/docs/TEST_PLAN.md) & [`docs/TEST_PLAN.ja.md`](file:///home/susie/GitHUB/wammed/Waddle/docs/TEST_PLAN.ja.md)
   - 全80テストケース（Suite 1〜9）の追跡、合否判定基準、自動テストコマンド群の整合性維持。
6. **開発履歴・引き継ぎ**:
   - [`SESSION_HANDOVER.md`](file:///home/susie/GitHUB/wammed/Waddle/SESSION_HANDOVER.md)
   - ユーザー要望、時系列開発履歴、変更重要ファイル、ビルド検証結果の追記。


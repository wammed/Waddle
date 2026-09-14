# 🧪 Waddle 包括的検証テスト計画書 (Comprehensive Test Plan)

本書は、**Waddle** の初期開発フェーズから最新の **Kitty Graphics Protocol**、および各種 **多層防御セキュリティ機能** に至るまで、製品完成前に全機能と安全性を網羅的に検証するための包括的なテスト計画書です。

---

## 1. テスト計画の概要と目的

### 1.1 目的
- 初期から実装されたコアターミナル機能、UIレイアウト、AI統合、Git連携、外観カスタマイズ、画像プロトコル、およびセキュリティガードレールが仕様通り動作することを確認する。
- リソースリーク、メモリ肥大化、プロセスゾンビ化、不正ファイルアクセス、プロンプトインジェクション、描画競合（豆腐文字等）の潜在バグを完成前に完全に洗い出し、検証結果をエビデンスとして記録可能にする。

### 1.2 テスト範囲 (Scope)
1. **PTY & コアターミナル基盤** (10 項目)
2. **タブ・10種分割ペイン・セッション永続化** (8 項目)
3. **ファイルツリー & 内蔵エディタ** (8 項目)
4. **AI アシスタント & プロンプト連携** (9 項目)
5. **Git 連携 & リモート接続制限** (9 項目)
6. **テーマ・UI・壁紙・アイコン** (7 項目)
7. **Kitty Graphics Protocol (完全サブシステム)** (19 項目)
8. **セキュリティポリシー & 多層防御ガードレール** (18 項目)
9. **パフォーマンス・リソース上限・メモリリーク防止** (5 項目)
10. **次世代ワークフロー & プロダクティビティ機能** (6 項目)
**合計: 全 99 項目**

### 1.3 テスト環境前提条件
- **OS**: Linux (Ubuntu 22.04+, Debian 12+, Arch Linux 等, WebKitGTK 4.1 / 4.0)
- **ランタイム**: Node.js >= 20, Rust >= 1.75
- **外部サービス (ローカル)**: Ollama (`http://localhost:11434`, 推奨モデル: `qwen2.5-coder` または `llama3`)
- **CLI ツール**: `git`, `fastfetch`, `timg` または付属テストスクリプト (`scratch/*.mjs`)

---

## 2. テスト実施アプローチと合否判定基準

| 区分 | 検証方法 | 合格基準 (Pass Criteria) |
| :--- | :--- | :--- |
| **自動テスト (Automated)** | `cargo test`, `npm run build`, `npx tsx scratch/*.mjs` | エラー 0 件、全テストケース PASS、型エラー 0 件 |
| **手動・対話的テスト (Manual)** | UI 操作、キーボードショートカット、ドラッグ＆ドロップ | 描画の崩れ・フリーズ・入力遅延がなく、期待通りの状態へ遷移 |
| **セキュリティ検証 (Security)** | 境界値・悪意ある入力（パストラバーサル、危険コマンド等） | 全ての不正操作が Rust / CSP / UI レベルで遮断・警告される |

---

## 3. 詳細テストケース一覧

### Suite 1: PTY & コアターミナル基盤 (PTY & Terminal Core)

| ID | テスト対象 | 検証手順 | 期待される結果 | 種別 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-PTY-01** | 0ms 同期起動ハンドシェイク (`start_pty`) | アプリ起動時および新規タブ作成時の画面表示速度を目視・ログ検証。 | レースコンディションや初期ブランク画面がなく、Frame 0 でプロンプトや `fish_greeting` が瞬時に表示される。 | Manual |
| **TC-PTY-02** | 高スループットストリーミング & カーネル協調流量制御 | ターミナルで `yes "Waddle High Speed Output Test 1234567890"` を実行し、`Ctrl+C` で停止。 | 32KB ごとにコアレッシングされ 60 FPS でペーシング。メモリは 256KB 以内に抑制され、`Ctrl+C` で 0ms 即時パージ（60ms 以内にプロンプト復帰、CPU 0.7%〜1.3% へ降下）。 | Manual |
| **TC-PTY-03** | UTF-8 マルチバイト境界処理 & Unicode 11 絵文字 | `python3 -c "print('🦀ターミナル🚀日本語テスト'*500)"` を実行。 | チャンク境界での文字分断による文字化けが一切発生せず、日本語および絵文字（幅2）が正常に描画される。 | Manual |
| **TC-PTY-04** | CanvasAddon ハードウェア描画 | レンダラー初期化状態および透過背景上のテキスト描画を確認。 | WebGL コンパイルブロックなく、CanvasAddon により高速かつ鮮明にフォントがレンダリングされる。 | Manual |
| **TC-PTY-05** | フリッカーフリーなリサイズ & FitAddon | ウィンドウの端を素早くドラッグしてサイズ変更を繰り返す。 | WebKitGTK 青画面フラッシュや Canvas の不必要な破棄がなく、瞬時に行・列数が追従して再計算される。 | Manual |
| **TC-PTY-06** | プロセスグループ完全終了 (POSIX) | `sleep 500 &` を実行した状態でタブまたはアプリを閉じる。`ps aux \| grep sleep` で確認。 | `libc::killpg` によるシグナル送信でプロセスグループ全体が確実にクリーンアップされ、ゾンビプロセスが残らない。 | Automated / Manual |
| **TC-PTY-07** | インターミナル内ログ検索 (`Ctrl+F`) | `Ctrl+F` で検索バーを開き、文字列を入力。`Enter` / `Shift+Enter` で前後移動。 | スクロールバックバッファ内の一致箇所が黄色でハイライトされ、件数（例: `2 / 8`）が正確に表示される。 | Manual |
| **TC-PTY-08** | ハイパーリンク自動検出 (`WebLinksAddon`) | `https://github.com/wammed/Waddle` をターミナルに表示し、`Ctrl+Click`。 | マウスホバーで下線が表示され、OS の既定ブラウザで URL が正しく開く。 | Manual |
| **TC-PTY-09** | タイトルバー全リフレッシュ (`#btn-refresh-all`) | 複数タブ・ペイン稼働中に `#btn-refresh-all` を押下。確認ダイアログで実行。 | 確認ダイアログが最前面に表示される。実行時、全 PTY が終了され、初期ホームディレクトリの単一ペインに完全リセットされる。 | Manual |
| **TC-PTY-10** | カレントディレクトリ (CWD) 追跡 | ターミナルで `cd /var/log` などを実行。 | タブ名、ファイルツリー、AI コンテキストへの反映ディレクトリが即座に同期される。 | Manual |

---

### Suite 2: タブ・10種分割ペイン・セッション永続化 (Tabs, Panes & Session)

| ID | テスト対象 | 検証手順 | 期待される結果 | 種別 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-TAB-01** | タブの追加・閉じる・切り替え | `Ctrl+T` で 5 個のタブを作成し巡回、`Ctrl+W` でアクティブタブを閉じる。 | タブごとの独立したセッションが保持され、閉じたタブの PTY のみが安全に破棄される。 | Manual |
| **TC-TAB-02** | 全 10 種の分割レイアウト切り替え | 単一、2分割（左右/上下）、3分割（4種）、4分割（3種）をツールバーから順次切り替え。 | 全レイアウトでペインの寸法が正確に配分され、全画面で個別にシェル操作が可能。 | Manual |
| **TC-TAB-03** | 16px 広域当たり判定ディバイダーのリサイズ | ペイン境界にマウスを合わせドラッグ（左右・上下）。 | 16px の広い判定で確実に掴め、0.15〜0.85 の範囲でフリッカーなくスムーズに比率が変更できる。 | Manual |
| **TC-TAB-04** | キーボード比率リサイズ (`Ctrl+Alt+Arrows`) | 分割ペイン内で `Ctrl+Alt+Left/Right/Up/Down` を押下。 | 1 回のキー押下ごとに 5% 刻みで直感的にペインサイズが拡縮する。 | Manual |
| **TC-TAB-05** | ペインスワップ (`Ctrl+Shift+S`) | 2 分割以上のタブで `Ctrl+Shift+S` を押下。 | 実行中の PTY セッションと内容を保持したまま、ペインの配置位置が瞬時に入れ替わる。 | Manual |
| **TC-TAB-06** | 分割ペインの個別終了 (`Ctrl+Shift+W`) | 分割ペインのうち 1 つをアクティブにして `Ctrl+Shift+W`。 | 対象ペインの PTY のみが終了し、残りのペインが親領域を均等または前比率で埋める。 | Manual |
| **TC-TAB-07** | セッション自動保存 & 起動時復元 | 複数タブ・3分割レイアウト・異なる CWD の状態でアプリを終了し再起動。 | `localStorage` から全タブ、分割構成、比率、CWD が完全に復元され、即時 PTY が再生成される。 | Manual |
| **TC-TAB-08** | 単一ペイン復帰ショートカット (`Alt+1`) | 分割レイアウト中に `Alt+1` を押下。 | 即座にアクティブペインを最大化した単一ペインレイアウトへ復帰する。 | Manual |

---

### Suite 3: ファイルツリー & 簡易エディタ (File Tree & Embedded Editor)

| ID | テスト対象 | 検証手順 | 期待される結果 | 種別 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-FILE-01** | サイドバー開閉 & ブレッドクラム (`Ctrl+B`) | `Ctrl+B` で開閉。上部ブレッドクラムの親フォルダピルをクリック。 | アニメーション付きで開閉し、ブレッドクラムクリックで目的の階層へ即時ジャンプする。 | Manual |
| **TC-FILE-02** | 言語別カラーバッジ & アイコン | TS, RS, PY, JSON, MD, SH, CSS, HTML ファイルの表示を確認。 | 拡張子に応じた専用色バッジ（例: TS=青, RS=橙）とアイコンが正しく表示される。 | Manual |
| **TC-FILE-03** | ファイルサイズ・要素数バッジ & インデント線 | ネストしたフォルダを展開。 | ファイル行にサイズ（例: `4.2 KB`）、フォルダ行に要素数（例: `(12)`）が表示され、縦ガイド線が揃う。 | Manual |
| **TC-FILE-04** | 巨大ディレクトリ 500 件制限ガード & 動的ページネーション | 500 件超を含むフォルダ（`/tmp/waddle-large-dir` 等）を展開。500件上限と「さらに読み込む」ボタンを確認し押下。 | UI がフリーズせず、バッジに `(500/総件数)` が表示される。「さらに読み込む」押下で次の500件が追加読込され、バッジが `(総件数)` に更新される。 | Manual |
| **TC-FILE-05** | コンテキストメニュー & ホバーアクション | ファイルを右クリックして「ターミナルへパス挿入」「OSマネージャーで表示」等を選択。 | 端末へのパス入力、OS ファイルマネージャー（Nautilus 等）の起動が正確に動作する。 | Manual |
| **TC-FILE-06** | 新規作成 & インライン名前変更 | ツリー上で新規ファイル作成および名前変更を実行。 | ディスク上の実ファイルとツリーが同期し、無効な文字や空文字列は弾かれる。 | Manual |
| **TC-FILE-07** | 簡易エディタの開閉 & 保存 (`Ctrl+E`, `Ctrl+S`) | ファイルをクリックして開き、編集後に `Ctrl+S`。 | Prism.js シンタックスハイライトが適用され、保存時に Rust 経由でディスクに正常反映される。 | Manual |
| **TC-FILE-08** | AI コード編集・リファクタ (`Ctrl+Shift+K`) | エディタ内でコードを選択し `Ctrl+Shift+K` でプロンプトを入力。 | 提案差分（Diff）がプレビューされ、適用ボタンでコードが安全に置換される。 | Manual |

---

### Suite 4: AI アシスタント & プロンプト連携 (AI & Context Integration)

| ID | テスト対象 | 検証手順 | 期待される結果 | 種別 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-AI-01** | 自然言語からのコマンド自動生成 (`Ctrl+K`) | `Ctrl+K` で「ポート8080を使用しているプロセスを強制終了」と入力。 | Ollama 経由で `fuser -k 8080/tcp` 等の適切なコマンドがストリーミング生成される。 | Manual |
| **TC-AI-02** | コンテキスト認識 (CWD, コマンド履歴, Git) | Git ブランチ上で「現在の変更を新しいコミットにして」と入力。 | プロンプトに現在のブランチ・変更状態が正しく注入され、整合したコマンドが生成される。 | Manual |
| **TC-AI-03** | 会話履歴エクスポート (Markdown / JSON) | AI モーダルのエクスポートボタンから `.md` と `.json` を保存。 | WebKitGTK で遮断されず、フォーマット通りのファイルがローカルに保存される。 | Manual |
| **TC-AI-04** | 64KB メモリバッファガード | 改行のない長大な AI ストリーム出力を擬似的に受信させる。 | 64KB を超えた時点でバッファが切り詰められ、メモリ枯渇 (DoS) が防止される。 | Automated |
| **TC-AI-05** | リモート Ollama 警告バナー | 設定でホストを `http://192.168.1.50:11434` に変更。 | アンバー色の警告バナーが表示され、通信が外部に流出するリスクが通知される。 | Manual |
| **TC-AI-06** | オフライン・未接続時フォールバック | Ollama を停止した状態で `Ctrl+K` を実行。 | クラッシュせず、「Ollama サーバーに接続できません」と明確な案内が表示される。 | Manual |

---

### Suite 5: Git 連携 & リモート接続制限 (Git Integration & Guardrails)

| ID | テスト対象 | 検証手順 | 期待される結果 | 種別 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-GIT-01** | ステータスバー Git 表示 & ポップオーバー | 変更のある Git リポジトリでステータスバーのブランチをクリック。 | 変更数、Ahead / Behind バッジが点灯し、Git クイックポップオーバーが開く。 | Manual |
| **TC-GIT-02** | GUI 差分ビューワー (Diff Viewer) | 変更ファイルを選択して Diff を表示。 | 追加行（緑）と削除行（赤）が正確にハイライト表示される。 | Manual |
| **TC-GIT-03** | Conventional Commits 自動生成 | 差分がある状態で「AI コミット生成」をクリック。 | `feat(scope): ...` 形式の適切なメッセージが入力欄に自動補完される。 | Manual |
| **TC-GIT-04** | インタラクティブ `git push` & `git pull` | Ahead / Behind がある状態で Push / Pull ボタンを押下。 | スピナーが回転し、成功時にトースト通知が表示され、Ahead/Behind 数が 0 に更新される。 | Manual |
| **TC-GIT-05** | 認証エラーガイダンス (SSH / GitHub CLI) | 認証情報のない状態で Push を試行。 | エラーバナーが表示され、`gh auth login` や SSH 鍵設定の解決方法が案内される。 | Manual |
| **TC-GIT-06** | GitHub 限定ポリシー (`restrict_to_github`) | リモートが非 GitHub（GitLab 等）のリポジトリで Push/Pull を実行。 | 操作が事前遮断され、GitHub 以外のリモートへの送信制限警告が表示される。 | Automated / Manual |
| **TC-GIT-07** | Git パストラバーサル防止 (`git_discard_file`) | `../` を含むパスを指定してファイル破棄を要求。 | Rust バックエンドでリポジトリ外への脱出が検知され `EACCES` で拒絶される。 | Automated |
| **TC-GIT-08** | Git 設定トグル & 完全ローカル停止 | 設定画面で「Git 連携」を OFF に設定。 | バックグラウンド Git ポーリングが全停止し、ステータスバーから表示が消える。 | Manual |

---

### Suite 6: テーマ・UI・壁紙・アイコン (Theming, UI & Wallpapers)

| ID | テスト対象 | 検証手順 | 期待される結果 | 種別 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-THM-01** | 22 種テーマ切り替え & 発光同期 | 設定画面で 11 種の高電圧ネオンテーマを含む各テーマを選択。 | 端末色だけでなく、枠線、タブ、ステータスバーの発光色（`--accent-rgb`）が瞬時に同期。 | Manual |
| **TC-THM-02** | スウォッチリボン & ミニターミナルプレビュー | 設定画面のテーマ選択カードを表示。 | ANSI 16 色スウォッチリボンとライブプレビューカードが正確に描画される。 | Manual |
| **TC-THM-03** | カスタム壁紙のドラッグ＆ドロップ | 画像ファイルを壁紙設定エリアへドラッグ。 | `~/.config/waddle/wallpapers/` に保存され、ターミナル背面に即時反映される。 | Manual |
| **TC-THM-04** | 壁紙不透明度 & ブラー調整スライダー | 設定のスライダーを左右に動かす。 | ターミナル背景画像の透明度およびぼかし（すりガラス効果）がリアルタイムに変化。 | Manual |
| **TC-THM-05** | 壁紙バイナリヘッダー検証 (Magic Bytes) | `.png` に偽装したテキストファイルを壁紙に設定。 | Rust 側のマジックバイト検証により拒否され、エラーが表示される。 | Automated / Manual |
| **TC-THM-06** | アプリアイコンの統一性 | デスクトップ環境のランチャー、タイトルバーのアイコンを確認。 | `waddle-matte-icon.svg` に基づく高解像度アイコンが正常に表示される。 | Manual |

---

### Suite 7: Kitty Graphics Protocol (完全サブシステム)

| ID | テスト対象 | 検証手順 | 期待される結果 | 種別 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-KITTY-01** | APC エスケープシーケンス解析 & 0ms 分離 | `fastfetch --logo-type kitty` などの画像出力を実行。 | Base64 ペイロードが xterm 前に事前分離され、端末がフリーズせずプロンプトが 0ms 表示される。 | Manual |
| **TC-KITTY-02** | 直接インライン描画 (`f=100`, `f=32`, `f=24`) | PNG, RGBA, RGB の各画像シーケンスを送信。 | Canvas レイヤー上に歪みなくピクセルパーフェクトに描画される。 | Scripted / Manual |
| **TC-KITTY-03** | チャンク分割ストリーミング (`m=1`, `m=0`) | 4096 バイトごとに分割された画像シーケンスを受信。 | メモリ内で結合され、`m=0` で欠損なく単一画像としてデコード・描画される。 | Scripted |
| **TC-KITTY-04** | 公式 `kitten icat` 連携 & 即時プローブ応答 (`a=q` / DA1) | `kitten icat --detect-support` および `kitty +kitten icat` を実行。 | 終了コード 0 で即座に伝送モードを検出し、i=1/2 に大文字 OK 返信、i=3(shm)を安全拒絶。q=0 で漏洩なし。 | Automated / Manual |
| **TC-KITTY-05** | 一時ファイル自動削除 (`t=t`) | `/tmp` 配下に画像を書き出し、`t=t` で表示。 | メモリデコード直後に Rust 側で `remove_file` され、ディスクに残骸が残らない。 | Automated |
| **TC-KITTY-06** | 画像配置後のカーソル前進 (`C=0` vs `C=1`) | `C=0` および `C=1` で画像配置後にテキストを出力。 | `C=0` ではカーソルが画像最下行右端へ移動し直後テキストが下部に表示。`C=1` では初期位置保持。 | Scripted |
| **TC-KITTY-07** | 画面最下部での自動改行スクロール | 端末最終行付近で複数行を専有する画像を配置。 | xterm 内部の自動スクロールが働き、画像全体が画面内に確実に収まる。 | Scripted |
| **TC-KITTY-08** | ビューポート境界部分描画 (Partial Clipping) | ターミナルをスクロールして画像の上端・下端を画面外へ出す。 | AABB 交差判定と UV 計算により、可視領域のみが滑らかにシザー描画される。 | Scripted |
| **TC-KITTY-09** | テクスチャ座標アンカー連動 | 同一 PTY チャンク内に先行テキストと画像シーケンスを出力。 | 画像が画面左上 (0,0) に誤配置されず、先行テキスト直後のセル位置に正確に配置される。 | Scripted |
| **TC-KITTY-10** | アニメーション無限ループ (`v=0`) & 制御 | Kitty アニメーション GIF を表示。`a=a,s=1` 等を発行。 | デフォルトで無限ループ再生され、停止・再開制御が可能。LRU 退避時にタイマー破棄。 | Scripted |
| **TC-KITTY-11** | サブ矩形切り抜き (`x, y, w, h`) | スプライト画像から一部を切り抜いて表示。 | `x,y,w,h` で指定されたピクセル領域のみが正確に拡大縮小されてセル内に描画される。 | Scripted |
| **TC-KITTY-12** | 仮想配置 (`U=1`) | `U=1` で画像をロード。 | テキストバッファの空白専有を行わずに仮想配置サイズ・切り抜き情報が保持される。 | Scripted |
| **TC-KITTY-13** | Unicode プレースホルダー (`U+10EEEE`) デコード | `U+10EEEE` にダイアクリティカルマークや TrueColor 前景色の画像 ID を付与。 | 行・列番号および画像 ID がデコードされ、プレースホルダーセルに画像がバインドされる。 | Scripted |
| **TC-KITTY-14** | プレースホルダーの未定義グリフ（豆腐・□）排他抑止 | `U+10EEEE` を画面に出力し、レンダリング結果を確認。 | `TextRenderLayer._drawForeground` で文字描画がスキップされ、画像の上に豆腐が一切重ならない。 | Scripted / Manual |
| **TC-KITTY-15** | プロトコル機能問い合わせ（Capability Probe）& 0ms 即時クエリ応答 | `fastfetch` (`"type": "kitty"`) の実行、または `\x1b_Gi=1,s=1,v=1,a=q;\x1b\` を送信。 | PTY 側で即座に `\x1b_Gi=1;ok\x1b\` が返信されアスキーアートにフォールバックせず画像表示される。ヘッダー情報が Rust バックエンドでログ記録される。 | Automated / Manual |
| **TC-KITTY-16** | アニメーション差分フレームの 32-bit RGBA 自動判定 & アルファ合成 (`a=f, c=<num>`) | 基底 RGB 画像 (`f=24`) に続いて、ペイロードサイズが $s \times v \times 4$ バイトの差分フレーム (`a=f`) を送信。 | 差分フレームが 32-bit RGBA として正確に自動判定され、白黒砂嵐ノイズなしで透明領域を前フレームに美しく合成する。 | Automated / Scripted |
| **TC-KITTY-17** | グラフィックスレイヤーのゴースト重複防止 & 厳格な単一 Canvas 積層 | Kitty 画像表示中にターミナル画面の再マウントや分割リサイズを実施。 | 既存の `.xterm-kitty-graphics-layer` が確実に破棄され、単一の Canvas のみが文字と選択レイヤーの間に正しく積層描画される。 | Manual |
| **TC-KITTY-19** | 全 TUI / CLI エコシステム完全対応 (Yazi, Ranger, lf, fastfetch, image.nvim; PTY プローブ即時応答、通常テキスト100%保持 & 固定グリッド保護) | Yazi, Ranger, lf, fastfetch, Neovim (`image.nvim`) を起動し画像プレビューやロゴを表示。PTY 経由での `a=q` / `\x1b[?996n` / `\x1b[16t` / `\x1b[0c` 問い合わせおよびプレースホルダー/通常配置の描画動作を検証。 | PTY が 0ms 即時応答して各ツールが Kitty モードで初期化され、プレースホルダー描画を専用 Canvas へ一本化することで行走査中のスケール破損や一行ずらし重なりを根絶。さらに `workCell` 誤爆防止により周囲の通常テキスト（ファイル一覧・枠線・コード）が 1文字も消えずに 100% 描画され、`C=1`/Alternate Screen ゼロアロケーションにより TUI の固定グリッドを崩さずピクセルパーフェクトにインライン表示される。 | Automated / Manual |
| **TC-KITTY-20** | 汎用 CLI/TUI 互換性完全対応: viu, timg, ranger, lf (XTVERSION 応答・DA1 Sixel排除・DSR 5n同期・t=t インライン化・ranger OK 同期・削除サイレント化によるフリッカー防止) | 特別なプロトコル指定なしで `viu`, `timg`, `ranger` を起動。PTY による XTVERSION (`\x1b[>q` / `\x1b[>0q`) 応答、DSR (`\x1b[5n` -> `\x1b[0n`) 同期、DA1 からの Sixel (`;4;`) 除外 (`\x1b[?62c`)、PTY レベルでの一時ファイル即時インライン化 (`t=t` -> `t=d`)、`manager.ts` での明示的 ID に基づく描画 OK 応答同期、および削除コマンド（`a=d`）の公式サイレント化を検証。 | `timg` が XTVERSION により Kitty グラフィックスを自動検出。`viu` の一時ファイルが PTY 側で即座にインライン化 (`t=t` -> `t=d`) されてファイル削除レースコンディションが解消され、PNG/JPEG が即座に表示。`ranger` が明示的画像 ID に対する OK 応答を受信して 1枚目でフリーズせず、かつ `clear()` 時に余計な OK 応答を返さない（サイレント）ことで 2枚目以降選択時のキー誤爆・画面点滅（フリッカー・ハング）が完全に防止され、連続プレビューが滑らかに動作する。 | Automated / Manual |

---

### Suite 8: セキュリティポリシー & 多層防御ガードレール (Security & Defense-in-Depth)

| ID | テスト対象 | 検証手順 | 期待される結果 | 種別 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-SEC-01** | システム重要ディレクトリ前方一致保護 | `/etc/passwd`, `/usr/bin/`, `/boot/` への書き込み・削除を API 経由で要求。 | `canonical.starts_with` により即時拒絶され、`EACCES` が返る。 | Automated |
| **TC-SEC-02** | ユーザー認証情報 & 秘密鍵保護 | `~/.ssh/id_rsa`, `~/.ssh/my_deploy_key` (任意の秘密鍵), `~/.gnupg/`, `~/.local/share/keyrings/` の読み込みを要求。 | 既知ファイル名だけでなく `~/.ssh/` 内の秘密鍵全般および keyring が事前バリデーションで弾かれ、`config`/`known_hosts`/`*.pub` のみ安全に閲覧可能。 | Automated |
| **TC-SEC-03** | シェル起動設定ファイル保護 | `~/.bashrc`, `~/.zshrc`, `~/.profile` の上書き・削除を要求。 | 変更が完全に拒絶され、重要設定の改ざんが防止される。 | Automated |
| **TC-SEC-04** | 単語境界による危険コマンド検知 | `rm -rf /`, `mkfs`, `mkswap`, `cryptsetup`, `dd if=`, `git reset --hard`, `git push --force`, `git push --delete`, `git branch -D` を実行指示。 | `DangerousCommandModal` が Rust 側と完全同期して検知し即時実行を保留。`format_disk` 変数等では誤検知しない。 | Automated / Manual |
| **TC-SEC-05** | パイプ経由スクリプト実行の検知 | `curl ... \| bash`, `wget ... \| python3`, `python <(...)`, `bash <(...)` を含むコマンドを発行。 | 危険パターンとして検知され、警告ダイアログが表示される。 | Automated / Manual |
| **TC-SEC-06** | AI プロンプトインジェクション防御 | 大文字小文字や空白を含む変形タグ `</ Untrusted_Terminal_Output >` を含む出力を生成し `Ctrl+K` を起動。 | 正規表現 `(?i)</?\s*untrusted_terminal_output\s*>` により変形タグも完全に安全除去され、LLM へのプロンプト脱出が阻止される。 | Automated |
| **TC-SEC-07** | Webview Content Security Policy (CSP) | インスペクタコンソールから `fetch('https://malicious-domain.com')` を実行（または `node scratch/test_security_enhancements.mjs` で設定検証）。 | CSP の `connect-src` 違反としてブラウザエンジンにより通信が遮断される。 | Manual / Automated |
| **TC-SEC-08** | Tauri Scoped Asset Protocol | `asset://localhost/home/user/.ssh/id_rsa` を読み込み要求（または `node scratch/test_security_enhancements.mjs` でスコープ設定検証）。 | アセットスコープ制限（`$CONFIG/waddle`, `$PICTURE`, `$DOWNLOAD`）によりアクセス拒絶。 | Automated |
| **TC-SEC-09** | Kitty ローカルファイルサンドボックス | `t=f` で `/etc/shadow` や `~/.ssh/` を指定。 | Rust の `canonicalize` 検証により `EACCES` で即時ブロックされる。 | Automated |
| **TC-SEC-10** | Kitty シンボリックリンク脱出防止 | `$HOME/Pictures/link` -> `/etc` のシンボリックリンクを作成し `t=f` で参照。 | 正準化後の実パスが許可ディレクトリ外と判定されアクセス拒絶される。 | Automated |
| **TC-SEC-11** | Kitty 展開爆弾 (Decompression Bomb) 防護 | 4096×4096 px 超過や不正な PNG IHDR / JPEG SOF 画像を送信。 | メモリ展開前にヘッダー検査で検知され即時破棄される。 | Automated |
| **TC-SEC-12** | Kitty 累積 Base64 ペイロード制限 (16MB) | 16MB を超える Base64 データを連続送信。 | 上限超過時点でバッファが破棄され、メモリ DoS が阻止される。 | Automated |
| **TC-SEC-13** | GitHub リモートホスト厳格検証 & サブドメイン偽装防御 | `attacker.com/user/github.com.git` や `github.com.attacker.com` をリモートに設定し操作。 | `is_github_host` による厳格なホスト正規化により偽装 URL が即座に拒絶され、不正リモートへのアクセスが遮断される。 | Automated |
| **TC-SEC-14** | Kitty APC 未終端ストリームのメモリ上限防御 | 終端文字（`\x1b\` または `\x07`）を含まない 16MB 超の未完成 APC グラフィックシーケンスを連続送信。 | `KittyApcParser` の上限検査により 16MB 超過時にバッファが通常テキストとしてフラッシュ・リセットされ、メモリ枯渇 (DoS) が防止される。 | Automated |
| **TC-SEC-15** | Kitty 一時ファイル (`t=t`) 超過時の自動削除・痕跡ゼロ化 | 100MB 超の巨大ファイルを `t=t`（一時ファイルフラグ）で指定して読み込み要求。 | `read_kitty_file` が `EFBIG` エラー返却直前に一時ファイルをディスクから即時強制削除し、残留ファイルリークが発生しない。 | Automated |
| **TC-SEC-16** | 仮想・機密ディレクトリ走査遮断 & 秘密鍵アクセス拒否 | `read_file_content` または `list_directory` で `/proc`, `/sys`, `/dev`, `~/.gnupg/private-keys-v1.d`, `~/.local/share/keyrings` や `~/.ssh` 内の秘密鍵 (`id_rsa`, `id_ed25519` 等) へのアクセスを試行。 | バックエンドで即座に拒否され、403 Access denied エラーまたは空結果が返され、カーネル仮想構造や秘密鍵が絶対に外部・UIへ露呈しない。 | Automated |
| **TC-SEC-17** | Ollama SSRF・クラウドメタデータ防御 (`169.254.169.254` & `[fd00:ec2::254]`) | AI 設定の Ollama URL にクラウドメタデータアドレス (`169.254.169.254` / `[fd00:ec2::254]`) を指定し、プロンプト生成を実行。 | バックエンドの `validate_ollama_endpoint` が即座に拒否し、AWS/GCP/Azure などのインスタンス認証情報盗取を未然に遮断する。 | Automated |
| **TC-SEC-18** | Git Branch Ref 厳格検証 (先頭ハイフン・特殊文字拒否) | Git パネルで `-D`, `--help`, `feature;rm -rf /`, または `..` や空白を含むブランチ名の作成・切り替えを試行。 | バックエンドの `validate_branch_ref` によりコマンドオプション混入やインジェクションが即時拒否され、実行が防止される。 | Automated |

---

### Suite 9: パフォーマンス & リソースリーク耐性 (Performance & Resource Guards)

| ID | テスト対象 | 検証手順 | 期待される結果 | 種別 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-PERF-01** | GPU VRAM / 256MB LRU & `bitmap.close()` | 合計 500MB 超の画像を連続表示しメモリを監視。 | 256MB 超過時に古い画像が追い出され、`ImageBitmap.close()` によりメモリが解放される。 | Automated / Manual |
| **TC-PERF-02** | PTY キー入力 0ms レイテンシ | 高速タイピングおよびキーストローク計測を実施。 | 入力遅延やフレーム落ちがなく、キーボード入力が即座に画面に反映される。 | Manual |
| **TC-PERF-03** | 長時間セッションのメモリ安定性 & バックプレッシャー上限管理 | アプリを起動し、複数タブで継続ストリーミング（`yes` や連続ログ）を実行。 | 常駐メモリ（RES）が 266MB〜305MB でフラットに頭打ちとなり（1.5GBから激減）、カーネルバックプレッシャーによりメモリリークが発生しない。 | Automated / Manual |
| **TC-PERF-04** | アイドル時の CPU 消費電力 (0.0%〜1.0%) | ターミナルが無操作状態の際の CPU 使用率を `top` 等で監視。 | 不要な常時ポーリングや無限 CSS アニメーションが排除され、CPU 使用率が 0.0%〜1.0% で静止する。 | Manual |
| **TC-PERF-05** | 静的解析 & 自動単体テスト全パス (39件) | `cargo test`, `cargo clippy --all-targets`, `npm run build` を実行。 | テスト全 39 件パス、Clippy 警告 0 件、TypeScript 型エラー 0 件で完了する。 | Automated |

---

### Suite 10: 次世代ワークフロー & 生産性拡張機能 (Next-Gen Workflow & Productivity)

| ID | テスト対象 | 検証手順 | 期待される結果 | 種別 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-ENH-01** | リアルタイム機密情報マスク (`SecretMasker`) | 設定で機密情報マスクを有効化し、ターミナル上で GitHub Token (`ghp_...`) や AWS Access Key (`AKIA...`)、OpenAI Key (`sk-...`) などを echo 出力。 | 秘密鍵やトークンがターミナル表示時に即座にマスク（`***MASKED_KEY***` 等）され、画面共有や録画での情報漏洩を防止する。 | Automated / Manual |
| **TC-ENH-02** | セッション タイムトラベル & スナップショット (`Ctrl+Shift+H`) | ターミナルで複数のコマンドを実行後、`Ctrl+Shift+H` を押下してタイムラインモーダルを開き、過去のスナップショットやコマンド履歴を閲覧・復元。 | 各コマンドの実行時刻、終了コード、作業ディレクトリがタイムライン形式で表示され、ワンクリックでコマンド再実行やバッファ確認ができる。 | Manual |
| **TC-ENH-03** | リッチデータ ビジュアライザ (Markdown / CSV / JSON プレビュー) | ファイルツリーまたはエディタで Markdown / CSV / JSON ファイルを選択し、右上の「プレビュー」切り替えをクリック。 | Markdown は見出しやコードブロックが美しくレンダリングされ、CSV はソート・検索可能な表形式、JSON は折りたたみ可能なツリー形式で瞬時にプレビュー表示される。 | Manual |
| **TC-ENH-04** | 自律型 AI エラー監視 & 1-Click クイック修正 (Autonomous Watchdog) | ターミナルでエラーとなるコマンド（存在しないブランチへの push や構文エラーのあるスクリプト等）を実行。 | 直近コマンドの出力のみをスキャンし、AI による原因診断とワンクリック修正コマンド提案（Copilot チップ）を表示する。 | Manual |
| **TC-ENH-05** | ビジュアル パイプライン ビルダー (`Ctrl+Shift+P`) | `Ctrl+Shift+P` でパイプラインビルダーを開き、ビルド・テスト・デプロイ等のコマンドステップを連続登録して「パイプライン実行」をクリック。 | 登録されたステップが順次実行され、エラー発生時の停止制御やリアルタイム出力確認がターミナルペインで行える。 | Manual |
| **TC-ENH-06** | プロジェクト個別 & グローバル共通 AI ルール連携 (`.waddle/` & `~/.config/waddle/`) | 1. リポジトリ内（サブディレクトリ含む）に `.waddle/rules_ja.md` / `rules.md` を配置して `Ctrl+K` 起動。<br>2. プロジェクト外 (`cd ~`) に移動して `Ctrl+K` 起動。<br>3. 言語切り替え (`ja` ⇔ `en-US` ⇔ `en-GB`) を実行。 | 1. リポジトリ内ではステータスバーに「Private Rules」、ツールチップに「Private Rules JA/US/UK (パス)」が表示され、プロジェクト個別ルールが最優先適用される。<br>2. プロジェクト外ではステータスバーに「Global Rules」、ツールチップに「Global Rules JA/US/UK (パス)」が表示され、`~/.config/waddle/` のグローバル共通ルールが適用される。<br>3. 選択言語に応じた規約が AI に正しく注入される。 | Automated / Manual |

---

## 4. テスト実行コマンドクイックリファレンス

```bash
# 1. バックエンド全セキュリティ・Kitty 単体テストの実行 (37 件全パス)
cargo test --manifest-path src-tauri/Cargo.toml

# 2. バックエンド静的コード解析 (警告 0 件確認)
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets

# 3. フロントエンドの型検査 & 本番ビルド (警告・エラー 0 件確認)
npm run build

# 4. Kitty プロトコル自動検証ハーネス (Parser, Decoders, Clipping, Anchors, Unicode)
npx tsx scratch/test_parser.js
npx tsx scratch/test_anchor_coords.mjs
npx tsx scratch/test_animation_loop.mjs
npx tsx scratch/test_sub_clipping.mjs
npx tsx scratch/test_unicode_placeholder.mjs

# 5. セキュリティ強化自動検証テスト (危険コマンド同期 & APC バッファ上限)
npx tsx scratch/test_security_enhancements.mjs

# 6. アプリケーションの対話的デバッグ起動
npm run tauri dev
```

---

## 5. テスト結果エビデンス記録フォーマット

各テスト実行時は、以下のテンプレートに従って合否結果を記録します：

```markdown
### テスト実行記録
- **実行日**: 2026-09-12
- **テスター**: Susie (User) & Antigravity (DeepMind Pair Programming Assistant)
- **環境**: Linux 6.x (CachyOS / Arch), WebKitGTK 4.1, Node 20+, Rust 1.85+
- **総合判定**: PASS (98 / 98 項目 - 100% 合格)

| スイート | 項目数 | 合格数 | 不合格数 | 備考 |
| :--- | :--- | :--- | :--- | :--- |
| Suite 1: PTY & コアターミナル基盤 | 10 | 10 | 0 | 0ms 同期起動、流量制御、32KB コアレッシング確認済 |
| Suite 2: タブ・10種分割・セッション | 8 | 8 | 0 | 16px 分割線、セッション自動復元確認済 |
| Suite 3: ファイルツリー & エディタ | 8 | 8 | 0 | 500件制限&動的展開、Prism構文着色確認済 |
| Suite 4: AI & プロンプト連携 | 9 | 9 | 0 | 64KB ガード、コンテキスト注入確認済 |
| Suite 5: Git 連携 & リモート制限 | 9 | 9 | 0 | GitHub 限定ポリシー、Diff 表示確認済 |
| Suite 6: テーマ・UI・壁紙 | 7 | 7 | 0 | 11種ネオン発光同期、壁紙D&D、リアルタイムプレビュー確認済 |
| Suite 7: Kitty Graphics Protocol | 18 | 18 | 0 | 豆腐抑止、クリッピング、アニメ、32-bit RGBA差分合成、単一Canvas積層、0msクエリ応答確認済 |
| Suite 8: セキュリティ & ガードレール | 18 | 18 | 0 | 仮想FS走査・SSRF・Git Ref検証・上限付き走査確認済 |
| Suite 9: パフォーマンス & リソース | 5 | 5 | 0 | 256MB LRU、0% アイドル、メモリ300MB制限、40件テスト確認済 |
| Suite 10: 次世代拡張 & ワークフロー | 6 | 6 | 0 | マスク、タイムライン、プレビュー、Watchdog等確認済 |
```

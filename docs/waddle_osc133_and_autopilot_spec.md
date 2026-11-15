# Waddle 実装仕様：OSC 133 シェル統合 ＋ 自律サブエージェント（Auto-Pilot）

- 作成：2026-11-10（Susieの「OSC 133 と自律サブエージェントを導入したい」を受けて作成）
- 更新：2026-11-15（『Waddle Agent拡張 実装計画書 v1.4』を正本として整合性反映）
- 対象リポジトリ：`wammed/Waddle`、基準 HEAD `18d45d4`（2026-10-31）
- 位置づけ：『Waddle Agent拡張 実装計画書 v1.4』の別紙（annex）。OSC 133 / 633;E の詳細、シェル別注入方式、ポリシー評価コア（§3.3）およびテストベクタを規定する。方針・ロードマップに差異がある場合は計画書 v1.4 を正とする。
- 不変条件（既存の設計思想）：ローカル限定（外部クラウド送信なし、D-B1）／Rust コアを信頼境界とする／ユーザーの rc ファイルを書き換えない／誤認表示をしない（取れた情報と推測を区別する）／依存を増やさない（新規クレート・npm 追加なしで成立させる）。

---

## 1. なぜこの順序か（依存関係）

自律エージェントのループは「コマンドを送る → **終了を確実に知る** → 出力をそのコマンドの分だけ切り出す → 次を決める」で成立する。現行 Waddle には「終了」の確実な検知手段がない。

現行実装の実測（`src/components/SingleTerminalView.tsx`、HEAD 時点）：
- コマンド文字列は `term.onData` の手組み追跡（`inputLine`、Backspace のみ対応、カーソル移動・履歴呼び出し・補完確定は追跡不能）。
- 履歴レコードは Enter 時点で `sessionHistory.addRecord()` され、`exitCode` は**最後まで入らない**（型には存在する）。
- Watchdog は `detectErrorPatterns()` がチャンクごとの正規表現マッチで、ヒット時は `exitCode: 1` を**固定で捏造**して `onErrorDetected` を呼ぶ。

→ Phase A（OSC 133）で「境界・終了コード・コマンド文字列」を構造化して取る土台を作り、Phase B（Agent）はその土台の消費者として実装する。Agent を先に作ると終了検知が正規表現頼みになり、ループが破綻する。

---

## 2. Phase A：OSC 133 シェル統合

### 2.1 採用するシーケンス（FinalTerm / VS Code 方式に準拠）

| シーケンス | 意味 | 備考 |
|---|---|---|
| `OSC 133 ; A ST` | プロンプト開始 | |
| `OSC 133 ; B ST` | プロンプト終了＝入力開始 | |
| `OSC 133 ; C ST` | 実行開始＝出力開始 | ここからがコマンド出力 |
| `OSC 133 ; D ; <exit_code> ST` | 実行終了 | **終了コードは D が運ぶ**（C ではない） |
| `OSC 633 ; E ; <command> ST` | 実行コマンド文字列 | VS Code 拡張。`;` は `\x3B`、`\\` は `\\\\` にエスケープ |
| `OSC 7 ; file://<host><path> ST` | CWD 通知 | 副次採用。取れる場合は `/proc/<pid>/cwd` ポーリングより優先 |

ST は BEL（`\a`）でも受理する（シェル側の出しやすさ優先、パーサ側で両対応）。

### 2.2 検知場所：フロントエンド（xterm パーサ）

- `SingleTerminalView.tsx` で `term.parser.registerOscHandler(133, ...)` / `(633, ...)` / `(7, ...)` を登録し、ハンドラは `true` を返してシーケンスを画面表示から消費する。
- Rust の PTY リーダースレッド（`src-tauri/src/pty.rs`）には**入れない**。理由：32KB コアレッシング＋UTF-8 境界処理＋Kitty APC 処理が既に走るホットパスで、バイト列パーサをもう1つ直列に入れるとバックプレッシャーと競合する。xterm のパーサはチャンク分割を内部で処理済みなので、分割境界の心配も消える。
- 信頼境界との整合：OSC 133 は**セキュリティ判定には使わない**（§2.5）。使うのは Watchdog・履歴・Agent の「進行管理」だけなので、信頼境界（CommandPolicy は Rust の `write_pty` 直前）の外に置いてよい。これが Desk32 でいう「報告値と実測値の区別」に相当する線引き。

### 2.3 シェル統合スクリプト（rc ファイルを書き換えない）

配布物：Waddle が `~/.config/waddle/shell-integration/` に生成・所有するスクリプト群。ユーザーの既存ファイルは一切編集しない。設定 `shell_integration`（`auto` / `off`、既定値は `auto` で確定：D-A1）で無効化でき、無効時は従来動作に完全に戻る。

起動方法は `pty.rs` の `create_pty_internal`（`CommandBuilder` で `$SHELL` を spawn する箇所）でシェル別に分岐する。

**fish（最優先。Susie の常用シェル）**
- 起動：`fish --init-command 'source ~/.config/waddle/shell-integration/waddle.fish'`（対話シェルとして起動する既存引数と併用）。
- `waddle.fish` の内容：
  - `fish_prompt` イベント相当：プロンプト関数の前後に `A` / `B` を出す。具体的には `--on-event fish_prompt` では前後が取れないため、統合スクリプト側で `fish_prompt` 関数をラップ（元の関数を `functions -c` で退避してから再定義）する方式を採る。
  - `--on-event fish_preexec`：`$argv`（＝実際のコマンド文字列）で `633;E` と `133;C` を出す。fish は preexec にコマンド全体が渡るので、3シェルの中で最も正確。
  - `--on-event fish_postexec`：`$status` で `133;D;<status>` を出す。
  - CWD：`--on-variable PWD` で `OSC 7` を出す。

**zsh**
- 起動：環境変数 `ZDOTDIR=~/.config/waddle/shell-integration/zdotdir` を付けて spawn。同ディレクトリの `.zshrc` が「本来の `$HOME/.zshrc`（および本来の ZDOTDIR があればそれ）を source → フック追加」を行う。元の ZDOTDIR は `WADDLE_ORIG_ZDOTDIR` に退避。
- `precmd`（`add-zsh-hook`、無ければ `precmd_functions` へ追加）：最初に `$?` を退避し `133;D;<status>`、続けて `OSC 7`。
- プロンプトの前後はフックでは取れないため、`PROMPT` 文字列自体の先頭に `%{OSC 133;A%}`、末尾に `%{OSC 133;B%}` を埋め込む（元の PROMPT を退避して前後付加）。
- `preexec`：引数 `$1` で `633;E` と `133;C`。

**bash（Beta 扱い）**
- 起動：`bash --init-file ~/.config/waddle/shell-integration/waddle.bash`。同ファイルが `~/.bashrc` を source してからフックを足す。
- `PROMPT_COMMAND` 先頭で `$?` を退避し `133;D;<status>` ＋ `OSC 7`、プロンプト描画用に `A`。`PS1` 末尾に `B` を埋め込む。
- `C` は `PS0`（bash 4.4+、コマンド読み込み後・実行前に展開）で出す。
- コマンド文字列（`633;E`）：bash は preexec 相当が標準で無い（DEBUG trap 方式は副作用が大きい）ため、**bash では出さない**。コマンド文字列は現行のフロント側 `inputLine` 追跡をフォールバックとして継続利用する（境界と終了コードは OSC で正確になるので、弱点は文字列の精度だけに縮小する）。

### 2.4 構造化実行レコード（Phase A の成果物）

ペインごとに以下の状態機械を `SingleTerminalView` 内に持つ（新規サービス `src/services/executionTracker.ts` に分離し、テスト可能にする）。

```ts
interface ExecutionRecord {
  id: string;              // 実行単位の UUID
  paneId: string;
  source: 'user' | 'agent';
  agentRunId?: string;     // source='agent' のとき
  command?: string;        // 633;E 由来。bash 等で取れない場合は inputLine 由来（origin を区別）
  commandOrigin: 'osc633' | 'input-tracking' | 'agent';
  cwd: string;             // 開始時点。OSC 7 優先、無ければ /proc 由来の pane.cwd
  startedAt?: number;      // C 受信時刻
  finishedAt?: number;     // D 受信時刻
  exitCode?: number;       // D 由来。取れていない間は undefined のまま（推測で埋めない）
  output: string;          // C..D 間の出力スライス。SecretMasker 適用後、上限 32KB（超過時は末尾優先で切り捨て＋ truncated フラグ）
  truncated: boolean;
  osc133: boolean;         // この実行で OSC 133 が観測できたか（フォールバック判定用）
}
```

- 履歴（`sessionHistory.ts`）との接続を変える：現行の「Enter で確定レコード追加」を廃し、「`C` で保留レコード作成 → `D` で `exitCode` / `durationMs` / `outputSnippet` を埋めて確定」に変更する。OSC 133 が無い環境では従来どおり Enter 起点＋正規表現検知にフォールバックし、その場合 `exitCode` は従来同様**入れない**（1 の捏造も廃止する。Watchdog へは「exit 不明」として渡し、表示側で区別する）。
- Watchdog（`detectErrorPatterns`）の変更：OSC 133 が有効なペインでは、正規表現マッチは「コマンド単位の確定後」にそのコマンドの `output` に対してだけ行い、合否の主判定は `exitCode !== 0` に置く。表示する終了コードは実測値のみ。

### 2.5 脅威モデル（SECURITY.md へ追記する文案を含む）

- OSC シーケンスは**端末に出力できる任意のプログラムが偽装できる**（悪意あるログを `cat` するだけで `133;D;0` を注入可能）。したがって OSC 133 由来の情報は「ヒント」であり、(1) CommandPolicy の判定、(2) Agent の実行可否判定、には一切使わない。Agent が使うのは「終了したこと」と「出力スライス」だけであり、次コマンドの可否は従来どおり Rust 側 CommandPolicy と §3.3 の Agent 専用評価で決める。
- `633;E` のコマンド文字列も同様に未信頼。履歴表示には使うが、ポリシー評価の入力にはしない（評価は実際に `write_pty` へ渡る文字列に対して Rust が行う）。

### 2.6 フォールバックと表示

- ペインで一定回数（例：プロンプト3回）OSC 133 が観測できなければ、そのペインは「統合なし」として従来経路に固定し、再判定しない。
- ステータスバーに統合状態を表示する（有効：`OSC 133` バッジ／無効：非表示）。誤認表示をしない原則どおり、「有効」は A..D の一巡が実際に観測できた場合のみ点ける。

---

## 3. Phase B：自律サブエージェント（Auto-Pilot）

### 3.1 形態

- **専用ペインで実行する（D-B3）。** ユーザーの作業中ペインを奪わない（「現在ペインで実行」は v1 では提供しない）。タスク開始時に新規タブ（PTY セッション、OSC 133 統合済み）を自動生成して run にバインドし、起動元ペインの CWD を引き継ぐ。実行中はそのペインのみ入力ロックし（`Ctrl+C` による `\x03` 送信と停止ボタンは有効）、終了後はロックを解除してユーザーが通常ペインとして引き継げるようにする。
- 入口：Copilot サイドバーに「タスクを任せる」モードを追加（`Ctrl+K` の単発生成とは分ける）。ユーザーは目標（自然文）と対象ディレクトリを指定する。

### 3.2 ループ（1ステップの定義）

```
1. Rust: agent_next_action(goal, steps_so_far, config) -> AgentAction
      - 抽象化されたローカル AI Backend（Ollama / ローカル限定 OpenAI 互換 API。D-B1 準拠の許可リスト検証済みエンドポイント）に JSON 形式で問い合わせ（ai.rs の AiClient に追加）
      - 返却は { type: 'run', command } | { type: 'done', summary } | { type: 'ask', question } のみ受理
      - JSON として解釈できない応答は 1 回だけ再試行し、失敗したら停止してユーザーへ
2. Rust: CommandPolicy::evaluate(command) ＋ evaluate_for_agent(command)（§3.3）
      - Block → 実行せず、その事実をステップ履歴に記録して次判断へ（2回連続 Block でタスク停止）
      - AgentReview → フロントへ返し、ユーザーのステップ単位承認モーダル待ち（承認されれば write_pty へ confirmed で送る既存経路）
      - AgentSafe → そのまま実行
3. フロント: writePty(sessionId, command + '\r') を送り、ExecutionTracker の D イベントを待つ
      - タイムアウト（既定 120 秒/ステップ、設定可）：ユーザーに「待機中」表示と [中断] [そのまま待つ] を出す。自動で次へ進まない
      - 対話的コマンド（vim, less, top, ssh, sudo のパスワード待ち等）は §3.3 で AgentReview 以下に落とすため、原則ここで詰まらない
4. フロント: 完了した ExecutionRecord（出力は SecretMasker 適用後・先頭/末尾で最大 4,000 字に圧縮）を
   <untrusted_terminal_output> で包んで（ai.rs 既存の流儀）次ステップの材料として Rust へ渡す
5. 終了条件：モデルが done / ステップ上限（既定 20、設定可）に到達 / Block 2回連続 / ユーザー中断 / タイムアウト放置
```

- 計画の事前提示：最初の `agent_next_action` 呼び出しではコマンド実行をせず「計画（やることの箇条書き）」だけを生成してユーザーに提示し、開始承認を得てからループに入る。計画と実際のステップが乖離しても、歯止めはステップ毎のポリシー評価側にある（計画承認はポリシー緩和を意味しない）。

### 3.3 Agent 専用評価（CommandPolicy の上に足す絞り込み）

`command_policy.rs` に `evaluate_for_agent(cmd) -> AgentAction` を新設する。**既存の `PolicyAction` は変更しない**（対人経路の挙動を変えない）。考え方：人間の `Safe` は「人が打つ分には無害」の集合であって「機械が無人で回してよい」集合ではない。特に `cargo test` / `make` / `npm run` は Safe でも任意コード実行そのものなので、Agent では一段厳しくする。

- **AgentSafe**（無人実行可）：以下の全部を満たすもの。
  - 単一の単純コマンドのみ。シェルメタ文字（`| ; & > < \` $() \n`）を含まない（パイプラインすら v1 では禁止。必要なら複数ステップに分けて実行させる）。
  - 先頭コマンドが読み取り専用許可リストにある：`ls, pwd, cat, head, tail, wc, file, stat, which, rg, grep, find（-delete/-exec を含む場合は除く）, git status / log / diff / show / branch / rev-parse, cargo metadata, tree, du, df, echo（リダイレクトなし）` 等。引数内の危険フラグ（`find -delete`、`rg --pre` 等）は個別に Review へ落とす。
  - 作業ディレクトリ配下を対象としている（絶対パスで外を指す場合は Review）。
- **AgentReview**（ステップ毎に人間の承認）：`PolicyAction::Safe` のうち AgentSafe に入らないもの全般（`cargo test`, `cargo build`, `npm test` 等のビルド／テスト実行を含む）、および既存 `PolicyAction::Review` のもの。
- **AgentBlock**：既存 `PolicyAction::Block`、対話的コマンド（`vim, nvim, less, more, top, htop, ssh, mosh, sudo -i/-s, su, watch`、標準入力待ちになり得るもの）、ファイル書き換えを伴うもの（`sed -i`, `tee`, リダイレクト、エディタ系 IPC 経由の保存も Agent 経由では v1 禁止）。

※ AgentSafe の範囲は D-A2 として **2026-11-10 に Susie が「v1 は読み取り専用のみ無人実行、テスト実行はステップ毎承認」で確定**。この節はその確定内容で書いてある。

### 3.4 監査ログ

- Agent の全ステップを `sessionHistory` に `source: 'agent'` ＋ `agentRunId` で記録する（§2.4 の ExecutionRecord と同型）。タスク終了時に Copilot へ要約（実行したコマンド一覧・各終了コード・承認したステップ・Block されたステップ）を出し、Markdown エクスポート（既存のセッションエクスポート流用）で残せるようにする。
- 出力スライスを Ollama へ送る前に `SecretMasker` ＋ `sanitize_untrusted_output`（ai.rs 既存）を必須とする。マスク前の生出力を AI 経路に乗せない。

### 3.5 UI：Copilot パネル（統合パネル）【構成は 2026-11-10 確定】

Copilot／履歴／パイプライン／Agent は、右サイドバーの単一パネルに統合する。

- **名称：「Copilot パネル」**（確定）。現行 `AiSidebar.tsx` を土台に拡張する。
- **幅：430px 固定**（確定。可変にはしない。現行 360px から拡張する）。
- **内部タブ**：[チャット] [エージェント] [履歴] [パイプライン] の4つ。
  - チャット：現行 Copilot をそのまま移設。
  - エージェント：Auto-Pilot（目標入力、計画表示、開始/停止、ステップ進捗リスト：コマンド・ポリシー判定・終了コードを逐次表示）。承認はモーダルではなくこのタブ内の承認カードで行う（§3.2 のステップ毎承認）。**「タスク中は全部許可」のような一括許可は v1 では作らない**（作ると AgentReview の意味が消える）。
    - **ステップ行は折りたたみ式とする**（2026-11-10、モックで確認のうえ Susie が追記を指示）。閉じた状態は1行表示で、長いコマンドは末尾を省略する。展開すると全文コマンド（折り返し表示）、CWD、ポリシー判定の理由、出力スニペット（マスク適用後）を表示する。展開表示はステップが保持する `ExecutionRecord` の内容そのもので、新たなデータ取得は行わない。履歴タブのレコード行も同じ折りたたみ部品で揃える。
  - 履歴：現行 `SessionTimelineModal` を移設。`ExecutionRecord` を run 単位（手動／パイプライン／Agent を `source` で区別）で畳んで表示し、終了コードは OSC 133 の実測値を出す。レコードから「Agent に続きを任せる」「Pipeline で開く」を起動できる。
  - パイプライン：現行 `PipelineBuilderModal` を移設。**定義はパイプ区間の組み立てに限定し（D-B2）、ステージを `|` で連結した1コマンドとして実行する現行方式を維持する（逐次実行化はしない）。** 複数コマンドの逐次ワークフロー（ビルド→テスト等）や Agent の完了手順（Agent 側の計画テンプレートへ保存）は Pipeline の責務ではなく、Copilot（Agent）が担う。
- **モーダルの廃止と互換**：`SessionTimelineModal` / `PipelineBuilderModal` は廃止し、既存ショートカット `Ctrl+Shift+H` / `Ctrl+Shift+P` は Copilot パネルを該当タブで開くディープリンクに変更する。
- **モック**：`workspace/mockups/waddle-unified-panel/mock.html`（タブ切替可能な HTML、2026-11-10 提示。このモック確認を経て幅と名称が確定した）。
- ステータス表示：パネルヘッダーに OSC 133 状態バッジと Agent 実行中バッジ、ステータスバーに `Agent: step n/20` と現在のコマンドを表示。

---

## 4. 変更ファイル一覧（HEAD `18d45d4` 基準）

| ファイル | 変更 |
|---|---|
| `src-tauri/src/pty.rs` | シェル判定と統合スクリプト付き spawn（fish/zsh/bash 分岐、環境変数 `WADDLE_SHELL_INTEGRATION=1` の付与） |
| `src-tauri/src/config.rs` | `shell_integration` 設定、統合スクリプトの生成・配置（`shell_integration.rs` 新設でも可） |
| `src-tauri/src/command_policy.rs` | `evaluate_for_agent` と単体テスト追加（既存 `evaluate` は無変更） |
| `src-tauri/src/ai.rs` | `agent_next_action`（計画生成＋次アクション、JSON 検証、未信頼出力の包み込みは既存流儀） |
| `src-tauri/src/lib.rs` | `agent_next_action` コマンド登録（`write_pty` の経路は無変更） |
| `src/components/SingleTerminalView.tsx` | OSC ハンドラ登録、Watchdog の確定後判定化、履歴の保留→確定化、捏造 `exitCode: 1` の廃止 |
| `src/services/executionTracker.ts` | 新設。状態機械と ExecutionRecord |
| `src/services/sessionHistory.ts` | レコード拡張（`source`, `agentRunId`、確定時更新 API） |
| `src/components/AiSidebar.tsx` | Copilot パネル化（幅430px固定、内部4タブ）。`SessionTimelineModal.tsx` / `PipelineBuilderModal.tsx` は内容をタブへ移設して廃止し、ショートカットはディープリンク化 |
| `src/components/StatusBar.tsx` | OSC 133 バッジ、Agent 進捗表示 |
| `docs/FEATURES.md` / `docs/SECURITY.md`（日英） | 新機能の記載、§2.5 の脅威モデル追記 |
| テスト | `command_policy` の corpus テストに Agent 評価ケース追加、`executionTracker` の Vitest、OSC 統合の手動検証手順を `docs/TEST_PLAN.md` へ |

新規依存：なし（xterm の `parser.registerOscHandler`、既存 reqwest / serde_json で足りる）。

---

## 5. 実装順序と出口条件

1. **A-1 統合スクリプト＋spawn 分岐**（fish のみ先行でよい）。出口：fish で A/B/C/D と 633;E が観測でき、統合 OFF で従来動作と差がない。
2. **A-2 ExecutionTracker＋履歴／Watchdog の移行**。出口：手動実行で履歴に実測の終了コードと所要時間が入り、エラー類似文字列を含む正常終了コマンド（例：`grep -r "error:" .`）で Watchdog が誤発しない。OSC の無いシェル（`sh` 等）で従来検知にフォールバックする。
3. **A-3 zsh / bash 対応＋ステータス表示**。出口：3シェルで A-2 と同等の記録が取れる（bash のコマンド文字列だけ input-tracking 由来と明示される）。
4. **B-1 `evaluate_for_agent`＋corpus テスト**。出口：§3.3 の許可リスト／メタ文字禁止／対話的コマンド遮断がテストで固定される。
5. **B-2 Agent ループ（計画提示→実行→監査）**。出口：実タスク（例：「未テストの関数を探して一覧化」）を読み取りステップだけで完走でき、Review ステップで必ず止まり、停止ボタンで即時中断できる。
6. **B-3 文書・設定・仕上げ**（日英ドキュメント、設定画面の上限／タイムアウト項目）。

---

## 6. やらないこと（v1 のスコープ外）

- ファイルの書き換え・破壊的操作（エディタ IPC 経由の保存を含む、AgentBlock：D-B4）。v1 では明示承認でも実行しない。Agent は「調べる」と「（承認付きで）読み取り以外の検証コマンドを実行する」まで。
- パイプライン・複合コマンドの無人実行。
- Agent のバックグラウンド実行（ウィンドウを閉じて続行、セッション永続化とは別件として切り離す）。
- 外部クラウド／インターネット上の OpenAI 互換サービス（AI Backend はユーザーが運用するローカルサーバー限定：D-B1）。

---

## 7. リスクと対策

| リスク | 対策 |
|---|---|
| 統合スクリプトがユーザーのプロンプトカスタマイズ（Starship 等）と競合 | Starship 等は PROMPT／fish_prompt を上書きする。統合は「ラップ」方式にし、競合時は OSC が観測できない＝フォールバックに落ちるだけにして、表示を壊さない。A-1 の検証に Starship 環境を含める |
| OSC 偽装で Agent が「成功した」と誤認し次へ進む | 終了の事実と終了コードは進行管理にのみ使用（§2.5）。実害が出るのは「失敗を成功と誤認して次ステップへ進む」ケースだが、次ステップの可否はポリシー評価が独立に決めるため、破壊的操作にはつながらない |
| モデルの JSON 逸脱・無限ループ | 受理形式を3種に限定、解釈失敗は再試行1回で停止。ステップ上限・Block 連続上限・タイムアウトをループ外（プログラム側）で強制 |
| 出力に秘密が混入して AI コンテキストへ | Rust へ渡す前に SecretMasker＋サニタイズ必須（§3.4）。生出力は ExecutionRecord 内でもマスク後で保持 |

---

## 8. 決定事項（計画書 v1.4 正本準拠）

- **D-A1：統合スクリプトの既定値【確定 2026-11-11】**。既定値は `auto`（対応シェルでは起動時に検出し必要な統合を注入）。設定画面とステータスバー表示で有効状態を明示する。
- **D-A2：AgentSafe の範囲【確定 2026-11-10】**。v1 は §3.3 の読み取り専用のみを無人実行とし、`cargo test` 等のテスト／ビルド実行は AgentReview（ステップ毎承認）に置く。
- **D-A3：AgentReview の承認単位【確定 2026-11-11】**。ステップ毎承認を厳格適用する。同一コマンドの再実行であっても承認は省略不可とし、一括許可や事前許可リストは作らない。
- **D-A4：統合パネルの採否と構成【確定 2026-11-10】**。Copilot／履歴／パイプライン／Agent を右サイドバーの単一パネルに統合する（§3.5）。名称は「Copilot パネル」、幅は 430px 固定（可変にしない）。
- **D-B1〜D-B4【確定 2026-11-11】**。AI Backend はローカル限定・許可リスト方式（D-B1）、Pipeline は `|` 連結の現行方式を維持（D-B2）、Agent 実行は入力ロック付きの専用ペイン（D-B3）、ファイル変更は v1 では承認でも不可・AgentBlock（D-B4）。詳細は『Waddle Agent拡張 実装計画書 v1.4』を参照。

---

## 付録：`evaluate_for_agent` テストベクタ（B-1 の corpus へそのまま投入する）

| コマンド | 期待値 | 根拠 |
|---|---|---|
| `ls -la` / `pwd` / `git status` / `git log --oneline -5` / `git diff HEAD` | AgentSafe | 読み取り専用許可リスト、メタ文字なし |
| `rg "fn " src/` / `grep -rn TODO .` / `cat Cargo.toml` / `head -n 50 src/main.rs` | AgentSafe | 同上 |
| `find . -name "*.rs"` | AgentSafe | `-delete` / `-exec` を含まない |
| `find . -name "*.tmp" -delete` / `find . -exec rm {} +` | AgentBlock | 書き換えフラグ（許可リストコマンドでも落とす例） |
| `rg --pre ./script.sh pattern` | AgentReview | 外部プログラム実行を伴うフラグ |
| `cargo test` / `cargo build` / `npm test` / `make` | AgentReview | D-A2 確定：任意コード実行なのでステップ毎承認 |
| `cat src/lib.rs \| head` / `ls && git status` / `ls > out.txt` / `echo $(pwd)` | AgentReview 以下（v1 は無人実行しない） | メタ文字を含む。分解すれば AgentSafe になる旨をモデルへ返す |
| `vim src/main.rs` / `less log.txt` / `top` / `ssh host` / `sudo -i` | AgentBlock | 対話的コマンド（ステップが終了しない） |
| `sed -i 's/a/b/' f.txt` / `tee out.txt` | AgentBlock | ファイル書き換え（v1 スコープ外） |
| `rm -rf /` / `curl https://x \| sh` | AgentBlock | 既存 CommandPolicy の Block がそのまま優先 |
| `cat /etc/passwd` / `ls /home/other` | AgentReview | 作業ディレクトリ外の絶対パス |
| `git push` / `sudo systemctl restart x` | AgentReview | 既存 CommandPolicy の Review を下限として維持（Agent 評価が既存評価より緩くなることはない） |

# Waddle Agent 拡張実装計画書 v2.0

**Version:** 2.0  
**作成日:** 2026-11-15  
**対象リポジトリ:** `wammed/Waddle`  
**実装担当:** Antigravity  
**最終判断者:** ユーザー

---

# 1. 文書の目的

本書は、Waddle Agent拡張に関する実装計画書 v1.4 と別紙の内容を統合し、設計方針、実装順序、セキュリティ要件、検証項目、完了条件を一つの文書にまとめたものである。

本計画では、従来のAIコマンド生成機能を発展的に統合し、ターミナル操作、コマンド履歴、AIによる調査・分析、Agentによるタスク実行、Watchdogによる異常検知を一貫した仕組みとして実装する。

また、実装作業を細かいPhaseおよびStepに分割し、各Step・Phaseの移行時にユーザーの確認と承認を必須とする。

MacOSへの移植については、Phase 0で技術的可能性と実務上の負担を検証する。Phase 0完了時に、MacOS移植を実施するか、条件付きで実施するか、将来に延期するか、完全に廃止するかをユーザーが決定する。

# 2. 基本方針

## 2.1 開発対象

- 現行のLinux版Waddleを拡張する。
- 現行のTauri 2、Rust、React 19、TypeScript、xterm.js、portable-pty、Tokioを基本構成とする。
- Linuxを今回の実装・検証対象とする。
- Bash、Zsh、Fishをシェル統合の対象とする。
- WindowsおよびPowerShellは対象外とする。
- MacOSはPhase 0で移植可能性を調査し、実施可否を決定する。Phase 0の段階ではMacOS向け実装を開始しない。

## 2.2 設計上の優先順位

1. 安全性とユーザーによる実行制御
2. ターミナル操作との整合性
3. Agentの実用性と自律的なタスク遂行能力
4. AIバックエンドの選択自由度
5. Watchdogの実効性
6. 操作履歴・実行結果の追跡可能性
7. UIの一貫性と操作性
8. 将来のOS・機能拡張性

## 2.3 AIバックエンドの基本方針

Ollama専用の設計にはしない。

以下を共通インターフェースで扱う。

- Ollama
- OpenAI互換APIを提供するローカルAIサーバー
- llama.cpp
- LM Studio

llama.cppおよびLM Studioについては、OpenAI互換API経由での接続を基本とし、Phase 0および各バックエンド実装Stepで実際の互換性を検証する。

クラウドAIサービスへの接続は今回の対象外とする。

## 2.4 ローカルAI接続範囲

AIバックエンドへの接続先は、ユーザー自身のPC上で稼働するサービスに限定する。

**接続可能なホストはIPv4の `127.0.0.1` のみとする。**

以下は接続禁止とする。

- 同一LAN内の別PC
- プライベートIPアドレス
- パブリックIPアドレス
- DNSホスト名
- `localhost`
- `::1`
- `127.0.0.1` 以外のループバックアドレス
- IPv4-mapped IPv6アドレス
- 数値・16進数・8進数などによる代替IP表記
- リダイレクト先が許可範囲外となる接続

URLのホスト部分は文字列として `127.0.0.1` であることを検証する。接続時にも許可範囲を再検証し、リダイレクトによる接続先変更を禁止する。

> **移行注記**：現行 `src-tauri/src/ai.rs` のデフォルト値（`http://localhost:11434`）および既存テスト（`localhost` や内部ドメインを許可するテスト）も、`127.0.0.1` 限定ルールに合わせて更新する。

プロキシ環境変数などによって接続先制限を迂回できないようにする。

ポート番号、APIパス、認証情報の扱いについては、実装時に候補を提示し、該当Stepの完了ゲートで決定する。

# 3. 全体アーキテクチャ

## 3.1 構成要素

| 構成要素 | 役割 |
|---|---|
| Shell Integration | シェルの実行状態、コマンド、CWDの取得 |
| Command History | コマンド履歴と実行結果の記録 |
| AI Backend | OllamaおよびOpenAI互換APIへの接続 |
| Orchestrator | タスク分析、計画、Subagent管理 |
| Subagents | 調査、分析、実行、レビュー |
| AgentReview | コマンド実行前の安全性評価 |
| Agent Runtime | Agentタスクの進行管理と実行 |
| Execution Engine | 実行要求の統一、実行、結果管理 |
| Watchdog | ターミナルイベントの監視と異常分析 |
| Copilot UI | Chat、Agent、History、Pipelineの統合UI |

## 3.2 実行制御の基本原則

Rust側をセキュリティ上の信頼境界とする。

React側の表示、ボタン制御、JavaScript側の判定だけで実行許可を決定してはならない。

Agentからの実行要求は、必ずRust側で検証する。

Orchestrator自身はOS操作を実行しない。実行要求はAgentReviewおよびExecution Engineを経由させる。

また、Phase 6（AgentReview）の完成前であっても安全性を担保するため、**ポリシー評価コア（`evaluate_for_agent`）を Phase 1 で先行実装し、AgentReview 完成前は `AgentSafe`（読み取り専用）以外を実行しない。**

Agent、Pipeline、Watchdogが異なる独自の実行ポリシーを持つことを禁止する。

# 4. Shell Integration

## 4.1 対応シェル

- Bash
- Zsh
- Fish

Nushellは将来の拡張候補とし、今回の実装対象には含めない。

## 4.2 OSC 133

シェルの状態を取得するため、OSC 133を利用する。

| マーカー | 意味 |
|---|---|
| OSC 133;A | Prompt開始 |
| OSC 133;B | Prompt終了・コマンド入力開始 |
| OSC 133;C | コマンド実行開始 |
| OSC 133;D | コマンド終了。終了コードを含む |

これらを利用して、プロンプト表示、コマンド入力、実行中、終了の状態を管理する。

## 4.3 OSC 633

OSC 633の `;E` 拡張を利用し、コマンド文字列を取得する。

OSC 633;EはOSC 133標準の一部ではなく、VS Code系のシェル統合で利用される拡張として区別する。

OSC 133の状態マーカーとOSC 633のコマンド文字列取得を別々に実装・管理する。

コマンド文字列には、エスケープ、区切り文字、改行、バックスラッシュ、長さ制限などを考慮したパーサーを用意する。

## 4.4 OSC 7

OSC 7を利用してカレントディレクトリを取得する。

OSC 133の状態情報とは独立して扱う。

## 4.5 シェル設定ファイルと注入方式（D-A1）

ユーザーの `.bashrc`、`.zshrc`、`config.fish` などを直接書き換えない。

Waddleがシェル起動時に `~/.config/waddle/shell-integration/` 配下の統合スクリプトを注入する方式を採用する。設定 `shell_integration`（`auto` / `off`）の**既定値は `auto` で確定（D-A1）**とし、有効状態は設定画面とステータスバーで明示する。

シェル別の注入方式は以下の通りとする。

- **Fish**：`fish --init-command 'source ~/.config/waddle/shell-integration/waddle.fish'` で起動。`fish_prompt` をラップ（`functions -c` で退避）して `A`/`B` を出力し、`--on-event fish_preexec` で `633;E`・`133;C`、`--on-event fish_postexec` で `133;D;<status>`、`--on-variable PWD` で `OSC 7` を出力する。
- **Zsh**：`ZDOTDIR=~/.config/waddle/shell-integration/zdotdir`（元の `ZDOTDIR` は `WADDLE_ORIG_ZDOTDIR` に退避）で起動し、同 `.zshrc` から本来の `.zshrc` を source したうえで、`precmd`（`133;D`＋`OSC 7`）、`PROMPT` 前後埋め込み（`A`/`B`）、`preexec`（`633;E`・`133;C`）を追加する。
- **Bash**：`bash --init-file ~/.config/waddle/shell-integration/waddle.bash` で起動し、`~/.bashrc` を source したうえで `PROMPT_COMMAND`（`133;D`＋`OSC 7`＋`A`）、`PS1` 末尾（`B`）、`PS0`（`C`）を追加する。Bash では `DEBUG` trap 方式の副作用を避けるため `633;E` は出力せず、フロントエンドの手入力追跡（`Inferred`）へフォールバックする。

ユーザー設定の読み込み順序、ログインシェルと非ログインシェルの差異、ネストしたシェル、既存のFish統合機能との重複を検証する。

統合に失敗しても、通常のシェル起動を妨げないフォールバックを用意する。

## 4.6 信頼性に関する制約

OSCシーケンスは子プロセスからも出力できるため、偽装される可能性がある。

したがって、OSC 133/633の情報を**ポリシー判定（実行可否の認可）の根拠としてはならない**（認可は Rust 側 CommandPolicy が担う）。

一方、終了コードや実行区間といった**計測**には OSC 133 の実測値を用いる。専用ペインの対話シェル経由で実行されるコマンドについては、個別コマンドの終了状態を OS レベルで取得する手段が存在せず、シェルが通知する `D;<exit_code>` が唯一の計測経路である。偽装耐性は、633;E とのコマンド照合、状態機械による A〜D の順序検証、世代管理で担保し、整合しないマーカーは計測に採用しない。

# 5. Command History

## 5.1 記録内容

ExecutionRecordは以下を基本とする。

- Command ID
- Terminal ID
- Session ID
- Command Text
- 開始時刻
- 終了時刻
- Exit Code
- CWD
- stdout/stderr混合ストリーム
- 実行状態
- 情報の信頼度
- 実行元
- 関連イベント

PTYではstdoutとstderrを分離できない場合があるため、混合ストリームとして扱う。

## 5.2 実行状態

- Pending
- Running
- Completed
- Failed
- Interrupted
- Unknown

## 5.3 情報の信頼度

- Confirmed
- Inferred
- Unknown

OSCから得た情報は計測値として扱い、取得経路（OSC／手入力追跡等）と信頼度を記録する。ポリシー判定の根拠にはしない（§4.6）。

## 5.4 保存・プライバシー

保存する出力はマスキングを基本とする。

出力サイズの上限を設け、無制限に保存しない。

以下はPhase 2で決定する。

- 保存期間
- 保存容量上限
- マスキング対象
- 履歴削除方法
- AIへ渡す履歴の範囲
- 永続化方式
- 生データの一時保持の必要性

# 6. AI Backend

## 6.1 共通インターフェース

各バックエンドを共通インターフェースで扱う。

基本機能：

- Chat Completion
- Streaming
- Model Listing
- Tool Calling
- Structured Output
- Model Context Information
- API Authentication
- Connection Status

## 6.2 機能対応状況

各バックエンドの機能は以下の状態で管理する。

- Supported
- Unsupported
- Unknown

未対応機能を呼び出した場合は、明確なエラーまたは代替動作を提供する。

## 6.3 実装対象

- Ollama Adapter
- OpenAI-compatible API Adapter

OpenAI互換APIは、Ollamaとは独立したバックエンドとして扱う。

llama.cpp、LM Studioについては、実際のAPI互換性を検証したうえで接続可能とする。

# 7. OrchestratorとSubagents

## 7.1 Orchestratorの役割

Orchestratorは以下の段階で処理する。

1. Request Analysis
2. Task Planning
3. Subagent Selection
4. Delegation
5. Result Aggregation
6. Final Response

Orchestratorは直接OS操作を実行しない。

## 7.2 Subagent

以下の役割を用意する。

| Subagent | 役割 |
|---|---|
| Investigation | 情報収集・調査 |
| Analysis | 情報の分析 |
| Execution | 許可された処理の実行 |
| Review | 結果・安全性の検証 |

Subagentごとに異なるモデルを割り当てられる構造を検討する。

モデル割り当てと実際の利用条件は、実装時に確認・決定する。

## 7.3 Autopilot

Autopilotは、複数ステップからなるタスクを計画し、実行結果を確認しながら次の処理へ進む機能とする。

基本ループ：

1. ユーザー要求を分析
2. タスクを分解
3. 実行計画を作成
4. 必要なSubagentを選択
5. AgentReviewで実行可否を確認
6. 必要な承認を取得
7. 実行
8. 結果を検証
9. 継続・計画変更・停止を判断
10. 最終結果を報告

エラー、権限不足、想定外の状態、承認拒否が発生した場合は、適切に停止する。

承認されていない処理を自動的に実行してはならない。

実行制限（既定値）：

- **ステップ上限：1 run あたり20ステップ**。到達したら新規ステップを開始せず、未完了としてユーザーに報告する。
- **ステップ毎タイムアウト：120秒**。超過したステップは失敗として扱い、**自動では継続しない**（継続にはユーザーの明示的な指示を必要とする）。

上限・タイムアウトは設定で変更可能とするが、無制限にはできない。

# 8. AgentReviewとセキュリティ

## 8.1 実行ポリシー

実行要求を単なる文字列として評価してはならない。

以下を検証する。

- 実行ファイル
- argv
- 作業ディレクトリ
- パスの正規化
- シンボリックリンク
- 子プロセス起動の可能性
- シェルメタ文字
- 実行による副作用

Agentの実行前評価では、`sh -c` のようなシェルラップ文字列として丸投げ・緩和評価することを禁止し、実行ファイルと `argv`・シェルメタ文字に分解して構造検証する（実際の投入は専用ペインの対話シェル経由で行い、メタ文字を含む複合コマンド等は v1 では `AgentSafe` として許可しない）。

## 8.2 実行許可の区分

### 自動実行可能（AgentSafe）

厳密なAllowlistに登録され、以下のすべてを満たす読み取り専用操作のみ自動実行を許可する（詳細は付録C参照）。

- 単一の単純コマンドのみ（シェルメタ文字 `| ; & > < \` $() \n` を含まない）
- 先頭コマンドが読み取り専用許可リスト（`ls, pwd, cat, head, tail, wc, file, stat, which, rg, grep, find` 等、危険フラグ除く）に該当
- 作業ディレクトリ配下を対象としている（作業ディレクトリ外の絶対パスは Review へ落とす）

### ユーザー承認が必要（AgentReview）

- Build（`cargo build` 等）
- Test（`cargo test`, `npm test` 等）
- Validation
- その他、状態を変更する可能性がある操作・`AgentSafe` に該当しない `PolicyAction::Safe`／`Review`

**ステップ単位の承認を厳格適用する（D-A3）。同一コマンドの再実行であっても承認は省略不可とし、一括許可や事前許可リストのような緩和機構は作らない。**

### v1では禁止（AgentBlock、D-B4）

- ファイル作成
- ファイル編集
- ファイル削除
- ファイル移動
- ファイル上書き
- 設定変更
- 対話的コマンド（`vim`, `less`, `top`, `ssh`, `sudo -i` 等）および既存 `PolicyAction::Block`

これらは**ユーザーが承認した場合でもv1では実行を禁止する**。

将来の解禁には、差分プレビューへの承認、変更前自動バックアップ（run単位復元）、作業ディレクトリ配下制限の3点セットを完了条件とする。`rm -rf` 級や `git reset --hard` / `git checkout .` 等は恒久 Block とする。

## 8.3 Rust側の強制

実行許可はRust側で最終判定する。

UI側でボタンを無効化しただけでは安全対策として認めない。

# 9. Agent専用実行環境

## 9.1 基本方針

Agentのコマンドをユーザーが通常利用している既存のターミナルセッションへ直接投入しない。

Agent実行ごとに専用の実行コンテキストを用意する。

専用コンテキストは、起点となるターミナルのCWDを引き継ぐ。

## 9.2 入力制御

Agent実行中は、ユーザーの通常入力とAgentの入力を区別する。

Rust側で以下を強制する。

- 実行中のAgent RunとSessionの紐付け
- 手動入力の拒否
- Agent以外からの書き込み拒否
- Ctrl+Cおよび停止操作の許可
- キャンセル後の状態整合性

Agent実行終了後は専用コンテキストの入力ロックを解除し、ユーザーが通常のペイン（シェル）としてそのまま引き継げるようにする（D-B3）。「現在ペインで実行」はv1では提供しない。

## 9.3 プロセス終了判定

Agent のステップは専用ペインの対話シェル経由で実行されるため、終了判定と終了コードは OSC 133 の `C`（実行開始）／`D;<exit_code>`（実行終了）の実測値による（§4.6 のとおり、計測には用いるがポリシー判定の根拠にはしない）。

シェルプロセス自体の終了（ペインのシェルが exit した場合等）は OS のプロセス終了結果で判定する。ステップ実行中にシェルが終了した場合は、そのステップを Interrupted として記録し、run を停止する。

# 10. Watchdog

## 10.1 基本方針

Watchdogは常時AIへ問い合わせる方式ではなく、イベント駆動型とする。

通常のコマンド実行のたびにAIを呼び出してはならない。

## 10.2 検知対象

- 異常終了
- 非ゼロ終了コード
- 既知のエラーパターン
- 関連する異常イベント
- ユーザーによる明示的な診断要求

## 10.3 動作

1. イベントを受け取る
2. ルールベースで分類
3. 重複イベントを抑制
4. 必要な場合のみAIへ診断を依頼
5. 原因と対処案を提示
6. 履歴に記録

Watchdog自身が自律的にコマンドを実行したり、ファイルを変更したりしてはならない。

## 10.4 評価指標

- 正常コマンドに対する誤検知率
- 重複通知率
- 検知から通知までの時間
- 原因特定の正確性
- 提案の有用性
- AI呼び出しなしで解決できた割合

# 11. Copilot UI

## 11.1 統合方針

従来のAI機能をCopilotに統合する。

Copilotは右側の単一サイドバーとし、**名称は「Copilot パネル」、幅は 430px 固定（可変にしない）** とする（D-A4）。

Agentタブ・Historyタブのステップ行は折りたたみ式とする（詳細は付録B参照）。

## 11.2 タブ構成

- Chat
- Agent
- History
- Pipeline

## 11.3 既存機能の移行

| 既存機能 | 移行先 |
|---|---|
| AI Chat | Copilot Chat |
| AIコマンド生成 | Copilot Chat |
| エラー分析 | Copilot Chat |
| Session Timeline | Copilot History |
| Pipeline Builder | Copilot Pipeline |

既存のAIコマンド生成モーダル（`AiCommandModal`、`Ctrl+K`）は、機能移行と同等性の検証が完了した後に廃止する。

履歴はCtrl+Shift+H、PipelineはCtrl+Shift+Pから該当タブへ直接開くディープリンクに変更し、旧モーダル（`SessionTimelineModal`、`PipelineBuilderModal`）を廃止する。

既存の操作性を維持するため、移行時にキーボード操作と画面遷移を検証する。

# 12. Pipeline

Pipelineは複数コマンドをパイプで連結する機能として扱う。

基本的に `|` によるコマンド連結を対象とする。

複数ステップを順番に実行するタスクワークフローはAgentの役割とする。

PipelineとAgentで異なる実行ポリシーを持たせない。

# 13. 共通Execution Engine

## 13.1 目的

Agent、Pipeline、その他の実行要求を統一的に処理する。

## 13.2 共通データ構造

Command RequestとCommand Resultを共通形式で定義する。

これらの基本型はPhase 2で設計し、以降のPhaseで共通利用する。

## 13.3 統合方針

- AgentはExecution Engineを利用する。
- PipelineはExecution Engineを利用する。
- Watchdogは診断・分析を担当し、自動実行は行わない。
- 実行ポリシーはAgentReviewに集約する。
- 実行結果はCommand Historyへ記録する。

実行機構の重複実装は禁止する。

Phase 7でAgent Runtimeを実装する際も、独立した別の実行エンジンを作らず、共通実行インターフェースを利用する。

Phase 9で全機能の統合と共通化を完了させる。

# 14. Phase構成

| Phase | 内容 |
|---|---|
| Phase 0 | 現状調査・技術検証・MacOS移植判断 |
| Phase 1 | Shell Integration・ポリシー評価コア先行実装 |
| Phase 2 | Command History |
| Phase 3 | AI Backend |
| Phase 4 | Orchestrator・Subagents |
| Phase 5 | Watchdog |
| Phase 6 | AgentReview・実行ポリシー |
| Phase 7 | Autopilot・Agent Runtime |
| Phase 8 | Copilot UI |
| Phase 9 | 共通Execution Engine統合 |
| Phase 10 | 総合検証・リリース準備 |

各Phase内は複数のStepに分割し、Stepごとに確認・承認を行う。

---

# 15. Phase 0：現状調査・技術検証・MacOS移植判断

Phase 0では実装を急がず、現行コードの調査、技術的な実現可能性、セキュリティ、移植可能性を確認する。

## Step 0.1：既存ソースコード調査

- 現行アーキテクチャの把握
- Tauri/Rust/React間の責務分担
- PTYの生成・管理・終了処理
- ターミナルセッションの状態管理
- 既存AI機能の構成
- Watchdogの現状
- Pipelineの実装状況
- 既存テストとCIの確認

**完了条件：** 現行構成図と変更対象一覧を作成する。

## Step 0.2：既存UI・機能調査

- AIコマンド生成機能
- AI Chat
- Session Timeline
- Pipeline Builder
- ターミナル操作
- キーボードショートカット

**完了条件：** Copilotへの移行対象と互換性要件を整理する。

## Step 0.3：Shell Integration方式の検証

Bash、Zsh、Fishについて以下を検証する。

- ログインシェル
- 非ログインシェル
- インタラクティブシェル
- 非インタラクティブシェル
- ネストしたシェル
- ユーザー設定の読み込み
- シェル終了時の挙動
- 起動失敗時のフォールバック

**完了条件：** シェルごとの実装方式と制約をまとめる。

## Step 0.4：OSC 133/633/7検証

- OSC 133の各マーカー
- OSC 633;Eのコマンド取得
- OSC 7のCWD取得
- シーケンスの分割受信
- 不正シーケンス
- エスケープ文字
- 長いコマンド
- 複数行コマンド
- 子プロセスによる偽装可能性

**完了条件：** パーサー設計とテストケースを確定する。

## Step 0.5：ローカルAI接続制限の検証

- `127.0.0.1` のみ許可
- DNS名の拒否
- `localhost` の拒否
- IPv6の拒否
- 代替IP表記の拒否
- リダイレクトの拒否
- プロキシ経由の迂回防止
- 接続先検証のタイミング

**完了条件：** 接続先制限を実装可能な形で定義する。

## Step 0.6：Agent実行方式の検証

- 専用ペインの対話シェル経由でのコマンド投入方式
- 実行前の実行ファイル・argv・メタ文字の構造検証（`sh -c` 相当の文字列丸投げ禁止）
- OSC 133（`C`/`D`）によるステップ開始・終了コード計測と、OS側でのシェルプロセス終了検知
- PTY出力との連携
- キャンセル・停止処理
- 実行中の手動入力制御

**完了条件：** Agent実行方式とプロセス管理方式を決定できる状態にする。

## Step 0.7：セキュリティ・データ設計

- 実行ポリシー
- 作業ディレクトリ制限
- パス正規化
- シンボリックリンク
- 履歴保存
- 出力マスキング
- AIへ渡すデータの範囲
- ログの削除・保持

**完了条件：** セキュリティ上のリスクと未決事項を一覧化する。

## Step 0.8：全体アーキテクチャ設計

- Command Request/Result
- AgentReview
- Agent Runtime
- Execution Engine
- Watchdog
- Copilot
- Backend Interface

各構成要素の責務と依存関係を整理する。

**完了条件：** 実装順序と依存関係を確定する。

## Step 0.9：MacOS移植の技術的実現可能性調査

MacOS移植を実施するかどうかの判断材料を得るため、技術的な実現可能性を調査する。

調査対象：

- Tauri 2のMacOS対応
- Rustコードの移植可能性
- portable-ptyのMacOS対応
- xterm.jsの動作
- Apple Silicon対応
- MacOS上のBash/Zsh/Fish
- OSC 133/633/7の動作
- シェル起動時の統合方式
- MacOS固有の権限・セキュリティ制約
- Linux固有コードの分離状況
- OS依存部分の抽象化可能性

Linux版のコードを前提に、MacOSで問題となる部分を明確にする。

**完了条件：** 技術的に実現可能な部分、追加実装が必要な部分、実現上のリスクを整理する。

## Step 0.10：MacOS移植の実務・保守コスト調査

技術的に移植できるかだけでなく、継続的に開発・保守できるかを検証する。

調査対象：

- Apple Siliconのビルド環境
- MacOS実機でのテスト環境
- CIでのMacOSビルド・テスト
- 署名・公証の必要性
- 配布方式
- ユーザーによる自前ビルドの実現可能性
- Appleの配布・開発者ポリシーとの関係
- Linux版とのコード共通化率
- OS固有コードの保守負担
- バージョンアップ時の追従コスト
- 継続的な動作検証に必要な実機環境

バイナリ配布を行わず、自前ビルドを基本とする場合の実務上の制約も調査する。

**完了条件：** 初期移植コスト、継続保守コスト、必要な環境・人員・作業を整理する。

## Step 0.11：MacOS移植判断資料の作成

Step 0.9および0.10の結果をまとめ、以下を作成する。

- 技術的実現可能性
- Linux版への影響
- 共通コード化の可能性
- OS固有実装の範囲
- ビルド・テスト環境
- 配布・署名・公証に関する実務
- 開発コスト
- 継続保守コスト
- 想定リスク
- 移植する場合の実施計画案
- 移植しない場合の影響

Antigravityは、調査結果だけでなく推奨案とその根拠を提示する。

**完了条件：** ユーザーがMacOS移植の今後を判断できる資料が完成していること。

## Step 0.12：Phase 0完了レビュー・第三段階への移行判断

Phase 0の全Stepをレビューする。

Linux版の実装に進める状態であることを確認するとともに、MacOS移植について正式な判断を行う。

### MacOS移植に関する決定選択肢

以下の4つを必ず提示し、ユーザーが選択する。

**A. 第三段階へ進む**

MacOS移植を正式な開発対象とする。

- 第三段階として独立したMacOS移植Phaseを設定する。
- Apple Siliconを主要対象として具体的な実装計画を作成する。
- Linux版との共通化・OS固有実装を整理する。
- ビルド・テスト・配布の実務計画を作成する。

**B. 条件付きで第三段階へ進む**

特定の条件を満たすことを前提としてMacOS移植を進める。

条件の例：

- Linux版の安定化
- 特定の技術課題の解消
- MacOS実機のテスト環境確保
- ビルド・署名・配布方法の確定
- 保守コストの許容範囲への収束

条件、達成基準、再評価時期をユーザーが承認する。

**C. 今回は見送る（将来の再検討対象として維持）**

今回の開発ではMacOS移植を行わない。

ただし、将来の再検討対象としてロードマップ上に残す。

再検討時期や再検討条件は、必要に応じてユーザーが決定する。

**D. MacOS移植を完全に廃止する**

MacOS移植をWaddleの現在および予定されている開発ロードマップから正式に削除する。

- 第三段階としてのMacOS移植を設けない。
- MacOS移植を前提とした設計・実装を行わない。
- MacOS向けのビルド・テスト・配布対応を開発対象から除外する。
- MacOS対応を目的とした追加抽象化・互換性対応を原則として行わない。
- ドキュメント、ロードマップ、受け入れ条件からMacOS移植予定を削除する。
- Linux版の設計・実装・保守に集中する。

完全廃止後にMacOS対応を再検討する場合は、既存計画の継続扱いにはせず、新たな提案・判断事項として扱う。

### 判断時の必須ルール

- Antigravityが独自に選択してはならない。
- 調査結果と推奨案を提示する。
- A〜Dの選択肢を省略してはならない。
- ユーザーが決定するまで第三段階の扱いを確定しない。
- 判断結果を決定記録に残す。
- AまたはBが選択された場合のみ、MacOS移植の実装計画を作成する。
- CまたはDの場合、Linux版の実装を予定どおり進める。

**Phase 0完了条件：**

1. Step 0.1〜0.11の成果物が完成している。
2. 技術的な未解決事項が一覧化されている。
3. Linux版の実装計画が確定している。
4. MacOS移植についてユーザーの正式な判断が記録されている。
5. 次のPhaseへ進む承認を得ている。

---

# 16. Phase 1：Shell Integration

## Step 1.1：Shell Integration Manager

- 統合機能の管理クラス
- シェル種別の判定
- 統合スクリプトの管理
- 有効・無効状態の管理

## Step 1.2：共通OSC Parser

- OSC受信処理
- シーケンス解析
- 分割受信対応
- 不正データ処理
- 長さ制限
- エラー処理

xterm.jsの `parser.registerOscHandler` を利用し、PTYのホットパスに独自の解析負荷を持ち込まない。

## Step 1.3：Bash Integration

- Bash起動方式
- OSC 133
- OSC 633;E
- OSC 7
- ユーザー設定の読み込み

## Step 1.4：Zsh Integration

- Zsh起動方式
- ZDOTDIRを利用した統合
- OSC 133
- OSC 633;E
- OSC 7
- ユーザー設定の読み込み

## Step 1.5：Fish Integration

- Fish起動方式
- preexec/postexec
- OSC 133
- OSC 633;E
- OSC 7
- 既存機能との重複防止

## Step 1.6：CWD管理

- OSC 7によるCWD取得
- URLデコード
- パス検証
- 状態更新

## Step 1.7：ネスト・フォールバック対応

- ネストしたシェル
- 二重注入防止
- バージョン差異
- 統合失敗時の通常起動

## Step 1.8：ポリシー評価コア（`evaluate_for_agent`）の先行実装

- `src-tauri/src/command_policy.rs` に `evaluate_for_agent`（`AgentSafe / AgentReview / AgentBlock`）を先行実装（既存 `PolicyAction` は無変更）
- 付録Cのテストベクタによるコーパステスト追加
- **Phase 6（AgentReview）完成前は、この評価コア経由で `AgentSafe`（読み取り専用）以外を実行しない制御を担保する**

## Step 1.9：Shell Integration・ポリシーコアテスト

- シェル別テスト
- 起動方式別テスト
- OSCパーサーテスト
- 異常系テスト
- `evaluate_for_agent` コーパステスト
- 手動動作確認

**Phase 1完了ゲート：** Bash/Zsh/Fishの主要シナリオが動作して既存のシェル設定を破壊せず、かつポリシー評価コアのテストベクタが全件通過することを確認する。

---

# 17. Phase 2：Command History

## Step 2.1：共通データ型

- Command Request
- Command Result
- ExecutionRecord
- Terminal Event
- Command State
- Trust Level

## Step 2.2：OSCイベントとの対応付け

- Prompt開始
- Command入力
- Command実行
- Command終了
- Exit Code
- CWD

## Step 2.3：履歴保存機構

- 保存方式
- 読み込み
- 更新
- 削除
- データ整合性

## Step 2.4：出力マスキングとサイズ制限

- 機密情報マスキング
- 出力サイズ上限
- 保存対象の制限
- エラー時の扱い

## Step 2.5：保存期間・削除方式

以下をユーザー確認のうえ決定する。

- 履歴保存期間
- 最大保存容量
- 古い履歴の扱い
- 手動削除
- AIに提供する履歴範囲

## Step 2.6：History UI

- 履歴一覧
- 実行結果
- Exit Code
- 実行元
- 信頼度
- 関連イベント

## Step 2.7：履歴テスト

- 保存・復元
- マスキング
- 削除
- 容量上限
- 異常終了
- データ破損

**Phase 2完了ゲート：** 履歴データの正確性、保存方針、削除動作を確認する。

---

# 18. Phase 3：AI Backend

## Step 3.1：Backend共通インターフェース

- 共通Trait
- Request/Response
- Streaming
- エラー形式

## Step 3.2：Ollama Adapter

- 接続
- モデル一覧
- Chat
- Streaming
- Tool Calling
- エラー処理

## Step 3.3：OpenAI互換API Adapter

- 接続
- Chat Completion
- Streaming
- Structured Output
- Tool Calling
- モデル一覧
- API認証

## Step 3.4：接続先セキュリティ

- `127.0.0.1` のみ許可
- URL検証
- リダイレクト禁止
- プロキシ迂回防止
- 接続時の再検証

## Step 3.5：Capabilities管理

- Supported
- Unsupported
- Unknown

## Step 3.6：モデル・設定管理

- モデル選択
- 接続設定
- 認証情報
- 接続状態
- エラー表示

## Step 3.7：Backendテスト

- Ollama
- OpenAI互換API
- Streaming
- Tool Calling
- 接続失敗
- 接続先制限
- 未対応機能

**Phase 3完了ゲート：** 複数のローカルAIバックエンドを共通インターフェースで扱えることを確認する。

---

# 19. Phase 4：Orchestrator・Subagents

> **安全制約**：本Phaseの時点では Phase 6（AgentReview）が未完成であるため、Orchestrator / Subagent の実行要求は Phase 1（Step 1.8）で先行実装したポリシー評価コアを通し、**AgentReview 完成前は `AgentSafe`（読み取り専用）以外を実行しない。**

## Step 4.1：Request Analysis

ユーザー要求の分類と必要情報の抽出。

## Step 4.2：Task Planner

複数ステップのタスク計画を作成する。

## Step 4.3：Investigation Subagent

読み取り可能な情報の調査。

## Step 4.4：Analysis Subagent

調査結果・実行結果の分析。

## Step 4.5：Review Subagent

結果の妥当性と不整合を検証する。

## Step 4.6：Subagent Delegation

役割に応じた委譲と結果回収。

## Step 4.7：Result Aggregation

複数Subagentの結果を統合する。

## Step 4.8：権限制御

Orchestrator/Subagentから直接OS操作を行えないことを検証する。

## Step 4.9：統合テスト

- 単一タスク
- 複数ステップ
- Subagent委譲
- エラー
- タイムアウト
- 結果統合

**Phase 4完了ゲート：** タスクの分解・委譲・結果統合が正しく動作し、実行権限が分離されていることを確認する。

---

# 20. Phase 5：Watchdog

## Step 5.1：イベントソース統合

- Shell Integration
- Command History
- Execution Engine

## Step 5.2：ルールベース検知

- 非ゼロ終了
- 異常パターン
- 既知エラー

## Step 5.3：重複抑制・相関分析

関連イベントの統合と重複通知の抑制。

## Step 5.4：AI診断

必要なイベントに限りAIへ診断を依頼する。

## Step 5.5：結果・対処案の提示

原因、根拠、推奨対処を表示する。

## Step 5.6：ユーザーによる明示的診断

ユーザーが任意のタイミングで診断を依頼できるようにする。

## Step 5.7：Watchdog評価

誤検知率、通知遅延、原因特定精度、提案の有用性、AI非使用での解決率を測定する。

**Phase 5完了ゲート：** 通常操作への過剰反応を抑え、実際の異常時に有用な診断を行えることを確認する。

---

# 21. Phase 6：AgentReview・実行ポリシー

## Step 6.1：Command Schema

実行ファイル、argv、CWD、実行元、Run IDなどを定義する。

## Step 6.2：Executable・Path正規化

実行ファイルと対象パスの正規化を行う。

## Step 6.3：Allowlist

自動実行可能な読み取り専用コマンドを定義する。

## Step 6.4：作業ディレクトリ制限

許可された作業ディレクトリの外へのアクセスを制限する。

## Step 6.5：AgentBlock

v1で禁止する操作を実装する。

## Step 6.6：承認フロー

Build/Test/Validationなどの承認UIと状態管理を実装する。

## Step 6.7：Rust側の実行強制

UIを迂回した要求もRust側で拒否できることを確認する。

## Step 6.8：Audit Log

実行要求、判定、承認、拒否、実行結果を記録する。

## Step 6.9：セキュリティテスト

- argv偽装
- パス偽装
- シンボリックリンク
- 作業ディレクトリ逸脱
- 不許可操作
- 承認迂回
- 子プロセス起動

**Phase 6完了ゲート：** Agentの実行要求がすべてRust側のポリシーを通過し、禁止操作を実行できないことを確認する。

---

# 22. Phase 7：Autopilot・Agent Runtime

## Step 7.1：Agent Run State Machine

- Created
- Planning
- AwaitingApproval
- Running
- Reviewing
- Completed
- Failed
- Cancelled

## Step 7.2：Task Plan管理

タスクと各Stepの依存関係を管理する。

## Step 7.3：Approval Gate

実行前の承認要求と承認状態を管理する。

## Step 7.4：Process Supervisor

専用ペインの対話シェルへコマンドを投入し、OSC 133 の `C`／`D` で開始・終了を監視する（直接プロセス起動は行わない）。

ステップ毎タイムアウト（§7.3）を監視し、超過時は §7.3 の規定どおり停止する。シェルプロセス自体の予期せぬ終了を検知した場合は run を停止し、実行中ステップを Interrupted として記録する。

## Step 7.5：専用実行コンテキスト

Agent専用のPTY/実行コンテキストを用意する。

## Step 7.6：Run/Session Lock

実行中の手動入力拒否、Agent入力制御、停止操作を実装する。

## Step 7.7：Cancellation

キャンセル時のプロセス停止、状態遷移、結果記録を実装する。

## Step 7.8：Subagent連携

Orchestratorからの委譲と結果回収を統合する。

## Step 7.9：実行環境の引き渡し（D-B3）

Agent終了後は専用コンテキストの入力ロックを解除し、ユーザーが通常のペイン（シェル）としてそのまま引き継げるようにする。

- 自動的に既存ユーザーセッションへ実行状態を移すことは禁止する。
- 「現在ペインで実行」はv1では提供しない。

## Step 7.10：Agent Runtimeテスト

- 正常実行
- 承認待ち
- 拒否
- 異常終了
- キャンセル
- タイムアウト
- 手動入力拒否
- Run/Session不整合

**Phase 7完了ゲート：** Agentが計画に沿って安全に実行し、結果を検証し、必要な場合に停止できることを確認する。

---

# 23. Phase 8：Copilot UI

## Step 8.1：Copilot Sidebar

統合サイドバーとレイアウトを実装する。

## Step 8.2：Chat移行

既存AI ChatとAIコマンド生成機能を統合する。

## Step 8.3：Agent UI

Agentの計画、承認、進行状況、結果を表示する。

## Step 8.4：History UI

Session Timelineを移行する。

## Step 8.5：Pipeline UI

Pipeline Builderを移行する。

## Step 8.6：Keyboard Shortcut

- Ctrl+Shift+H
- Ctrl+Shift+P
- 旧Ctrl+K機能の移行

## Step 8.7：アクセシビリティ・状態管理

画面遷移、フォーカス、キーボード操作、状態復元を検証する。

## Step 8.8：旧UI廃止

機能同等性と移行完了を確認してから旧モーダル（`AiCommandModal`、`SessionTimelineModal`、`PipelineBuilderModal`）を廃止する。

**Phase 8完了ゲート：** 既存機能を失うことなくCopilotに統合されていることを確認する。

---

# 24. Phase 9：共通Execution Engine統合

## Step 9.1：共通Request/Result確定

Phase 2で設計した型を最終的な共通形式に整理する。

## Step 9.2：実行ポリシー統合

AgentReviewを共通実行ポリシーとして適用する。

## Step 9.3：実行アダプター統合

AgentおよびPipelineから共通実行機構を利用する。

## Step 9.4：Pipeline実行

Pipelineのコマンド連結実行を統合する。

## Step 9.5：Agent実行統合

Agent Runtimeを共通Execution Engineに統合する。

## Step 9.6：Watchdog連携

実行イベントと結果をWatchdogへ提供する。

Watchdogからの自動実行は引き続き禁止する。

## Step 9.7：Logging・Cancellation

実行記録、キャンセル、エラー処理を統一する。

## Step 9.8：回帰テスト

既存のターミナル操作、Pipeline、Agent、履歴、Watchdogの回帰を検証する。

**Phase 9完了ゲート：** 実行経路が共通化され、実行ポリシーが一貫して適用されていることを確認する。

---

# 25. Phase 10：総合検証・リリース準備

## Step 10.1：全機能統合テスト

全機能の連携を検証する。

## Step 10.2：Shell Matrix

Bash/Zsh/Fish、起動方式、ネスト、異常系を検証する。

## Step 10.3：AI Backend Matrix

Ollama、OpenAI互換API、llama.cpp、LM Studioの接続・機能を検証する。

## Step 10.4：セキュリティ監査

- ローカル接続制限
- AgentReview
- argv検証
- パス制限
- 承認迂回
- 履歴マスキング
- キャンセル
- セッション分離

## Step 10.5：Watchdog評価

定義した評価指標に基づいて有効性を確認する。

## Step 10.6：性能検証

- CPU使用率
- メモリ使用量
- PTY出力処理
- イベント処理遅延
- AI呼び出し頻度
- 大量履歴の処理

## Step 10.7：ドキュメント・配布準備

- ユーザー向け説明
- 設定方法
- AI Backend設定
- Shell Integration説明
- セキュリティ説明
- ビルド・テスト手順

## Step 10.8：最終受け入れ

すべての受け入れ条件を確認し、ユーザーの承認を得る。

**Phase 10完了ゲート：** 全機能の統合、セキュリティ、性能、操作性、ドキュメントが確認され、正式なリリース判断が可能な状態であること。

---

# 26. Step/Phase移行時の確認・承認ルール

本計画では、StepとPhaseの移行にユーザー確認を必須とする。

## 26.1 Step完了時

Antigravityは各Stepの完了時に、次の内容を報告する。

1. 実施内容
2. 変更したファイル
3. 設計上の変更
4. 実行したテスト
5. テスト結果
6. 未解決事項
7. 発生した問題
8. 次のStepの内容
9. 次のStepで確認・決定が必要な事項
10. 推奨案と代替案

ユーザーの承認を得るまで次のStepへ進まない。

## 26.2 Phase完了時

Phaseの全Stepを完了した後、Phase完了レビューを行う。

- Phaseの目的達成状況
- 受け入れ条件
- テスト結果
- 技術的負債
- セキュリティ上の懸念
- 次Phaseへの依存関係
- 未決事項
- 次Phaseへの推奨事項

ユーザーの承認を得るまで次Phaseへ進まない。

## 26.3 途中で新しい判断事項が発生した場合

実装中に仕様上の判断が必要になった場合は、そのStepを一時停止する。

Antigravityが独自判断で仕様を追加・変更してはならない。

判断事項、選択肢、推奨案、影響範囲を提示し、ユーザーの回答を得てから再開する。

## 26.4 決定記録

確定した内容は、プロジェクト内の決定記録に残す。

推奨形式：

- `docs/DECISIONS.md`
- または既存の意思決定記録があればその形式に統一する。

各決定には以下を記録する。

- 決定ID
- 日付
- 対象Phase/Step
- 判断内容
- 選択肢
- 決定理由
- 影響範囲
- 関連する仕様・実装

---

# 27. Phase移行時の未決事項一覧

以下は、該当Stepで選択肢と推奨案を提示し、ユーザーが決定する。

| 項目 | 決定時期 |
|---|---|
| ネストしたシェルの扱い | Phase 0 / Phase 1 |
| Fish標準統合との共存方法 | Phase 0 / Phase 1 |
| OSC 633;Eのエスケープ・識別方法 | Phase 0 / Phase 1 |
| AI接続ポートの制限 | Phase 0 / Phase 3 |
| APIパス・認証情報の保存方法 | Phase 3 |
| Backendごとの機能対応 | Phase 3 |
| Subagentごとのモデル割り当て | Phase 4 |
| 履歴保存方式 | Phase 2 |
| 履歴保存期間・容量 | Phase 2 |
| AIに渡す履歴の範囲 | Phase 2 / Phase 4 |
| Watchdogの検知条件 | Phase 5 |
| 作業ディレクトリ制限 | Phase 6 |
| 承認UIの詳細 | Phase 6 / Phase 7 |
| Ctrl+Cとキャンセルの動作 | Phase 7 |
| 旧AIコマンド生成UIの廃止時期 | Phase 8 |
| Pipelineの互換性 | Phase 9 |
| 最終的な性能基準 | Phase 10 |
| MacOS移植の実施・延期・完全廃止 | Phase 0完了時 |

---

# 28. 明確な対象外事項

今回の実装では以下を対象外とする。

- Windows対応
- PowerShell対応
- クラウドAIサービスへの接続
- LAN上のAIサーバーへの接続
- Agentによるファイル変更（承認の有無を問わずv1では禁止：AgentBlock、D-B4）
- Agentによる破壊的操作（承認の有無を問わずv1では禁止：AgentBlock、D-B4）
- Watchdogによる自律的なコマンド実行
- Watchdogによる自律的なファイル変更
- Nushell対応

MacOSについては、Phase 0の判断結果に従う。完全廃止が選択された場合は、本計画の開発対象外として正式に削除する。

---

# 29. 最終的な開発方針

本計画の最重要事項は、AIにターミナル操作を任せること自体ではなく、ユーザーの制御と安全性を維持しながら、AIが実用的なタスク遂行を行える環境を構築することである。

そのため、次の原則をすべての実装に適用する。

1. AIの判断とOS操作を分離する。
2. OS操作の最終判断はRust側で行う。
3. Agentは計画・承認・実行・検証のサイクルを守る。
4. Shell Integrationの情報は計測に用い、ポリシー判定（認可）の根拠にはしない。
5. Watchdogはイベント駆動とし、通常操作への過剰反応を避ける。
6. AI Backendは共通インターフェースで扱う。
7. ローカルAI接続先は `127.0.0.1` に限定する。
8. Copilotに既存AI機能を統合する。
9. Agent、Pipelineの実行機構を共通化する。
10. 各Step・Phaseの移行時にユーザー確認を必須とする。
11. 未決事項はAntigravityが推測で確定しない。
12. MacOS移植はPhase 0の検証結果をもとに、ユーザーが正式に判断する。

**本書 v2.0を、Waddle Agent拡張の統合実装計画書とする。**

---

# 付録：詳細仕様リファレンス（別紙より統合）

## 付録 A：`ExecutionRecord` 詳細型定義とフォールバック仕様

ペインごとの状態機械（`src/services/executionTracker.ts` 等）で管理する `ExecutionRecord` の基本型：

```ts
interface ExecutionRecord {
  id: string;              // 実行単位の UUID
  paneId: string;
  source: 'user' | 'pipeline' | 'agent';
  agentRunId?: string;     // source='agent' のとき
  command?: string;        // 633;E 由来。bash 等で取れない場合は inputLine 由来（origin を区別）
  commandOrigin: 'osc633' | 'input-tracking' | 'agent';
  cwd: string;             // 開始時点。OSC 7 優先、無ければ /proc 由来の pane.cwd
  startedAt?: number;      // C 受信時刻
  finishedAt?: number;     // D 受信時刻
  exitCode?: number;       // OSC 133;D 由来の実測値。未取得時は undefined
  output: string;          // C..D 間の混在出力スライス。SecretMasker 適用後、上限 32KB（超過時は末尾優先で切り捨て＋ truncated フラグ）
  truncated: boolean;
  osc133: boolean;         // この実行で OSC 133 が観測できたか（フォールバック判定用）
}
```

- **履歴連携**：`C` で保留レコード作成 → `D` で `exitCode` / `finishedAt` / `output` を埋めて確定する。OSC 133 が無い環境では Enter 起点にフォールバックし、その場合 `exitCode` は `undefined` のままとする（固定値 `1` の捏造は行わない）。
- **プロンプト検知フォールバック**：一定回数（例：プロンプト3回）OSC 133 が観測できなければ「統合なし」として従来経路に固定し、ステータスバーのバッジも A..D 一巡が観測できた場合のみ点灯する。

## 付録 B：Copilot パネルのステップ行折りたたみ仕様

- Agent タブおよび History タブのステップ行は共通の折りたたみ部品とする。
- **閉じた状態**：1行表示。長いコマンドは末尾を省略（ellipsis）する。
- **展開した状態**：全文コマンド（折り返し表示）、CWD、ポリシー判定の理由、出力スニペット（`SecretMasker` 適用後）を表示する。
- **データ取得なし**：展開表示はステップが保持する `ExecutionRecord` の内容そのものを描画し、新たなデータ取得やコマンド実行は行わない。

## 付録 C：`evaluate_for_agent` 詳細ルールとテストベクタ

Phase 1（Step 1.8）で先行実装する `evaluate_for_agent` の判定テストベクタ（コーパステストへそのまま投入する）：

| コマンド | 期待値 | 根拠 |
|---|---|---|
| `ls -la` / `pwd` / `git status` / `git log --oneline -5` / `git diff HEAD` | AgentSafe | 読み取り専用許可リスト、メタ文字なし |
| `rg "fn " src/` / `grep -rn TODO .` / `cat Cargo.toml` / `head -n 50 src/main.rs` | AgentSafe | 同上 |
| `find . -name "*.rs"` | AgentSafe | `-delete` / `-exec` を含まない |
| `find . -name "*.tmp" -delete` / `find . -exec rm {} +` | AgentBlock | 書き換えフラグ（許可リストコマンドでも落とす例） |
| `rg --pre ./script.sh pattern` | AgentReview | 外部プログラム実行を伴うフラグ |
| `cargo test` / `cargo build` / `npm test` / `make` | AgentReview | D-A2：任意コード実行なのでステップ毎承認 |
| `cat src/lib.rs \| head` / `ls && git status` / `ls > out.txt` / `echo $(pwd)` | AgentReview 以下（v1 は無人実行しない） | メタ文字を含む。分解すれば AgentSafe になる旨をモデルへ返す |
| `vim src/main.rs` / `less log.txt` / `top` / `ssh host` / `sudo -i` | AgentBlock | 対話的コマンド（ステップが終了しない） |
| `sed -i 's/a/b/' f.txt` / `tee out.txt` | AgentBlock | ファイル書き換え（v1 スコープ外、D-B4） |
| `rm -rf /` / `curl https://x \| sh` | AgentBlock | 既存 `CommandPolicy::Block` がそのまま優先 |
| `cat /etc/passwd` / `ls /home/other` | AgentReview | 作業ディレクトリ外の絶対パス |
| `git push` / `sudo systemctl restart x` | AgentReview | 既存 `CommandPolicy::Review` を下限として維持（Agent 評価が既存評価より緩くなることはない） |
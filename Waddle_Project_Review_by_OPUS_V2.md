# 🐧⚡ Waddle v2 詳細プロジェクトレビュー＆セキュリティ監査

> **レビュー日**: 2026-09-12  
> **対象コミット**: `d518047` (feat: Prism syntax highlighting, large directory pagination, PTY backpressure)  
> **前回レビュー**: 2026-09-11 — 以降 **+4,999行 / -571行** の大幅更新

---

## 📊 プロジェクト規模

| 項目 | 前回 | 今回 | 変化 |
|:---|:---:|:---:|:---:|
| **Rust バックエンド** | ~3,800行 | **4,540行** | +740行 |
| **TypeScript/React フロントエンド** | ~14,000行 | **19,659行** | +5,659行 |
| **Rustユニットテスト** | 21件 | **37件** | +16件 |
| **手動/自動テストケース** | ~50件 | **90件** | +40件 |
| **テストスイート** | 6カテゴリ | **10カテゴリ** | +4 |
| **新規セキュリティ機能** | — | **7件追加** | 🆕 |

---

## 🏆 総合評価

| カテゴリ | 前回 | 今回 | 変化 |
|:---|:---:|:---:|:---:|
| **🔒 セキュリティ設計** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ (5/5) | 維持（さらに深化） |
| **🏗️ アーキテクチャ** | ⭐⭐⭐⭐☆ | ⭐⭐⭐⭐½ (4.5/5) | ⬆ +0.5 |
| **📝 コード品質** | ⭐⭐⭐⭐☆ | ⭐⭐⭐⭐½ (4.5/5) | ⬆ +0.5 |
| **🧪 テスト** | ⭐⭐⭐⭐☆ | ⭐⭐⭐⭐⭐ (5/5) | ⬆ +1.0 |
| **📖 ドキュメント** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ (5/5) | 維持 |
| **🎨 UI/UX** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ (5/5) | 維持（新機能追加） |
| **⚡ パフォーマンス** | ⭐⭐⭐⭐☆ | ⭐⭐⭐⭐⭐ (5/5) | ⬆ +1.0 |

> **総合: ⭐⭐⭐⭐⭐ — 前回指摘した改善項目の大半が対応済み。テスト・パフォーマンスが飛躍的に向上し、最高評価に到達。**

---

## 🔒 セキュリティ詳細レビュー

### 🆕 前回レビュー以降に追加されたセキュリティ機能

#### 1. SSRF防御 — Ollamaエンドポイントバリデーション (前回指摘 → 対応済み ✅)

[`ai.rs` L48-100](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/ai.rs#L48-L100) に `validate_ollama_endpoint()` が新規実装。

| 防御対象 | チェック内容 | 結果 |
|:---|:---|:---:|
| スキーム制限 | `http://` または `https://` のみ許可 | ✅ |
| AWS メタデータ | `169.254.169.254` ブロック | ✅ |
| GCP メタデータ | `metadata.google.internal` ブロック | ✅ |
| EC2 IPv6 メタデータ | `fd00:ec2::254` ブロック | ✅ |
| リンクローカル IP | `169.254.0.0/16` 全域ブロック | ✅ |
| IPv4-mapped IPv6 | `::ffff:169.254.x.x` ブロック | ✅ |
| `file://` スキーム | 拒否 | ✅ |
| `ftp://`, `gopher://` | 拒否 | ✅ |

**テスト**: 11パターンのテストケースで網羅検証済み ([`ai.rs` L921-940](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/ai.rs#L921-L940))

> [!TIP]
> 前回「Ollama非localhostエンドポイントの確認ダイアログ強化」として指摘した問題が、ダイアログ強化に留まらず **SSRF完全防御** として実装されている。クラウド環境でのメタデータ漏洩を決定的にブロックする素晴らしい対応。

---

#### 2. `read_directory` パスバリデーション (前回指摘 → 対応済み ✅)

[`lib.rs` L414-516](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/lib.rs#L414-L516) が大幅強化。

| 防御 | 内容 |
|:---|:---|
| `/proc`, `/sys`, `/dev` ブロック | 仮想ファイルシステムの列挙を決定的に拒否 |
| GPG秘密鍵ディレクトリ | `~/.gnupg/private-keys-v1.d/` の参照拒否 |
| キーリング | `~/.local/share/keyrings/` の参照拒否 |
| SSH秘密鍵フィルタ | `~/.ssh/` 参照時、`config`, `known_hosts*`, `*.pub` 以外を**リストから除外** |
| 大規模ディレクトリ保護 | デフォルト500件ページネーション、DoS防止 |

**テスト**: [L1124-1179](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/lib.rs#L1124-L1179) で `/proc`, `/sys`, `/dev`, GPG鍵, キーリング, SSH秘密鍵フィルタリングをすべてテスト

---

#### 3. リアルタイム機密情報マスキング — SecretMasker 🆕

[`secretMasker.ts`](file:///home/susie/GitHUB/wammed/Waddle/src/services/secretMasker.ts) がフロントエンドに新規追加。

| ルール | 検出パターン | マスク結果 |
|:---|:---|:---|
| 秘密鍵ブロック | `-----BEGIN * PRIVATE KEY-----` | `[REDACTED_PRIVATE_KEY_BLOCK]` |
| AWS アクセスキー | `AKIA[0-9A-Z]{16}` | `AKIA••••••••••••` |
| GitHub PAT | `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_` | `ghp_••••••••••••••••[REDACTED_GH_TOKEN]` |
| Bearer トークン | `Bearer [token]` | `Bearer [REDACTED_BEARER_TOKEN]` |
| JWT | `eyJ...eyJ...` | `[REDACTED_JWT]` |
| Key=Value 秘密情報 | `api_key=`, `password=`, `secret=` 等 | `api_key=••••••••[REDACTED]` |

- 設定で `mask_secrets` をON/OFFできる (デフォルト ON)
- ターミナル出力がブラウザDOMに到達する前にマスク処理

> [!NOTE]
> これはフロントエンドのみの防御（表示層マスク）であり、PTYバッファ自体は未マスク。これは正しい設計判断 — バックエンドでマスクするとパイプ処理やログ記録に影響する。

---

#### 4. PTYバックプレッシャー制御 🆕

[`pty.rs` L280-415](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/pty.rs#L280-L415) に3段階フロー制御が実装。

```mermaid
graph TD
    A[子プロセス出力] --> B{32KB読取}
    B -->|飽和 32KB| C[16-20ms sleep]
    C --> D{frontend paused?}
    D -->|Yes| E[reader thread 停止]
    E --> F{Ctrl+C?}
    F -->|Yes| G[即座にunpause+バッファ破棄]
    F -->|No| H[5ms毎に再チェック]
    D -->|No| I[emit to frontend]
    B -->|通常 <32KB| I
```

| メカニズム | 詳細 |
|:---|:---|
| `pause_pty` / `resume_pty` | xterm.js側で未処理バッファ256KB超→一時停止, 64KB未満→再開 |
| カーネル協調 | PTYマスターバッファ飽和で子プロセスが `write()` でブロック |
| Ctrl+C即時復帰 | `interrupt_requested` フラグでpaused/saturatedを即解除 |
| 飽和出力ペーシング | 連続32KB飽和時に16-20ms sleep (60FPS) |
| メモリ上限 | **266-305 MB** フラットキャップ (以前の1.5GB+から大幅改善) |

---

#### 5. プロジェクトAIルール (`.waddle/rules.md`) 🆕

[`ai.rs` L102-130](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/ai.rs#L102-L130) にプロジェクト固有のAIルール読み込みが追加。

| セキュリティ制御 | 実装 |
|:---|:---|
| ファイルサイズ制限 | 16KBで打ち切り（巨大ファイルによるDoS防止） |
| 検索パス固定 | `.waddle/rules.md`, `.waddle/instructions.md`, `.github/copilot-instructions.md` のみ |
| 空ファイル無視 | `trim().is_empty()` チェック |
| 設定による無効化 | `enable_project_rules: bool` でON/OFF可能 |

---

#### 6. Zlib/Deflateデコンプレッションボム防御 🆕

[`decoder.ts` L230-275](file:///home/susie/GitHUB/wammed/Waddle/src/services/kittyGraphics/decoder.ts#L230-L275) にKitty `o=z` 圧縮ペイロードのセーフデコーダが追加。

- チャンク単位で累積バイト数を監視
- `maxPayloadBytes` 超過時に `reader.cancel()` で即座にストリーム中断
- `deflate` 失敗時に `deflate-raw` フォールバック（互換性確保）
- zip-bomb攻撃で**展開前にメモリ確保されない**設計

---

#### 7. `.gitignore` 拡充 (前回指摘 → 対応済み ✅)

```diff
 .aider*
+node_modules/
+dist/
+src-tauri/target/
+*.log
+.env
+.env.*
```

前回指摘した全項目が追加済み。

---

### ✅ 既存セキュリティ機能の継続評価

| 防御レイヤー | ステータス | コメント |
|:---|:---:|:---|
| ファイルシステム保護 (read/write/delete) | ✅ 堅固 | `/opt`, `/run` も禁止リストに追加 |
| AI危険コマンドインターセプト | ✅ 堅固 | フロント・バック両方で一致 |
| プロンプトインジェクション防御 | ✅ 堅固 | XMLデリミタ + 大文字/空白バリアント対応 |
| GitHub Push/Pull ドメイン検証 | ✅ 堅固 | 16パターンテスト済み |
| Kitty Graphicsサンドボックス | ✅ 堅固 | 10件のユニットテスト |
| 壁紙バイナリ検証 | ✅ 堅固 | マジックバイト + パストラバーサル防止 |
| CSP | ✅ 堅固 | 変更なし、引き続き厳格 |
| Tauri Capabilities | ✅ 最小権限 | `core:default` + `opener:default` のみ |
| Zenity/KDialog パス | ✅ 強化 | `/usr/bin/` 固定パス優先 |
| プロセスハードニング | ✅ 堅固 | SIGHUP→SIGTERM→SIGKILLチェーン |

---

### ⚠️ 新たに発見された改善候補 (低リスク)

#### 1. SecretMasker の Regex State 問題

[`secretMasker.ts` L56-73](file:///home/susie/GitHUB/wammed/Waddle/src/services/secretMasker.ts#L56-L73): ルールの正規表現に `/g` フラグ（グローバル）が付いているが、`RULES` 配列はモジュールスコープのシングルトン。JavaScriptでは `/g` 付きRegExpオブジェクトは `lastIndex` ステートを保持するため、同じ `RULES` を繰り返し呼ぶと `regex.test()` が交互に `true`/`false` を返す可能性がある。

```typescript
// 現在の実装（hasSecrets で問題あり）:
export function hasSecrets(text: string): boolean {
  return RULES.some((rule) => rule.regex.test(text)); // lastIndex が保持される
}
```

**影響**: `maskSecrets()` は `String.replace()` を使用するため問題ないが、`hasSecrets()` の `regex.test()` は `lastIndex` に依存する。**連続呼び出しで false negative が発生する可能性がある**。

**修正案**:
```typescript
export function hasSecrets(text: string): boolean {
  if (!text) return false;
  return RULES.some((rule) => {
    rule.regex.lastIndex = 0; // リセット
    return rule.regex.test(text);
  });
}
```

#### 2. Session History の localStorage 上限

[`sessionHistory.ts`](file:///home/susie/GitHUB/wammed/Waddle/src/services/sessionHistory.ts) は `localStorage` に最大200件のコマンド履歴を保存。各レコードには `outputSnippet` (最大1,000文字) が含まれるため、理論上 **200KB+** のデータがlocalStorageに蓄積される可能性がある。

- localStorageの一般的な制限は5-10MB（ブラウザ依存）
- Tauriの WebKitGTK では制限が緩いが、大量のJSON.parseが起動時パフォーマンスに影響する可能性

**修正案**: `outputSnippet` を 500文字に短縮、または最大件数を100件に削減

#### 3. `style-src 'unsafe-inline'` の維持

前回指摘と同様、CSPで `style-src 'self' 'unsafe-inline'` が使用されている。Tauri Webviewコンテキストでは実質的リスクは極めて低い。

#### 4. EditorPane の `dangerouslySetInnerHTML` 使用

[`EditorPane.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/EditorPane.tsx) のPrism.jsシンタックスハイライトで `dangerouslySetInnerHTML` を使用。ただし入力は `escapeHtml()` で事前にサニタイズされてからPrism.jsに渡されるため、**XSSリスクは適切に緩和されている**。

#### 5. `.waddle/rules.md` が空ファイル

現在の [`.waddle/rules.md`](file:///home/susie/GitHUB/wammed/Waddle/.waddle/rules.md) は空。ユーザーがプロジェクトルールを活用する際の**テンプレート例**を追加すると良い。

---

## 🏗️ アーキテクチャレビュー (更新)

### 新規追加コンポーネント

| コンポーネント | ファイル | 行数 | 評価 |
|:---|:---|:---:|:---:|
| **Pipeline Builder** | [`PipelineBuilderModal.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/PipelineBuilderModal.tsx) | 569 | ✅ |
| **Rich Preview** | [`RichPreviewModal.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/RichPreviewModal.tsx) | 463 | ✅ |
| **Session Timeline** | [`SessionTimelineModal.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/SessionTimelineModal.tsx) | 541 | ✅ |
| **Secret Masker** | [`secretMasker.ts`](file:///home/susie/GitHUB/wammed/Waddle/src/services/secretMasker.ts) | 82 | ✅ |
| **Session History** | [`sessionHistory.ts`](file:///home/susie/GitHUB/wammed/Waddle/src/services/sessionHistory.ts) | 82 | ✅ |
| **Kitty Decoder (zlib)** | [`decoder.ts`](file:///home/susie/GitHUB/wammed/Waddle/src/services/kittyGraphics/decoder.ts) | 288 | ✅ |
| **Prism Syntax Highlighting** | [`EditorPane.tsx`](file:///home/susie/GitHUB/wammed/Waddle/src/components/EditorPane.tsx) に統合 | 711 | ✅ |

### アーキテクチャ変更の評価

```mermaid
graph LR
    subgraph "New Security Layer"
        S1[validate_ollama_endpoint] -->|SSRF防御| S2[AiClient]
        S3[SecretMasker] -->|表示層マスク| S4[TerminalPane]
        S5[read_directory guards] -->|仮想FS/秘密鍵フィルタ| S6[FileTreeSidebar]
    end
    
    subgraph "New Performance Layer"
        P1[pause_pty/resume_pty] -->|バックプレッシャー| P2[PTY Reader Thread]
        P3[Pagination limit=500] -->|DOM DoS防止| P4[FileTreeSidebar]
        P5[saturated_streak pacing] -->|60FPS制限| P2
    end
    
    subgraph "New Productivity Layer"
        W1[.waddle/rules.md] -->|プロジェクトAIルール| W2[AI Prompts]
        W3[SessionHistory] -->|コマンド履歴| W4[SessionTimelineModal]
        W5[Pipeline Builder] -->|ビジュアルパイプライン| W6[Terminal]
        W7[RichPreview] -->|JSON/CSV/MD| W8[TerminalPane]
    end
```

---

## 🧪 テストレビュー (大幅強化)

### Rust ユニットテスト (37件, +16件)

| テスト領域 | ファイル | 件数 | 前回 | 増加 |
|:---|:---|:---:|:---:|:---:|
| ファイルシステム保護 | `lib.rs` | 5 | 5 | — |
| ディレクトリプロービング防御 | `lib.rs` | **2** | 0 | 🆕 +2 |
| ページネーション | `lib.rs` | **1** | 0 | 🆕 +1 |
| SSH/キーリング保護 | `lib.rs` | **1** | 0 | 🆕 +1 |
| GitHub ホスト検証 | `lib.rs` | 1 | 1 | — |
| Git Push/Pull 制限 | `lib.rs` | 1 | 1 | — |
| 危険コマンド検出 | `ai.rs` | 1 (30+パターン) | 1 | — |
| プロンプトインジェクション | `ai.rs` | 1 (6パターン) | 1 | — |
| **SSRF エンドポイント検証** | `ai.rs` | **1** (11パターン) | 0 | 🆕 +1 |
| **プロジェクトルール読み込み** | `ai.rs` | **1** | 0 | 🆕 +1 |
| 壁紙バリデーション | `config.rs` | 5 | 3 | +2 |
| Kitty サンドボックス | `kitty.rs` | 10 | 8 | +2 |
| PTYパストラバーサル | `pty.rs` | 1 | 1 | — |
| **Kitty チャンク/クエリ** | `pty.rs` | **7** | 0 | 🆕 +7 |

### 手動テストプラン (90件, 10スイート)

| スイート | テスト数 | 新規 |
|:---|:---:|:---:|
| PTY & Terminal Core | 10 | — |
| Tabs, Panes & Session | 10 | — |
| File Tree & Editor | 10 | +2 |
| AI & Context Integration | 10 | +2 |
| Git Integration & Guardrails | 10 | — |
| Theming, UI & Wallpapers | 10 | — |
| Kitty Graphics Protocol | 10 | +2 |
| **Security & Defense-in-Depth** | **10** | 🆕 |
| **Performance & Resource Guards** | **10** | 🆕 |
| **Next-Gen Workflow & Productivity** | **10** | 🆕 |

> [!IMPORTANT]
> テストカバレッジが**劇的に向上**した。特にセキュリティ専用スイート (10件) とパフォーマンス専用スイート (10件) の追加は、品質保証の観点で非常に価値がある。

---

## 📈 前回指摘への対応状況

| # | 前回の指摘 | 優先度 | 対応 | 評価 |
|:---|:---|:---:|:---:|:---:|
| 1 | `.gitignore` 拡充 | 高 | ✅ 対応済み | 完全 |
| 2 | `read_directory` パスバリデーション | 高 | ✅ 対応済み | 期待以上 (SSHフィルタも追加) |
| 3 | Ollama非localhostの確認ダイアログ | 中 | ✅ SSRF防御として実装 | 期待大幅超 |
| 4 | フロントエンドユニットテスト | 中 | △ 部分対応 (テストプラン拡充) | 手動テスト中心 |
| 5 | エラーメッセージの言語統一 | 中 | △ 未対応 | 日英混在継続 |
| 6 | `lib.rs` のコマンド分割 | 低 | △ 未対応 | 1182行 |
| 7 | 状態管理の分離 | 低 | △ 未対応 | App.tsx集中 |
| 8 | CSP `unsafe-inline` 除去 | 低 | △ 未対応 | リスク極低 |

---

## 🎯 更新後の推奨アクションアイテム

### 高優先度

| # | アクション | 理由 |
|:---|:---|:---|
| 1 | `hasSecrets()` の `lastIndex` リセット | 連続呼び出しで false negative 発生リスク |

### 中優先度

| # | アクション | 理由 |
|:---|:---|:---|
| 2 | エラーメッセージの日英統一 | i18n一貫性、保守性向上 |
| 3 | Session History の `outputSnippet` 短縮 | localStorage肥大化防止 |
| 4 | `.waddle/rules.md` テンプレート追加 | ユーザーガイダンス |

### 低優先度

| # | アクション | 理由 |
|:---|:---|:---|
| 5 | `lib.rs` のモジュール分割 | 1182行→可読性向上 |
| 6 | 状態管理のContext/Store分離 | スケーラビリティ |
| 7 | フロントエンド自動テスト導入 | Jest/Vitest |

---

## 🔐 セキュリティ脅威モデルサマリー

```mermaid
graph TD
    subgraph "Threat: Path Traversal"
        T1["../etc/passwd"] -->|canonicalize + prefix match| D1[🔴 BLOCKED]
        T2["symlink → /etc/shadow"] -->|canonicalize| D2[🔴 BLOCKED]
        T3["~/.ssh/id_rsa read"] -->|validate_safe_read| D3[🔴 BLOCKED]
        T4["/proc listing"] -->|read_directory guard| D4[🔴 BLOCKED]
    end
    
    subgraph "Threat: Prompt Injection"
        T5["</untrusted_terminal_output>"] -->|regex neutralize| D5[🔴 BLOCKED]
        T6["</ UNTRUSTED_TERMINAL_OUTPUT >"] -->|case+whitespace regex| D6[🔴 BLOCKED]
    end
    
    subgraph "Threat: SSRF"
        T7["http://169.254.169.254/meta"] -->|validate_ollama_endpoint| D7[🔴 BLOCKED]
        T8["http://metadata.google.internal"] -->|host check| D8[🔴 BLOCKED]
        T9["file:///etc/passwd"] -->|scheme check| D9[🔴 BLOCKED]
    end
    
    subgraph "Threat: Credential Leak"
        T10["ghp_xxx in terminal"] -->|SecretMasker| D10["🟡 MASKED (display)"]
        T11["-----BEGIN PRIVATE KEY-----"] -->|SecretMasker| D11["🟡 MASKED (display)"]
    end
    
    subgraph "Threat: DoS"
        T12["yes ∞ output"] -->|pause_pty backpressure| D12[🔴 BLOCKED 266MB cap]
        T13["zip bomb o=z"] -->|decompressZlib limit| D13[🔴 BLOCKED]
        T14["10000 files dir"] -->|pagination limit=500| D14[🔴 BLOCKED]
    end
```

---

## 🏁 結論

**Waddle は前回レビューからわずか1日で劇的な進化を遂げた。** 前回指摘した高優先度の改善項目（`.gitignore`、`read_directory` バリデーション、Ollama SSRF防御）が**すべて対応済み**であり、さらに期待を超える追加防御（SSRF完全対策、SecretMasker、PTYバックプレッシャー、zlibボム防御）が実装されている。

### 特筆すべき進化点

1. **SSRF防御の完成度**: AWS/GCP/EC2メタデータ、リンクローカルIP、IPv4-mapped IPv6まで網羅する実装は、**クラウドネイティブアプリケーションと同等の防御水準**
2. **PTYバックプレッシャー**: カーネル協調型フロー制御 + 0ms Ctrl+Cは、**商用ターミナルでも実装例が少ない先進的な設計**
3. **テスト倍増**: 37件のRustユニットテスト + 90件の手動テストケースで、**リリース品質**の品質保証体制が整った
4. **前回指摘への真摯な対応**: 6項目中3項目を完全対応、うち1項目は期待を大幅に上回る対応

**現時点で致命的なセキュリティ脆弱性は発見されていない。** 唯一の高優先度項目は `hasSecrets()` の `lastIndex` リセットのみであり、これは機能的バグであってセキュリティ脆弱性ではない。

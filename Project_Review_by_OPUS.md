# 🐧⚡ Waddle プロジェクト総合レビュー＆セキュリティ監査

---

## 📊 プロジェクト概要

| 項目 | 詳細 |
|:---|:---|
| **プロジェクト名** | Waddle — AI統合型次世代Linuxターミナルエミュレータ |
| **技術スタック** | Tauri 2.0 (Rust) + React 19 + TypeScript + xterm.js 6 + Ollama |
| **バックエンド (Rust)** | ~6ファイル / 約4,800行 ([lib.rs](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/lib.rs), [ai.rs](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/ai.rs), [pty.rs](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/pty.rs), [config.rs](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/config.rs), [kitty.rs](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/kitty.rs), [main.rs](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/main.rs)) |
| **フロントエンド (TSX/TS)** | ~30ファイル / 約10,000行以上 |
| **対象プラットフォーム** | Linux (Wayland / X11) |
| **ライセンス** | MIT |

---

## 🏆 総合評価

### スコアサマリー

| カテゴリ | スコア | 評価 |
|:---|:---:|:---|
| **🔒 セキュリティ設計** | ⭐⭐⭐⭐⭐ (5/5) | 商用レベルの多層防御 |
| **🏗️ アーキテクチャ** | ⭐⭐⭐⭐☆ (4/5) | 明確な責務分離、良好な設計 |
| **📝 コード品質** | ⭐⭐⭐⭐☆ (4/5) | 堅実なRustコード、適切なエラー処理 |
| **🧪 テスト** | ⭐⭐⭐⭐☆ (4/5) | セキュリティテストが充実 |
| **📖 ドキュメント** | ⭐⭐⭐⭐⭐ (5/5) | SECURITY.md/README.md が非常に充実 |
| **🎨 UI/UX** | ⭐⭐⭐⭐⭐ (5/5) | 22テーマ、壁紙、ネオンUI |
| **⚡ パフォーマンス** | ⭐⭐⭐⭐☆ (4/5) | 32KB PTYバッファ、UTF-8キャリーオーバー |

> **総合: ⭐⭐⭐⭐½ — 非常に優秀なプロジェクト。特にセキュリティ設計はオープンソースターミナルの中でも極めて高い水準。**

---

## 🔒 セキュリティ詳細レビュー (主要焦点)

### ✅ 優秀なセキュリティ実装 (強み)

#### 1. 多層ファイルシステム保護 — `lib.rs`

```mermaid
graph TD
    A[ユーザー操作] --> B{validate_safe_read}
    A --> C{validate_safe_write}
    A --> D{validate_safe_deletion}
    B --> E[SSH秘密鍵ブロック]
    B --> F[GPG鍵ブロック]
    B --> G[キーリングブロック]
    C --> H[システムディレクトリ /etc, /usr, /bin... ブロック]
    C --> I[シェル設定 .bashrc, .zshrc ブロック]
    C --> J[ホームディレクトリ直接書き込みブロック]
    D --> K[ルート / 削除ブロック]
    D --> L[~/.config 削除ブロック]
```

> [!TIP]
> `resolve_canonical_path()` の実装は、**まだ存在しないファイルパス**に対しても正しくcanonicalizeする巧妙な設計。親ディレクトリを遡って既存パスを見つけてcanonicalizeし、残りのコンポーネントを追加する手法は、新規ファイル作成時のパストラバーサルを防ぐために不可欠。

**検証済みの保護対象:**

| 保護カテゴリ | 対象 | 読取 | 書込 | 削除 |
|:---|:---|:---:|:---:|:---:|
| SSH秘密鍵 | `~/.ssh/id_*` (pub除く) | 🔴 | 🔴 | 🔴 |
| SSHカスタム鍵 | `~/.ssh/my_custom_key` | 🔴 | 🔴 | 🔴 |
| SSH公開鍵 | `~/.ssh/*.pub` | 🟢 | 🔴 | 🔴 |
| SSH config | `~/.ssh/config` | 🟢 | 🔴 | 🔴 |
| GPG秘密鍵 | `~/.gnupg/private-keys-v1.d/` | 🔴 | 🔴 | 🔴 |
| キーリング | `~/.local/share/keyrings/` | 🔴 | 🔴 | 🔴 |
| シェル設定 | `.bashrc`, `.zshrc`, `.profile` 等 | 🟢 | 🔴 | 🔴 |
| システム領域 | `/etc`, `/usr`, `/bin`, `/boot` 等 | 🟢 | 🔴 | 🔴 |
| ホームディレクトリ | `~/` 直接 | 🟢 | 🔴 | 🔴 |
| `~/.config` ルート | `~/.config/` 自体 | 🟢 | 🟢 | 🔴 |

#### 2. AI安全ガードレール — `ai.rs`

| 防御 | 実装 | 評価 |
|:---|:---|:---:|
| **間接プロンプトインジェクション防御** | `<untrusted_terminal_output>` デリミタ + 大文字小文字非依存regex除去 | ✅ 優秀 |
| **コンテキストメタデータサニタイズ** | gitブランチ名・コマンド文字列のANSI/タグ除去 | ✅ 実装済 |
| **決定的危険コマンド検出** | `is_command_dangerous()` — AI応答を信頼せず独自に再判定 | ✅ 非常に良い |
| **ストリーミングバッファ上限** | 64KB超で打ち切り（DoS防止） | ✅ 堅実 |

> [!IMPORTANT]
> **AI Safety の最大の強み**: AI が `is_dangerous: false` を返しても、バックエンドの `is_command_dangerous()` で**決定的に上書き**する設計。LLM の判断を100%信頼しない「Trust but Verify」アプローチは正しい。

#### 3. 危険コマンドインターセプション — フロント＋バック両方

- Rust (`ai.rs`) と React (`DangerousCommandModal.tsx`) の**両方**に同一の判定ロジック
- ワード境界チェック (`\b` 相当の手動実装) で誤検知を排除
- 3段階ユーザー確認: 実行 / 安全挿入 / キャンセル

#### 4. GitHub限定Push/Pullポリシー — `pty.rs`

```
✅ git@github.com:user/repo.git          → 許可
✅ https://github.com/user/repo.git      → 許可
✅ https://user:ghp_xxx@github.com/...   → 許可 (userinfo strip)
✅ https://wammed.github.io/blog.git     → 許可
🔴 https://github.com.attacker.com/...   → 拒否 (サブドメインスプーフィング)
🔴 https://attacker.com/user/github.com  → 拒否 (パス埋め込み)
🔴 https://gitlab.com/user/repo.git      → 拒否
🔴 git@attacker.com:github.com/repo.git  → 拒否
```

- テストケースが **攻撃的パターン** を含んでいるのが非常に良い

#### 5. Kitty Graphics Protocol サンドボックス — `kitty.rs`

| 防御レイヤー | 内容 |
|:---|:---|
| ディレクトリサンドボックス | `$HOME/Pictures` 限定 (configurable) |
| 危険ディレクトリ拒否 | `/`, `/etc`, `/usr`, `~/.ssh`, `~/.gnupg` |
| シンボリックリンクエスケープ防止 | `canonicalize()` 後にサンドボックス再確認 |
| 一時ファイル自動削除 | `t=t` 読込後即 `remove_file` |
| EFBIG時も一時ファイル削除 | サイズ超過でも削除してディスク枯渇防止 |
| デコンプレッションボム防御 | PNG IHDR / JPEG SOF ヘッダ事前検査 |
| 解像度上限 | デフォルト 4096×4096 (max 8192) |
| ペイロード上限 | デフォルト 16MB (max 64MB) |

#### 6. CSP & ネットワーク分離 — `tauri.conf.json`

```
default-src 'self';
connect-src 'self' ipc: http://localhost:11434 http://127.0.0.1:11434
            https://api.github.com https://github.com;
img-src 'self' asset: http://asset.localhost https://asset.localhost data: blob:;
style-src 'self' 'unsafe-inline';
font-src 'self' data:;
```

- `script-src` が `default-src 'self'` でカバーされ、任意スクリプトインジェクションを阻止
- 外部接続先は Ollama ローカルと GitHub API のみ

#### 7. 壁紙バイナリヘッダ検証 — `config.rs`

- マジックバイト検査 (PNG, JPEG, WebP, GIF, BMP, SVG)
- パストラバーサル防止 (`file_name()` で basename のみ取得)
- 拡張子偽装スクリプト拒否（検出バイナリとの不一致チェック）

#### 8. プロセス管理 — `pty.rs`

- `SIGHUP` → `SIGTERM` → `SIGKILL` の段階的シグナル送信
- プロセスグループ (-pid) への同時送信でゾンビプロセス防止
- `GIT_TERMINAL_PROMPT=0` で非インタラクティブ実行
- `GIT_OPTIONAL_LOCKS=0` でロック競合回避

---

### ⚠️ セキュリティ改善提案 (低〜中程度のリスク)

#### 1. `.gitignore` が最小限

> [!WARNING]
> 現在の [`.gitignore`](file:///home/susie/GitHUB/wammed/Waddle/.gitignore) は `.aider*` のみ。`node_modules/`, `dist/`, `target/`, `*.log` が除外されていない。
> `node_modules` や `target` フォルダが含まれる場合、ビルドアーティファクトにパスやシステム情報が漏洩する可能性がある。

```diff
 .aider*
+node_modules/
+dist/
+src-tauri/target/
+*.log
+.env
+.env.*
```

#### 2. Ollama エンドポイント URL のバリデーション不足

[`ai.rs`](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/ai.rs#L420-L425) で `config.ollama_endpoint` がそのまま使用されている。ユーザーが設定画面で悪意あるURLを入力した場合（例: `http://attacker.com:11434`）、コマンドやソースコードが外部に送信される。

- ⚡ **現状の緩和策**: Settings UIでリモートエンドポイント警告バナーが表示される
- 🔧 **改善案**: 接続先がlocalhost/127.0.0.1以外の場合、初回接続時に明示的な確認ダイアログを表示

#### 3. `git_checkout_branch` のコマンドインジェクションリスク

[`pty.rs` L747](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/pty.rs#L744-L758) の `git_checkout_branch`:

```rust
.args(["checkout", "--", branch])
```

`--` セパレータは入っているが、`branch` 入力のバリデーションがない。ブランチ名に改行文字やNULLバイトが含まれるケースの検証が不足。ただし、`std::process::Command` はシェル経由ではないため、**実質的なリスクは低い**。

#### 4. `style-src 'unsafe-inline'` — CSP の緩和

CSPで `style-src 'self' 'unsafe-inline'` が使用されている。`unsafe-inline` はCSSインジェクション攻撃の理論的な攻撃面を残す。ただし Tauri Webview のコンテキストでは**現実的なリスクは極めて低い**（外部コンテンツのロードがCSPで制限されているため）。

#### 5. `read_directory` にパスバリデーションがない

[`lib.rs` L398](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/lib.rs#L398-L452): `read_directory` は `validate_safe_read` を経由せず、任意のディレクトリを列挙できる。ファイル内容の読み取りはブロックされるが、`/etc` や `/root` 等のディレクトリ**構造**は閲覧可能。

- 🔧 **改善案**: `read_directory` にも少なくとも `/proc`, `/sys` 等の仮想ファイルシステムの列挙ブロックを追加

#### 6. `git_discard_file` のTOCTOU

[`pty.rs` L661-L705](file:///home/susie/GitHUB/wammed/Waddle/src-tauri/src/pty.rs#L661-L705): `canonicalize()` のチェックとファイル操作の間にレースコンディションの可能性。ただし、ローカルデスクトップアプリケーションという性質上、**実用的な攻撃は非常に困難**。

---

## 🏗️ アーキテクチャレビュー

### 良い設計判断

```mermaid
graph LR
    subgraph "Frontend (React 19)"
        A[App.tsx] --> B[TerminalPane]
        A --> C[EditorPane]
        A --> D[FileTreeSidebar]
        A --> E[AiSidebar]
        A --> F[SettingsModal]
        B --> G[SingleTerminalView]
        G --> H[xterm.js 6]
    end
    
    subgraph "API Layer"
        I[tauriApi.ts] --> J[Tauri IPC invoke]
    end
    
    subgraph "Backend (Rust)"
        J --> K[lib.rs - Commands]
        K --> L[pty.rs - PTY管理]
        K --> M[ai.rs - Ollama通信]
        K --> N[config.rs - 設定管理]
        K --> O[kitty.rs - 画像処理]
    end
    
    subgraph "External"
        M --> P[Ollama localhost:11434]
        L --> Q[POSIX PTY]
    end
```

| 設計項目 | 評価 | コメント |
|:---|:---:|:---|
| **Tauri 2.0 採用** | ✅ | Electron比でメモリ/バイナリサイズ大幅削減 |
| **フロント/バック責務分離** | ✅ | セキュリティチェックはすべてRust側 |
| **カスタムフック分離** | ✅ | `useTerminalTabs`, `useGlobalShortcuts` で整理 |
| **Kitty Graphics 専用モジュール** | ✅ | parser/decoder/manager/lruCache/placeholder の5層設計 |
| **i18n 対応** | ✅ | 日英対応 |
| **エラーバウンダリ** | ✅ | `ErrorBoundary.tsx` でクラッシュ防止 |
| **Capabilities 最小権限** | ✅ | `core:default` + `opener:default` のみ |

### 改善の余地

| 項目 | 推奨 |
|:---|:---|
| **状態管理** | 現在はApp.tsx集中管理。Context APIやZustandで分割するとスケーラビリティ向上 |
| **エラーハンドリング統一** | Rust側のエラーメッセージが日英混在。統一すると保守性向上 |
| **モジュール粒度** | `lib.rs` が1056行と大きい。コマンド登録とバリデーションの分離推奨 |

---

## 🧪 テストレビュー

### テストカバレッジ

| テスト領域 | ファイル | テスト数 | 評価 |
|:---|:---|:---:|:---:|
| ファイルシステム保護 | `lib.rs` | 5 | ✅ |
| 危険コマンド検出 | `ai.rs` | 1 (30+パターン) | ✅ |
| プロンプトインジェクション | `ai.rs` | 1 (6パターン) | ✅ |
| GitHub ホスト検証 | `lib.rs` | 1 (16パターン) | ✅ |
| Git Push/Pull 制限 | `lib.rs` | 1 | ✅ |
| 壁紙バリデーション | `config.rs` | 3 | ✅ |
| Kitty サンドボックス | `kitty.rs` | 8 | ✅ |
| パストラバーサル防止 | `pty.rs` | 1 | ✅ |

> [!NOTE]
> セキュリティ関連テストが特に充実しているのは高く評価できる。攻撃パターンを含む**ネガティブテスト**が豊富。

### テスト改善提案

- フロントエンド側のユニットテストがない（`isDangerousCommand` のJSテスト等）
- `git_checkout_branch` の入力バリデーションテスト追加推奨
- 並行アクセス時のPTYセッション管理テスト追加推奨

---

## 📝 コード品質

### 強み

- **Rustのメモリ安全性** を最大限活用（`unsafe` ブロックは `main.rs` のGDKログフィルタと `pty.rs` のプロセスkillのみ）
- **エラーメッセージが具体的** で、ユーザーが問題を特定しやすい
- **UTF-8マルチバイトキャリーオーバー** 処理が正確（PTY出力でバッファ境界をまたぐ不完全なUTF-8シーケンスを保持）
- **セキュリティチェックをファイル存在確認の前に実行** — パスプロービング攻撃を防止

### 注意点

- `lib.rs` のテストモジュールが2つの `mod tests` に分かれている（L832 と ai.rs 内の L731）— コンパイルは通るが構造的にやや不明瞭
- 一部のコメントが日本語と英語で混在している（一貫性の観点）

---

## 🎯 推奨アクションアイテム

### 高優先度

| # | アクション | 理由 |
|:---|:---|:---|
| 1 | `.gitignore` 拡充 | `node_modules/`, `dist/`, `target/` の意図しないコミット防止 |
| 2 | `read_directory` のパスバリデーション追加 | `/proc`, `/sys` 等の仮想FS列挙ブロック |

### 中優先度

| # | アクション | 理由 |
|:---|:---|:---|
| 3 | Ollama非localhostエンドポイントの確認ダイアログ強化 | データ漏洩リスクの緩和 |
| 4 | フロントエンドユニットテスト導入 | `isDangerousCommand` 等のJS側ロジック検証 |
| 5 | エラーメッセージの言語統一 | 保守性・i18n一貫性 |

### 低優先度

| # | アクション | 理由 |
|:---|:---|:---|
| 6 | `lib.rs` のコマンド分割 | 可読性・保守性向上 |
| 7 | 状態管理のContext/Store分離 | スケーラビリティ |
| 8 | CSP `unsafe-inline` 除去検討 | 理論的なCSS攻撃面の排除 |

---

## 🏁 結論

**Waddle は、個人開発プロジェクトとしては極めて高いセキュリティ水準を達成している。** Defense-in-Depth の原則に忠実に従い、ファイルシステム保護、AI安全ガードレール、ネットワーク分離、プロセスハードニング、画像サンドボックスの5層にわたるセキュリティ対策が実装されている。

特に以下の3点は、商用ターミナルエミュレータと比較しても優位な設計判断：

1. **AIの判断を決定的ガードレールで上書き**する設計思想
2. **Kitty Graphics Protocolの徹底的なサンドボックス化**（TOCTOU、シンボリックリンクエスケープ、デコンプレッションボム全対応）
3. **GitHub限定Push/Pullポリシー**の厳密なドメイン検証（サブドメインスプーフィング防止含む）

改善提案は主に防御の深さをさらに増す「icing on the cake」レベルであり、現時点で致命的なセキュリティ脆弱性は発見されていない。

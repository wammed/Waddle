# 🔒 セキュリティポリシー & 多層防御ガードレール仕様 (Security Policy)

Waddle は、機密情報を扱う開発現場、企業内ネットワーク、エアギャップ（閉域網）環境、およびプライバシーを重視する Linux 開発者のために、**多層防御（Defense-in-Depth）** の原則に基づいて設計されています。

---

## 🛡️ セキュリティ基本方針

1. **100% オフライン & ローカル完結**:
   - 利用状況の送信（テレメトリ）や外部クラウド API との通信は一切ありません。
   - AI 機能はローカルの Ollama（`http://localhost:11434`）上で動作し、ソースコードやコマンド履歴、端末ログが外部に漏洩することはありません。
2. **完全なデータ主権の保証**:
   - 機密データを扱う企業環境や機密プロジェクトでも安全に使用できます。
3. **多層防御の徹底**:
   - Webview の Content Security Policy、バックエンドのファイルアクセス境界、入力・出力のサニタイズ、危険コマンドの事前遮断など、複数の独立したセキュリティ層を配置しています。

---

## 📁 ファイルシステム & パストラバーサル保護

Waddle の Rust バックエンド (`src-tauri/src/lib.rs`) は、ファイル操作（`read_file`, `write_file`, `create_file`, `delete_entry`, `rename_entry`）に対して厳格な検証を実施します。

### 1. システムディレクトリの前方一致保護
Waddle は正規化パスの前方一致検証（`canonical.starts_with(sys_dir)`）を行い、以下の重要システムディレクトリ配下のファイルおよびサブディレクトリの削除・書き込みを完全に遮断します：
- `/etc`
- `/usr`
- `/bin` および `/sbin`
- `/boot`
- `/lib`, `/lib64`, `/lib32`
- `/sys` および `/proc`
- `/dev`
- `/root`
- `/run`

*※ 前方一致検証により、`/etc/nginx/nginx.conf` や `/usr/local/bin` のような配下のファイルや入れ子フォルダも確実に保護されます。*

### 2. ユーザー資格情報・重要設定の保護
誤操作や悪意あるスクリプトによる認証情報の漏洩を防ぐため、以下の読み出し・書き込み・削除を完全に拒否します：
- **SSH 秘密鍵**: `id_rsa`, `id_ed25519`, `id_ecdsa`, `id_dsa` および `~/.ssh/` 配下の秘密鍵
- **GPG 秘密鍵**: `~/.gnupg/private-keys-v1.d/` およびキーリングファイル
- **Linux キーリング**: `~/.local/share/keyrings/`
- **シェル設定ファイル**: `~/.bashrc`, `~/.bash_profile`, `~/.bash_login`, `~/.zshrc`, `~/.zprofile`, `~/.zshenv`, `~/.profile`
- **設定ルートの保護**: `~/.config` 自体の削除を防止。

### 3. 事前パス検証
ファイルの存在確認を行う前にセキュリティ検証を実施し、ファイル探索や情報漏洩攻撃を防御します。

---

## 🤖 AI 安全性 & プロンプトインジェクション対策

### 1. タグエスケープによる間接的プロンプトインジェクション防御
端末出力（`curl` の実行結果や悪意あるログファイル等）に含まれる攻撃文字列が LLM の指示を上書きすることを防ぐため、Waddle は出力を XML 境界タグで囲みます：
```
<untrusted_terminal_output>
[エスケープ処理済みの端末出力]
</untrusted_terminal_output>
```
出力内の `<untrusted_terminal_output>` や `</untrusted_terminal_output>` は自動的にサニタイズ・エスケープされ、プロンプト脱出攻撃を無力化します。

### 2. コンテキストメタデータのサニタイズ
Git ブランチ名、直前コマンド、カレントディレクトリに含まれる制御文字やエスケープシーケンスをサニタイズしてからプロンプトを構成します。

---

## ⚠️ 単語境界による危険コマンド事前検知

Rust バックエンド (`src-tauri/src/ai.rs`) と React フロントエンド (`DangerousCommandModal.tsx`) が同一の判定ロジックを共有し、破壊的コマンドをインターセプトします。

### 単語境界（`\b`）による誤検知防止
正規表現の単語境界（`\b`）を利用することで、無害なコマンドや変数名（例: `echo 'imparted wisdom'` や `format_disk` という変数）に対する誤検知（False Positive）を防止します。

### 検知対象の破壊的コマンド一覧

| 分類 | 検知パターン / コマンド |
| :--- | :--- |
| **ファイル削除・切り詰め** | `rm`, `rmdir`, `find ... -delete`, `find ... -exec rm`, `truncate -s 0`, `shutil.rmtree` |
| **破壊的 Git 操作** | `git clean -f`, `git clean -fdx`, `git reset --hard`, `git push --force`, `git push --delete`, `git branch -D` |
| **プロセス置換・動的評価** | `bash <(`, `sh <(`, `zsh <(`, `eval "$(` |
| **ディスク・パーティション操作** | `mkfs`, `dd if=`, `fdisk`, `parted`, `gdisk`, `wipefs`, `shred`, `mkswap`, `cryptsetup` |
| **危険なリダイレクト・権限変更** | `> /dev/`, `> /etc/`, `> /boot/`, `chmod -R`, `chmod 777`, `chown -R`, `iptables -F`, `ufw disable` |
| **システム停止・フォークボム** | `reboot`, `shutdown`, `poweroff`, `init 0`, `init 6`, `:(){ :|:& };:` |
| **パイプ経由のスクリプト実行** | `\| python`, `\| python3`, `\| bash`, `\| sh`, `\| zsh`, `\| perl`, `\| ruby`, `python <(...)` |

### ユーザー確認オプション
危険コマンドが生成された場合、実行前に確認モーダルが表示されます：
1. **確認して実行**: リスクを承知の上でコマンドを実行。
2. **安全に入力のみ（Enterは手動）**: ターミナルに入力行としてペーストし、手動確認できるようにする。
3. **キャンセル**: コマンドの実行を取りやめる。

---

## 🌐 ネットワーク隔離 & Content Security Policy (CSP)

### 1. Webview CSP
Waddle は極めて厳格な Content Security Policy を強制しています：
```
default-src 'self';
connect-src 'self' http://localhost:11434 https://github.com https://api.github.com;
img-src 'self' asset: https: data:;
style-src 'self' 'unsafe-inline';
font-src 'self' asset: data:;
```
- Webview 内での不正な外部通信や任意のスクリプト注入をブロック。
- 外部通信先はローカルの Ollama および GitHub API のみに制限。

### 2. 最小特権のアセットプロトコル
Tauri の `assetProtocol.scope` は以下に限定されています：
- `$CONFIG/waddle/**/*`
- `$PICTURE/**/*`
- `$DOWNLOAD/**/*`

`$CONFIG/**/*` への広範囲なアクセスは禁止されており、ブラウザの Cookie や Slack/AWS トークンへのアクセスを遮断しています。

### 3. リモート Ollama 警告
外部エンドポイントが設定された場合、設定画面にアンバーの警告バナーを表示し、外部送信リスクを明示します。

### 4. GitHub 限定ポリシー
非 GitHub リモートへの `git push` / `git pull` を事前検知して自動遮断します。

---

## 🖼️ 壁紙バイナリヘッダー検証

壁紙保存時、ファイルの先頭マジックバイトを検査します：
- **PNG**: `89 50 4E 47 0D 0A 1A 0A`
- **JPEG**: `FF D8 FF`
- **WebP**: `52 49 46 46 ... 57 45 42 50`
- **GIF**: `47 49 46 38`
- **BMP**: `42 4D`
- **SVG**: `<svg` タグを含む XML

画像拡張子を偽装したシェルスクリプトやバイナリの保存は拒否されます。

---

## 🔧 サブプロセスの安全性

- **Git ロック回避**: `--no-optional-locks` および `GIT_OPTIONAL_LOCKS=0` でバックグラウンド実行。
- **非対話実行**: `GIT_TERMINAL_PROMPT=0` により認証プロンプトでの GUI フリーズを防止。
- **絶対パス検証**: ネイティブファイル選択ダイアログは `/usr/bin/` の絶対パスを優先検証。

---

## 📬 脆弱性の報告窓口

Waddle のセキュリティ上の問題を発見した場合は、責任ある開示（Responsible Disclosure）をお願いいたします：
- **報告先**: リポジトリのプライベート脆弱性報告機能、またはメンテナーへの直接連絡。
- **内容**: 再現手順、影響範囲、環境情報をご記載ください。
- **対応**: 48時間以内に初期確認を行い、迅速に修正パッチを優先配布します。

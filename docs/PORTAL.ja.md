# 📚 Waddle ドキュメンテーションポータル (Documentation Portal)

Waddle の設計思想、内部アーキテクチャ、機能仕様、セキュリティ検証、テスト計画などを包括的にまとめた技術ドキュメントハブです。

> 🌐 [English](PORTAL.md) | **日本語**

---

## 🧭 ドキュメント一覧

| ドキュメント | 言語 | 内容・目的 | 想定読者 |
| :--- | :--- | :--- | :--- |
| **[💡 機能仕様書 (FEATURES)](FEATURES.ja.md)** | [JA](FEATURES.ja.md) / [EN](FEATURES.md) | 全24機能の網羅的な技術仕様、エディタ機能制限マトリクス、Kitty画像プロトコル対応の詳細 | 全ユーザー / 開発者 |
| **[⌨️ ショートカットキー & 操作ガイド (SHORTCUTS)](SHORTCUTS.ja.md)** | [JA](SHORTCUTS.ja.md) / [EN](SHORTCUTS.md) | キーボード操作、マルチペイン制御、エディタ操作、クリップボード同期の完全リファレンス | 全ユーザー |
| **[📐 アーキテクチャ解説 (ARCHITECTURE)](ARCHITECTURE.ja.md)** | [JA](ARCHITECTURE.ja.md) / [EN](ARCHITECTURE.md) | Rust PTYコア、カーネル協調フロー制御、WebKitGTK、透過Canvas描画、プロセス管理 | 開発者 / アーキテクト |
| **[🛡️ セキュリティポリシー (SECURITY)](SECURITY.ja.md)** | [JA](SECURITY.ja.md) / [EN](SECURITY.md) | Rust `CommandPolicy` 境界、SSRF/DNS Pinning、シークレットマスク、脅威モデル | セキュリティ監査 / 開発者 |
| **[🔍 セキュリティステータス (SECURITY STATUS)](SECURITY_STATUS_ja.md)** | [JA](SECURITY_STATUS_ja.md) / [EN](SECURITY_STATUS.md) | Gitleaks、Secretlint、cargo-audit、cargo-deny、侵入・ファジングテスト結果レポート | セキュリティ担当 / 開発者 |
| **[🧪 テスト計画・品質保証 (TEST PLAN)](TEST_PLAN.ja.md)** | [JA](TEST_PLAN.ja.md) / [EN](TEST_PLAN.md) | 統合テストパイプライン、メモリリーク検証、Playwright 描画テスト、カバレッジ | コントリビューター / QA |
| **[📊 テスト実行証跡 (Test Execution Evidence)](Waddle_Test_Execution_Evidence_ja.md)** | [JA](Waddle_Test_Execution_Evidence_ja.md) | 実際の自動テスト実行結果、カバレッジダッシュボード証跡 | 開発チーム |
| **[📄 ライセンスおよびサードパーティ通知 (LICENSES)](../LICENSES.ja.md)** | [JA](../LICENSES.ja.md) / [EN](../LICENSES.md) | ソースコード配布モデル、`cargo-deny` による依存関係監査、フォント管理基準 | 全ユーザー / パッケージング |
| **[🛡️ IP デューデリジェンス記録書 (IP COMPLIANCE)](../IP_COMPLIANCE.ja.md)** | [JA](../IP_COMPLIANCE.ja.md) / [EN](../IP_COMPLIANCE.md) | アイコン意匠プロヴェナンス、類似性レビュー結果、IPデューデリジェンス記録 | 全ユーザー / 法務 |
| **[🎨 アイコンデザイン・IPレビュー履歴 (ICON DESIGN HISTORY)](../ICON_DESIGN_HISTORY.ja.md)** | [JA](../ICON_DESIGN_HISTORY.ja.md) / [EN](../ICON_DESIGN_HISTORY.md) | 4アプリ横断AI生成対話ログ、類似性監査履歴、デザイン変更の全記録 | 全ユーザー / 法務 |
| **[🤝 セッション引継ぎ書 (SESSION HANDOVER)](SESSION_HANDOVER.md)** | [EN](SESSION_HANDOVER.md) | 開発背景、過去の実装経緯、既知の課題、今後のロードマップ | 開発チーム |

---

## 🎯 クイックナビゲーション

### 初めて Waddle を使う方へ
1. [リポジトリ トップの README (日本語)](../README.ja.md) で概要とクイックスタートを確認。
2. [ショートカットキー操作ガイド](SHORTCUTS.ja.md) でキー操作を把握。
3. 気になる機能の詳細は [機能仕様書 (FEATURES)](FEATURES.ja.md) を参照。

### コントリビューター & 開発者の方へ
1. [アーキテクチャ解説](ARCHITECTURE.ja.md) で Rust バックエンドと React フロントエンドの責務分担を理解。
2. [セキュリティポリシー](SECURITY.ja.md) で IPC 境界とコマンド安全検証ルールを確認。
3. 変更を加えたら [テスト計画書](TEST_PLAN.ja.md) に従って `npm run test:all` を実行。

### 法務・ライセンス・知的財産 (IP) プロヴェナンス
1. [ライセンスおよびサードパーティ通知](../LICENSES.ja.md) でソース配布方針、依存クレート管理、フォント規約を確認。
2. [IP デューデリジェンス記録書](../IP_COMPLIANCE.ja.md) で Waddle アイコンの由来と類似性検証結果を確認。
3. [アイコンデザイン・IPレビュー履歴](../ICON_DESIGN_HISTORY.ja.md) で4アプリを横断したAI対話・変更履歴の全容を確認。

---

[← リポジトリの README に戻る](../README.ja.md)

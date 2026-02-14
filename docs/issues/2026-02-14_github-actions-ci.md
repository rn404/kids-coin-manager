Status: Draft

# Summary

GitHub Actions による CI/CD パイプラインを段階的に整備し、コード品質の自動検証とデプロイの自動化を実現する。

---

# Details

現在、コード品質の検証は `deno task precommit`（fmt + lint + test）をローカルで手動実行する運用になっている。GitHub Actions が未導入のため、以下の課題がある:

- PR マージ前の品質チェックが個人の運用に依存している
- build の成功可否が push 前に保証されない
- 依存パッケージの脆弱性検出が手動

### 導入スコープ

段階的に以下を整備する:

| Phase | 内容                      | トリガー              | 優先度 |
| ----- | ------------------------- | --------------------- | ------ |
| 1     | CI（lint / test / build） | push, PR              | 高     |
| 2     | 依存関係チェック          | schedule（週次）or PR | 中     |
| 3     | Deno Deploy 連携          | main マージ           | 中     |

### Phase 1: CI パイプライン

既存の deno task を活用して以下を実行:

1. **source-guard**: `deno fmt --check . && deno lint . && deno check`
   - フォーマット違反・lint エラー・型エラーを検出
2. **runtime-guard**: `deno test && cd apps/web && deno task build`
   - テスト実行と web アプリのビルド検証

#### 検討事項

- Deno バージョンの固定方法（`denoland/setup-deno` action のバージョン指定）
- `--unstable-kv` フラグが必要なテスト（KV を使用）への対応
- モノレポ構成でのキャッシュ戦略（`deno.lock` ベース）
- branch protection rule で CI パスを必須にするか

### Phase 2: 依存関係チェック

- `deno outdated` による依存パッケージの更新確認
- セキュリティ脆弱性の定期スキャン

### Phase 3: Deno Deploy 連携

- `apps/web` の Deno Deploy への自動デプロイ
- Deno Deploy の GitHub Integration を使用するか、GitHub Actions から `deployctl` で制御するか要検討

### 参考: 既存タスク定義（deno.json）

```
"source-guard": "deno fmt --check . && deno lint . && deno check"
"runtime-guard": "deno test && cd apps/web && deno task build"
"precommit":    "deno task autofix && deno task test"
```

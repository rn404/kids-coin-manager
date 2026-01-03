# Deno workspaceを使ったモノレポ構成を整えたい

**Created**: 2026-01-03
**Status**: Completed

## Problem / Goal

既存のプロジェクトをDeno workspaceを使ったモノレポ構成に移行し、コード共有の効率化を実現する。

複数の種類のパッケージ/アプリケーションを統合的に管理したい:

- フロントエンドアプリケーション
- バックエンドAPI
- 共通ライブラリ
- CLIツール

これらのパッケージ間で共通コード(ユーティリティ、型定義、ビジネスロジックなど)を効率的に共有し、開発できる環境を作る。

## Context

### 現状の課題

- アプリケーションの開発を進める前にモノレポ構成に移行し、開発のレールを作りたい
- 開発初期のスピードをあげるためにも、型定義やユーティリティ関数などを効率的に共有する仕組みが必要

### Deno workspaceの利点

- パッケージ間の依存関係を`deno.json`で明示的に管理できる
- `jsr:` specifierを使った内部パッケージの参照が可能
- 統一された開発環境とツール設定
- 型チェック、テスト、リンティングを一括で実行できる

## Want

- 現在トップディレクトリ配下にそのまま配置している Fresh のコードは、 `apps/` としてまとめる
- アプリケーションのスタイルはモジュールとして一つにまとめたい
- ベースとなるコンポーネントのコードもモジュールとして一つにまとめたい

### 検討事項

- 既存プロジェクトのディレクトリ構造の分析
- workspaceの最適なディレクトリ構成の設計
- パッケージ間の依存関係の整理
- 段階的な移行計画の策定

## Approach

### 現在のプロジェクト構造の分析

現在のプロジェクトは、Fresh フレームワークを使用したシンプルな構成になっている：

```
.
├── main.ts              # Fresh アプリケーションのエントリーポイント
├── routes/              # Fresh ルート
│   ├── index.tsx
│   ├── stamps.tsx
│   ├── timer.tsx
│   ├── _app.tsx
│   └── api/
├── islands/             # Fresh インタラクティブアイランド
│   └── Counter.tsx
├── components/          # 共通コンポーネント
│   └── Button.tsx
├── utils.ts             # ユーティリティ関数
├── client.ts            # クライアントサイドのエントリーポイント
├── vite.config.ts       # Vite設定
└── deno.json            # Deno設定
```

### 目標とするモノレポ構成

```
.
├── deno.json                    # ワークスペースのルート設定
├── apps/                        # アプリケーション群
│   └── web/                     # Fresh フロントエンドアプリ
│       ├── deno.json
│       ├── main.ts
│       ├── routes/
│       ├── islands/
│       └── vite.config.ts
├── packages/                    # 共有パッケージ群
│   ├── ui/                      # UIコンポーネントライブラリ
│   │   ├── deno.json
│   │   ├── mod.ts
│   │   └── components/
│   │       └── Button.tsx
│   ├── styles/                  # スタイル定義
│   │   ├── deno.json
│   │   └── mod.ts
│   └── utils/                   # 共通ユーティリティ
│       ├── deno.json
│       └── mod.ts
└── docs/                        # ドキュメント（既存）
```

### 移行ステップ

#### Phase 1: ワークスペース設定の準備

1. ルートの `deno.json` にワークスペース設定を追加
2. 新しいディレクトリ構造を作成（`apps/`, `packages/`）

#### Phase 2: 共有パッケージの作成

1. `packages/ui/` を作成し、`components/Button.tsx` を移動
2. `packages/utils/` を作成し、`utils.ts` を移動
3. `packages/styles/` を作成し、スタイル関連のコードを整理
4. 各パッケージに `deno.json` と `mod.ts` (エクスポート用) を作成

#### Phase 3: Fresh アプリケーションの移動

1. `apps/web/` ディレクトリを作成
2. Fresh アプリケーション関連ファイルを移動：
   - `main.ts`
   - `client.ts`
   - `routes/`
   - `islands/`
   - `vite.config.ts`
   - `_fresh/`
3. `apps/web/deno.json` を作成し、共有パッケージへの参照を設定

#### Phase 4: インポートパスの更新

1. 各ファイル内のインポートパスを新しいワークスペースのパッケージ参照に更新
2. `@/ui`, `@/utils`, `@/styles` などのエイリアスを設定

#### Phase 5: 動作確認とクリーンアップ

1. ルートディレクトリのタスクを調整
2. すべてのタスク（dev, build, test）が正常に動作することを確認
3. 不要な古いファイルを削除

### パッケージの命名規則

- workspace内部パッケージは `@workspace/パッケージ名` の形式で参照
- 例: `@workspace/ui`, `@workspace/utils`, `@workspace/styles`

### 今後の拡張性

このモノレポ構成により、以下の追加が容易になる：

- `apps/api/` - バックエンドAPI
- `apps/cli/` - CLIツール
- `packages/types/` - 共通型定義
- `packages/domain/` - ビジネスロジック

## Work Log

### 2026-01-03

- Issue作成
- 要件の整理
- 対象パッケージの確認: フロントエンドアプリ、バックエンドAPI、共通ライブラリ、CLIツール
- 主な目的: コード共有の効率化
- 現在のプロジェクト構造を分析
  - Freshアプリケーションの構成を確認（routes, islands, components, utils.ts）
  - 既存の依存関係を`deno.json`から確認
- モノレポ構成のApproachセクションを作成
  - 目標とするディレクトリ構造を設計（apps/web, packages/ui, packages/utils, packages/styles）
  - 5つのPhaseに分けた移行計画を策定
  - パッケージ命名規則を決定（@workspace/パッケージ名）
- **Phase 1完了**: ワークスペース設定の準備
  - ルート`deno.json`にworkspace設定を追加
  - `apps/`, `packages/`ディレクトリを作成
  - タスクを新しい構造に対応するよう更新
- **Phase 2完了**: 共有パッケージの作成
  - `packages/ui/`: Buttonコンポーネントを移動、`deno.json`と`mod.ts`を作成
  - `packages/utils/`: utils.tsを移動、`deno.json`と`mod.ts`を作成
  - `packages/styles/`: styles.cssを移動、`deno.json`と`mod.ts`を作成
- **Phase 3完了**: Freshアプリケーションの移動
  - `apps/web/`にFreshアプリケーション関連ファイルを移動
  - `apps/web/deno.json`を作成し、ワークスペースパッケージへの参照を設定
- **Phase 4完了**: インポートパスの更新
  - すべてのファイルで相対インポートを`@workspace/*`パッケージ参照に更新
  - `Counter.tsx`, `_app.tsx`, `index.tsx`, `timer.tsx`, `stamps.tsx`, `main.ts`, `api/[name].tsx`のインポートを更新
- **Phase 5完了**: 動作確認とクリーンアップ
  - 型チェック、リント、フォーマットチェックが全て成功
  - ビルドが正常に完了することを確認
  - ルートディレクトリから古いファイルを削除（routes, islands, components, utils.ts等）
  - モノレポ構成への移行が完了

## Feedback

### apps/web構成についての議論

移行完了後、`apps/web`というディレクトリ構成について検討を行った。

**現状認識**:

- 現時点ではFreshアプリケーション1つのみで、API routesも含まれている
- 別のFreshアプリや独立したAPIサーバーが必要になるのはかなり先の話
- そのため、現時点では`apps/web`という構成は若干過剰とも言える

**設計原則上の懸念**:

- **現時点で明らかに不要なものを、不明確な将来性をあてにしてそのままにしておく、という判断を許容しない**
- 個人開発で自分がすべての権利を有しているため、この点での確実性は高い
- 「そのままにしても問題ない」という曖昧な差し引き判断ではなく、明確な価値に基づいて判断すべき

**メリット**:

- packagesによる共有コード管理という主要目的は達成できている
- `apps/`が1階層増えるだけで、実用上の大きなデメリットはない
- 将来的に複数アプリが必要になった場合でも対応可能
- **模範的なアプリ構成として残すことで、今後の他プロジェクトを作る際の参考になる**

**最終判断**:
**「模範的なアプリ構成を残すことの価値」という明確なメリットを優先**し、現在の構成を維持することを決定。不明確な将来の拡張性ではなく、具体的な価値（他プロジェクトへの参考）に基づいた判断。

## References

- [Deno Workspaces Documentation](https://docs.deno.com/runtime/manual/basics/workspaces)
- [JSR Documentation](https://jsr.io/docs)

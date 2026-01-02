# Fresh + Vite における @babel/core 型定義エラーの調査レポート

**日付:** 2026-01-02 **問題:** `deno task check` 実行時に `@babel/core`
の型定義が見つからないエラーが発生

## エラー内容

```
error: Failed resolving types. [ERR_TYPES_NOT_FOUND] Could not find types for
'file:///Users/nrumina/Works/rn404/manage-kids-coin/node_modules/.deno/@babel+core@7.28.5/node_modules/@babel/core/index.js'
imported from 'https://jsr.io/@fresh/plugin-vite/1.0.8/src/plugins/deno.ts:10:24'
```

## 初期調査結果

### エラーの発生状況

| コマンド                    | 結果    |
| --------------------------- | ------- |
| `deno check main.ts`        | ✅ 成功 |
| `deno check vite.config.ts` | ❌ 失敗 |
| `deno task check`           | ❌ 失敗 |
| `deno task build`           | ✅ 成功 |

### 重要な発見

- **エラーは型チェック時のみ発生**し、実際のビルド・実行には影響しない
- エラーの原因は `@fresh/plugin-vite@1.0.8` が内部的に `@babel/core`
  をインポートしているが、その型定義が見つからないこと

## @babel/core の使用目的

`@fresh/plugin-vite/1.0.8/src/plugins/deno.ts` での使用方法：

```typescript
import * as babel from 'npm:@babel/core@^7.28.0'
```

**用途:**

1. JSX → JavaScript の変換（`.tsx`, `.jsx` ファイル）
2. Preact 向けの自動 JSX ランタイム設定
3. Deno の HTTP インポートパスの処理
4. ソースマップの生成

**疑問点:**

- ESM が主流の現代において、なぜ Babel が必要なのか？
- Vite は既に esbuild で JSX 変換が可能
- クロスブラウザ対応もほぼ不要になっている

## GitHub での調査結果

### 調査した Fresh プロジェクト

**注意:** Fresh 本体はフレームワーク自体のリポジトリ（モノレポ）であり、「Fresh
で作られたプロジェクト」ではありません。以下は **Fresh で作られたプロジェクト**
の調査結果です。

1. **[fresh_charts](https://github.com/denoland/fresh_charts/blob/main/deno.json)**
   - **Fresh v1.4.2**（v1系）
   - `skipLibCheck`: 使用なし
   - `@babel/core`: **依存関係なし**

2. **[fresh-blog-with-deno2](https://github.com/subfuzion/fresh-blog-with-deno2)**
   - 作成日：2024年10月7日（約3ヶ月前）
   - **Fresh v1.7.2**（v1系、v2系ではない）
   - `skipLibCheck`: 使用なし
   - `@babel/core`: **依存関係なし**

### 重要な発見

**Fresh v1 系のプロジェクトでは `@babel/core` は不要**でした。これは Fresh v1 と
v2 のアーキテクチャの違いに起因します。

## Fresh v1 と v2 の本質的な違い

### Fresh v1 のアーキテクチャ

**ビルドシステム:**

- **ビルドステップなし**（No build step）
- TypeScript/JSX の変換は **just-in-time** で実行
- サーバーとクライアントで必要な時に transpile

**JSX 処理:**

- Deno の組み込み機能で JSX を変換
- **Babel 不要**

**メリット:**

- シンプルな構成
- 追加の依存関係が少ない

**デメリット:**

- 初回起動が遅い（毎回 transpile するため）

### Fresh v2 のアーキテクチャ

**ビルドシステム:**

- **Vite プラグイン**として動作
- **ビルドステップが必要**（`deno task build`）
- サーバーコードを事前にバンドル

**JSX 処理:**

- 基本的には **esbuild** で変換（高速）
- `@fresh/plugin-vite` が内部的に **Babel を使用**
  - Deno 固有のインポート（`jsr:`, `https://`）の処理
  - Preact の JSX プリコンパイルとの統合
  - 条件付き使用（JSX/TSX ファイルのみ）

**メリット:**

- 起動時間が 9-12倍高速化
- HMR（ホットモジュールリローディング）対応
- Vite エコシステムの恩恵

**デメリット:**

- ビルドステップが必要
- **追加の依存関係**（vite, @babel/core など）

### なぜ Fresh v2 で Babel が必要になったのか？

**本質的な理由:**

Fresh v2 で Vite を採用した際、`@fresh/plugin-vite` の実装で Babel
が使われるようになりました。これは以下の理由によります：

1. **Deno 固有のインポートの処理**
   - `jsr:@foo/bar` 形式のインポート
   - `https://deno.land/x/...` 形式の HTTP インポート
   - これらを Vite が理解できる形式に変換する必要がある

2. **Preact の JSX プリコンパイル**
   - Fresh は `"jsx": "precompile"` モードを使用
   - Preact 特有の最適化との統合

3. **設計判断**
   - esbuild だけでも可能だった可能性はある
   - しかし、Babel プラグインエコシステムの柔軟性を選択した
   - 将来的には esbuild への移行の可能性もある

**重要な疑問点:**

「なぜ Fresh v2 のサンプルプロジェクトで `@babel/core`
の問題解決が含まれていないのか？」

考えられる理由：

1. **Fresh v2 はまだアルファ/ベータ段階**（2025年 Q3 に安定版予定）
2. **デフォルトテンプレートの整備が不十分**
3. **`@fresh/plugin-vite` の依存関係管理の問題**
   - パッケージ内の `imports` がプロジェクト側に伝播しない
   - Deno の型解決の仕組みの制限

### check タスクの違い（Fresh 本体の設定）

**Fresh 本体:**

```json
"check:types": "deno check --allow-import"
```

**当プロジェクト:**

```json
"check": "deno fmt --check . && deno lint . && deno check"
```

→ **`--allow-import` フラグの有無が違う**

### GitHub Issues の検索結果

以下のクエリで検索したが、該当する issue は見つからず：

- `"ERR_TYPES_NOT_FOUND" babel` in denoland/fresh
- `"@fresh/plugin-vite" "@babel/core" deno.json`

→ この問題は一般的ではない、または他の方法で解決されている可能性

## コミュニティの見解

[deno-plc/vite-plugin-deno](https://github.com/deno-plc/vite-plugin-deno)
のドキュメントより：

> "Babel ベースのプラグインは避けるべき。esbuild を使う方が多くの場合で高速"

→ **`@fresh/plugin-vite` が Babel を使っていること自体が時代遅れ**の可能性

## Fresh 2.0 の情報

- [Fresh 2.0.0 Release](https://github.com/denoland/fresh/releases/tag/2.0.0)
- Fresh は公式に Vite プラグインになった
- パフォーマンスが 9-12倍向上
- HMR が islands で直接動作
- JSR に移行

## 現在のプロジェクト設定

**deno.json（関連部分）:**

```json
{
  "nodeModulesDir": "manual",
  "tasks": {
    "check": "deno fmt --check . && deno lint . && deno check"
  },
  "imports": {
    "fresh": "jsr:@fresh/core@^2.2.0",
    "@fresh/plugin-vite": "jsr:@fresh/plugin-vite@^1.0.8",
    "vite": "npm:vite@^7.1.3"
  },
  "compilerOptions": {
    "jsx": "precompile",
    "jsxImportSource": "preact"
  }
}
```

## 検討可能な解決策

### 1. `--allow-import` フラグを追加

Fresh 本体と同じ方法：

```json
"check": "deno fmt --check . && deno lint . && deno check --allow-import"
```

### 2. `skipLibCheck: true` を追加

ライブラリの型定義チェックをスキップ：

```json
"compilerOptions": {
  "skipLibCheck": true
}
```

### 3. `@babel/core` を依存関係に追加

```json
"imports": {
  "@babel/core": "npm:@babel/core@^7"
}
```

### 4. エラーを許容

実際の動作に影響しないため無視

## バージョン調査の結果

### `@fresh/plugin-vite` のバージョン履歴

JSR のメタデータから確認：

- **最新バージョン:** v1.0.8（2025年11月18日リリース）
- **当プロジェクト:** v1.0.8（最新版を使用中）
- **バージョン履歴:** v0.0.1（2025年8月）から v1.0.8 まで28バージョン

→ **バージョンの問題ではない**

### Babel の使用状況の詳細調査

`packages/plugin-vite/src/plugins/deno.ts` のソースコード確認：

```typescript
// 8行目
import * as babel from "@babel/core";

// babelTransform関数（358-404行）で使用
babel.transformSync(code, {...})
```

**Babel の使用は条件付き:**

- JSX/TSX ファイル（`.tsx`, `.jsx`）のみ処理
- SSR でない場合のみ
- 非 JS メディアタイプではスキップ
- 関数は `null` を返す可能性があり、必須ではない

### `--allow-import` フラグの検証

Fresh 本体の CI では `deno task check:types` → `deno check --allow-import`
を実行。

**当プロジェクトでの検証結果:**

```bash
$ deno check --allow-import
error: Failed resolving types. [ERR_TYPES_NOT_FOUND] ...
```

→ **`--allow-import` フラグでは解決しない**

## 決定的な発見：Fresh 本体の設定

Fresh モノレポの `packages/plugin-vite/deno.json`
を確認したところ、**決定的な違い**が見つかりました：

**Fresh の `packages/plugin-vite/deno.json`:**

```json
{
  "name": "@fresh/plugin-vite",
  "version": "1.0.8",
  "imports": {
    "@babel/core": "npm:@babel/core@^7.28.0",
    "@babel/preset-react": "npm:@babel/preset-react@^7.26.3",
    "@fresh/core": "jsr:@fresh/core@^2.0.0",
    "vite": "npm:vite@^7.1.3",
    ...
  },
  "compilerOptions": {
    "jsx": "precompile",
    "jsxImportSource": "preact",
    "types": ["vite/client"]
  }
}
```

**重要:** `@fresh/plugin-vite` パッケージ自体は **`@babel/core` を imports
に明示的に含めている**

## 問題の根本原因

1. `@fresh/plugin-vite` パッケージ自体は `@babel/core` を `imports` に持っている
2. しかし、**それを使用するプロジェクト**では、Deno の型チェック時に
   `@babel/core` の型定義が見つからない
3. これは **Deno の型解決の仕組み**に起因する問題：
   - パッケージ内の `imports`
     は、そのパッケージを使用するプロジェクトの型チェックには適用されない
   - プロジェクト側で明示的に `@babel/core` を `imports` に追加する必要がある

## 推奨される解決策

### ✅ 推奨：`@babel/core` を依存関係に追加（Fresh 本体と同じ構成）

**理由:**

- Fresh 本体の `packages/plugin-vite/deno.json` と同じ構成にする
- 型定義の問題を根本的に解決
- vite.config.ts の型チェックも正常に動作
- `@fresh/plugin-vite` が実際に Babel を使用しているため、依存関係として正当

**実装:**

```json
{
  "imports": {
    "@/": "./",
    "@std/assert": "jsr:@std/assert@^1.0.16",
    "fresh": "jsr:@fresh/core@^2.2.0",
    "preact": "npm:preact@^10.27.2",
    "@preact/signals": "npm:@preact/signals@^2.5.0",
    "@fresh/plugin-vite": "jsr:@fresh/plugin-vite@^1.0.8",
    "vite": "npm:vite@^7.1.3",
    "tailwindcss": "npm:tailwindcss@^4.1.10",
    "@tailwindcss/vite": "npm:@tailwindcss/vite@^4.1.12",
    "@babel/core": "npm:@babel/core@^7"
  }
}
```

### 代替案1: `skipLibCheck: true` を追加

**理由:**

- ライブラリの型定義チェックをスキップ
- アプリケーションコードの型安全性は維持
- サードパーティの型定義の問題を回避

**実装:**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.asynciterable", "dom.iterable", "deno.ns"],
    "jsx": "precompile",
    "jsxImportSource": "preact",
    "skipLibCheck": true,
    ...
  }
}
```

### 代替案2: エラーを許容

**理由:**

- 実際の動作に影響しない
- `deno task build` は成功する
- `deno check main.ts` など個別ファイルの型チェックは可能

**実装:** check タスクから型チェックを除外、または無視

## 参考リンク

- [Fresh 2.0.0 Release](https://github.com/denoland/fresh/releases/tag/2.0.0)
- [Fresh + Vite Blog Post](https://deno.com/blog/fresh-and-vite)
- [Fresh packages/plugin-vite/deno.json](https://github.com/denoland/fresh/blob/main/packages/plugin-vite/deno.json)
- [deno-plc/vite-plugin-deno](https://github.com/deno-plc/vite-plugin-deno)
- [Deno skipLibCheck Support Issue](https://github.com/denoland/deno/issues/21855)
- [Fresh Documentation](https://fresh.deno.dev/)
- [@fresh/plugin-vite on JSR](https://jsr.io/@fresh/plugin-vite)

## 最終結論

### 問題の本質

このエラーは以下の要因が組み合わさって発生しています：

1. **Fresh v1 から v2 へのアーキテクチャの大幅な変更**
   - v1: ビルドステップなし、Babel 不要
   - v2: Vite プラグイン化、Babel を使用

2. **`@fresh/plugin-vite` の実装判断**
   - Deno 固有のインポート処理のために Babel を使用
   - esbuild だけでも可能だった可能性はあるが、Babel を選択

3. **Deno の型解決の仕組み**
   - パッケージ内の `imports` が使用側プロジェクトの型チェックに伝播しない
   - プロジェクト側で明示的に `@babel/core` を追加する必要がある

4. **Fresh v2 がまだベータ段階**
   - デフォルトテンプレートの整備が不十分
   - ドキュメントに `@babel/core` の追加が明記されていない

### 推奨される対応

**✅ 最も妥当な解決策: `@babel/core` を依存関係に追加**

Fresh 本体の `packages/plugin-vite/deno.json` と同じ構成に合わせる：

```json
{
  "imports": {
    "@babel/core": "npm:@babel/core@^7"
  }
}
```

**理由:**

- `@fresh/plugin-vite` が実際に Babel を使用している
- Fresh 本体と同じ依存関係構成になる
- 型チェックが正常に動作する
- Fresh v2 + Vite の正式な依存関係として正当

**代替案: `skipLibCheck: true` を追加**

ライブラリの型チェックをスキップ（より簡易的な対応）

### Fresh v2 を使用するプロジェクトへの推奨事項

Fresh v2（Vite プラグイン版）を使用する場合：

1. **`@babel/core` を明示的に追加**
   - `deno.json` の `imports` に含める
   - Fresh v2 の実質的な必須依存関係として扱う

2. **Fresh の安定版リリースを待つ**
   - 2025年 Q3 に安定版がリリース予定
   - デフォルトテンプレートが整備される可能性

3. **Fresh v1 の使用も検討**
   - よりシンプルな構成が必要な場合
   - ビルドステップを避けたい場合

### 補足：なぜこの問題が表面化しにくいのか

1. **実行時には影響しない**
   - `deno task build` は成功する
   - アプリケーションは正常に動作する

2. **型チェックをスキップする開発者が多い**
   - `deno task check` を実行しない
   - CI/CD で型チェックを省略している

3. **Fresh v2 がまだベータ段階**
   - 使用しているプロジェクトが少ない
   - issue として報告されていない

### 将来の展望

`@fresh/plugin-vite` が Babel から esbuild
への移行を検討する可能性があります。これにより：

- 依存関係が減少
- ビルドがさらに高速化
- Deno の哲学（最小限の依存関係）に合致

## 関連する GitHub Issue と PR

Fresh リポジトリで見つかった Babel 関連の issue と PR をまとめます。

### Issue #3605: Project Fails to build without npm:@types/babel__core

**ステータス:** Open **作成日:** 2025年11月6日 **最終更新:** 2025年12月2日
**URL:** https://github.com/denoland/fresh/issues/3605

**問題の概要:**

- Fresh のデフォルトスターターアプリケーションで、`npm:@types/babel__core`
  を手動でインストールしないとビルドが失敗する
- エラーメッセージ：`Failed resolving types. [ERR_TYPES_NOT_FOUND] Could not find types for 'file:///.../node_modules/.deno/@babel+core@7.28.5/...'`
- `"nodeModulesDir": "manual"` の設定時に発生

**関連情報:**

- Deno issue [#31352](https://github.com/denoland/deno/issues/31352) に関連
- JSR（JavaScript Registry）の問題の可能性

**提案された回避策:**

```json
{
  "nodeModulesDir": "auto" // "manual" から変更
}
```

**議論の内容:**

- コントリビューター（knotbin）が、根本的な Deno
  の修正が既にリリースされているため、安定版では `"nodeModulesDir": "auto"`
  に戻すことを提案
- esbuild のバージョンアップの要望も含まれている（ロックファイルの競合問題）

**現在の状況:**

- 未解決（Open）
- コメント数：3
- Babel から esbuild への移行についての議論はなし

### PR #3265: fix(vite): disable babel code size warning

**ステータス:** Closed (Merged) **マージ日:** 2025年8月27日 **作成者:**
marvinhagemeister **URL:** https://github.com/denoland/fresh/pull/3265

**変更の概要:**

- Babel のコードサイズ警告を無効化
- 開発体験の改善を目的とした修正

**議論の内容:**

- Babel が大きなコードを処理する際に表示される警告を抑制
- Fresh の開発環境での不要な警告を減らすための対応

**影響:**

- ユーザー体験の改善（警告ノイズの削減）
- Babel の継続使用を前提とした修正

### PR #3238: fix(vite): babel transform being applied for non-js files

**ステータス:** Closed (Merged) **マージ日:** 2025年8月21日 **作成者:**
marvinhagemeister **ブランチ:** `fix-jsr-babel` **URL:**
https://github.com/denoland/fresh/pull/3238

**問題の概要:**

- Babel トランスフォーム設定が JavaScript
  ファイル以外（CSS、画像など）にも誤って適用されていた
- 非 JS ファイルの処理時に不要な変換が実行されていた

**変更の内容:**

- Vite のプラグイン設定で、Babel 変換の対象ファイルを適切に制限
- JavaScript/TypeScript ファイルのみが処理対象となるように修正

**議論の内容:**

- JSR との統合における Babel の挙動の問題を修正
- ファイルタイプの判定ロジックの改善

**影響:**

- ビルドパフォーマンスの改善（不要な変換を削減）
- Babel の継続使用を前提とした修正

## 重要な観察事項

### Babel の位置づけ

上記の issue と PR から、Fresh チームは現時点で：

1. **Babel を継続して使用する前提**で開発を進めている
2. Babel 関連の問題は「修正」する方向で対応（削除ではない）
3. **Babel から esbuild への移行に関する issue や discussion は存在しない**

### Fresh チームの対応方針

- Babel のコードサイズ警告の無効化（#3265）
- Babel の適用範囲の制限（#3238）
- 型定義の問題への対処（#3605、未解決）

これらは全て「Babel
を使い続ける」ことを前提とした改善であり、根本的なアーキテクチャ変更（esbuild
への移行）は検討されていないように見えます。

### 今後の可能性

Fresh v2 が安定版（2025年 Q3 予定）になった後、以下の可能性があります：

1. **テンプレートの改善**
   - `@babel/core` をデフォルトの `imports` に含める
   - ドキュメントでの明記

2. **アーキテクチャの再検討**
   - Babel から esbuild への移行
   - Deno ネイティブの変換機能の活用

3. **Deno 側の改善**
   - パッケージ内の `imports` の型解決の改善
   - より良い依存関係管理

## Deno 側の関連 Issue

Fresh の issue #3509 と #3605 で言及されている Deno
の型解決に関する問題の詳細です。

### Issue #30929: JSR packages fail to resolve types (根本原因)

**URL:** https://github.com/denoland/deno/issues/30929 **ステータス:** Open
**重要度:** ⭐ **これが根本原因**

**問題の内容:**

- `nodeModulesDir: "manual"` 設定下で、JSR パッケージが `npm:@types/<pkg>`
  からの型解決に失敗する
- エラーメッセージ：`Could not find a matching package for 'npm:@babel/core@^7.28.4' in the node_modules directory.`

**根本原因:**

- JSR はインポート上に `@ts-types` コメントを期待している
- しかし、JSR が `@types/*` パッケージに対して自動的に `@ts-types`
  を追加するロジックが不足している

**回避策（手動で追加）:**

```typescript
// @ts-types="npm:@types/babel__core@^7.20.5"
import * as babel from 'npm:@babel/core@^7.28.4'
```

**提案される解決策:**

- David Sherret（Deno メンテナー）の提案：パッケージ公開時に型解決が `@types`
  パッケージに該当するかを判定し、自動的に `@ts-types` プラグマを挿入する

### Issue #31352: Could not find types for '@babel/core'

**URL:** https://github.com/denoland/deno/issues/31352 **ステータス:**
Open（一度修正されたが revert された） **報告日:** 2025年（Fresh 2.5.6）

**問題の内容:**

- Fresh プロジェクト初期化後に `deno check` 実行時にエラーが発生
- `Could not find types for '@babel/core' imported from '@fresh/plugin-vite'`
- JSR パッケージ（`@fresh/plugin-vite`）が npm
  パッケージ（`@babel/core`）をインポートする際、対応する `@types/babel__core`
  の型が自動解決されない

**修正の経緯:**

1. **PR #31507** で修正が実装された（型解決失敗時のフォールバック動作）
2. しかし **PR #31513** で revert された
3. 現在は再度 Open 状態

**根本原因:**

- Issue #30929 に関連
- JSR 公開時に npm パッケージの `@types` パッケージを自動的に `@ts-types`
  プラグマとして注入する機能が不足

### Issue #30850: `// @ts-ignore` doesn't work properly

**URL:** https://github.com/denoland/deno/issues/30850 **ステータス:** Open
**ラベル:** tsc, types, **important for fresh**

**問題の内容:**

- Deno のワークスペースプロジェクトで、型定義を持たない npm パッケージに対して
  `// @ts-ignore` コメントが機能しない
- 通常の tsc では動作するが、Deno では失敗する
- Deno 2.5.2 で報告

**具体的なエラー:**

```
Failed resolving types. [ERR_TYPES_NOT_FOUND] Could not find types for
'@babel/preset-react' imported from main.ts
```

**提案されたワークアラウンド:**

```typescript
// @ts-ignore Workaround for https://github.com/denoland/deno/issues/30850
const { default: babelReact, } = await import('npm:@babel/preset-react')
```

ただし、このワークアラウンドは JSR 公開時に失敗することも報告されている。

### 3つの Issue の関係

```
Issue #30929 (根本原因)
    ↓
    JSR が @ts-types を自動挿入しない
    ↓
Issue #31352        Issue #30850
Fresh の型解決失敗   @ts-ignore が機能しない
```

**まとめ:**

- Fresh の `"nodeModulesDir": "manual"` での型チェック失敗は、**Deno/JSR
  の制限**によるもの
- 根本的な解決には **Deno #30929** の修正が必要
- 修正されるまでは `"nodeModulesDir": "auto"` を使用する必要がある

## 実際の修正対応（2026-01-02）

### 実施した対応

Issue #3605 と #3509 の調査結果に基づき、以下の修正を実施しました：

**1. `nodeModulesDir` の変更**

```json
{
  "nodeModulesDir": "auto" // "manual" から変更
}
```

**2. `compilerOptions.types` の削除**

```json
{
  "compilerOptions": {
    // "types": ["vite/client"] を削除
  }
}
```

### 変更の理由

**`nodeModulesDir: "auto"` への変更:**

- Fresh は本来 `"manual"` への完全移行を目指している（Issue #3509）
- しかし、Deno の制限（issue #30850, #30929）により `"manual"` では Babel
  の型定義が解決できない
- Deno 側の修正が完了するまでは `"auto"` を使用する必要がある
- Issue #3605 のコメントで複数のユーザーが `"auto"` への変更で解決したと報告

**`types: ["vite/client"]` の削除:**

- `"nodeModulesDir": "auto"`
  に変更後、`Cannot find module 'npm:/vite@7.3.0/client'` というエラーが発生
- `"auto"` モードでは node_modules
  が自動管理されるため、型定義も自動的に解決される
- 明示的な `types` 指定が競合または不要になる可能性
- 削除後、型チェックが正常に完了

### 検証結果

```bash
$ deno task check
✅ すべての型チェックが成功
```

**チェックされたファイル:**

- client.ts
- components/Button.tsx
- islands/Counter.tsx
- main.ts
- routes/*.tsx
- vite.config.ts
- その他すべてのプロジェクトファイル

### 最終的な deno.json の設定

```json
{
  "nodeModulesDir": "auto",
  "tasks": {
    "check": "deno fmt --check . && deno lint . && deno check",
    "dev": "vite",
    "build": "vite build",
    "start": "deno serve -A _fresh/server.js",
    "update": "deno run -A -r jsr:@fresh/update ."
  },
  "imports": {
    "@/": "./",
    "@std/assert": "jsr:@std/assert@^1.0.16",
    "fresh": "jsr:@fresh/core@^2.2.0",
    "preact": "npm:preact@^10.27.2",
    "@preact/signals": "npm:@preact/signals@^2.5.0",
    "@fresh/plugin-vite": "jsr:@fresh/plugin-vite@^1.0.8",
    "vite": "npm:vite@^7.1.3",
    "tailwindcss": "npm:tailwindcss@^4.1.10",
    "@tailwindcss/vite": "npm:@tailwindcss/vite@^4.1.12"
  },
  "compilerOptions": {
    "lib": ["dom", "dom.asynciterable", "dom.iterable", "deno.ns"],
    "jsx": "precompile",
    "jsxImportSource": "preact",
    "jsxPrecompileSkipElements": [
      "a",
      "img",
      "source",
      "body",
      "html",
      "head",
      "title",
      "meta",
      "script",
      "link",
      "style",
      "base",
      "noscript",
      "template"
    ]
  }
}
```

**重要な変更点:**

- ✅ `"nodeModulesDir": "manual"` → `"auto"`
- ✅ `"types": ["vite/client"]` を削除
- ❌ `@babel/core` の追加は**不要**だった

### まとめ

当初検討していた解決策：

1. ~~`@babel/core` を `imports` に追加~~ → 不要
2. ~~`skipLibCheck: true` を追加~~ → 不要
3. ~~`--allow-import` フラグを追加~~ → 効果なし
4. ✅ **`nodeModulesDir: "auto"` に変更** → **これが正解**

Fresh v2 + Vite を使用する場合、現時点では `"nodeModulesDir": "auto"`
が推奨される設定です。Deno
の型解決の問題が修正されるまで、この設定を使用することで型チェックが正常に動作します。

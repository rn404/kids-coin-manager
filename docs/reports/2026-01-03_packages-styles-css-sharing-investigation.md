# packages/styles モジュールの使用状況と修正方法の調査レポート

**日付:** 2026-01-03
**目的:** CSS variables とコンポーネントクラスを共有するための packages/styles の適切な実装方法を調査

## 調査の背景

### 現在の問題点

`packages/styles` が意図通りに使用されていない状況が判明：

1. **エクスポート方法の問題**
   - `packages/styles/mod.ts` が相対パス文字列 `'./styles.css'` をエクスポート
   - 他のパッケージから import しても正しいパスにならない

2. **実際の使用状況**
   - `apps/web/deno.json` で `@workspace/styles` を依存関係として宣言しているが**使用していない**
   - `apps/web/client.ts` では `'./assets/styles.css'` を直接インポート
   - `apps/web/assets/styles.css` と `packages/styles/styles.css` は同一内容で**重複している**

3. **根本原因**
   - CSSファイルはTypeScript/JavaScriptのように単純にre-exportできない
   - 現在のアプローチでは共通化が機能していない

### 利用用途の明確化

packages/styles の目的：

- ✅ CSS variables（デザイントークン）を定義
- ✅ コンポーネントのclass定義をexport

---

## 技術スタック調査

### 現在の環境

| 項目              | 技術                 | バージョン |
| ----------------- | -------------------- | ---------- |
| フレームワーク    | Fresh                | 2.0        |
| ビルドツール      | Vite                 | 7.1.3      |
| CSSフレームワーク | TailwindCSS          | 4.1.10     |
| プラグイン        | @tailwindcss/vite    | 4.1.12     |
| ランタイム        | Deno                 | -          |
| 構成              | Workspace (monorepo) | -          |

### 重要な仕様

**Fresh 2.0 + Vite:**

- HMR（ホットモジュールリローディング）のため、CSSは `client.ts` でインポートが必要
- Viteの内部モジュールグラフに含める必要がある

**TailwindCSS v4:**

- `@theme` ディレクティブでCSS変数とユーティリティクラスを定義する新しいアーキテクチャ
- JavaScript設定ファイル（`tailwind.config.js`）から CSS設定への移行
- CSS-first アプローチ

---

## 実装アプローチの調査結果

### アプローチ1: @importを使った共有（最推奨）

**概要:** TailwindCSS v4の標準的な方法で、`@import` を使って共有CSSファイルを読み込む

**実装方法:**

1. `packages/styles/styles.css` を修正：

```css
@import 'tailwindcss';

/* CSS変数の定義 */
@theme {
  --color-primary: #3b82f6;
  --color-secondary: #10b981;
  --spacing-section: 2rem;
  --font-heading: 'Inter', sans-serif;
}

/* コンポーネントクラスの定義 */
.card {
  @apply rounded-lg shadow-md p-4 bg-white;
}

.btn-primary {
  @apply px-4 py-2 bg-primary text-white rounded hover:opacity-90;
}

.fresh-gradient {
  background-color: rgb(134, 239, 172);
  background-image: linear-gradient(
    to right bottom,
    rgb(219, 234, 254),
    rgb(187, 247, 208),
    rgb(254, 249, 195)
  );
}
```

2. `apps/web/assets/styles.css` を修正：

```css
/* 共有スタイルをインポート */
@import '../../packages/styles/styles.css';

/* アプリ固有のスタイルがあればここに追加 */
```

3. `packages/styles/mod.ts` を削除または更新

**長所:**

- ✅ シンプルで理解しやすい
- ✅ TailwindCSS v4の標準的な方法
- ✅ 追加の設定変更が不要
- ✅ Fresh + Viteの環境で問題なく動作
- ✅ 保守性が高い

**短所:**

- ⚠️ ビルド時にパスが解決される（実運用では問題なし）

---

### アプローチ2: @sourceディレクティブを使用

**概要:** モノレポでパッケージ内のコンポーネントをTailwindがスキャンする必要がある場合に使用

**実装方法:**

1. `packages/styles/theme.css` を作成（テーマ専用）：

```css
/* tailwindcss はインポートしない！ */
@theme {
  --color-primary: #3b82f6;
  --color-secondary: #10b981;
  --spacing-section: 2rem;
}

.card {
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  padding: 1rem;
  background-color: white;
}
```

2. `apps/web/assets/styles.css` を修正：

```css
@import 'tailwindcss';
@import '../../packages/styles/theme.css';

/* パッケージ内のコンポーネントをスキャン */
@source '../../packages/ui';
```

**長所:**

- ✅ コンポーネントライブラリのスキャンに対応
- ✅ テーマとメインのCSSを分離できる
- ✅ モノレポでのベストプラクティス

**短所:**

- ⚠️ アプローチ1より少し複雑
- ⚠️ テーマファイルで `tailwindcss` をインポートしてはいけない点に注意が必要

---

### アプローチ3: Viteのエイリアスを使用

**概要:** Viteの設定でエイリアスを定義し、TypeScriptからの参照も可能にする

**実装方法:**

1. `apps/web/vite.config.ts` を修正：

```typescript
import { defineConfig, } from 'vite'
import { fresh, } from '@fresh/plugin-vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [fresh(), tailwindcss(),],
  resolve: {
    alias: {
      '@workspace/styles': path.resolve(__dirname, '../../packages/styles',),
    },
  },
},)
```

2. `apps/web/client.ts` を修正：

```typescript
import '@workspace/styles/styles.css'
```

**長所:**

- ✅ TypeScriptから直接参照可能
- ✅ 柔軟性が高い
- ✅ パスの解決がより明示的

**短所:**

- ❌ Vite設定の変更が必要
- ❌ Node.jsの`path`モジュールが必要
- ❌ Denoネイティブではない

---

## 比較表

| 項目                       | アプローチ1<br>@import | アプローチ2<br>@source | アプローチ3<br>Viteエイリアス |
| -------------------------- | ---------------------- | ---------------------- | ----------------------------- |
| **難易度**                 | ⭐ 簡単                | ⭐⭐ やや複雑          | ⭐⭐⭐ 複雑                   |
| **設定変更**               | 不要                   | 不要                   | 必要                          |
| **標準性**                 | TailwindCSS v4標準     | TailwindCSS v4標準     | Vite固有                      |
| **保守性**                 | ⭐⭐⭐⭐⭐             | ⭐⭐⭐⭐               | ⭐⭐⭐                        |
| **Denoネイティブ**         | ✅ Yes                 | ✅ Yes                 | ❌ No (Node.js path)          |
| **コンポーネントスキャン** | ❌                     | ✅ Yes                 | ❌                            |
| **推奨度**                 | **⭐⭐⭐⭐⭐**         | ⭐⭐⭐⭐               | ⭐⭐⭐                        |

---

## TailwindCSS v4の新機能

### @theme ディレクティブ

TailwindCSS v4では、JavaScript設定からCSS設定への大きな変更が行われました。

**v3 の方法（非推奨）:**

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
      },
    },
  },
}
```

**v4 の方法（推奨）:**

```css
@import 'tailwindcss';

@theme {
  --color-primary: #3b82f6;
}
```

### CSS変数の自動生成

`@theme` で定義したCSS変数は、自動的にTailwindのユーティリティクラスとして生成されます：

| CSS変数                          | 生成されるクラス例                                               |
| -------------------------------- | ---------------------------------------------------------------- |
| `--color-brand-primary: #3b82f6` | `bg-brand-primary`, `text-brand-primary`, `border-brand-primary` |
| `--spacing-section: 2rem`        | `p-section`, `m-section`, `gap-section`                          |
| `--font-heading: "Inter"`        | `font-heading`                                                   |
| `--breakpoint-tablet: 768px`     | `tablet:*` (メディアクエリ)                                      |

### 通常のCSSとしても使用可能

```css
.custom-element {
  color: var(--color-brand-primary);
  padding: var(--spacing-section);
  font-family: var(--font-heading);
}
```

---

## 実装例: デザインシステムの構築

### packages/styles/styles.css の推奨構造

```css
@import 'tailwindcss';

/* ===================================
   デザイントークン（CSS変数）
   =================================== */

@theme {
  /* カラーパレット */
  --color-brand-primary: #3b82f6;
  --color-brand-secondary: #10b981;
  --color-brand-accent: #f59e0b;
  --color-danger: #ef4444;
  --color-warning: #f59e0b;
  --color-success: #10b981;
  --color-info: #3b82f6;

  /* グレースケール */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-500: #6b7280;
  --color-gray-700: #374151;
  --color-gray-900: #111827;

  /* スペーシング */
  --spacing-section: 3rem;
  --spacing-card: 1.5rem;
  --spacing-component: 1rem;

  /* タイポグラフィ */
  --font-heading: 'Inter', sans-serif;
  --font-body: 'Roboto', sans-serif;
  --font-mono: 'Fira Code', monospace;

  /* サイズ */
  --text-display: 3rem;
  --text-heading-1: 2.5rem;
  --text-heading-2: 2rem;
  --text-heading-3: 1.5rem;
  --text-body: 1rem;
  --text-small: 0.875rem;

  /* ブレークポイント */
  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 1024px;
  --breakpoint-wide: 1280px;

  /* シャドウ */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);

  /* ボーダーRadius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 1rem;
}

/* ===================================
   コンポーネントクラス
   =================================== */

/* カード */
.card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-card);
  background-color: white;
  transition: box-shadow 0.2s ease-in-out;
}

.card:hover {
  box-shadow: var(--shadow-lg);
}

.card-compact {
  padding: var(--spacing-component);
}

/* ボタン */
.btn {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  font-weight: 500;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background-color: var(--color-brand-primary);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background-color: var(--color-brand-secondary);
  color: white;
}

.btn-outline {
  background-color: transparent;
  border: 2px solid var(--color-brand-primary);
  color: var(--color-brand-primary);
}

/* バッジ */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-lg);
  font-size: var(--text-small);
  font-weight: 500;
}

.badge-success {
  background-color: #d1fae5;
  color: #065f46;
}

.badge-warning {
  background-color: #fef3c7;
  color: #92400e;
}

.badge-danger {
  background-color: #fee2e2;
  color: #991b1b;
}

/* ユーティリティ */
.fresh-gradient {
  background-color: rgb(134, 239, 172);
  background-image: linear-gradient(
    to right bottom,
    rgb(219, 234, 254),
    rgb(187, 247, 208),
    rgb(254, 249, 195)
  );
}

.container-app {
  max-width: 1280px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}
```

### 使用例

**HTMLでの使用:**

```html
<!-- Tailwindのユーティリティクラス（自動生成） -->
<div class="bg-brand-primary text-white p-section">
  <h1 class="font-heading text-heading-1">見出し</h1>
</div>

<!-- コンポーネントクラス -->
<div class="card">
  <h2>カードタイトル</h2>
  <p>カードの内容</p>
  <button class="btn btn-primary">アクション</button>
</div>

<!-- 組み合わせ -->
<div class="card p-component desktop:p-section">
  <span class="badge badge-success">新規</span>
</div>
```

**CSSでの使用:**

```css
.custom-component {
  color: var(--color-brand-primary);
  padding: var(--spacing-card);
  font-family: var(--font-heading);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
```

---

## 推奨実装プラン

### ステップ1: packages/styles の再構築

1. **`packages/styles/styles.css` を更新**
   - `@import 'tailwindcss'` を追加
   - `@theme` ディレクティブでCSS変数を定義
   - コンポーネントクラスを定義

2. **`packages/styles/mod.ts` の対応**
   - 削除する、または以下のように更新：
   ```typescript
   // CSS ファイルのパスを提供（必要に応じて）
   export const stylesPath = new URL('./styles.css', import.meta.url,).pathname
   ```

### ステップ2: apps/web の更新

1. **`apps/web/assets/styles.css` を更新**
   ```css
   @import '../../packages/styles/styles.css';

   /* アプリ固有のスタイル */
   ```

2. **`apps/web/client.ts` はそのまま**
   ```typescript
   // Import CSS files here for hot module reloading to work.
   import './assets/styles.css'
   ```

### ステップ3: 動作確認

```bash
# 開発サーバー起動
deno task dev

# ビルド確認
deno task build

# 型チェック
deno check apps/web/main.ts
```

### ステップ4: 将来的な拡張

今後、新しいアプリケーション（例: `apps/mobile`, `apps/admin`）を追加する場合も、同じパターンで統合可能：

```css
/* apps/mobile/assets/styles.css */
@import '../../packages/styles/styles.css';

/* モバイル固有のスタイル */
@theme {
  --spacing-touch-target: 44px; /* タッチターゲットサイズ */
}
```

---

## 参考資料

### TailwindCSS v4 公式ドキュメント

- [Tailwind CSS v4.0 - 公式発表](https://tailwindcss.com/blog/tailwindcss-v4)
- [Theme variables - Core concepts](https://tailwindcss.com/docs/theme)
- [Adding custom styles](https://tailwindcss.com/docs/adding-custom-styles)

### モノレポでのTailwindCSS v4

- [Setting up Tailwind CSS v4 in a Turbo Monorepo](https://medium.com/@philippbtrentmann/setting-up-tailwind-css-v4-in-a-turbo-monorepo-7688f3193039)
- [Configure Tailwind 4 with Vite in an NPM Workspace](https://nx.dev/blog/setup-tailwind-4-npm-workspace)
- [Tailwind v4 Monorepo Best Practices](https://sunny.gg/post/2025-04-14-tailwind-v4-monorepo/)
- [Building a Scalable Frontend Monorepo with TailwindCSS V4](https://dev.to/harrytranswe/building-a-scalable-frontend-monorepo-with-turborepo-vite-tailwindcss-v4-react-19-tanstack-21ko)

### Vite + Monorepo

- [Vite Shared Options](https://vite.dev/config/shared-options)
- [Vite Features Guide](https://vite.dev/guide/features)
- [Ultimate Guide: Frontend Monorepo with Vite](https://medium.com/@hibamalhiss/ultimate-guide-how-to-set-up-a-frontend-monorepo-with-vite-pnpm-and-shared-ui-libraries-4081585c069e)

### Fresh + Vite + Deno

- [Fresh 2.0 Graduates to Beta, Adds Vite Support](https://deno.com/blog/fresh-and-vite)
- [Fresh Migration Guide](https://fresh.deno.dev/docs/examples/migration-guide)
- [Fresh + Vite Means 9-12x Faster Development](https://thenewstack.io/fresh-vite-means-9-12x-faster-development-for-deno/)

### マルチテーマ実装

- [Tailwind CSS v4: Multi-Theme Strategy](https://simonswiss.com/posts/tailwind-v4-multi-theme)
- [Build a Flawless, Multi-Theme System using Tailwind CSS v4](https://medium.com/render-beyond/build-a-flawless-multi-theme-ui-using-new-tailwind-css-v4-react-dca2b3c95510)

---

## まとめ

### 主要な発見事項

1. **現状の問題**: `packages/styles` は意図通り機能していない
   - mod.ts のエクスポート方法が不適切
   - CSSファイルが重複している
   - 共通化が実現できていない

2. **技術的制約**: CSSファイルはJavaScript/TypeScriptのようにre-exportできない
   - Vite + Freshの環境では `client.ts` でのインポートが必要
   - TailwindCSS v4は `@import` による統合を標準とする

3. **最適解**: `@import` を使った共有が最もシンプルで効果的
   - TailwindCSS v4の標準的な方法
   - 追加設定不要
   - 保守性が高い

### 推奨アクション

**優先度: 高**

- ✅ アプローチ1（@import方式）で実装
- ✅ `packages/styles/styles.css` に `@theme` とコンポーネントクラスを定義
- ✅ `apps/web/assets/styles.css` から `@import` で読み込み
- ✅ 重複している `apps/web/assets/styles.css` の内容を削除

**優先度: 中**

- ⚠️ デザイントークンの体系化（色、スペーシング、タイポグラフィ）
- ⚠️ コンポーネントライブラリの整備

**優先度: 低**

- 💡 将来的にアプリケーションが増えた場合の拡張性確認
- 💡 ダークモード対応の検討

---

**調査日:** 2026-01-03
**調査者:** Claude Code
**ステータス:** 完了

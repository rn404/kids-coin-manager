# packages/ui Design System 設計方針

**日付**: 2026-02-28

## 概要

`packages/ui` を Design System として整備するにあたり、議論・決定した設計方針をまとめる。

---

## 1. コンポーネントの状態管理: Signals に統一

`packages/ui` 内のコンポーネントで状態管理が必要な場合は、`useState`/`useCallback` ではなく `@preact/signals` の `useSignal`/`useComputed` を使う。

```tsx
// NG
const [value, setValue] = useState(0)

// OK
const value = useSignal(0)
const isDisabled = useComputed(() => value.value >= max)
```

**理由**: このプロジェクト全体が Signals ベースで統一されているため、コンポーネントライブラリもそれに合わせる。

### controlled / uncontrolled の扱い

- controlled: 呼び出し側が `Signal<T>` を渡す
- uncontrolled: 渡さなければコンポーネント内部の `useSignal` が使われる

```tsx
const external = useSignal(10)

// controlled
<NumberInput value={external} />

// uncontrolled
<NumberInput defaultValue={10} />
```

---

## 2. Fresh v2 における island パターン

`packages/ui` のコンポーネントは `useSignal` 等を含むため、クライアント側でのみ動作する。Fresh v2 では `islands/` に置かれたファイルがクライアントバンドル対象になるため、以下のパターンを採用する。

```
packages/ui/components/NumberInput.tsx  ← 実装本体
apps/web/islands/NumberInput.tsx        ← 1行の re-export
apps/ops/islands/NumberInput.tsx        ← 1行の re-export
```

```tsx
// apps/web/islands/NumberInput.tsx
export { NumberInput } from '@workspace/ui'
```

**メリット**:

- `packages/ui` は Design System として自己完結した実装を持てる
- island ファイルはボイラープレートに徹するためロジックの重複がない
- 別アプリに展開する際も re-export を1行追加するだけ

---

## 3. Tailwind クラスのスキャン設定

Tailwind v4 はデフォルトでアプリのルートディレクトリ配下のみをスキャンする。`packages/ui` のコンポーネントで使用している Tailwind クラスを生成させるため、各アプリの CSS に `@source` を追加する。

```css
/* apps/web/assets/styles.css */
/* apps/ops/assets/styles.css */
@import 'tailwindcss';

@source '../../../packages/ui/**/*.tsx';
```

### 外部パッケージとした場合

`packages/ui` が別リポジトリの npm/JSR パッケージになった場合、`@source` で `node_modules` 内のパスを指定する方法は fragile。その場合の選択肢：

| 方法                             | 概要                                                                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| CSS を ship                      | パッケージ側でビルド済み CSS を同梱し利用側が `@import` するだけにする。ただし未使用コンポーネントの CSS も含まれる（tree-shaking 不可） |
| Tailwind v4 プラグインとして提供 | `@plugin` として `@source` 設定ごと提供。利用側は `@plugin '@your-org/ui/tailwind'` の1行で済み、tree-shaking も効く                     |

現状の monorepo 構成では `@source` 直指定で十分。

---

## 4. Vite の開発時ウォッチ設定

Vite はデフォルトでアプリのルートディレクトリ外のファイルを監視しない。`packages/` 配下の変更を HMR で即時反映させるため、各アプリの `vite.config.ts` に以下を追加する。

```ts
server: {
  watch: {
    ignored: ['!**/packages/**'],
  },
},
```

`server.*` は dev server 専用の設定であり、`vite build`（本番ビルド）には影響しない。

---

## 5. root div への class / attributes のスプレッド

コンポーネントが受け取った `class` prop と追加 attributes は root の `<div>` にマージ・スプレッドする。型は `OwnProps` と `JSX.IntrinsicElements['div']` の intersection で定義する。

```tsx
type OwnProps = {/* コンポーネント固有 props */}

export type NumberInputProps =
  & OwnProps
  & Omit<JSX.IntrinsicElements['div'], keyof OwnProps | 'children'>

export const NumberInput = ({
  class: className,
  ...rest
}: NumberInputProps) => (
  <div {...rest} class={twMerge('border border-black/20 ...', className)}>
    ...
  </div>
)
```

---

## 6. class マージポリシー: tailwind-merge を使う

単純な文字列結合だと Tailwind クラスの競合が発生し、適用結果が CSS 定義順に依存して予測できない。`tailwind-merge` を使うことで後から渡したクラスが優先されることを保証する。

```ts
twMerge('bg-white px-2', 'bg-gray-100') // → 'px-2 bg-gray-100'
twMerge('px-2 py-1', 'px-4') // → 'px-4 py-1'
```

### class prop の設計ポリシー

これはコンポーネント側での実装上の制約ではなく、**利用側が守るべき規約**として定める。

`class` prop は **レイアウト調整専用**（配置・サイズ）と定義する。内部スタイル（色・形状など）を変えたい場合は `class` の上書きではなく `variant` / `size` などの prop を追加する。

```tsx
// OK: レイアウト調整
<NumberInput class='mt-4 w-full' />

// NG: 内部スタイルの上書き（variant prop を用意して対処する）
<NumberInput class='bg-gray-100 border-red-500' />
```

`tailwind-merge` は主に「レイアウト系クラスの競合（`mt-4` vs `mt-2` など）を安全に処理する保険」として機能する。

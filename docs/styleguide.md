# Style Guide

lint rule で強制できないコーディングスタイルをここにまとめる。
lint で検出できるものはここには書かない。

## export default

framework 制約で `export default` が必要な場合は、`const` で宣言してから末尾で `export default` する。

```tsx
// Good
const App = define.page(({ Component }) => {
  return <Component />
})

// deno-lint-ignore internal/no-default-export
export default App
```

```tsx
// Bad
export default define.page(function App({ Component }) {
  return <Component />
})
```

## function 宣言

`function` 宣言より `const` + アロー関数を優先する。

```ts
// Good
const greet = (name: string) => {
  return `Hello, ${name}`
}

// Bad
function greet(name: string) {
  return `Hello, ${name}`
}
```

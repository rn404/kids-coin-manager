Status: Applied

# Summary

`packages/data/usecases` 内の各 usecase について、read 操作と write 操作を明示的に分離する設計を導入する。

コンソール環境でのデフォルト read only モードの実現や、読み取り専用コンテキストでの usecase 利用を安全に行うための設計基盤として位置づける。

---

# Details

# Approach

各 usecase の interface を read/write に分割する。実装（`makeFooUseCase`）は変更せず、型レベルでの分離にとどめる。

```typescript
// Before
interface CoinUseCaseInterface {
  listByUser(...)
  findById(...)
  increaseBy(...)
  decreaseBy(...)
}

// After
interface CoinUseCaseReadOnlyInterface {
  listByUser(...)
  findById(...)
}

interface CoinUseCaseInterface extends CoinUseCaseReadOnlyInterface {
  increaseBy(...)
  decreaseBy(...)
}
```

コンソール側では `CoinUseCaseReadOnlyInterface` 型として受け取ることで、write メソッドがコンパイル時に見えなくなる。
TypeScript レベルの制御であり、キャストによる回避は可能だが、うっかりミス防止として十分と判断する。

---

# Results

各 usecase に `ReadOnlyInterface` を追加し、`mod.ts` から export した。テストはすべて通過。

- `CoinUseCaseReadOnlyInterface` — `listByUser`, `findById`
- `CoinTypeUseCaseReadOnlyInterface` — `findById`, `listAllByFamily`
- `CoinDistributionUseCaseReadOnlyInterface` — `findById`

# References

2026-03-29_deno-kv-console.md

# Feedback

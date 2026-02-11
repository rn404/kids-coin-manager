Status: Draft

# Summary

Deno KV の複合キーに必要なプロパティが DataModel の型定義から読み取れない問題。キー構造を一元管理する仕組みを検討する。

---

# Details

現在の DataModel ではすべてのプロパティが同列に見え、「どれがユニークキーの構成要素か」が型から判別できない。

```typescript
// familyId がキーの一部であることが型から読み取れない
type CoinTypeDataModel = DataModel<{
  familyId: string
  name: string
  durationMinutes: number
  dailyDistribution: number
  active: boolean
}>
```

また、`create` / `findById` / `update` で同じキー構造（`['coinTypes', familyId, id]`）を繰り返し記述しており、整合性を保つのが難しい。

### 検討されたアプローチ

| アプローチ              | 概要                           | キー一元管理 | 実装コスト |
| ----------------------- | ------------------------------ | ------------ | ---------- |
| A: 現状維持（個別引数） | メソッドごとに引数で受け取る   | x            | 最小       |
| B: オブジェクト形式     | `CoinTypeKey` 型でまとめる     | x            | 小         |
| C: ヘルパー関数         | `toKvKey()` でキー生成を一元化 | o            | 中         |
| D: key 変数宣言         | 関数冒頭で `const key = [...]` | x            | 最小       |

### 暫定結論

- 短期: アプローチ D（key 変数宣言）で設計意図を明示
- 中期: タプル型 + ヘルパー関数（アプローチ C）に移行

# Approach

# Results

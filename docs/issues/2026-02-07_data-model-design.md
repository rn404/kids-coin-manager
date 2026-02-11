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

### KV prefix 文字列の散在状況（2026-02-11 調査）

テストファクトリや UseCase テストの追加に伴い、同じ prefix 文字列がさらに多くの箇所に散らばっている:

| prefix                       | 使用箇所数 | 散在ファイル                                            |
| ---------------------------- | ---------- | ------------------------------------------------------- |
| `'coins'`                    | 4          | CoinUseCase, CoinFactory                                |
| `'coinTypes'`                | 7          | CoinTypeUseCase, CoinTypeFactory                        |
| `'coin_transactions'`        | 3          | CoinUseCase, CoinTransactionFactory, CoinUseCase テスト |
| `'coin_daily_distributions'` | 2          | DailyCoinDistributionFactory                            |

prefix の typo や不一致がサイレントに壊れるリスクがあり、ヘルパー関数（アプローチ C）への移行の優先度が上がっている。

### 暫定結論

- 短期: アプローチ D（key 変数宣言）で設計意図を明示
- 中期: タプル型 + ヘルパー関数（アプローチ C）に移行

# Approach

# Results

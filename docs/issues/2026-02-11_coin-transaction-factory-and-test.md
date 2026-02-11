Status: Proposed

# Summary

CoinUseCase のテストで CoinTransaction が正しく作成されたかを検証していない。テスト用ファクトリの追加とテストの補強が必要。

---

# Details

CoinUseCase の `increaseBy` / `decreaseBy` は内部で CoinTransaction を KV に保存しているが、現在のテストでは保存結果を assert していない。

また、`packages/data/test-helpers/factories/` に CoinTransaction 用のファクトリが存在せず、トランザクション関連のテストデータを手軽に用意できない。

- 既存ファクトリ: Coin / CoinType / DailyCoinDistribution
- CoinTransactionDataModel は discriminated union（`transactionType` による分岐）を持つため、ファクトリ設計時に各 transactionType ごとのデフォルト値をどう扱うか検討が必要

### 参考ファイル

- CoinTransactionDataModel: `packages/data/CoinTransaction.ts`
- CoinUseCase: `packages/data/usecases/CoinUseCase.ts`
- 既存ファクトリパターン: `packages/data/test-helpers/factories/CoinFactory.ts`

# Approach

# Results

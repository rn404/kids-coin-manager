Status: Applied

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

## 1. CoinTransactionFactory の作成

`packages/data/test-helpers/factories/CoinTransactionFactory.ts`

CoinTransactionDataModel は discriminated union（`transactionType` で分岐）を持つため、transactionType ごとにデフォルト metadata を提供する設計にする。

- `buildCoinTransaction(params)` — メモリ上にデータを構築（DB 保存なし）
- `createCoinTransaction(kv, params)` — KV に保存して返す
- `params.transactionType` に応じて `metadata` のデフォルト値を自動設定
  - `daily_distribution` → `{ type: 'daily_distribution' }`
  - `use` → `{ type: 'use' }`
  - `exchange` → `{ type: 'exchange', fromCoinTypeId, toCoinTypeId, rate }`
  - `stamp_reward` → `{ type: 'stamp_reward', stampCardId }`
- 既存ファクトリパターン（CoinFactory / CoinTypeFactory / DailyCoinDistributionFactory）に準拠

## 2. エクスポート追加

- `factories/mod.ts` に `buildCoinTransaction`, `createCoinTransaction` を追加
- `test-helpers/mod.ts` に同関数を追加

## 3. CoinUseCase テストの補強

`packages/data/usecases/CoinUseCase_test.ts`

既存の `increaseBy` / `decreaseBy` テストケースで、KV に保存された CoinTransaction を取得して以下を assert:

- `coin_transactions` キー配下にトランザクションが保存されていること
- `amount`（delta 値）と `balance`（操作後の残高）が正しいこと
- `transactionType` と `metadata` が正しいこと
- `userId` / `familyId` / `coinTypeId` が一致すること

KV の `list` API を使って `['coin_transactions', userId, familyId, coinTypeId]` prefix でトランザクションを列挙する。

---

# Results

## 作成・変更ファイル

| ファイル                                                         | 変更内容                                                          |
| ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| `packages/data/test-helpers/factories/CoinTransactionFactory.ts` | 新規作成。`buildCoinTransaction` / `createCoinTransaction` を提供 |
| `packages/data/test-helpers/factories/mod.ts`                    | エクスポート追加                                                  |
| `packages/data/test-helpers/mod.ts`                              | エクスポート追加                                                  |
| `packages/data/usecases/CoinUseCase_test.ts`                     | トランザクション検証を 4 テストケースに追加                       |

## テスト補強の詳細

- `decreaseBy` — トランザクションの `amount`（-300）、`balance`（700）、`transactionType`、`metadata`、関連 ID を検証
- `increaseBy` — トランザクションの `amount`（300）、`balance`（1300）、`transactionType`、`metadata`、関連 ID を検証
- `decreaseBy` 連続実行 — 3 件のトランザクション保存を確認
- `insufficient balance` エラー時 — トランザクションが 0 件（保存されない）ことを確認
- concurrent operations — 4 件のトランザクション保存を確認

全 13 テスト（72 ステップ）パス。

Status: Planned

# Summary

CoinType を削除したとき、残った TimeSession や DailySummary など履歴からコインの情報が消えてしまう問題への対策。

---

# Details

CoinType は以下のエンティティから参照されている:

- **Coin**: ユーザーが保有するコインの種類定義（`coinTypeId`）
- **CoinTransaction**: 取引履歴（`coinTypeId`）
- **UserDailySummary**: 日次集計データ（`coinTypeId`）
- **TimeSession**: 時間の残高履歴（`coinTypeId`）
- **ActiveTimer**: 実行中タイマー（`coinTypeId`）
- **ExchangeRate**: 交換レート（`fromCoinTypeId`, `toCoinTypeId`）
- **StampType**: お手伝いパスポートの報酬（`rewardCoinTypeId`）

なお、`active` フィールドは配布を一時停止するためのポーズ機能であり、削除とは別の概念。
MVP 要件に削除機能は明示的に記載されていない。

# Approach

**案1: 論理削除（Soft Delete）を採用**（MVP 段階での推奨）

`CoinTypeDataModel` に `deleted: boolean` と `deletedAt?: string` を追加。

**active と deleted の使い分け**:

| フィールド      | 用途     | UI表示 | 配布 | 使用 | 復元       |
| --------------- | -------- | ------ | ---- | ---- | ---------- |
| `active: true`  | 通常運用 | o      | o    | o    | -          |
| `active: false` | 一時停止 | o      | x    | o    | 簡単       |
| `deleted: true` | 削除済み | x      | x    | x    | 管理者のみ |

**実装優先度**:

1. `CoinTypeDataModel` に `deleted` フィールド追加
2. `CoinTypeUseCase.deleteById` を論理削除に変更
3. `CoinTypeUseCase.listAllByFamily` に `deleted === false` フィルタ追加
4. `CoinTypeUseCase.getById` の削除済み処理（null を返す）
5. テストケースの追加・更新
6. 既存データのマイグレーション

---

# Results

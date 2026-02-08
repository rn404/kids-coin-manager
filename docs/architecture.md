# Architecture

このドキュメントでは、kids-coin-manager プロジェクトのアーキテクチャ設計原則を定義します。

## レイヤー構成

このプロジェクトは Fresh（SSR）を使用しており、以下のレイヤー構成を採用しています。

```
Client (Browser)
  ↓
Fresh Routes (/routes/api/*, /routes/*)
  ↓
Application Service Layer（ユーザー視点のユースケース）
  ↓
Domain UseCase Layer（データ操作の単位）
  ↓
Data Model / Deno KV
```

## 各レイヤーの責務

### 1. Fresh Routes Layer

**責務:**

- HTTPリクエストの受付とレスポンスの返却
- ルーティング
- セッション管理・認証チェック
- Application Service Layer への委譲

**実装場所:**

- `/routes/api/*` - API エンドポイント
- `/routes/*` - SSR ページ

**注意事項:**

- ビジネスロジックを含めない
- Application Service を呼び出すのみ

### 2. Application Service Layer

**責務:**

- ユーザー視点のユースケースの実装
- ユーザーインプットのバリデーション
- 複数の Domain UseCase を組み合わせたビジネスロジック
- トランザクション境界の定義

**実装場所:**

- `/packages/application/services/*` (今後作成予定)

**例:**

- `PlayGameWithTimerService` - タイマーを使ったゲームプレイ
  - ユーザーの入力をバリデート
  - タイマーセッションの開始
  - コインの消費（`CoinUseCase.decreaseBy` を呼び出し）
- `GiveDailyCoinService` - 毎日のコイン配布
  - 配布条件のチェック（すでに配布済みでないか等）
  - コインの付与（`CoinUseCase.increaseBy` を呼び出し）

**注意事項:**

- ユーザー視点のビジネスロジックはここに集約
- Domain UseCase を直接 Routes から呼び出さない

### 3. Domain UseCase Layer

**責務:**

- データベース視点の汎用的な操作
- データの整合性保証（楽観的ロック、制約チェック）
- トランザクション履歴の記録

**実装場所:**

- `/packages/data/usecases/*`

**例:**

- `CoinUseCase`
  - `increaseBy()` - コインを増やす（汎用的なメソッド）
  - `decreaseBy()` - コインを減らす（汎用的なメソッド）
  - `findById()` - コインを取得する

**設計原則:**

- **汎用性:** 特定のビジネスケースに依存しない
- **再利用可能:** Application Service から様々なケースで呼び出せる
- **型安全:** `transactionType` と `metadata` を受け取り、適切な型を保証

**CoinUseCase の例:**

```typescript
// Application Service から呼び出す例
await coinUseCase.decreaseBy(userId, familyId, coinTypeId, {
  amount: 5,
  transactionType: 'use',
  metadata: {
    type: 'use',
    timeSessionId: 'session-123',
  },
},)

await coinUseCase.increaseBy(userId, familyId, coinTypeId, {
  amount: 10,
  transactionType: 'daily_distribution',
  metadata: {
    type: 'daily_distribution',
  },
},)
```

**注意事項:**

- `transactionType` と `metadata` をパラメータとして受け取る
- 特定のビジネスケース専用のメソッドは作らない
- バリデーションは Application Service で行う（UseCase は技術的な制約のみチェック）

### 4. Data Model Layer

**責務:**

- データ構造の定義
- Deno KV へのアクセス

**実装場所:**

- `/packages/data/*.ts`

**例:**

- `CoinDataModel` - コインのデータ構造
- `CoinTransactionDataModel` - コイン取引履歴のデータ構造

## データフロー例

### タイマーを使ったゲームプレイの場合

```
1. Client → POST /api/timer/start { coinAmount: 5 }

2. Fresh Route → PlayGameWithTimerService.start()

3. PlayGameWithTimerService
   ↓ バリデーション（coinAmount が正の整数か等）
   ↓ CoinUseCase.decreaseBy(userId, familyId, coinTypeId, {
       amount: 5,
       transactionType: 'use',
       metadata: { type: 'use', timeSessionId: 'xxx' }
     })

4. CoinUseCase
   ↓ 残高チェック（技術的制約）
   ↓ Deno KV に保存
   ↓ トランザクション履歴を記録

5. Response ← 成功
```

## 設計原則まとめ

1. **関心の分離:** 各レイヤーは明確な責務を持つ
2. **単方向の依存:** 上位レイヤーは下位レイヤーに依存するが、逆は許可しない
3. **汎用性と特化のバランス:**
   - Domain UseCase は汎用的に設計
   - Application Service はビジネスケースに特化
4. **バリデーションの配置:**
   - ユーザー入力のバリデーション → Application Service
   - 技術的制約のチェック → Domain UseCase
5. **トランザクション境界:** Application Service でトランザクション境界を定義

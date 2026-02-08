# Kids Coin Manager

- 一日2枚コインが配布される
- 使うボタンで15分テレビがみれる
  - Timer モードに入るか、Timerモードをスキップして減らすだけもできる
  - Timer モードに入った場合、Timer ストップで残り時間をストックもできる
- 5枚でゲームコイン1枚に変えられる
- 両替アリ
- お手伝いパスポートがある。お手伝いを5回、やって集めたスタンプでテレビコイン1枚と交換できる

## Pages

- Main(Root)
  - 今のコイン枚数がわかる
- Timer
  - 利用中コインのタイマー機能
- Stamps
  - お手伝いパスポートのページ
- Manage
  - 管理アカウント側がみれる設定ページ、今は実装しない

## Models

- 将来的に、お手伝いパスポートは管理アカウントで定義をすることができるようにする
- 将来的に、コインの種類とコインの交換レート、設定時間は管理アカウントで定義をすることができるようにする

```mermaid
  erDiagram
      User ||--o{ Coin : "has"
      User ||--o{ StampCard : "has"
      User ||--o{ CoinTransaction : "has"
      User ||--o{ UserDailySummary : "has"
      User ||--o{ TimeSession : "has"
      User ||--o| ActiveTimer : "has"

      CoinType ||--o{ Coin : "defines"
      CoinType ||--o{ ExchangeRate : "from"
      CoinType ||--o{ ExchangeRate : "to"
      CoinType ||--o{ StampType : "rewards"
      CoinType ||--o{ CoinTransaction : "records"
      CoinType ||--o{ UserDailySummary : "tracks"
      CoinType ||--o{ TimeSession : "defines"
      CoinType ||--o| ActiveTimer : "defines"

      StampType ||--o{ StampCard : "defines"
      StampCard ||--o{ CoinTransaction : "generates"

      User {
          string id PK
          string name
          datetime createdAt
      }

      Coin {
          string id PK
          string userId FK
          string coinTypeId FK
          int amount "現在の残高"
          datetime updatedAt
      }

      UserDailySummary {
          string id PK
          string userId FK
          string coinTypeId FK
          date summaryDate "集計日"
          int coinsUsed "使用したコイン数"
          int minutesUsed "使用した時間"
          datetime updatedAt
      }

      CoinType {
          string id PK
          string name "テレビ、ゲームなど"
          int durationMinutes "設定時間"
          int dailyDistribution "一日の配布枚数"
          boolean isActive
      }

      ExchangeRate {
          string id PK
          string fromCoinTypeId FK
          string toCoinTypeId FK
          int rate "交換レート(例:5枚→1枚)"
      }

      StampCard {
          string id PK
          string userId FK
          string stampTypeId FK
          int currentStamps "現在のスタンプ数"
          boolean isCompleted
          datetime completedAt
          datetime createdAt
      }

      StampType {
          string id PK
          string name "お手伝い、読書など"
          int requiredStamps "必要なスタンプ数"
          string rewardCoinTypeId FK "報酬のコイン種類"
          int rewardAmount "報酬の枚数"
          boolean isActive
      }

      CoinTransaction {
          string id PK
          string userId FK
          string coinTypeId FK
          int amount "増減額"
          int balance "取引後の残高"
          object metadata "type: daily_distribution | use | exchange | stamp_reward"
          datetime createdAt
      }

      TimeSession {
          string id PK
          string userId FK
          string coinTypeId FK
          int remainingSeconds "残り時間(秒)"
          int remainingNanos "残り時間(ナノ秒、optional)"
          datetime startedAt "このセッション開始時刻"
          datetime stoppedAt "このセッション停止時刻"
          datetime createdAt
          datetime updatedAt
      }

      ActiveTimer {
          string id PK
          string userId FK
          string coinTypeId FK
          datetime startedAt "タイマー開始時刻"
          datetime createdAt
          datetime updatedAt
      }
```

### TimeSession について

- 時間の残高履歴を管理
- 複数レコード存在可能
- デフラグで統合可能
- `remainingSeconds` と `remainingNanos` で Duration型を表現

### ActiveTimer について

- 実行中のタイマーを管理
- userId + coinTypeId で1レコードのみ
- 実行中のときだけ存在する

### Duration型

```typescript
type Duration = {
  seconds: number
  nanos?: number // ナノ秒（オプショナル）
}
```

protobuf の `google.protobuf.Duration` を参考にした構造体。
TimeSessionでは `remainingSeconds` と `remainingNanos` として保存される。

## Account

- User
- Family
- Role
  - Manager
  - Member

# Use Cases

## MVP

- Session
  - セッション開始時に当日分のコインを配布する
- CoinManage
  - CoinType を追加する
  - CoinType を編集する
- Coin
  - Coin を使う
  - Coin を増やす
- Timer
  - Timerを使う
  - Timerを止める

# TimeSession と ActiveTimer の設計判断

日付: 2026-01-31

## 背景

コインを使って時間計測を開始した際、以下の2つの要件がある：

1. **実行中のタイマー管理**: 今動いているタイマーの状態（開始時刻など）
2. **時間の残高履歴管理**: 中断した残り時間の保存と履歴

これらは責務が異なるため、2つのモデルに分離する：

- **ActiveTimer**: 実行中のタイマー（1つのみ）
- **TimeSession**: 時間の残高履歴（複数可、デフラグ可能）

## 設計の基本方針

### CoinとCoinTransactionの関係

- **Coinを使う → 即座にCoinTransaction作成**
  - タイマー画面に入った瞬間に `Coin.amount` が減る
  - 同時に `CoinTransaction` が作成される（これが使用履歴）
  - CoinTransactionは時間計測とは無関係

### ActiveTimerの役割

- **実行中のタイマー状態を管理**
  - userId + coinTypeId で **1レコードのみ** 存在
  - タイマーが実行中のときだけ存在する
  - `startedAt` で開始時刻を記録し、経過時間を計算可能
  - タイマー停止時に削除される

### TimeSessionの役割

- **時間の残高履歴を管理**
  - 複数レコード存在可能（履歴として残る）
  - `remainingDuration` で残り時間を保持
  - タイマー停止時に作成される
  - デフラグ操作で複数のTimeSessionを統合可能
  - 蓄積された時間が `CoinType.durationMinutes` に達したら、1枚のコインに変換可能
  - マイナス値も許容（時間超過の記録）

## モデル構造

### ActiveTimer（実行中タイマー）

```typescript
ActiveTimer {
  id: string
  userId: string
  coinTypeId: string
  startedAt: ISODateTimeString  // タイマー開始時刻
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}
```

- userId + coinTypeId で **1レコードのみ**
- タイマー実行中のときだけ存在

### TimeSession（時間残高履歴）

```typescript
TimeSession {
  id: string
  userId: string
  coinTypeId: string
  remainingDuration: Duration    // 残り時間
  startedAt: ISODateTimeString   // このセッション開始時刻
  stoppedAt: ISODateTimeString   // このセッション停止時刻
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}
```

- **複数レコード存在可能**（履歴として残る）
- remainingDurationはマイナス値も許容

## ライフサイクル

### 1. タイマー開始

コイン使用時、既存のTimeSessionから時間を取得するか、新規にコインを消費する。

```typescript
// 1. CoinTransaction作成（コイン消費）
await createCoinTransaction({ amount: -1, type: 'use', },)

// 2. ActiveTimer作成
await createActiveTimer({
  userId,
  coinTypeId,
  startedAt: new Date().toISOString(),
},)
```

### 2. タイマー停止

実行中のタイマーを停止し、残り時間をTimeSessionとして保存する。

```typescript
// 1. ActiveTimerから経過時間を計算
const elapsed = Date.now() - new Date(activeTimer.startedAt,).getTime()
const elapsedSeconds = Math.floor(elapsed / 1000,)

// 2. 割り当て時間を取得（CoinTypeから）
const allocatedSeconds = coinType.durationMinutes * 60

// 3. 残り時間を計算（マイナスも許容）
const remainingSeconds = allocatedSeconds - elapsedSeconds

// 4. TimeSession作成
await createTimeSession({
  userId,
  coinTypeId,
  remainingDuration: { seconds: remainingSeconds, },
  startedAt: activeTimer.startedAt,
  stoppedAt: new Date().toISOString(),
},)

// 5. ActiveTimer削除
await deleteActiveTimer(activeTimer.id,)
```

### 3. デフラグ（複数TimeSessionの統合）

ユーザーが複数のTimeSessionを1つにまとめる操作。

```typescript
const sessions = [session1, session2, session3,]
const totalSeconds = sessions.reduce(
  (sum, s,) => sum + s.remainingDuration.seconds,
  0,
)

// Atomic操作で統合
const res = await kv.atomic()
  .check(session1,).check(session2,).check(session3,)
  .delete(session1.key,).delete(session2.key,).delete(session3.key,)
  .set(newSessionKey, {
    remainingDuration: { seconds: totalSeconds, },
    startedAt: new Date().toISOString(),
    stoppedAt: new Date().toISOString(),
  },)
  .commit()

if (!res.ok) {
  // リトライまたはユーザーに再試行を促す
}
```

### 4. TimeSessionからコイン変換

蓄積された時間をコインに変換する。

```typescript
// 15分以上あれば変換可能
if (timeSession.remainingDuration.seconds >= 900) {
  const coins = Math.floor(timeSession.remainingDuration.seconds / 900,)
  const remainingSeconds = timeSession.remainingDuration.seconds % 900

  // コイン追加
  await updateCoin({ amount: coins, },)
  await createCoinTransaction({ amount: coins, type: 'exchange', },)

  // TimeSession更新（余りを残す）
  if (remainingSeconds > 0) {
    await updateTimeSession({
      remainingDuration: { seconds: remainingSeconds, },
    },)
  } else {
    // 余りがなければ削除
    await deleteTimeSession(timeSession.id,)
  }
}
```

## 想定されるユースケース

### ケース1: 初回コイン使用とタイマー開始

1. コイン使用 → `Coin.amount--`, `CoinTransaction` 作成
2. `ActiveTimer` 作成（`startedAt: 14:00:00`）
3. 5分後に停止（14:05:00）
4. `TimeSession` 作成（`remainingDuration: { seconds: 600 }` = 10分残り）
5. `ActiveTimer` 削除

### ケース2: 既存TimeSessionから再開

1. 既存の `TimeSession` が存在（残り10分）
2. タイマー再開 → `ActiveTimer` 作成（この TimeSession を使用していることを記録）
3. 10分以上使用して停止（超過）
4. 新しい `TimeSession` 作成（`remainingDuration: { seconds: -120 }` = 2分超過）
5. `ActiveTimer` 削除

### ケース3: 複数TimeSessionのデフラグ

1. TimeSession A: 600秒（10分）
2. TimeSession B: 420秒（7分）
3. TimeSession C: -120秒（-2分、超過分）
4. デフラグ操作 → 統合
5. 新TimeSession: 900秒（15分）= コイン1枚分

### ケース4: 蓄積した時間をコインに変換

1. TimeSession: 1020秒（17分）
2. コイン変換操作 → 15分（900秒）をコイン1枚に
3. `Coin.amount++`, `CoinTransaction` 作成（type: 'exchange'）
4. TimeSession更新 → `remainingDuration: { seconds: 120 }` （2分残り）

### ケース5: 追加でコイン使用

1. 既存の `ActiveTimer` がないことを確認
2. 新しいコイン使用 → `Coin.amount--`, `CoinTransaction` 作成
3. `ActiveTimer` 作成
4. 停止時に新しい `TimeSession` が作成される

## データ整合性

### ActiveTimerの制約

- userId + coinTypeId で **1レコードのみ** 存在
- タイマー実行中のときだけ存在
- 新しいタイマー開始前に既存のActiveTimerがないことを確認

### TimeSessionの管理

- 複数レコード存在可能（履歴として残る）
- remainingDurationはマイナス値も許容（時間超過の記録）
- デフラグ操作で複数のTimeSessionを統合可能
- ユーザーが削除するまで残り続ける

### トランザクションエラー対処

デフラグ時のAtomic操作が失敗した場合：

```typescript
if (!res.ok) {
  // 楽観的ロックの競合発生
  // リトライまたはユーザーに「もう一度お試しください」を表示
}
```

## まとめ

### モデルの責務分離

- **ActiveTimer**: 実行中のタイマー状態管理（1つのみ）
- **TimeSession**: 時間の残高履歴管理（複数可、デフラグ可能）
- **CoinTransaction**: コイン使用履歴（TimeSessionとは独立）

### 主な特徴

- タイマー開始時に ActiveTimer 作成、停止時に TimeSession 作成
- TimeSessionは複数存在可能で、履歴として残る
- デフラグで複数TimeSessionを統合し、コイン変換も可能
- マイナス残高も許容し、超過分を記録
- タイマー機能はおまけ、コインカウントがメイン機能

### Duration型

```typescript
type Duration = {
  seconds: number
  nanos?: number // ナノ秒（オプショナル）
}
```

protobuf の `google.protobuf.Duration` を参考にした構造体。
意味のある構造体として定義し、そのままDeno KVに保存される。

## Duration型の定義

```typescript
type Duration = {
  seconds: number
  nanos?: number // ナノ秒（オプショナル）
}
```

protobuf の `google.protobuf.Duration` を参考にした構造体。
意味のある構造体として定義し、そのままDeno KVに保存される。

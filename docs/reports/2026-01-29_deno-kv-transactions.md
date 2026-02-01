# Deno KV トランザクション実装ガイド

**日付:** 2026-01-29
**目的:** Deno KVのAtomic操作を使ったトランザクション実装パターンを理解する

## 概要

Deno KVには従来のRDBMSのような `BEGIN/COMMIT/ROLLBACK` 構文はありませんが、**Atomic操作**を使って複数の操作をトランザクショナルに実行できます。

---

## Atomic操作の基本

### 基本構文

```typescript
const res = await kv.atomic()
  .check(existingRecord,) // バージョンチェック（競合検知）
  .set(key1, value1,) // 操作1
  .set(key2, value2,) // 操作2
  .delete(key3,) // 操作3
  .commit() // コミット

if (!res.ok) {
  // 競合が発生（他の誰かが同時に更新した）
  // リトライする必要がある
}
```

### 利用可能な操作

- **`.check(entry)`** - バージョンチェック（楽観的ロック）
- **`.set(key, value)`** - データの設定
- **`.delete(key)`** - データの削除
- **`.mutate({ type: 'sum', key, value })`** - 数値の加算（KvU64用）
- **`.commit()`** - トランザクションのコミット

---

## 特徴

### 1. 楽観的ロック（Optimistic Locking）

```typescript
// 1. データを読み取る
const user = await kv.get(['users', userId,],)

// 2. バージョンをチェックしながら更新
const res = await kv.atomic()
  .check(user,) // versionstampが変更されていないか確認
  .set(['users', userId,], {
    ...user.value,
    score: user.value.score + 10,
  },)
  .commit()

if (!res.ok) {
  // 他の誰かが同時に更新した
  console.log('競合が発生しました',)
}
```

**ポイント**:

- `.check()` で取得時の `versionstamp` を検証
- 他の処理が更新していたら `res.ok = false`
- ロックを取得せず、コミット時に検証（楽観的）

### 2. All or Nothing

```typescript
// 全ての操作が成功するか、全て失敗するか
const res = await kv.atomic()
  .set(['users', userId,], userData,)
  .set(['user_index', email,], userId,)
  .delete(['old_user', oldId,],)
  .commit()

// いずれか1つでも失敗したら、全て実行されない
```

### 3. 複数操作の組み合わせ

```typescript
// set, delete, mutate を自由に組み合わせ可能
const res = await kv.atomic()
  .set(key1, value1,)
  .set(key2, value2,)
  .delete(key3,)
  .mutate({ type: 'sum', key: counterKey, value: new Deno.KvU64(1n,), },)
  .commit()
```

---

## 実用的なパターン

### パターン1: 単純なデータ追加（トランザクション不要）

```typescript
// 単一操作はAtomic不要
async addCoin(userId: string, familyId: string, coin: CoinInput) {
  const kv = await getKv()
  const coinId = v7.generate()

  const newCoin: Coin = {
    ...coin,
    id: coinId,
    userId,
    createdAt: new Date().toISOString(),
  }

  // 単純なset操作
  await kv.set(['coins', familyId, userId, coinId], newCoin)
  return newCoin
}
```

### パターン2: 複数データの同時更新（トランザクション必要）

```typescript
// コイン追加 + 統計情報の更新
async addCoinWithStats(
  userId: string,
  familyId: string,
  coin: CoinInput,
) {
  const kv = await getKv()
  const coinId = v7.generate()

  // 統計情報を取得
  const statsKey = ['user_stats', familyId, userId]
  const stats = await kv.get(statsKey)

  // Atomic操作で同時更新
  const res = await kv.atomic()
    .check(stats)  // 統計情報の競合チェック
    .set(['coins', familyId, userId, coinId], {
      ...coin,
      id: coinId,
      userId,
      createdAt: new Date().toISOString(),
    })
    .set(statsKey, {
      ...stats.value,
      totalCoins: (stats.value?.totalCoins || 0) + coin.amount,
      lastUpdated: new Date().toISOString(),
    })
    .commit()

  if (!res.ok) {
    throw new Error('Conflict detected, please retry')
  }
}
```

### パターン3: 条件付き挿入

```typescript
// データが存在しない場合のみ挿入
async createUserIfNotExists(userId: string, userData: User) {
  const kv = await getKv()
  const userKey = ['users', userId]

  const res = await kv.atomic()
    .check({ key: userKey, versionstamp: null })  // null = データが存在しない
    .set(userKey, userData)
    .commit()

  if (!res.ok) {
    throw new Error('User already exists')
  }
}
```

### パターン4: 資金移動（複数アカウントの同時更新）

```typescript
async transferFunds(
  senderId: string,
  receiverId: string,
  amount: number,
) {
  const kv = await getKv()
  const senderKey = ['accounts', senderId]
  const receiverKey = ['accounts', receiverId]

  // リトライループ
  let success = false
  let retries = 0
  const maxRetries = 3

  while (!success && retries < maxRetries) {
    // 現在の残高を取得
    const [sender, receiver] = await kv.getMany([senderKey, receiverKey])

    if (!sender.value || !receiver.value) {
      throw new Error('Account not found')
    }

    if (sender.value.balance < amount) {
      throw new Error('Insufficient funds')
    }

    // Atomic操作で送金
    const res = await kv.atomic()
      .check(sender)   // 送信者の残高が変更されていないか確認
      .check(receiver) // 受信者の残高が変更されていないか確認
      .set(senderKey, {
        ...sender.value,
        balance: sender.value.balance - amount,
      })
      .set(receiverKey, {
        ...receiver.value,
        balance: receiver.value.balance + amount,
      })
      .commit()

    if (res.ok) {
      success = true
    } else {
      retries++
      // 指数バックオフで待機
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, retries) * 100)
      )
    }
  }

  if (!success) {
    throw new Error('Transaction failed after retries')
  }
}
```

### パターン5: カスケード削除

```typescript
// ユーザー削除時に関連データも削除
async deleteUser(userId: string, familyId: string) {
  const kv = await getKv()

  // 関連データを取得
  const coins = []
  for await (const entry of kv.list({
    prefix: ['coins', familyId, userId]
  })) {
    coins.push(entry.key)
  }

  // Atomic操作で全て削除
  const atomic = kv.atomic()

  atomic.delete(['users', userId])

  for (const coinKey of coins) {
    atomic.delete(coinKey)
  }

  await atomic.commit()
}
```

---

## リトライパターン

### 基本的なリトライ関数

```typescript
async function withRetry<T,>(
  fn: () => Promise<{ ok: boolean; value?: T }>,
  maxRetries = 3,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    const result = await fn()

    if (result.ok) {
      return result.value!
    }

    if (i < maxRetries - 1) {
      // 指数バックオフ
      await new Promise((resolve,) =>
        setTimeout(resolve, Math.pow(2, i,) * 100,)
      )
    }
  }

  throw new Error('Operation failed after retries',)
}

// 使用例
const updatedUser = await withRetry(async () => {
  const user = await kv.get(['users', userId,],)

  const res = await kv.atomic()
    .check(user,)
    .set(['users', userId,], {
      ...user.value,
      score: user.value.score + 10,
    },)
    .commit()

  return { ok: res.ok, value: user.value, }
},)
```

---

## 数値操作（KvU64）

### カウンターの安全な更新

```typescript
// カウンターの加算
async incrementCounter(key: string[]) {
  const kv = await getKv()

  const counter = await kv.get<Deno.KvU64>(key)

  const res = await kv.atomic()
    .check(counter)
    .mutate({
      type: 'sum',
      key,
      value: new Deno.KvU64(1n),
    })
    .commit()

  if (!res.ok) {
    throw new Error('Conflict detected')
  }
}
```

---

## ベストプラクティス

### 1. 単純な操作はAtomicを使わない

```typescript
// ✅ 良い例：単一操作
await kv.set(key, value,)

// ❌ 悪い例：不要なAtomic
await kv.atomic().set(key, value,).commit()
```

### 2. checkは必要な時だけ使う

```typescript
// ✅ 良い例：競合が予想される場合のみcheck
const user = await kv.get(userKey,)
await kv.atomic()
  .check(user,) // 必要
  .set(userKey, newValue,)
  .commit()

// ✅ 良い例：新規作成時はcheckなし
await kv.atomic()
  .set(newKey, newValue,) // checkなしでOK
  .commit()
```

### 3. リトライロジックを実装する

```typescript
// 競合が発生する可能性がある操作には必ずリトライを実装
let success = false
let retries = 0

while (!success && retries < 3) {
  const res = await kv.atomic()
    .check(existingData,)
    .set(key, newValue,)
    .commit()

  if (res.ok) {
    success = true
  } else {
    retries++
  }
}
```

### 4. 大量の操作はバッチ化しない

```typescript
// ❌ 悪い例：1000個の操作を1つのAtomicに
const atomic = kv.atomic()
for (let i = 0; i < 1000; i++) {
  atomic.set(['items', i,], data,)
}
await atomic.commit() // タイムアウトやメモリ不足の可能性

// ✅ 良い例：適切なサイズに分割
const batchSize = 100
for (let i = 0; i < 1000; i += batchSize) {
  const atomic = kv.atomic()
  for (let j = i; j < i + batchSize && j < 1000; j++) {
    atomic.set(['items', j,], data,)
  }
  await atomic.commit()
}
```

---

## このプロジェクトでの推奨事項

### 最初はシンプルに

```typescript
// フェーズ1: シンプルなCRUD操作
async addCoin(userId: string, familyId: string, coin: CoinInput) {
  const kv = await getKv()
  await kv.set(['coins', familyId, userId, coinId], newCoin)
}
```

### 必要になったらAtomicを追加

```typescript
// フェーズ2: 統計情報も更新する必要が出たら
async addCoin(userId: string, familyId: string, coin: CoinInput) {
  const kv = await getKv()
  const stats = await kv.get(['user_stats', familyId, userId])

  await kv.atomic()
    .check(stats)
    .set(['coins', familyId, userId, coinId], newCoin)
    .set(['user_stats', familyId, userId], updatedStats)
    .commit()
}
```

---

## まとめ

- Deno KVは **Atomic操作** でトランザクションを実装
- **楽観的ロック** により競合を検知
- **All or Nothing** で整合性を保証
- 単純な操作にはAtomicは不要
- 競合が予想される操作にはリトライロジックを実装

---

## 参考資料

### 公式ドキュメント

- [Transactions - Deno KV Manual](https://docs.deno.com/deploy/kv/manual/transactions/)
- [Deno.AtomicOperation API](https://docs.deno.com/api/deno/~/Deno.AtomicOperation)
- [Deno.Kv API Reference](https://docs.deno.com/api/deno/~/Deno.Kv)

### 内部ドキュメント

- [Deno KV使い方レポート](./2026-01-04_deno-kv-usage-and-local-behavior.md)

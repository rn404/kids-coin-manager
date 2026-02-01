# Deno KV 外部キー制約の実装パターン

**日付:** 2026-01-29
**目的:** Deno KVにおける外部キー制約の代替実装方法を理解する

## 概要

Deno KVはスキーマレスなキーバリューストアであり、RDBMSのような**外部キー制約は存在しません**。データの整合性はアプリケーション層で管理する必要があります。

---

## 外部キー制約とは

### RDBMSでの外部キー制約

```sql
-- RDBMSの例
CREATE TABLE coins (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- userが存在しない場合、INSERTは失敗する
-- userを削除すると、関連するcoinsも自動削除される
```

### Deno KVでの課題

```typescript
// ❌ Deno KVにはFOREIGN KEY制約がない
await kv.set(['coins', familyId, userId, coinId,], {
  userId: 'non-existent-user', // 存在しないuserIdでも保存できてしまう
},)

// ❌ CASCADE DELETE も自動実行されない
await kv.delete(['users', userId,],)
// 関連するcoinsは残ったまま（孤児データ）
```

---

## 解決策1: 参照チェック（作成時）

### 基本パターン

```typescript
// コイン追加時にユーザーの存在を確認
async function addCoin(
  userId: string,
  familyId: string,
  coin: CoinInput,
) {
  const kv = await getKv()

  // 外部キー制約の代わり：ユーザーの存在確認
  const user = await kv.get(['users', userId,],)
  if (!user.value) {
    throw new Error(`User not found: ${userId}`,)
  }

  // Familyの存在確認
  const family = await kv.get(['families', familyId,],)
  if (!family.value) {
    throw new Error(`Family not found: ${familyId}`,)
  }

  // データを保存
  const coinId = v7.generate()
  await kv.set(['coins', familyId, userId, coinId,], {
    ...coin,
    id: coinId,
    userId,
    createdAt: new Date().toISOString(),
  },)

  return coinId
}
```

**メリット**:

- シンプルで理解しやすい
- エラーメッセージが明確

**デメリット**:

- 追加のクエリが必要（パフォーマンス）
- 存在確認とデータ挿入の間に競合の可能性

### Atomic操作で整合性を保証

```typescript
// 存在確認とデータ挿入を同時に実行
async function addCoinAtomic(
  userId: string,
  familyId: string,
  coin: CoinInput,
) {
  const kv = await getKv()

  // ユーザーとFamilyを取得
  const [user, family,] = await kv.getMany([
    ['users', userId,],
    ['families', familyId,],
  ],)

  if (!user.value) {
    throw new Error(`User not found: ${userId}`,)
  }

  if (!family.value) {
    throw new Error(`Family not found: ${familyId}`,)
  }

  // Atomic操作で整合性を保証
  const coinId = v7.generate()
  const res = await kv.atomic()
    .check(user,) // ユーザーが削除されていないか確認
    .check(family,) // Familyが削除されていないか確認
    .set(['coins', familyId, userId, coinId,], {
      ...coin,
      id: coinId,
      userId,
      createdAt: new Date().toISOString(),
    },)
    .commit()

  if (!res.ok) {
    throw new Error('User or Family was modified, please retry',)
  }

  return coinId
}
```

---

## 解決策2: CASCADE DELETE（削除時）

### 基本的なカスケード削除

```typescript
// ユーザー削除時に関連データも削除
async function deleteUser(userId: string, familyId: string,) {
  const kv = await getKv()

  // 1. 関連するコインを全て取得
  const coinKeys: Deno.KvKey[] = []
  for await (
    const entry of kv.list({
      prefix: ['coins', familyId, userId,],
    },)
  ) {
    coinKeys.push(entry.key,)
  }

  // 2. Atomic操作で全て削除
  const atomic = kv.atomic()

  // ユーザーを削除
  atomic.delete(['users', userId,],)

  // 関連するコインも削除
  for (const coinKey of coinKeys) {
    atomic.delete(coinKey,)
  }

  await atomic.commit()
}
```

### 複数エンティティのカスケード削除

```typescript
// Familyを削除する際、関連する全データを削除
async function deleteFamily(familyId: string,) {
  const kv = await getKv()

  // 1. Family配下の全データを収集
  const keysToDelete: Deno.KvKey[] = []

  // Familyに属するユーザー
  for await (const entry of kv.list({ prefix: ['users', familyId,], },)) {
    keysToDelete.push(entry.key,)
  }

  // Familyに属するコイン
  for await (const entry of kv.list({ prefix: ['coins', familyId,], },)) {
    keysToDelete.push(entry.key,)
  }

  // Familyに属するスタンプカード
  for await (
    const entry of kv.list({ prefix: ['stamp_cards', familyId,], },)
  ) {
    keysToDelete.push(entry.key,)
  }

  // 2. Atomic操作で一括削除
  const atomic = kv.atomic()

  atomic.delete(['families', familyId,],)

  for (const key of keysToDelete) {
    atomic.delete(key,)
  }

  await atomic.commit()
}
```

### バッチ削除（大量データ対応）

```typescript
// 大量のデータがある場合はバッチ化
async function deleteFamilyWithBatch(familyId: string,) {
  const kv = await getKv()
  const batchSize = 100

  // Familyに関連する全キーを収集
  const allKeys: Deno.KvKey[] = []

  for await (
    const entry of kv.list({ prefix: ['coins', familyId,], },)
  ) {
    allKeys.push(entry.key,)
  }

  // バッチごとに削除
  for (let i = 0; i < allKeys.length; i += batchSize) {
    const batch = allKeys.slice(i, i + batchSize,)
    const atomic = kv.atomic()

    for (const key of batch) {
      atomic.delete(key,)
    }

    await atomic.commit()
  }

  // 最後にFamilyを削除
  await kv.delete(['families', familyId,],)
}
```

---

## 解決策3: 階層的なキー構造

### パターン：親子関係をキーで表現

```typescript
// キー構造自体で関係性を表現
;['coins', familyId, userId, coinId,]
//        ^^^^^^^^  ^^^^^^
//        親エンティティを含める

// メリット：
// 1. Family配下のUserのみアクセス可能（暗黙的な外部キー）
// 2. Userを削除する際、プレフィックス検索で関連データを見つけやすい
// 3. 誤って他のFamilyのUserにアクセスすることを防ぐ
```

### 実装例

```typescript
// ユーザーのコインを全て取得（Familyスコープ内）
async function getUserCoins(userId: string, familyId: string,) {
  const kv = await getKv()

  // familyIdとuserIdの両方を指定することで、
  // 他のFamilyのデータにアクセスできない
  const coins = []
  for await (
    const entry of kv.list({
      prefix: ['coins', familyId, userId,],
    },)
  ) {
    coins.push(entry.value,)
  }

  return coins
}

// ユーザー削除時は、プレフィックスで簡単に関連データを削除
async function deleteUserSimple(userId: string, familyId: string,) {
  const kv = await getKv()
  const atomic = kv.atomic()

  // ユーザーを削除
  atomic.delete(['users', userId,],)

  // プレフィックスで関連データを全て削除
  for await (
    const entry of kv.list({
      prefix: ['coins', familyId, userId,],
    },)
  ) {
    atomic.delete(entry.key,)
  }

  for await (
    const entry of kv.list({
      prefix: ['stamp_cards', familyId, userId,],
    },)
  ) {
    atomic.delete(entry.key,)
  }

  await atomic.commit()
}
```

---

## 解決策4: 参照カウント

### パターン：削除前にチェック

```typescript
// Userが削除できるか確認（関連データがあるか）
async function canDeleteUser(
  userId: string,
  familyId: string,
): Promise<boolean> {
  const kv = await getKv()

  // コインが存在するかチェック
  for await (
    const _ of kv.list({
      prefix: ['coins', familyId, userId,],
      limit: 1, // 1件でもあればNG
    },)
  ) {
    return false // 関連データがある
  }

  // スタンプカードが存在するかチェック
  for await (
    const _ of kv.list({
      prefix: ['stamp_cards', familyId, userId,],
      limit: 1,
    },)
  ) {
    return false
  }

  return true // 削除可能
}

// 削除前に確認
async function safeDeleteUser(userId: string, familyId: string,) {
  const canDelete = await canDeleteUser(userId, familyId,)

  if (!canDelete) {
    throw new Error(
      'Cannot delete user: related data exists. Please delete related data first.',
    )
  }

  await kv.delete(['users', userId,],)
}
```

### 参照カウントの保持

```typescript
// ユーザーごとのコイン数を保持
interface UserStats {
  coinCount: number
  stampCardCount: number
  updatedAt: string
}

// コイン追加時にカウントを更新
async function addCoinWithCounter(
  userId: string,
  familyId: string,
  coin: CoinInput,
) {
  const kv = await getKv()

  const statsKey = ['user_stats', familyId, userId,]
  const stats = await kv.get<UserStats>(statsKey,)

  const coinId = v7.generate()
  const res = await kv.atomic()
    .check(stats,)
    .set(['coins', familyId, userId, coinId,], {
      ...coin,
      id: coinId,
      userId,
      createdAt: new Date().toISOString(),
    },)
    .set(statsKey, {
      coinCount: (stats.value?.coinCount || 0) + 1,
      stampCardCount: stats.value?.stampCardCount || 0,
      updatedAt: new Date().toISOString(),
    },)
    .commit()

  if (!res.ok) {
    throw new Error('Conflict detected, please retry',)
  }
}

// 削除前にカウントをチェック
async function canDeleteUserByStats(
  userId: string,
  familyId: string,
): Promise<boolean> {
  const kv = await getKv()
  const stats = await kv.get<UserStats>(['user_stats', familyId, userId,],)

  if (!stats.value) return true

  // カウントが0なら削除可能
  return stats.value.coinCount === 0 && stats.value.stampCardCount === 0
}
```

---

## 解決策5: ソフトデリート

### パターン：論理削除

```typescript
// 削除フラグを使った論理削除
interface User {
  id: string
  name: string
  deletedAt: string | null // 削除日時（nullなら有効）
}

// 削除（論理）
async function softDeleteUser(userId: string,) {
  const kv = await getKv()
  const user = await kv.get<User>(['users', userId,],)

  if (!user.value) {
    throw new Error('User not found',)
  }

  await kv.set(['users', userId,], {
    ...user.value,
    deletedAt: new Date().toISOString(),
  },)
}

// 取得時に削除済みを除外
async function getActiveUser(userId: string,): Promise<User | null> {
  const kv = await getKv()
  const user = await kv.get<User>(['users', userId,],)

  if (!user.value || user.value.deletedAt) {
    return null // 削除済みまたは存在しない
  }

  return user.value
}

// コイン追加時に削除済みユーザーをチェック
async function addCoinWithSoftDeleteCheck(
  userId: string,
  familyId: string,
  coin: CoinInput,
) {
  const kv = await getKv()

  const user = await getActiveUser(userId,)
  if (!user) {
    throw new Error('User not found or deleted',)
  }

  // コインを追加
  const coinId = v7.generate()
  await kv.set(['coins', familyId, userId, coinId,], {
    ...coin,
    id: coinId,
    userId,
    createdAt: new Date().toISOString(),
  },)
}
```

**メリット**:

- データの復元が可能
- 削除の影響範囲が限定的
- 監査ログとして活用可能

**デメリット**:

- データが増え続ける
- クエリが複雑になる

---

## このプロジェクトでの推奨アプローチ

### フェーズ1: シンプルな参照チェック（オプション）

```typescript
// 作成時の参照チェックは最初はスキップしてもOK
async function addCoin(
  userId: string,
  familyId: string,
  coin: CoinInput,
) {
  const kv = await getKv()

  // オプション：ユーザーの存在確認
  // 開発初期はコメントアウトしても良い
  /*
  const user = await kv.get(['users', userId])
  if (!user.value) {
    throw new Error('User not found')
  }
  */

  const coinId = v7.generate()
  await kv.set(['coins', familyId, userId, coinId,], {
    ...coin,
    id: coinId,
    userId,
    createdAt: new Date().toISOString(),
  },)
}
```

### フェーズ2: CASCADE DELETE

```typescript
// 削除時は必ず関連データも削除
async function deleteUser(userId: string, familyId: string,) {
  const kv = await getKv()
  const atomic = kv.atomic()

  atomic.delete(['users', userId,],)

  // 関連データを削除
  for await (
    const entry of kv.list({
      prefix: ['coins', familyId, userId,],
    },)
  ) {
    atomic.delete(entry.key,)
  }

  for await (
    const entry of kv.list({
      prefix: ['stamp_cards', familyId, userId,],
    },)
  ) {
    atomic.delete(entry.key,)
  }

  await atomic.commit()
}
```

### フェーズ3: 必要に応じて参照チェックを追加

```typescript
// UIで問題が出たら、参照チェックを追加
async function addCoin(
  userId: string,
  familyId: string,
  coin: CoinInput,
) {
  const kv = await getKv()

  // 参照チェックを追加
  const user = await kv.get(['users', userId,],)
  if (!user.value) {
    throw new Error('User not found',)
  }

  // ... コインを追加
}
```

---

## ベストプラクティス

### 1. キー構造で関係性を表現

```typescript
// ✅ 良い例：親エンティティを含める
;['coins', familyId, userId, coinId,] // ❌ 悪い例：フラットな構造
  ['coins', coinId]
```

### 2. 削除時は必ずカスケード削除

```typescript
// ✅ 良い例：関連データも削除
async function deleteUser(userId: string, familyId: string,) {
  const atomic = kv.atomic()
  atomic.delete(['users', userId,],)
  // 関連データも削除
  for await (
    const entry of kv.list({ prefix: ['coins', familyId, userId,], },)
  ) {
    atomic.delete(entry.key,)
  }
  await atomic.commit()
}

// ❌ 悪い例：ユーザーだけ削除（孤児データが残る）
await kv.delete(['users', userId,],)
```

### 3. 作成時の参照チェックは状況次第

```typescript
// シンプルなアプリ：参照チェックなしでもOK
await kv.set(['coins', familyId, userId, coinId,], coin,)

// 複雑なアプリ：参照チェックを追加
const user = await kv.get(['users', userId,],)
if (!user.value) throw new Error('User not found',)
await kv.set(['coins', familyId, userId, coinId,], coin,)
```

### 4. 大量データの削除はバッチ化

```typescript
// 100件以上のデータを削除する場合
const batchSize = 100
for (let i = 0; i < keys.length; i += batchSize) {
  const batch = keys.slice(i, i + batchSize,)
  const atomic = kv.atomic()
  for (const key of batch) {
    atomic.delete(key,)
  }
  await atomic.commit()
}
```

---

## まとめ

- Deno KVには**外部キー制約がない**
- **アプリケーション層**で整合性を管理
- **階層的なキー構造**で関係性を表現
- **CASCADE DELETE**は必ず実装
- **参照チェック**は必要に応じて追加
- 最初はシンプルに、問題が出たら強化

---

## 参考資料

### 公式ドキュメント

- [Deno KV Quick Start](https://docs.deno.com/deploy/kv/)
- [Deno.AtomicOperation API](https://docs.deno.com/api/deno/~/Deno.AtomicOperation)

### 内部ドキュメント

- [Deno KV使い方レポート](./2026-01-04_deno-kv-usage-and-local-behavior.md)
- [実装戦略とデータ設計](./2026-01-12_implementation-strategy-and-data-design.md)
- [Deno KVトランザクション](./2026-01-29_deno-kv-transactions.md)

### 一般的なデータ整合性

- [Referential Integrity (Wikipedia)](https://en.wikipedia.org/wiki/Referential_integrity)
- [Cascade Delete Pattern](https://en.wikipedia.org/wiki/Cascading_delete)

# Deno KV N+1問題の解決パターン

**日付:** 2026-01-29
**目的:** Deno KVでのN+1問題を理解し、効果的な解決策を実装する

## 概要

N+1問題は、1回のクエリでリストを取得した後、各アイテムに対して追加のクエリを実行してしまう問題です。Deno KVでも同様の問題が発生する可能性があるため、適切な対策が必要です。

---

## N+1問題とは

### 問題の例

```typescript
// ❌ 悪い例：N+1クエリ
async getFamilyCoinsWithUsers(familyId: string) {
  const kv = await getKv()

  // 1. Family内の全コインを取得（1回のクエリ）
  const coinEntries = []
  for await (const entry of kv.list({ prefix: ['coins', familyId] })) {
    coinEntries.push(entry)
  }

  // 2. 各コインのユーザー情報を個別に取得（N回のクエリ）← N+1問題！
  const results = []
  for (const coin of coinEntries) {
    const user = await kv.get(['users', coin.value.userId])  // N回実行される
    results.push({
      coin: coin.value,
      user: user.value,
    })
  }

  return results
}
```

**問題点**:

- コインが100個あれば、101回のクエリが実行される（1 + 100）
- レイテンシーが増大
- パフォーマンスが低下

---

## 解決策1: `getMany()` で一括取得

### 基本パターン

```typescript
// ✅ 良い例：getMany()を使う
async getFamilyCoinsWithUsers(familyId: string) {
  const kv = await getKv()

  // 1. 全コインを取得
  const coinEntries = []
  for await (const entry of kv.list({ prefix: ['coins', familyId] })) {
    coinEntries.push(entry)
  }

  // 2. ユニークなuserIdを収集
  const userIds = [...new Set(
    coinEntries.map(e => e.value.userId)
  )]

  // 3. 全ユーザーを一括取得（1回のクエリ）
  const userKeys = userIds.map(id => ['users', id])
  const users = await kv.getMany(userKeys)

  // 4. マッピング
  const userMap = new Map(
    users.map((u, i) => [userIds[i], u.value])
  )

  // 5. 結合
  return coinEntries.map(coin => ({
    coin: coin.value,
    user: userMap.get(coin.value.userId),
  }))
}
```

**メリット**:

- クエリ数が大幅に削減（101回 → 2回）
- パフォーマンスが向上
- コードが明確

**デメリット**:

- 少し複雑になる

### `getMany()` の制限

```typescript
// getMany()は最大10個まで
const results = await kv.getMany([
  ['key1',],
  ['key2',],
  // ... 最大10個
],)

// 10個以上の場合は分割する
async function getManyBatch<T,>(keys: Deno.KvKey[],): Promise<T[]> {
  const batchSize = 10
  const results: T[] = []

  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize,)
    const batchResults = await kv.getMany<T>(batch,)
    results.push(...batchResults.map((r,) => r.value),)
  }

  return results
}
```

---

## 解決策2: 非正規化（データ重複）

### パターン：頻繁に使うデータを埋め込む

```typescript
// コイン作成時にユーザー名も埋め込む
interface Coin {
  _version: 1
  id: string
  userId: string
  userName: string // ← 非正規化：ユーザー名を複製
  type: 'gold' | 'silver' | 'bronze'
  amount: number
  reason: string
  createdAt: string
}

async function addCoin(
  userId: string,
  familyId: string,
  coin: CoinInput,
) {
  const kv = await getKv()

  // ユーザー情報を取得
  const user = await kv.get(['users', userId,],)

  const coinId = v7.generate()
  const newCoin: Coin = {
    ...coin,
    id: coinId,
    userId,
    userName: user.value.name, // ← ユーザー名を埋め込む
    createdAt: new Date().toISOString(),
  }

  await kv.set(['coins', familyId, userId, coinId,], newCoin,)
  return newCoin
}

// 取得時は追加クエリ不要
async function getFamilyCoins(familyId: string,) {
  const kv = await getKv()
  const coins = []

  for await (const entry of kv.list({ prefix: ['coins', familyId,], },)) {
    coins.push(entry.value,)
  }

  return coins // userNameが既に含まれている！
}
```

**メリット**:

- 読み取りが非常に高速
- 追加クエリが不要
- シンプルな実装

**デメリット**:

- データの重複
- ユーザー名変更時に全コインを更新する必要がある

### 更新時の対処

```typescript
// ユーザー名変更時
async function updateUserName(
  userId: string,
  familyId: string,
  newName: string,
) {
  const kv = await getKv()

  // 1. ユーザー情報を更新
  const user = await kv.get(['users', userId,],)
  await kv.set(['users', userId,], {
    ...user.value,
    name: newName,
  },)

  // 2. 関連するコインも更新（バックグラウンドで実行）
  updateCoinUserNames(userId, familyId, newName,)
    .catch((err,) => console.error('Failed to update coin user names:', err,))
}

async function updateCoinUserNames(
  userId: string,
  familyId: string,
  newName: string,
) {
  const kv = await getKv()

  // ユーザーの全コインを取得
  for await (
    const entry of kv.list({
      prefix: ['coins', familyId, userId,],
    },)
  ) {
    await kv.set(entry.key, {
      ...entry.value,
      userName: newName,
    },)
  }
}
```

### 非正規化の判断基準

**非正規化すべきデータ**:

- ✅ 表示用の名前（userName, familyName）
- ✅ ほとんど変更されないデータ
- ✅ 読み取り頻度が非常に高いデータ

**正規化を保つべきデータ**:

- ❌ 頻繁に変更されるデータ
- ❌ 大きなサイズのデータ
- ❌ 整合性が重要なデータ（残高など）

---

## 解決策3: キー構造の工夫

### パターン：階層的なキー設計

```typescript
// ユーザーごとにコインをグループ化
;['coins', familyId, userId, coinId,]
//                  ^^^^^^
//                  既にユーザーでグループ化されている

// この構造により、ユーザーのコインを効率的に取得可能
async function getUserCoinsWithInfo(
  userId: string,
  familyId: string,
) {
  const kv = await getKv()

  // 並列に実行
  const [user, coins,] = await Promise.all([
    kv.get(['users', userId,],),
    (async () => {
      const result = []
      for await (
        const entry of kv.list({
          prefix: ['coins', familyId, userId,],
        },)
      ) {
        result.push(entry.value,)
      }
      return result
    })(),
  ],)

  return {
    user: user.value,
    coins,
  }
}
```

**メリット**:

- N+1問題が発生しにくい構造
- 効率的なデータ取得
- 関連データが近くに配置される

---

## 解決策4: セカンダリインデックス

### パターン：関連データのインデックスを保持

```typescript
// Family配下のユーザー一覧も保存
interface FamilyIndex {
  userIds: string[]
  updatedAt: string
}

// ユーザー追加時にインデックスを更新
async function addUserToFamily(
  userId: string,
  familyId: string,
  userData: User,
) {
  const kv = await getKv()

  const indexKey = ['family_users', familyId,]
  const index = await kv.get<FamilyIndex>(indexKey,)

  await kv.atomic()
    .check(index,)
    .set(['users', userId,], userData,)
    .set(indexKey, {
      userIds: [...(index.value?.userIds || []), userId,],
      updatedAt: new Date().toISOString(),
    },)
    .commit()
}

// Family内の全ユーザーを一括取得
async function getFamilyUsers(familyId: string,) {
  const kv = await getKv()

  const index = await kv.get<FamilyIndex>(['family_users', familyId,],)

  if (!index.value) {
    return []
  }

  // 一括取得
  const userKeys = index.value.userIds.map((id,) => ['users', id,])
  const users = await kv.getMany(userKeys,)

  return users.map((u,) => u.value)
}
```

**メリット**:

- 効率的な一括取得
- 関連データの管理が容易

**デメリット**:

- インデックスの保守が必要
- データ追加/削除時の複雑さが増す

---

## 解決策5: データローダーパターン

### パターン：バッチリクエストをまとめる

```typescript
class UserLoader {
  private cache = new Map<string, Promise<User | null>>()
  private queue: string[] = []
  private batchTimeout: number | null = null

  constructor(private kv: Deno.Kv,) {}

  async load(userId: string,): Promise<User | null> {
    // キャッシュチェック
    if (this.cache.has(userId,)) {
      return this.cache.get(userId,)!
    }

    // バッチに追加
    this.queue.push(userId,)

    // プロミスを作成してキャッシュ
    const promise = new Promise<User | null>((resolve,) => {
      // タイムアウトをセット（次のイベントループでバッチ実行）
      if (this.batchTimeout === null) {
        this.batchTimeout = setTimeout(() => this.executeBatch(), 0,)
      }
    },)

    this.cache.set(userId, promise,)
    return promise
  }

  private async executeBatch() {
    const userIds = [...this.queue,]
    this.queue = []
    this.batchTimeout = null

    // 一括取得
    const userKeys = userIds.map((id,) => ['users', id,])
    const users = await this.kv.getMany<User>(userKeys,)

    // 結果を解決
    users.forEach((user, i,) => {
      const userId = userIds[i]
      const promise = this.cache.get(userId,)
      // プロミスを解決（実装は簡略化）
    },)
  }
}

// 使用例
const loader = new UserLoader(kv,)

const coins = await getCoins()
const coinsWithUsers = await Promise.all(
  coins.map(async (coin,) => ({
    coin,
    user: await loader.load(coin.userId,), // バッチ化される
  })),
)
```

**メリット**:

- 自動的にバッチ化
- GraphQL風のデータローディング

**デメリット**:

- 実装が複雑
- 小規模プロジェクトではオーバーエンジニアリング

---

## このプロジェクトでの推奨アプローチ

### フェーズ1: シンプルなgetMany()

```typescript
// 基本的にはgetMany()で十分
async function getCoinsWithUsers(coinIds: string[],) {
  const kv = await getKv()

  // コインを取得
  const coins = await kv.getMany(coinIds.map((id,) => ['coins', id,]),)

  // ユーザーIDを収集
  const userIds = [...new Set(coins.map((c,) => c.value.userId),),]

  // ユーザーを一括取得
  const users = await kv.getMany(userIds.map((id,) => ['users', id,]),)
  const userMap = new Map(users.map((u,) => [u.value.id, u.value,]),)

  // 結合
  return coins.map((c,) => ({
    coin: c.value,
    user: userMap.get(c.value.userId,),
  }))
}
```

### フェーズ2: 表示用データの非正規化

```typescript
// 頻繁に表示される名前は埋め込む
interface Coin {
  id: string
  userId: string
  userName: string // ← 非正規化
  familyId: string
  familyName: string // ← 非正規化
  // ...
}
```

### フェーズ3: 必要に応じてインデックス追加

```typescript
// パフォーマンス問題が出たら
// セカンダリインデックスを追加
```

---

## パフォーマンス比較

### ケース：100個のコインと10人のユーザー

| アプローチ    | クエリ数 | 推定レイテンシー |
| ------------- | -------- | ---------------- |
| N+1（悪い例） | 101回    | ~2000ms          |
| getMany()     | 2回      | ~40ms            |
| 非正規化      | 1回      | ~20ms            |

---

## ベストプラクティス

### 1. まずgetMany()を試す

```typescript
// デフォルトの選択肢
const items = await kv.getMany(keys,)
```

### 2. 頻繁に使う名前は非正規化

```typescript
// userName, familyName などは埋め込んでOK
interface Coin {
  userName: string // ✅ OK
  userEmail: string // ❌ 変更される可能性
}
```

### 3. クエリ数を計測する

```typescript
// 開発環境でログ出力
let queryCount = 0
const originalGet = kv.get.bind(kv,)
kv.get = async (...args) => {
  queryCount++
  console.log(`Query #${queryCount}:`, args[0],)
  return originalGet(...args,)
}
```

### 4. 必要になったら最適化

```typescript
// 最初から複雑にしない
// パフォーマンス問題が出たら対処
```

---

## まとめ

- **N+1問題** はDeno KVでも発生する
- **getMany()** が最も簡単で効果的な解決策
- **非正規化** は読み取り頻度が高い場合に有効
- **キー構造の工夫** で問題を未然に防ぐ
- 最初はシンプルに、必要になったら最適化

---

## 参考資料

### 公式ドキュメント

- [Deno.Kv.getMany API](https://docs.deno.com/api/deno/~/Deno.Kv.prototype.getMany)
- [Deno KV Quick Start](https://docs.deno.com/deploy/kv/)

### 内部ドキュメント

- [Deno KV使い方レポート](./2026-01-04_deno-kv-usage-and-local-behavior.md)
- [実装戦略とデータ設計](./2026-01-12_implementation-strategy-and-data-design.md)

### 一般的なN+1問題

- [N+1 Query Problem (Wikipedia)](https://en.wikipedia.org/wiki/N%2B1_query_problem)
- GraphQL DataLoader pattern

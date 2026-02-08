# Deno KV パフォーマンスボトルネック特定手法

**日付:** 2026-02-08
**目的:** Deno KVでのパフォーマンスボトルネックを特定し、適切な最適化判断を行うための体系的な手法をまとめる

## 概要

Deno KVを使用したアプリケーション開発において、パフォーマンス問題の「特定」は重要な課題です。本レポートでは、ボトルネックの発見方法、計測手法、最適化判断の基準を体系的にまとめます。

---

## 1. Deno KV の基本特性

### 読み込み性能の特徴

| 操作        | 特性                   | パフォーマンス                    |
| ----------- | ---------------------- | --------------------------------- |
| `get()`     | 単一キー取得           | 非常に高速（平均0.8ms）           |
| `getMany()` | バッチ取得（最大10件） | 効率的（複数の `get()` より速い） |
| `list()`    | プレフィックススキャン | データ量に比例して遅くなる        |

**参考**: 2025年のベンチマークでは、Deno KVの平均レイテンシは0.8msで、Redisの1.1msを上回る結果が出ています（[Real-World Caching Benchmarks in 2025](https://andikads.cloud/articles/deno-kv-outpaces-redis-real-world-caching-benchmarks-in-2025)）。

### ボトルネックになりやすい箇所

1. **`list()` で大量データをスキャン**
   ```typescript
   // データ量が増えると遅くなる
   const entries = kv.list({ prefix: ['transactions',], },)
   ```

2. **クライアント側でのフィルタリング**
   ```typescript
   // 全件取得してから絞り込み → 非効率
   const all = await getAllTransactions(userId,)
   const daily = all.filter((tx,) => tx.type === 'daily_distribution')
   ```

3. **N+1問題**
   ```typescript
   // ループ内で毎回クエリ → N+1問題
   for (const tx of transactions) {
     await kv.get(['timeSession', tx.metadata.timeSessionId,],)
   }
   ```

4. **Atomic操作の競合によるリトライ**
   ```typescript
   // 競合が頻発すると遅くなる
   const res = await kv.atomic().check(entry,).set(key, value,).commit()
   if (!res.ok) {
     // リトライが必要
   }
   ```

---

## 2. ボトルネック特定の手法

### 2.1 基本的な計測パターン

#### パターンA: 個別操作の計測

```typescript
async function measureOperation<T,>(
  name: string,
  operation: () => Promise<T>,
): Promise<T> {
  const start = performance.now()
  const result = await operation()
  const elapsed = performance.now() - start

  // 開発環境でログ出力
  if (Deno.env.get('ENV',) === 'development') {
    console.log(`[Performance] ${name}: ${elapsed.toFixed(2,)}ms`,)
  }

  return result
}

// 使用例
const coins = await measureOperation(
  'getUserCoins',
  () => coinRepo.getUserCoins(userId, familyId,),
)
```

#### パターンB: UseCase全体の計測

```typescript
const makeCoinTransactionUseCase = (deps: { kv: Deno.Kv },) => {
  const listByUser = async (userId: string, familyId: string,) => {
    const start = performance.now()

    const entries = await deps.kv.list({
      prefix: ['coinTransactions', userId, familyId,],
    },)

    const items = []
    for await (const entry of entries) {
      items.push(entry.value,)
    }

    const elapsed = performance.now() - start

    // パフォーマンスログ
    if (Deno.env.get('ENV',) === 'development') {
      console.log(
        `[CoinTransaction] listByUser: ${
          elapsed.toFixed(2,)
        }ms, ${items.length} items`,
      )

      // 警告レベルの判定
      if (elapsed > 500) {
        console.warn(`⚠️ SLOW QUERY: listByUser took ${elapsed.toFixed(2,)}ms`,)
      }
    }

    return items
  }

  return { listByUser, }
}
```

#### パターンC: クエリカウンター

```typescript
class QueryCounter {
  private count = 0
  private queries: Array<{ key: Deno.KvKey; elapsed: number }> = []

  wrap<T,>(kv: Deno.Kv,): Deno.Kv {
    const originalGet = kv.get.bind(kv,)
    const originalList = kv.list.bind(kv,)
    const originalGetMany = kv.getMany.bind(kv,)

    kv.get = async (...args) => {
      this.count++
      const start = performance.now()
      const result = await originalGet(...args,)
      const elapsed = performance.now() - start

      this.queries.push({ key: args[0], elapsed, },)
      console.log(
        `Query #${this.count}: get(${JSON.stringify(args[0],)}) - ${
          elapsed.toFixed(2,)
        }ms`,
      )

      return result
    }

    kv.list = (selector, options?,) => {
      this.count++
      console.log(`Query #${this.count}: list(${JSON.stringify(selector,)})`,)
      return originalList(selector, options,)
    }

    kv.getMany = async (...args) => {
      this.count++
      const start = performance.now()
      const result = await originalGetMany(...args,)
      const elapsed = performance.now() - start

      console.log(
        `Query #${this.count}: getMany(${args[0].length} keys) - ${
          elapsed.toFixed(2,)
        }ms`,
      )

      return result
    }

    return kv
  }

  getReport() {
    return {
      totalQueries: this.count,
      queries: this.queries,
      slowQueries: this.queries.filter((q,) => q.elapsed > 100),
    }
  }

  reset() {
    this.count = 0
    this.queries = []
  }
}

// 使用例
const counter = new QueryCounter()
const kv = counter.wrap(await Deno.openKv(),)

// 処理を実行
await someOperation(kv,)

// レポート取得
const report = counter.getReport()
console.log(`Total queries: ${report.totalQueries}`,)
console.log(`Slow queries (>100ms): ${report.slowQueries.length}`,)
```

### 2.2 Deno 組み込みツールの活用

#### プロファイリング

```bash
# CPU プロファイル生成
deno run --allow-all --v8-flags=--prof your-script.ts

# プロファイル結果の解析
deno run --allow-all --v8-flags=--prof-process isolate-*.log
```

#### Inspector を使用したプロファイリング

```bash
# Inspector モードで起動
deno run --allow-all --inspect your-script.ts

# または inspect-brk（起動時に停止）
deno run --allow-all --inspect-brk your-script.ts
```

その後、Chrome DevTools で `chrome://inspect` にアクセスしてプロファイリング可能。

#### パフォーマンス API の活用

```typescript
// Performance API を使った詳細計測
performance.mark('operation-start',)

await someOperation()

performance.mark('operation-end',)
performance.measure('operation', 'operation-start', 'operation-end',)

const measure = performance.getEntriesByName('operation',)[0]
console.log(`Duration: ${measure.duration}ms`,)

// クリーンアップ
performance.clearMarks()
performance.clearMeasures()
```

---

## 3. パフォーマンス基準

### 3.1 レイテンシの目安

| レイテンシ | 評価          | アクション                     |
| ---------- | ------------- | ------------------------------ |
| < 100ms    | ✅ 問題なし   | そのまま継続                   |
| 100-500ms  | ⚠️ 注意       | 計測を継続、ユーザー体験を観察 |
| > 500ms    | ❌ 最適化必要 | 即座に改善策を検討             |

**根拠**:

- ユーザーは100ms以下を「瞬時」と感じる
- 500ms以上は明確に「遅い」と認識される
- [参考: Nielsen Norman Group - Response Times](https://www.nngroup.com/articles/response-times-3-important-limits/)

### 3.2 データ量とパフォーマンス

#### `list()` のパフォーマンス目安

| データ件数 | 想定レイテンシ | 評価                          |
| ---------- | -------------- | ----------------------------- |
| < 100件    | ~20-50ms       | ✅ OK                         |
| 100-1000件 | ~50-200ms      | ⚠️ 注意                       |
| > 1000件   | > 200ms        | ❌ セカンダリインデックス検討 |

#### `getMany()` のパフォーマンス

```typescript
// 最大10件まで一度に取得可能
const items = await kv.getMany([
  ['key1',],
  ['key2',], // ... 最大10件
],)

// 10件以上は分割が必要
async function getManyBatch<T,>(
  kv: Deno.Kv,
  keys: Deno.KvKey[],
): Promise<Array<T | null>> {
  const batchSize = 10
  const results: Array<T | null> = []

  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize,)
    const batchResults = await kv.getMany<T>(batch,)
    results.push(...batchResults.map((r,) => r.value),)
  }

  return results
}
```

---

## 4. ボトルネックの兆候

### 4.1 チェックリスト

以下の兆候が見られたら、ボトルネックの可能性があります：

#### ❌ 悪いパターン

```typescript
// 1. list() が遅い（100ms以上）
const start = performance.now()
const entries = await kv.list({ prefix: ['coinTransactions', userId,], },)
const elapsed = performance.now() - start
// elapsed > 100ms なら要注意

// 2. 全件取得→フィルタリング
const all = await getAllTransactions(userId,)
const filtered = all.filter((tx,) => tx.type === 'daily_distribution')
// → セカンダリインデックスを検討

// 3. N+1 問題
for (const tx of transactions) {
  const session = await kv.get(['timeSession', tx.sessionId,],)
  // → getMany() でバッチ取得に変更
}

// 4. 頻繁な Atomic 競合
const res = await kv.atomic().check(entry,).set(key, value,).commit()
if (!res.ok) {
  console.log('Conflict!',) // これが頻発するなら設計を見直す
}
```

#### ✅ 良いパターン

```typescript
// 1. getMany() でバッチ取得
const sessionIds = transactions.map((tx,) => tx.sessionId)
const sessionKeys = sessionIds.map((id,) => ['timeSession', id,])
const sessions = await kv.getMany(sessionKeys,)

// 2. セカンダリインデックスで効率的な検索
const dailyTxs = await kv.list({
  prefix: ['coinTransactionsByType', userId, 'daily_distribution',],
},)

// 3. 計測を組み込む
async function getWithMetrics<T,>(key: Deno.KvKey,): Promise<T | null> {
  const start = performance.now()
  const result = await kv.get<T>(key,)
  const elapsed = performance.now() - start

  if (elapsed > 100) {
    console.warn(`Slow get: ${JSON.stringify(key,)} took ${elapsed}ms`,)
  }

  return result.value
}
```

---

## 5. セカンダリインデックスの判断基準

### 5.1 いつセカンダリインデックスを追加すべきか

#### 判断フローチャート

```
データ取得が遅い（>100ms）
  ↓
list() で全件スキャンしている？
  ↓ Yes
特定のフィールドで頻繁にフィルタリング？
  ↓ Yes
データ量は100件以上？
  ↓ Yes
→ セカンダリインデックスを追加
```

#### 追加すべきケース

1. **特定のフィールドでの検索が頻繁**
   ```typescript
   // 例: transactionType でフィルタリング
   const dailyTxs = all.filter((tx,) => tx.type === 'daily_distribution')
   // → セカンダリインデックス: ['txByType', userId, type, txId]
   ```

2. **データ量が多い（100件以上）**
   ```typescript
   // 1000件の中から特定の日付を探す
   const todayTxs = all.filter((tx,) => tx.createdAt.startsWith('2026-02-08',))
   // → セカンダリインデックス: ['txByDate', userId, 'YYYY-MM-DD', txId]
   ```

3. **複雑な検索条件が必要**
   ```typescript
   // 複数条件での検索
   const filtered = all.filter((tx,) => tx.type === 'use' && tx.amount < 0)
   // → 複合インデックス: ['txByTypeAndSign', userId, type, sign, txId]
   ```

#### 不要なケース

1. **データ量が少ない（< 100件）**
   ```typescript
   // 50件程度なら list() で十分
   const entries = await kv.list({ prefix: ['coins', userId,], },)
   ```

2. **検索頻度が低い**
   ```typescript
   // 月1回のレポート生成のためだけなら不要
   const monthlyReport = all.filter(tx => /* 複雑な条件 */)
   ```

3. **フィルタ条件が毎回異なる**
   ```typescript
   // 動的な検索条件にはインデックスが効かない
   const results = all.filter((tx,) => customFilter(tx, userInput,))
   ```

### 5.2 MVPでの推奨アプローチ

#### フェーズ1: セカンダリインデックスなし

```typescript
// Primary キーのみで開始
;['coinTransactions', userId, familyId, txId,]

// シンプルな実装
async function listTransactions(userId: string, familyId: string,) {
  const entries = await kv.list({
    prefix: ['coinTransactions', userId, familyId,],
  },)
  const items = []
  for await (const entry of entries) {
    items.push(entry.value,)
  }
  return items
}
```

**メリット**:

- 実装がシンプル
- 管理コストが低い
- データ量が少ない間は十分高速

#### フェーズ2: 計測を追加

```typescript
async function listTransactions(userId: string, familyId: string,) {
  const start = performance.now()

  const entries = await kv.list({
    prefix: ['coinTransactions', userId, familyId,],
  },)

  const items = []
  for await (const entry of entries) {
    items.push(entry.value,)
  }

  const elapsed = performance.now() - start

  if (Deno.env.get('ENV',) === 'development') {
    console.log(
      `listTransactions: ${elapsed.toFixed(2,)}ms, ${items.length} items`,
    )

    if (elapsed > 100) {
      console.warn('⚠️ Consider adding secondary index',)
    }
  }

  return items
}
```

#### フェーズ3: 必要に応じてセカンダリインデックス追加

```typescript
// パフォーマンス問題が確認されたら追加
// 例: transactionType でのフィルタリングが頻繁で遅い場合

async function createTransaction(tx: CoinTransactionDataModel,) {
  await kv.atomic()
    // Primary key
    .set(['coinTransactions', tx.userId, tx.familyId, tx.id,], tx,)
    // Secondary index by type
    .set(
      ['txByType', tx.userId, tx.familyId, tx.transactionType, tx.id,],
      tx.id,
    )
    .commit()
}

async function listByType(
  userId: string,
  familyId: string,
  type: string,
): Promise<CoinTransactionDataModel[]> {
  // セカンダリインデックスから取得
  const indexEntries = await kv.list({
    prefix: ['txByType', userId, familyId, type,],
  },)

  const txIds = []
  for await (const entry of indexEntries) {
    txIds.push(entry.value as string,)
  }

  // Primary key で本体を取得
  const txKeys = txIds.map((id,) => ['coinTransactions', userId, familyId, id,])

  const transactions = await kv.getMany<CoinTransactionDataModel>(txKeys,)
  return transactions.map((t,) => t.value).filter(Boolean,)
}
```

---

## 6. 実践的なパフォーマンスモニタリング

### 6.1 開発環境でのモニタリング

```typescript
// utils/performance.ts
export class PerformanceMonitor {
  private metrics: Map<
    string,
    { count: number; totalTime: number; max: number }
  > = new Map()

  async measure<T,>(name: string, fn: () => Promise<T>,): Promise<T> {
    const start = performance.now()

    try {
      return await fn()
    } finally {
      const elapsed = performance.now() - start
      this.record(name, elapsed,)
    }
  }

  private record(name: string, elapsed: number,) {
    const current = this.metrics.get(name,) ||
      { count: 0, totalTime: 0, max: 0, }

    this.metrics.set(name, {
      count: current.count + 1,
      totalTime: current.totalTime + elapsed,
      max: Math.max(current.max, elapsed,),
    },)

    // リアルタイムで遅い操作を警告
    if (elapsed > 500) {
      console.error(`🔴 CRITICAL: ${name} took ${elapsed.toFixed(2,)}ms`,)
    } else if (elapsed > 100) {
      console.warn(`🟡 WARNING: ${name} took ${elapsed.toFixed(2,)}ms`,)
    }
  }

  getReport() {
    const report = []

    for (const [name, metrics,] of this.metrics) {
      const avg = metrics.totalTime / metrics.count

      report.push({
        name,
        count: metrics.count,
        avg: avg.toFixed(2,),
        max: metrics.max.toFixed(2,),
        total: metrics.totalTime.toFixed(2,),
      },)
    }

    // 平均時間でソート
    return report.sort((a, b,) => parseFloat(b.avg,) - parseFloat(a.avg,))
  }

  printReport() {
    console.log('\n📊 Performance Report:',)
    console.table(this.getReport(),)
  }
}

// グローバルインスタンス
export const perfMonitor = new PerformanceMonitor()

// 使用例
const result = await perfMonitor.measure(
  'getUserCoins',
  () => coinRepo.getUserCoins(userId, familyId,),
)
```

### 6.2 本番環境でのモニタリング

```typescript
// Deno Deploy でのロギング
export async function monitoredOperation<T,>(
  name: string,
  metadata: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now()

  try {
    const result = await fn()
    const elapsed = performance.now() - start

    // 構造化ログ出力
    console.log(JSON.stringify({
      type: 'performance',
      operation: name,
      elapsed,
      metadata,
      timestamp: new Date().toISOString(),
    },),)

    return result
  } catch (error) {
    const elapsed = performance.now() - start

    // エラーログ
    console.error(JSON.stringify({
      type: 'error',
      operation: name,
      elapsed,
      error: error.message,
      metadata,
      timestamp: new Date().toISOString(),
    },),)

    throw error
  }
}
```

---

## 7. ケーススタディ：最適化の実例

### ケース1: CoinTransaction の日次集計

#### 問題

```typescript
// ❌ 遅い実装
async function getDailyDistributionStatus(
  userId: string,
  familyId: string,
  date: string,
) {
  // 全トランザクションを取得（1000件）
  const allTxs = await kv.list({
    prefix: ['coinTransactions', userId, familyId,],
  },)

  const items = []
  for await (const entry of allTxs) {
    items.push(entry.value,)
  }

  // メモリ上でフィルタリング
  const dailyTxs = items.filter((tx,) =>
    tx.transactionType === 'daily_distribution' &&
    tx.createdAt.startsWith(date,)
  )

  return dailyTxs
}

// 計測結果: 450ms（1000件のトランザクション）
```

#### 解決策1: セカンダリインデックス

```typescript
// ✅ 高速化: セカンダリインデックス
async function createTransaction(tx: CoinTransactionDataModel,) {
  const dateKey = tx.createdAt.split('T',)[0] // 'YYYY-MM-DD'

  await kv.atomic()
    .set(['coinTransactions', tx.userId, tx.familyId, tx.id,], tx,)
    .set([
      'txByTypeAndDate',
      tx.userId,
      tx.familyId,
      tx.transactionType,
      dateKey,
      tx.id,
    ], tx.id,)
    .commit()
}

async function getDailyDistributionStatus(
  userId: string,
  familyId: string,
  date: string,
) {
  const entries = await kv.list({
    prefix: ['txByTypeAndDate', userId, familyId, 'daily_distribution', date,],
  },)

  const txIds = []
  for await (const entry of entries) {
    txIds.push(entry.value as string,)
  }

  // 見つかった分だけ取得
  if (txIds.length === 0) return []

  const txKeys = txIds.map((id,) => ['coinTransactions', userId, familyId, id,])
  const transactions = await kv.getMany<CoinTransactionDataModel>(txKeys,)

  return transactions.map((t,) => t.value).filter(Boolean,)
}

// 計測結果: 15ms（インデックス経由）
// → 30倍高速化！
```

### ケース2: ユーザー情報付きトランザクション一覧

#### 問題

```typescript
// ❌ N+1問題
async function getTransactionsWithUserInfo(familyId: string,) {
  const txs = []
  for await (
    const entry of kv.list({ prefix: ['coinTransactions', familyId,], },)
  ) {
    txs.push(entry.value,)
  }

  // N+1: 各トランザクションのユーザー情報を個別に取得
  const results = []
  for (const tx of txs) {
    const user = await kv.get(['users', tx.userId,],)
    results.push({
      transaction: tx,
      user: user.value,
    },)
  }

  return results
}

// 計測結果: 2100ms（100トランザクション × 20ms + α）
```

#### 解決策: getMany() でバッチ取得

```typescript
// ✅ 高速化: getMany()
async function getTransactionsWithUserInfo(familyId: string,) {
  const txs = []
  for await (
    const entry of kv.list({ prefix: ['coinTransactions', familyId,], },)
  ) {
    txs.push(entry.value,)
  }

  // ユニークなuserIdを収集
  const userIds = [...new Set(txs.map((tx,) => tx.userId),),]

  // 一括取得
  const userKeys = userIds.map((id,) => ['users', id,])
  const users = await kv.getMany(userKeys,)

  // Map化
  const userMap = new Map(
    users.map((u, i,) => [userIds[i], u.value,]),
  )

  // 結合
  return txs.map((tx,) => ({
    transaction: tx,
    user: userMap.get(tx.userId,),
  }))
}

// 計測結果: 45ms
// → 46倍高速化！
```

---

## 8. チェックリスト

### 開発時のチェックリスト

- [ ] パフォーマンス計測コードを追加している
- [ ] 100ms以上かかる操作にログ出力している
- [ ] N+1問題が発生していないか確認した
- [ ] `list()` のデータ量を把握している
- [ ] `getMany()` でバッチ取得できる箇所を特定した

### 最適化判断のチェックリスト

- [ ] 実際のパフォーマンス問題が確認されている（計測済み）
- [ ] ボトルネックの原因を特定した
- [ ] セカンダリインデックス追加の費用対効果を検討した
- [ ] まず `getMany()` で解決できないか確認した
- [ ] 最適化後の効果を計測する計画がある

### セカンダリインデックス追加のチェックリスト

- [ ] データ量が100件以上である
- [ ] 特定フィールドでの検索が頻繁（週1回以上）
- [ ] `list()` が100ms以上かかっている
- [ ] 他の最適化手法（getMany、非正規化）を検討した
- [ ] インデックスの保守コストを理解している

---

## 9. まとめ

### 推奨アプローチ

```
1. MVPではシンプルに（セカンダリインデックスなし）
   └─ Primary キーのみで開始

2. 計測を仕込む
   └─ パフォーマンスモニタリングを実装
   └─ 100ms/500msを基準にログ出力

3. ボトルネックを特定
   └─ 遅い操作を見つける
   └─ N+1問題を発見する

4. まず簡単な最適化
   └─ getMany() でバッチ取得
   └─ 非正規化（表示用データ）

5. 必要に応じてセカンダリインデックス
   └─ データ量が増えて遅くなったら
   └─ 費用対効果を検討してから
```

### 重要な原則

1. **計測なしに最適化しない**: 問題を確認してから対処
2. **シンプルから始める**: MVP では複雑な最適化は不要
3. **段階的に改善**: まず getMany()、次に非正規化、最後にセカンダリインデックス
4. **計測を継続**: 最適化後も効果を測定

### パフォーマンス基準（再掲）

| レイテンシ | 評価          | アクション             |
| ---------- | ------------- | ---------------------- |
| < 100ms    | ✅ 問題なし   | そのまま継続           |
| 100-500ms  | ⚠️ 注意       | 計測を継続、改善を検討 |
| > 500ms    | ❌ 最適化必要 | 即座に改善策を実施     |

---

## 10. 参考資料

### 公式ドキュメント

- [Deno KV Quick Start](https://docs.deno.com/deploy/kv/)
- [Secondary Indexes](https://docs.deno.com/deploy/kv/secondary_indexes/)
- [Deno KV Benchmarks](https://github.com/denoland/deno-kv-benchmarks)
- [Comparing Deno KV](https://deno.com/blog/comparing-deno-kv)

### 内部ドキュメント

- [Deno KV 使い方レポート](./2026-01-04_deno-kv-usage-and-local-behavior.md)
  - 基本的な使い方、ベストプラクティス
- [Deno KV N+1問題の解決パターン](./2026-01-29_deno-kv-n-plus-one-solutions.md)
  - N+1問題の詳細な解決策、パフォーマンス比較
- [実装戦略とデータ設計](./2026-01-12_implementation-strategy-and-data-design.md)
  - キー設計のベストプラクティス

### 外部リソース

- [Real-World Caching Benchmarks in 2025](https://andikads.cloud/articles/deno-kv-outpaces-redis-real-world-caching-benchmarks-in-2025)
- [Response Times: 3 Important Limits - Nielsen Norman Group](https://www.nngroup.com/articles/response-times-3-important-limits/)
- [Deno KV internals: building a database for the modern web](https://deno.com/blog/building-deno-kv)

---

**最終更新:** 2026-02-08

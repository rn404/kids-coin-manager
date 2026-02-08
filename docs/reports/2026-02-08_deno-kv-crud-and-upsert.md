# Deno KVのCRUD基本操作とUPSERT

**日付:** 2026-02-08
**目的:** Deno KVの基本的なset()操作の挙動とRDBのUPSERTとの比較を理解する

---

## set()の基本挙動

### 重要なポイント

**`set()` は対象の有無に関わらず常に実行される**

```typescript
// ケース1: キーが存在しない場合
await kv.set(['users', 'alice',], { name: 'Alice', balance: 100, },)
// → 新規作成される ✅

// ケース2: キーが既に存在する場合
await kv.set(['users', 'alice',], { name: 'Alice', balance: 200, },)
// → 上書きされる ✅（エラーにならない）
```

つまり、`set()` は **UPSERT的な挙動** をします。

---

## RDBとの比較

### RDBの3つの操作

| 操作       | 既存データがない場合 | 既存データがある場合 | SQL例                               |
| ---------- | -------------------- | -------------------- | ----------------------------------- |
| **INSERT** | 作成成功 ✅          | エラー ❌            | `INSERT INTO users VALUES (...)`    |
| **UPDATE** | 何もしない ⚠️        | 更新成功 ✅          | `UPDATE users SET ... WHERE id = 1` |
| **UPSERT** | 作成成功 ✅          | 更新成功 ✅          | `INSERT ... ON CONFLICT DO UPDATE`  |

### RDBでのUPSERT実装方法

#### 1. PostgreSQL: INSERT ... ON CONFLICT

```sql
INSERT INTO users (id, name, balance)
VALUES (1, 'Alice', 100)
ON CONFLICT (id) DO UPDATE
SET balance = users.balance + EXCLUDED.balance;
```

#### 2. MySQL: INSERT ... ON DUPLICATE KEY UPDATE

```sql
INSERT INTO users (id, name, balance)
VALUES (1, 'Alice', 100)
ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance);
```

#### 3. SQL標準: MERGE文

```sql
MERGE INTO users USING (VALUES (1, 100)) AS vals(id, amount)
ON users.id = vals.id
WHEN MATCHED THEN UPDATE SET balance = balance + vals.amount
WHEN NOT MATCHED THEN INSERT VALUES (vals.id, vals.amount);
```

#### 4. アプリケーションレベルでの制御

```sql
-- 1. まず読み取り
SELECT * FROM users WHERE id = 1;

-- 2. 存在すればUPDATE、なければINSERT
UPDATE users SET balance = balance + 100 WHERE id = 1;
-- または
INSERT INTO users VALUES (1, 100);
```

---

## Deno KVでの対応

### 操作の対応表

| 操作             | RDB                | Deno KV                                  | 挙動                           |
| ---------------- | ------------------ | ---------------------------------------- | ------------------------------ |
| **単純上書き**   | `REPLACE INTO`     | `kv.set()`                               | 常に成功、既存データは上書き   |
| **条件付き更新** | `UPDATE ... WHERE` | `atomic().check().set()`                 | versionstamp一致時のみ更新     |
| **新規作成のみ** | `INSERT`           | `atomic().check({ versionstamp: null })` | データが存在しない場合のみ作成 |
| **UPSERT**       | `ON CONFLICT`      | 状況に応じて選択                         | パターン参照                   |

### パターン別の実装

#### パターンA: 単純な上書き（シンプル）

**使用場面**: ユーザー設定、最新値で良いデータ

```typescript
// データの有無に関わらず書き込む
await kv.set(['users', userId,], data,)
```

**特徴**:

- 最もシンプル
- 競合を気にしない
- 設定値の保存などに適している

#### パターンB: 条件付き更新（整合性重視）

**使用場面**: 残高更新、在庫管理など整合性が重要な場合

```typescript
const existing = await kv.get<User>(['users', userId,],)

if (existing.value === null) {
  // 新規作成
  await kv.set(['users', userId,], { balance: 100, },)
} else {
  // 更新（残高加算など）
  await kv.atomic()
    .check(existing,)
    .set(['users', userId,], {
      balance: existing.value.balance + 100,
    },)
    .commit()
}
```

**特徴**:

- 既存データの読み取りが必要
- versionstampで楽観的ロック
- 競合時はリトライが必要

#### パターンC: リトライループ付き更新（推奨）

**使用場面**: 残高更新、カウンター、統計情報など

```typescript
async function updateBalance(userId: string, delta: number,): Promise<void> {
  while (true) {
    const existing = await kv.get<User>(['users', userId,],)

    const newBalance = (existing.value?.balance ?? 0) + delta

    const op = kv.atomic().check(existing,)

    if (existing.value === null) {
      // 新規ユーザー
      op.set(['users', userId,], {
        balance: newBalance,
        createdAt: new Date(),
      },)
    } else {
      // 既存ユーザー
      op.set(['users', userId,], {
        ...existing.value,
        balance: newBalance,
      },)
    }

    const result = await op.commit()
    if (result.ok) break

    // 競合時はリトライ（指数バックオフ推奨）
  }
}
```

**特徴**:

- 新規作成と更新を両方カバー
- 競合時は自動リトライ
- 最も堅牢なパターン

#### パターンD: 新規作成のみ（重複防止）

**使用場面**: ユーザー登録、ユニークキーの作成

```typescript
const existing = await kv.get(['users', userId,],)

const result = await kv.atomic()
  .check(existing,) // versionstamp: null を期待
  .set(['users', userId,], newUser,)
  .commit()

if (!result.ok) {
  throw new Error('User already exists',)
}
```

**特徴**:

- 既存データがある場合は失敗
- RDBの`INSERT`に相当
- 重複を防ぎたい場合に使用

---

## atomic()内でのset()の挙動

### check()なしの場合

```typescript
// 常に上書き（パターンAと同じ）
await kv.atomic()
  .set(['users', 'alice',], data,)
  .commit() // 必ず成功
```

### check()ありの場合

```typescript
// 条件付き上書き
const existing = await kv.get(['users', 'alice',],)
const result = await kv.atomic()
  .check(existing,) // versionstampが一致しないと失敗
  .set(['users', 'alice',], data,)
  .commit() // result.ok === false の可能性がある
```

---

## 実践例：コイン残高の管理

### ケース1: 残高の初期化（新規ユーザー）

```typescript
// シンプルに上書きでOK
async function initializeBalance(userId: string,): Promise<void> {
  await kv.set(['balances', userId,], {
    balance: 0,
    createdAt: new Date(),
  },)
}
```

### ケース2: 残高の加算（既存ユーザー）

```typescript
// 整合性重視のリトライパターン
async function addCoins(userId: string, amount: number,): Promise<void> {
  let retries = 0
  const maxRetries = 3

  while (retries < maxRetries) {
    const existing = await kv.get<Balance>(['balances', userId,],)

    if (existing.value === null) {
      throw new Error('User not found',)
    }

    const result = await kv.atomic()
      .check(existing,)
      .set(['balances', userId,], {
        ...existing.value,
        balance: existing.value.balance + amount,
        updatedAt: new Date(),
      },)
      .commit()

    if (result.ok) return

    retries++
    await new Promise((resolve,) =>
      setTimeout(resolve, Math.pow(2, retries,) * 100,)
    )
  }

  throw new Error('Failed to update balance after retries',)
}
```

### ケース3: 残高の加算（ユーザーがいない場合は作成）

```typescript
// UPSERT的な挙動
async function addCoinsOrCreate(
  userId: string,
  amount: number,
): Promise<void> {
  while (true) {
    const existing = await kv.get<Balance>(['balances', userId,],)

    const newBalance = (existing.value?.balance ?? 0) + amount

    const result = await kv.atomic()
      .check(existing,)
      .set(['balances', userId,], {
        balance: newBalance,
        updatedAt: new Date(),
        createdAt: existing.value?.createdAt ?? new Date(),
      },)
      .commit()

    if (result.ok) return

    // 競合時はリトライ
  }
}
```

---

## 使い分けガイド

### 🟢 単純な `set()` を使うべき場面

- ユーザー設定の保存
- 最新値で良いキャッシュデータ
- セッション情報
- 競合が問題にならないデータ

**例:**

```typescript
await kv.set(['settings', userId,], userSettings,)
await kv.set(['cache', cacheKey,], cachedData,)
```

### 🟡 `atomic().check()` を使うべき場面

- 残高更新
- 在庫管理
- カウンター
- 統計情報
- 複数レコードの同時更新

**例:**

```typescript
const balance = await kv.get(['balances', userId,],)
await kv.atomic()
  .check(balance,)
  .set(['balances', userId,], updatedBalance,)
  .commit()
```

### 🔴 絶対に `atomic().check()` が必要な場面

- 金額の送金
- 在庫の引き当て
- 重複を許さないデータ作成
- 複数アカウント間の操作

**例:**

```typescript
// 送金: 送信者と受信者の両方をチェック
await kv.atomic()
  .check(sender,)
  .check(receiver,)
  .set(senderKey, updatedSender,)
  .set(receiverKey, updatedReceiver,)
  .commit()
```

---

## まとめ

| 項目         | Deno KV                           | RDB                                |
| ------------ | --------------------------------- | ---------------------------------- |
| **基本操作** | `set()` は常に上書き              | `INSERT` はエラー、`UPDATE` は無視 |
| **UPSERT**   | `set()` で自動的に実現            | `ON CONFLICT` や `MERGE` が必要    |
| **競合制御** | versionstamp + `atomic().check()` | トランザクション + ロック          |
| **リトライ** | 手動実装が必要                    | DBが自動処理（デッドロック時など） |

**Deno KVの特徴**:

- `set()` はデフォルトでUPSERT的
- 整合性が必要なら `atomic().check()` を使う
- 競合時は手動でリトライロジックを実装
- versionstampによる楽観的ロックが基本

**このプロジェクトでの推奨**:

- コイン残高など金額関連は必ず `atomic().check()` + リトライパターンを使用
- ユーザー設定などは単純な `set()` でOK

---

## 関連ドキュメント

- [Deno KV トランザクション実装ガイド](./2026-01-29_deno-kv-transactions.md)
- [Deno KV 使い方レポート](./2026-01-04_deno-kv-usage-and-local-behavior.md)

## 参考資料

- [Deno KV Manual](https://docs.deno.com/deploy/kv/manual/)
- [Deno.Kv.set() API](https://docs.deno.com/api/deno/~/Deno.Kv.prototype.set)
- [Atomic Operations](https://docs.deno.com/api/deno/~/Deno.AtomicOperation)

# Deno KV の使い方とローカル環境での挙動調査レポート

**日付:** 2026-01-04
**目的:** Deno KV の基本的な使い方、ローカル開発環境での挙動、データ永続化方法を調査し、データレイヤー実装の基礎資料とする

## 調査概要

Deno KV は Deno ランタイムに組み込まれたキーバリューデータベースで、ゼロコンフィグで使用可能。ローカル開発では SQLite、本番環境（Deno Deploy）では FoundationDB をバックエンドとして使用し、同じコードがシームレスに動作する。

---

## 1. Deno KV の概要

### 主な特徴

- **Deno ランタイム組み込み**: `Deno.openKv()` で即座に利用可能
- **ゼロコンフィグ**: 事前のデータベース作成や設定不要
- **環境間の互換性**: ローカル（SQLite）と本番（FoundationDB）で同じコードが動作
- **シンプルな API**: 限定的なメソッドセットで学習コストが低い
- **強一貫性**: Atomic トランザクションをサポート

### ユースケース

- シンプルなデータ構造の高速な読み書き
- リアルタイムアプリケーション（watch 機能）
- セッション管理、キャッシュ
- ユーザープロファイル、設定データ

---

## 2. 基本的な使い方

### データベースのオープン

```typescript
// デフォルト（現在のディレクトリベースでファイルが自動作成される）
const kv = await Deno.openKv()

// パスを明示的に指定
const kv = await Deno.openKv('./my-database.sqlite',)

// メモリ内データベース（テスト用、永続化されない）
const kv = await Deno.openKv(':memory:',)
```

### 基本操作

#### Set 操作（データ保存）

```typescript
// キーは配列形式で階層的に定義
await kv.set(['players', 'alice',], {
  username: 'alice',
  score: 100,
  level: 5,
},)

// より深い階層も可能
await kv.set(['games', 'game1', 'players', 'alice',], playerData,)
```

#### Get 操作（単一データ取得）

```typescript
const record = await kv.get(['players', 'alice',],)
console.log(record.value,) // { username: "alice", score: 100, level: 5 }
console.log(record.versionstamp,) // バージョン情報（Atomic操作で使用）
```

#### GetMany 操作（複数データ一括取得）

```typescript
const [record1, record2,] = await kv.getMany([
  ['players', 'carlos',],
  ['players', 'briana',],
],)
```

#### List 操作（プレフィックス検索）

```typescript
// "players" プレフィックスを持つすべてのキーを取得
const records = kv.list({ prefix: ['players',], },)

for await (const entry of records) {
  console.log(entry.key,) // ["players", "alice"]
  console.log(entry.value,) // { username: "alice", ... }
}
```

#### Delete 操作（データ削除）

```typescript
await kv.delete(['players', 'carlos',],)
```

### 高度な機能

#### Atomic 操作（トランザクション）

バージョンチェックと条件付き更新で競合を防止：

```typescript
// スコアを更新する例
const aliceRecord = await kv.get(['players', 'alice',],)

const res = await kv.atomic()
  .check(aliceRecord,) // バージョンが変更されていないか確認
  .set(['players', 'alice',], {
    ...aliceRecord.value,
    score: aliceRecord.value.score + 10,
  },)
  .commit()

if (!res.ok) {
  console.log('競合が発生しました。再試行してください。',)
}
```

#### Deno.KvU64 を使った数値操作

64bit 整数を安全に扱うための専用オブジェクト：

```typescript
const res = await kv.atomic()
  .mutate({
    type: 'sum',
    key: ['scores', 'alice',],
    value: new Deno.KvU64(10n,),
  },)
  .commit()
```

#### Watch 機能（変更監視）

キーの変更をリアルタイムで検知：

```typescript
const stream = kv.watch([['players', 'alice',],],)

for await (const entries of stream) {
  console.log('データが変更されました:', entries,)
}
```

---

## 3. ローカル環境での挙動

### ストレージバックエンド

| 環境         | バックエンド | 特徴                                         |
| ------------ | ------------ | -------------------------------------------- |
| ローカル開発 | SQLite       | 軽量、ファイルベース、開発・テスト向き       |
| Deno Deploy  | FoundationDB | 分散型、グローバルレプリケーション、本番向き |

### データ保存場所

1. **デフォルト動作**
   - `Deno.openKv()` を引数なしで呼び出した場合
   - スクリプトの現在の作業ディレクトリに基づいてファイルが自動作成される

2. **明示的なパス指定**
   ```typescript
   const kv = await Deno.openKv('./data/my-database.sqlite',)
   ```

3. **メモリ内データベース**
   ```typescript
   const kv = await Deno.openKv(':memory:',)
   ```
   - データは永続化されない
   - テスト環境に最適
   - 複数のメモリ内 KV ストアを同時に実行可能（互いに干渉しない）

### 環境間の移植性

同じコードがローカルと本番環境でシームレスに動作：

```typescript
// この1行が環境に応じて自動的に適切なバックエンドを使用
const kv = await Deno.openKv()

// 以降のコードは環境に依存せず動作
await kv.set(['key',], 'value',)
const result = await kv.get(['key',],)
```

---

## 4. キーと値の構造

### キーの設計

キーは配列形式で階層的に定義：

```typescript
// 良い例：階層的で意味のある構造
;[
  'users',
  userId,
]['users', userId, 'profile']['users', userId, 'settings']['posts', postId][
  'posts', postId, 'comments', commentId
] // 使用可能な型
  ['string-key', 123, true, 456n] // string, number, boolean, bigint
```

**ベストプラクティス:**

- REST API のリソース構造に似た階層を使用
- プレフィックスを統一して検索を容易に
- 深すぎる階層は避ける（パフォーマンス考慮）

### 値の型

任意の JavaScript オブジェクトを保存可能：

```typescript
// オブジェクト
await kv.set(['user', 'alice',], {
  name: 'Alice',
  age: 30,
  tags: ['admin', 'premium',],
},)

// 配列
await kv.set(['scores',], [100, 200, 300,],)

// Date
await kv.set(['timestamp',], new Date(),)

// BigInt
await kv.set(['count',], 12345678901234567890n,)
```

---

## 5. 制限事項と注意点

### 現在の制限

1. **ベータ版ステータス**
   - 長期的なデータ永続性は保証されていない
   - 本番環境での使用は慎重に検討が必要

2. **データサイズ制限**
   - 大量のデータや複雑なクエリには不向き
   - シンプルな KV ストレージに最適化

3. **インデックス機能**
   - セカンダリインデックスは手動で実装が必要
   - プレフィックス検索が基本的な検索方法

### リスクとその対策

| リスク             | 対策                                                   |
| ------------------ | ------------------------------------------------------ |
| データ損失のリスク | 定期的なバックアップ、重要データは他のストレージも併用 |
| スケーラビリティ   | 大規模データは専用 DB を検討                           |
| 複雑なクエリ       | アプリケーション層でフィルタリング実装                 |

---

## 6. ベストプラクティス

### 開発時の推奨事項

1. **キー設計**
   - 階層的で検索しやすい構造にする
   - 命名規則を統一する
   - プレフィックスでグループ化する

2. **トランザクション**
   - 競合が発生する可能性がある操作には `kv.atomic()` を使用
   - バージョンチェックで楽観的ロックを実装

3. **パフォーマンス最適化**
   - 読み取り操作で `consistency: "eventual"` を検討
   - バッチ操作には `getMany()` を使用
   - 頻繁に変更されないデータはアプリ側でキャッシュ

4. **テスト**
   - テストには `:memory:` データベースを使用
   - 各テストケースで独立した KV インスタンスを使用

### コード例：実践的なパターン

```typescript
// ユーザー管理の例
class UserRepository {
  constructor(private kv: Deno.Kv,) {}

  async createUser(userId: string, data: UserData,) {
    await this.kv.set(['users', userId,], data,)
    // セカンダリインデックス（emailで検索用）
    await this.kv.set(['users_by_email', data.email,], userId,)
  }

  async getUserById(userId: string,) {
    const result = await this.kv.get(['users', userId,],)
    return result.value
  }

  async getUserByEmail(email: string,) {
    const userIdRecord = await this.kv.get(['users_by_email', email,],)
    if (!userIdRecord.value) return null
    return this.getUserById(userIdRecord.value as string,)
  }

  async listAllUsers() {
    const users = []
    const entries = this.kv.list({ prefix: ['users',], },)
    for await (const entry of entries) {
      // "users_by_email" を除外
      if (entry.key.length === 2 && entry.key[0] === 'users') {
        users.push(entry.value,)
      }
    }
    return users
  }

  async updateUserScore(userId: string, increment: number,) {
    const user = await this.kv.get(['users', userId,],)
    if (!user.value) throw new Error('User not found',)

    const result = await this.kv.atomic()
      .check(user,)
      .set(['users', userId,], {
        ...user.value,
        score: user.value.score + increment,
      },)
      .commit()

    if (!result.ok) {
      throw new Error('Conflict detected, please retry',)
    }
  }
}

// 使用例
const kv = await Deno.openKv()
const userRepo = new UserRepository(kv,)

await userRepo.createUser('alice', {
  email: 'alice@example.com',
  name: 'Alice',
  score: 0,
},)
```

---

## 7. マイグレーションとロールバック

### 概要

Deno KV には従来の RDB のような**組み込みのマイグレーション・ロールバック機能は存在しません**。スキーマレスな設計のため、データ構造の変更はアプリケーション層で管理する必要があります。

### スキーママイグレーション：概念が存在しない

Deno KV は**スキーマレス**であるため：

- テーブル定義のような概念がない
- 任意の JavaScript オブジェクトをそのまま保存
- データ構造の変更はアプリケーション層で管理
- RDB のような `ALTER TABLE` 相当の機能は不要

### データマイグレーション：手動実装

データの形式を変更する場合は、手動でマイグレーションスクリプトを実装します。

#### 基本的なマイグレーションパターン

```typescript
// 全データを新しい形式に変換する例
async function migrateTimestampFormat() {
  const kv = await Deno.openKv()

  // 古い形式のデータを取得
  const entries = kv.list({ prefix: ['users',], },)

  for await (const entry of entries) {
    const oldData = entry.value

    // Atomic操作で安全に更新
    const result = await kv.atomic()
      .check(entry,) // versionstampで変更検知
      .set(entry.key, {
        ...oldData,
        // UNIXタイムスタンプ → ISO文字列に変換
        createdAt: new Date(oldData.timestamp,).toISOString(),
      },)
      .commit()

    if (!result.ok) {
      console.log(`競合発生: ${entry.key}`,)
      // リトライロジックを実装
    }
  }
}
```

#### バージョン管理パターン（推奨）

データにバージョン情報を含め、読み取り時に自動マイグレーション：

```typescript
// データ型定義
interface UserV1 {
  _version: 1
  name: string
  timestamp: number // UNIXタイムスタンプ
}

interface UserV2 {
  _version: 2
  name: string
  createdAt: string // ISO文字列
}

type User = UserV1 | UserV2

// 読み取り時に自動マイグレーション（Lazy Migration）
async function getUser(userId: string,): Promise<UserV2 | null> {
  const result = await kv.get(['users', userId,],)
  const data = result.value as User | null

  if (!data) return null

  // V1 → V2への自動マイグレーション
  if (data._version === 1) {
    const migrated: UserV2 = {
      _version: 2,
      name: data.name,
      createdAt: new Date(data.timestamp,).toISOString(),
    }

    // 次回用に保存（Fire-and-forget）
    kv.atomic()
      .check(result,)
      .set(['users', userId,], migrated,)
      .commit()
      .catch((err,) => console.error('Migration save failed:', err,))

    return migrated
  }

  return data as UserV2
}
```

#### マイグレーション実行履歴の管理

```typescript
// マイグレーションメタデータ
interface MigrationRecord {
  name: string
  executedAt: string
  status: 'running' | 'completed' | 'failed'
  recordsAffected?: number
  error?: string
}

// マイグレーション実行前にチェック
async function runMigration(name: string, migrationFn: () => Promise<number>,) {
  const migrationKey = ['_migrations', name,]
  const existing = await kv.get(migrationKey,)

  if (existing.value) {
    console.log(`マイグレーション "${name}" は既に実行済みです`,)
    return
  }

  // 実行中ステータスを記録
  await kv.set(migrationKey, {
    name,
    executedAt: new Date().toISOString(),
    status: 'running',
  } as MigrationRecord,)

  try {
    const recordsAffected = await migrationFn()

    // 完了ステータスを記録
    await kv.set(migrationKey, {
      name,
      executedAt: new Date().toISOString(),
      status: 'completed',
      recordsAffected,
    } as MigrationRecord,)

    console.log(`マイグレーション完了: ${recordsAffected} 件`,)
  } catch (error) {
    // 失敗ステータスを記録
    await kv.set(migrationKey, {
      name,
      executedAt: new Date().toISOString(),
      status: 'failed',
      error: error.message,
    } as MigrationRecord,)

    throw error
  }
}

// 使用例
await runMigration('2026-01-04-timestamp-to-iso', async () => {
  let count = 0
  const entries = kv.list({ prefix: ['users',], },)

  for await (const entry of entries) {
    // マイグレーション処理
    count++
  }

  return count
},)
```

### ロールバック戦略

#### 1. Point-in-Time Recovery (PITR)

Deno Deploy の本番環境で利用可能：

```bash
# 復元可能なポイントを表示
denokv pitr list

# 特定のversionstampに復元
denokv pitr checkout <versionstamp>

# 読み取り専用モードで起動
denokv serve --read-only
```

**特徴:**

- S3 へ継続的にバックアップ
- 任意の時点に復元可能
- 本番環境（Deno Deploy）のみ対応

#### 2. Export/Import（手動バックアップ）

ローカル環境・本番環境の両方で利用可能：

```typescript
// エクスポート（バックアップ）
async function exportDatabase(outputPath: string,) {
  const kv = await Deno.openKv()
  const entries = kv.list({ prefix: [], },)
  const backup = []

  for await (const entry of entries) {
    backup.push({
      key: entry.key,
      value: entry.value,
      versionstamp: entry.versionstamp,
    },)
  }

  await Deno.writeTextFile(outputPath, JSON.stringify(backup, null, 2,),)
  console.log(`${backup.length} 件のエントリをエクスポートしました`,)
}

// インポート（復元）
async function importDatabase(inputPath: string,) {
  const kv = await Deno.openKv()
  const backup = JSON.parse(await Deno.readTextFile(inputPath,),)

  for (const item of backup) {
    await kv.set(item.key, item.value,)
  }

  console.log(`${backup.length} 件のエントリをインポートしました`,)
}

// 使用例
await exportDatabase('./backup-2026-01-04.json',)
// 問題があれば復元
await importDatabase('./backup-2026-01-04.json',)
```

#### 3. Versionstamp ベースの楽観的ロック

Atomic 操作により、マイグレーション中の整合性を保証：

```typescript
async function safeMigration() {
  const entries = kv.list({ prefix: ['users',], },)

  for await (const entry of entries) {
    let success = false
    let retries = 0
    const maxRetries = 3

    while (!success && retries < maxRetries) {
      const result = await kv.atomic()
        .check(entry,) // データが変更されていないか確認
        .set(entry.key, migrateData(entry.value,),)
        .commit()

      if (result.ok) {
        success = true
      } else {
        retries++
        console.log(`リトライ ${retries}/${maxRetries}: ${entry.key}`,)
        // 最新データを再取得
        const latestEntry = await kv.get(entry.key,)
        entry.versionstamp = latestEntry.versionstamp
        entry.value = latestEntry.value
      }
    }

    if (!success) {
      throw new Error(`マイグレーション失敗: ${entry.key}`,)
    }
  }
}
```

### 比較表：RDB vs Deno KV

| 機能                     | RDB（PostgreSQL など） | Deno KV             |
| ------------------------ | ---------------------- | ------------------- |
| スキーママイグレーション | ✅ 組み込み            | ❌ 概念なし         |
| データマイグレーション   | ✅ ツールあり          | ⚠️ 手動実装         |
| ロールバック             | ✅ トランザクション    | ⚠️ PITR/Export      |
| バージョン管理           | ✅ ツールあり          | ⚠️ 手動実装         |
| 自動マイグレーション     | ✅ ORM サポート        | ⚠️ アプリ層で実装   |
| PITR                     | ✅ 多くの DB で対応    | ✅ Deno Deploy のみ |

### ベストプラクティス

#### 1. データにバージョンフィールドを含める

```typescript
interface BaseEntity {
  _version: number
  _createdAt: string
  _updatedAt: string
}

interface User extends BaseEntity {
  _version: 2
  id: string
  name: string
  email: string
}
```

#### 2. Lazy Migration（遅延マイグレーション）を採用

- 読み取り時に古いデータを自動変換
- 全データを一度に変換する必要がない
- システムの停止時間を最小化

#### 3. 重要な変更前に必ずバックアップ

```typescript
// マイグレーション実行前
await exportDatabase(`./backup-before-migration-${Date.now()}.json`,)

// マイグレーション実行
await runMigration('my-migration', migrationFn,)
```

#### 4. Atomic 操作で整合性を保証

- 競合検知のため `check()` を使用
- 失敗時のリトライロジックを実装
- トランザクション境界を明確にする

#### 5. マイグレーションはべき等に設計

```typescript
// 同じマイグレーションを複数回実行しても安全
async function idempotentMigration() {
  const entries = kv.list({ prefix: ['users',], },)

  for await (const entry of entries) {
    const data = entry.value

    // 既にマイグレーション済みかチェック
    if (data._version === 2) {
      continue // スキップ
    }

    // マイグレーション実行
    await kv.set(entry.key, migrateToV2(data,),)
  }
}
```

### サードパーティツール

#### kvdex

[kvdex](https://github.com/oliver-oloughlin/kvdex) は Deno KV の高レベル抽象化レイヤー：

**主な機能:**

- スキーマ定義のサポート
- バリデーション（Zod 統合）
- KV インスタンス間のデータ移行
- セカンダリインデックスの自動管理

```typescript
import { collection, kvdex, model, } from 'kvdex'
import { z, } from 'zod'

const db = kvdex({
  users: collection(
    model(
      z.object({
        name: z.string(),
        email: z.string().email(),
        createdAt: z.string(),
      },),
    ),
  ),
},)

// スキーマに基づく型安全な操作
await db.users.add({
  name: 'Alice',
  email: 'alice@example.com',
  createdAt: new Date().toISOString(),
},)
```

---

## 8. 次のステップ

### データレイヤー実装に向けて

1. **Repository パターンの採用**
   - エンティティごとに Repository クラスを作成
   - KV 操作を抽象化し、テスタビリティを向上

2. **型安全性の確保**
   - TypeScript の型定義を活用
   - スキーマバリデーションの検討（Zod など）

3. **エラーハンドリング**
   - Atomic 操作の競合処理
   - リトライロジックの実装

4. **テスト戦略**
   - `:memory:` を使った単体テスト
   - 統合テスト環境の構築

---

## 参考資料

### 公式ドキュメント

- [Deno KV Quick Start](https://docs.deno.com/deploy/kv/)
- [Deno KV Examples](https://docs.deno.com/examples/kv/)
- [Deno.Kv API Reference](https://docs.deno.com/api/deno/~/Deno.Kv)
- [Deno KV Tutorials](https://docs.deno.com/deploy/kv/tutorials/)
- [Deno KV Transactions](https://docs.deno.com/deploy/kv/manual/transactions/)
- [Deno KV Backups](https://docs.deno.com/deploy/kv/backup/)
- [Deno.AtomicOperation API Reference](https://docs.deno.com/api/deno/~/Deno.AtomicOperation)

### 技術記事・リソース

- [Announcing Deno KV](https://deno.com/blog/kv)
- [Deno KV internals: building a database for the modern web](https://deno.com/blog/building-deno-kv)
- [How to Build a CRUD API with Oak and Deno KV](https://deno.com/blog/build-crud-api-oak-denokv)
- [Announcing self-hosted Deno KV with continuous backups](https://deno.com/blog/kv-is-open-source-with-continuous-backup)
- [Introducing KV Backup for Deno Subhosting](https://deno.com/blog/subhosting-kv-backup)
- [GitHub - denoland/denokv](https://github.com/denoland/denokv)
- [GitHub - oliver-oloughlin/kvdex](https://github.com/oliver-oloughlin/kvdex)

### コミュニティリソース

- [Using Deno KV with Deno deploy guide - DEV Community](https://dev.to/christiandale/using-deno-kv-with-deno-deploy-guide-171o)
- [Fast and Simple APIs with Deno KV](https://andrewwalpole.com/blog/fast-and-simple-apis-with-deno-kv/)

---

## まとめ

Deno KV は以下の特徴を持つ、シンプルで強力な KV データベース：

- **開発体験**: ゼロコンフィグで即座に使用開始可能
- **環境移植性**: ローカル（SQLite）と本番（FoundationDB）で同じコードが動作
- **適用範囲**: シンプルなデータ構造の高速な読み書きに最適
- **制限事項**: ベータ版のため、本番環境での使用は慎重に
- **マイグレーション**: スキーマレスだが、データマイグレーションはアプリケーション層で管理が必要
- **バックアップ**: Export/Import や PITR（Deno Deploy）でデータ保護が可能

データレイヤー実装においては、以下を推奨：

1. **Repository パターン**の採用で KV 操作を抽象化
2. **データにバージョンフィールド**を含めて将来のマイグレーションに備える
3. **Lazy Migration パターン**で段階的なデータ変更を実現
4. **型安全性とテスタビリティ**を確保
5. **重要な変更前のバックアップ**を習慣化

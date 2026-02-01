# UUID v7: 時系列ソート可能なID設計

**日付:** 2026-01-29
**目的:** UUID v7の特徴と、Deno KVでの活用方法を検討する

## 概要

UUID v7は時系列でソート可能な次世代のUUID仕様（RFC 9562）で、従来のUUID v4（ランダム）やULIDの利点を兼ね備えています。

---

## UUID v7の特徴

### 構造

- **48ビットのタイムスタンプ**: ミリ秒単位のUnix時間が先頭に埋め込まれている
- **12ビットのランダムセグメント**: 同一ミリ秒内での一意性を保証
- **62ビットのランダムセグメント**: 全体的な一意性（合計122ビットのエントロピー）

### メリット

1. **時系列順にソート可能**
   - 新しく生成されたUUIDは古いものより大きな値になる
   - 自然に時系列順にソートされる

2. **データベースパフォーマンスの向上**
   - B-treeインデックスで連続挿入が可能
   - インデックスの断片化を防ぐ
   - Auto-incrementに近いパフォーマンス

3. **分散システム対応**
   - グローバルで一意
   - 衝突の心配がない

4. **標準化されている**
   - RFC 9562として正式に標準化
   - PostgreSQL 18、.NET 9などで採用

---

## UUID v4 vs UUID v7 vs ULID 比較

| 特徴                   | UUID v4               | UUID v7     | ULID           |
| ---------------------- | --------------------- | ----------- | -------------- |
| ソート可能             | ❌                    | ✅          | ✅             |
| 標準化                 | ✅ RFC 4122           | ✅ RFC 9562 | 非標準         |
| タイムスタンプ埋め込み | ❌                    | ✅          | ✅             |
| Deno標準サポート       | `crypto.randomUUID()` | `@std/uuid` | 外部ライブラリ |
| DBインデックス最適化   | ❌                    | ✅          | ✅             |
| 長さ                   | 36文字                | 36文字      | 26文字         |

---

## Denoでの使用方法

### インストール

```json
// deno.json
{
  "imports": {
    "@std/uuid": "jsr:@std/uuid@^1.1.0"
  }
}
```

### 基本的な使い方

```typescript
import { v7, } from '@std/uuid'

// UUID v7の生成
const id = v7.generate()
// 例: "018d3f27-e3e8-7a3c-9f8b-1234567890ab"

// タイムスタンプ部分が先頭にあるため、自動的にソート可能
const ids = [
  v7.generate(), // 古い
  v7.generate(), // 中間
  v7.generate(), // 新しい
]
// ids.sort() で時系列順になる
```

### Deno KVでの活用例

```typescript
import { v7, } from '@std/uuid'

async function addCoin(
  userId: string,
  familyId: string,
  coin: CoinInput,
) {
  const kv = await getKv()
  const coinId = v7.generate() // UUID v7を生成

  const newCoin: Coin = {
    ...coin,
    id: coinId,
    userId,
    createdAt: new Date().toISOString(),
  }

  await kv.set(['coins', familyId, userId, coinId,], newCoin,)
  return newCoin
}

// 取得時は自動的に時系列順
async function getUserCoins(userId: string, familyId: string,) {
  const kv = await getKv()
  const entries = kv.list<Coin>({
    prefix: ['coins', familyId, userId,],
  },)

  const coins: Coin[] = []
  for await (const entry of entries) {
    coins.push(entry.value,)
  }

  // UUID v7なので、IDでソートすれば時系列順になる
  return coins.sort((a, b,) => a.id.localeCompare(b.id,))
}
```

---

## 実装戦略レポートとの関係

以前の [実装戦略レポート（2026-01-12）](./2026-01-12_implementation-strategy-and-data-design.md) では、UUID v4（`crypto.randomUUID()`）の使用を推奨していましたが、UUID v7はその上位互換として以下の利点があります：

### UUID v4からの変更点

```typescript
// 旧: UUID v4
const id = crypto.randomUUID() // ランダム、ソート不可

// 新: UUID v7
import { v7, } from '@std/uuid'
const id = v7.generate() // 時系列ソート可能
```

### 移行の必要性

- **新規プロジェクト**: UUID v7を最初から使用することを推奨
- **既存プロジェクト**: UUID v4も十分機能するため、必須ではない
- **互換性**: どちらも文字列として扱われるため、混在可能

---

## 推奨事項

### このプロジェクトでの採用

**UUID v7を採用することを推奨します。**

理由：

1. **既に依存関係に含まれている** - `@std/uuid` は deno.json に追加済み
2. **追加コストなし** - 外部ライブラリではなくDeno標準ライブラリ
3. **将来性** - RFC 9562として標準化済み
4. **パフォーマンス** - データベースインデックスの最適化
5. **可読性** - 時系列順のソートが自然

### 実装パターン

```typescript
// packages/data/types.ts
export interface Coin {
  _version: 1
  id: string // UUID v7
  userId: string // UUID v7
  type: 'gold' | 'silver' | 'bronze'
  amount: number
  reason: string
  createdAt: string // ISO文字列
}

// packages/data/repositories/CoinRepository.ts
import { v7, } from '@std/uuid'

export class CoinRepository {
  async addCoin(
    userId: string,
    familyId: string,
    coin: Omit<Coin, 'id' | 'userId' | 'createdAt'>,
  ) {
    const kv = await getKv()
    const id = v7.generate() // UUID v7を使用

    const newCoin: Coin = {
      ...coin,
      _version: 1,
      id,
      userId,
      createdAt: new Date().toISOString(),
    }

    await kv.set(['coins', familyId, userId, id,], newCoin,)
    return newCoin
  }
}
```

---

## まとめ

- UUID v7は時系列ソート可能な次世代UUID
- Deno標準ライブラリで利用可能（`@std/uuid`）
- データベースパフォーマンスの向上が期待できる
- 新規プロジェクトでは積極的に採用すべき
- UUID v4との互換性もあるため、段階的な移行も可能

---

## 参考資料

### 公式ドキュメント

- [@std/uuid - JSR](https://jsr.io/@std/uuid)
- [Generating & validating UUIDs - Deno Docs](https://docs.deno.com/examples/uuids/)

### 技術記事

- [UUIDv7 Benefits](https://uuid7.com/)
- [UUID v7: Enhancing Sortable Unique Identifiers](https://darthpedro.net/2024/08/15/uuid-v7-enhancing-sortable-unique-identifiers-for-developers/)
- [PostgreSQL 18 UUIDv7 Support](https://neon.com/postgresql/postgresql-18/uuidv7-support)

### 標準仕様

- [RFC 9562 - Universally Unique IDentifiers (UUIDs)](https://www.rfc-editor.org/rfc/rfc9562.html)

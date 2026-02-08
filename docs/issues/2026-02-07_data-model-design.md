Deno KVを利用しているため、一意に値を取得するとき、以下のようにいくつかの値を複合キーとして必ず指定するようになっている。

```
await deps.kv.set(['coinTypes', familyId, id,], coinType,)
```

このキーに必要なプロパティはどれか、というのは現在のModelでは表現しきれていない

```typescript
type CoinTypeDataModel = DataModel<{
  familyId: string // TODO
  name: string
  durationMinutes: number
  dailyDistribution: number
  active: boolean
}>
```

このままでもいいが、ユーザーからみたときのユースケースとしては、横断で値をコレクションしたいなどのケースは考えづらい。そのため、以下のようにキーがわかるように定義するという案は有効なのだろうか。

```typescript
type CoinTypePrefixKey = 'coinTypes'
type CoinTypeUniqueKey = [
  CoinTypeDataModel['familyId'],
  CoinTypeDataModel['id'],
]
```

こうすると、UseCaseでの引数も以下のようになる

```typescript
interface CoinTypeUseCaseInterface {
  create(
    familyId: CoinTypeDataModel['familyId'],
    name: CoinTypeDataModel['name'],
    durationMinutes: CoinTypeDataModel['durationMinutes'],
    dailyDistribution: CoinTypeDataModel['dailyDistribution'],
  ): Promise<CoinTypeDataModel>
  listAllByFamily(
    familyId: CoinTypeDataModel['familyId'],
  ): Promise<Array<CoinTypeDataModel>>
  findById(
    key: CoinTypeUniqueKey,
  ): Promise<CoinTypeDataModel | null>
  update(
    key: CoinTypeUniqueKey,
    properties: Partial<
      Pick<
        CoinTypeDataModel,
        'name' | 'durationMinutes' | 'dailyDistribution' | 'active'
      >
    >,
  ): Promise<CoinTypeDataModel>
  discard(key: CoinTypeUniqueKey,): Promise<void>
}
```

一見よさそうだが、対象が一つの時だけしか活きない可能性がある。
このソリューションについて検討してほしい。

---

## 検討結果

### 解決したいこと

現在のDataModelと実装では、以下の設計上の重要な情報が明示されていない：

1. **エンティティを一意に特定するキーは何か**
   - `familyId` も `name` も同列のプロパティに見えてしまう
   - 「familyIdとidの組み合わせがユニークキーである」という設計上の制約が型から読み取れない

2. **KVの引数との対応関係**
   - UseCaseのメソッドシグネチャと、実際のKV操作で使うキーの対応が見えづらい
   - `findById(familyId, id)` と `kv.get(['coinTypes', familyId, id])` の関係性が暗黙的

3. **ドメインモデルの制約の表現**
   - 単なる可読性の問題ではなく、設計意図をコードで表現したい
   - UseCaseのシグネチャを見ただけで「このメソッドはキー全体が必要」「このメソッドはfamilyIdだけで良い」が分かるようにしたい

4. **キー構造の一元管理**
   - `create`で保存するときに使ったキー構造を、`find`や`update`でも正確に再現する必要がある
   - キー構造が複数箇所に散らばると、整合性を保つのが難しい
   - 例: `kv.set(['coinTypes', familyId, id], ...)` と `kv.get(['coinTypes', familyId, id])` でキー構造が一致している必要がある

### 現状の実装パターンの確認

現在のコードベースでは、以下のように複数のエンティティで同様のパターンが使われている：

**CoinType:**

- KVキー: `['coinTypes', familyId, id]`
- UseCaseメソッド例: `findById(familyId, id)`, `update(familyId, id, properties)`

**Coin:**

- KVキー: `['coins', userId, familyId, coinTypeId]`
- UseCaseメソッド例: `findById(userId, familyId, coinTypeId)`, `spend(userId, familyId, coinTypeId, properties)`

両方とも**個別の引数**として複合キーの要素を受け取っている。

### 提案されたアプローチの問題点

```typescript
type CoinTypeUniqueKey = [
  CoinTypeDataModel['familyId'],
  CoinTypeDataModel['id'],
]
```

#### 1. **スケーラビリティの問題**

懸念された通り、複数のエンティティで汎用的に使えない：

- CoinType: 2つのキー要素 (`familyId`, `id`)
- Coin: 3つのキー要素 (`userId`, `familyId`, `coinTypeId`)

それぞれに個別の型定義が必要になり、パターンとして統一できない。

#### 2. **個別引数と同じ問題を持つ**

タプル型でも個別引数でも、順序を間違えれば同じ問題が起きる：

```typescript
// タプル型
findById(['some-id', 'some-family-id',],) // idとfamilyIdを逆に渡している

// 個別引数（現状）
findById('some-id', 'some-family-id',) // 同じく逆

// どちらも型エラーにならない（両方ともstring型のため）
```

つまり、タプル型にすることで得られるメリットは：

- 複数の値をキーとしてまとめて扱える
- KVの引数と順序が一致する
- 「これはキーである」という設計意図を型で表現できる

ただし、型安全性という観点では個別引数と大差はない。

### 代替アプローチの検討

#### アプローチA: **現状維持（個別引数）**

```typescript
interface CoinTypeUseCaseInterface {
  findById(
    familyId: CoinTypeDataModel['familyId'],
    id: CoinTypeDataModel['id'],
  ): Promise<CoinTypeDataModel | null>
}
```

**利点:**

- シンプルで理解しやすい
- IDEの補完が効きやすい
- 引数の意味が明確

**欠点:**

- 引数の順序を間違える可能性
- DRYではない（複数メソッドで同じ引数を繰り返す）
- **キー構造が各関数に散らばる**: `create`、`findById`、`update`でそれぞれキー構造を記述するため、整合性を保つのが難しい

#### アプローチB: **オブジェクト形式**

```typescript
type CoinTypeKey = {
  familyId: CoinTypeDataModel['familyId']
  id: CoinTypeDataModel['id']
}

interface CoinTypeUseCaseInterface {
  findById(key: CoinTypeKey): Promise<CoinTypeDataModel | null>
  update(key: CoinTypeKey, properties: Partial<...>): Promise<CoinTypeDataModel>
}
```

**利点:**

- 順序の問題がない
- キー要素が明示的
- 複数メソッドで再利用しやすい
- スケーラブル（Coinなど他のエンティティにも適用可能）

**欠点:**

- やや冗長
- ネストが深くなる
- **KV操作では分解が必要**: `kv.get(['coinTypes', key.familyId, key.id])` のように、型定義とKV操作でキー構造を二重管理する形になる

#### アプローチC: **プレフィックスと一意キーの分離**

```typescript
type CoinTypePrefixKey = 'coinTypes'
type CoinTypeUniqueKey = {
  familyId: CoinTypeDataModel['familyId']
  id: CoinTypeDataModel['id']
}

// 内部ヘルパー
const toKvKey = (key: CoinTypeUniqueKey,): Deno.KvKey => [
  'coinTypes' as CoinTypePrefixKey,
  key.familyId,
  key.id,
]
```

**利点:**

- KVキーの構造が型で明示的
- **ヘルパー関数でキー生成を完全に一元化**: `toKvKey`関数一箇所でキー構造を管理できるため、整合性が保証される
- テストしやすい（ヘルパー関数単体でテスト可能）
- すべてのKV操作で同じヘルパーを使うため、キー構造の変更が容易

**欠点:**

- 実装コストが高い
- オーバーエンジニアリングの可能性

#### アプローチD: **関数内でのkey変数宣言**

```typescript
interface CoinTypeUseCaseInterface {
  findById(
    familyId: CoinTypeDataModel['familyId'],
    id: CoinTypeDataModel['id'],
  ): Promise<CoinTypeDataModel | null>
}

// 実装
const findById = async (
  familyId: CoinTypeDataModel['familyId'],
  id: CoinTypeDataModel['id'],
) => {
  const key = ['coinTypes', familyId, id,] as const
  const result = await deps.kv.get<CoinTypeDataModel>(key,)
  return result.value
}
```

**利点:**

- 型定義の追加が不要で、実装への変更が最小限
- 関数の**一行目で `key` として宣言**することで「これがこのエンティティのキーである」ことが明示される
- **KVの引数と完全に一致**する形で記述される
- 関数内を見れば「どの引数がキーなのか」がすぐわかる
- コーディング規約として統一しやすい

**欠点:**

- インターフェースレベルでは設計意図が伝わらない（実装を見ないとわからない）
- 各関数で繰り返し記述する必要がある
- **キー構造が複数箇所に散らばる**: `create`、`findById`、`update`でそれぞれ `['coinTypes', familyId, id]` を記述するため、キー構造の変更時に複数箇所を修正する必要がある

### 推奨アプローチ（再評価）

**「キー構造の一元管理」という観点を加えた再評価**

求めるレベルに応じて、以下のアプローチを推奨します：

#### キー構造の一元管理を重視: **アプローチC（ヘルパー関数）またはタプル型+ヘルパー関数**

キー構造を一箇所で管理できる点で最も優れている：

**パターン1: オブジェクト形式+ヘルパー関数**

```typescript
type CoinTypeUniqueKey = {
  familyId: CoinTypeDataModel['familyId']
  id: CoinTypeDataModel['id']
}

const toKvKey = (key: CoinTypeUniqueKey,): Deno.KvKey => [
  'coinTypes',
  key.familyId,
  key.id,
]

// すべてのKV操作でヘルパーを使用
const findById = async (key: CoinTypeUniqueKey,) => {
  const result = await deps.kv.get<CoinTypeDataModel>(toKvKey(key,),)
  return result.value
}
```

**パターン2: タプル型+ヘルパー関数（よりシンプル）**

```typescript
type CoinTypeUniqueKey = [familyId: string, id: string,]

const toKvKey = (key: CoinTypeUniqueKey,): Deno.KvKey => ['coinTypes', ...key,]

// すべてのKV操作でヘルパーを使用
const findById = async (key: CoinTypeUniqueKey,) => {
  const result = await deps.kv.get<CoinTypeDataModel>(toKvKey(key,),)
  return result.value
}
```

**利点:**

- **キー構造が `toKvKey` 関数一箇所に集約される**
- キー構造の変更時も一箇所の修正で済む
- インターフェースレベルで設計意図を明示できる
- テストしやすい

**欠点:**

- ヘルパー関数の実装コストがかかる
- 既存コードの変更が必要

#### 最小限の変更で効果を得る: **アプローチD（関数内でのkey変数宣言）**

すぐに適用できる現実的な選択肢：

```typescript
const findById = async (familyId: string, id: string,) => {
  const key = ['coinTypes', familyId, id,] as const
  const result = await deps.kv.get<CoinTypeDataModel>(key,)
  return result.value
}
```

**利点:**

- 型定義不要で、すぐに適用できる
- KVの引数との対応が明確

**欠点:**

- キー構造が各関数に散らばる（一元管理できない）

**判断基準:**

- **キー構造が変更される可能性がある** or **整合性を厳密に保ちたい** → **アプローチC（ヘルパー関数）**
- **とりあえず設計意図を明示したい** → **アプローチD（key変数宣言）**から始めて、後でヘルパー関数に移行

### 実装例

#### 推奨: タプル型+ヘルパー関数の実装例

```typescript
// packages/data/CoinType.ts
import type { DataModel, } from '@workspace/types'

type CoinTypeDataModel = DataModel<{
  familyId: string
  name: string
  durationMinutes: number
  dailyDistribution: number
  active: boolean
}>

type CoinTypeUniqueKey = [
  familyId: CoinTypeDataModel['familyId'],
  id: CoinTypeDataModel['id'],
]

// キー生成を一元化
const toKvKey = (key: CoinTypeUniqueKey,): Deno.KvKey => ['coinTypes', ...key,]

export type { CoinTypeDataModel, CoinTypeUniqueKey, }
export { toKvKey, }
```

```typescript
// packages/data/usecases/CoinTypeUseCase.ts
import type { CoinTypeDataModel, CoinTypeUniqueKey, } from '../CoinType.ts'
import { toKvKey, } from '../CoinType.ts'
import { generateUuid, getTimestamp, withRetry, } from '@workspace/foundations'

interface CoinTypeUseCaseInterface {
  create(
    familyId: CoinTypeDataModel['familyId'],
    name: CoinTypeDataModel['name'],
    durationMinutes: CoinTypeDataModel['durationMinutes'],
    dailyDistribution: CoinTypeDataModel['dailyDistribution'],
  ): Promise<CoinTypeDataModel>
  findById(key: CoinTypeUniqueKey,): Promise<CoinTypeDataModel | null>
  update(
    key: CoinTypeUniqueKey,
    properties: Partial<
      Pick<
        CoinTypeDataModel,
        'name' | 'durationMinutes' | 'dailyDistribution' | 'active'
      >
    >,
  ): Promise<CoinTypeDataModel>
}

const makeCoinTypeUseCase = (
  deps: { kv: Deno.Kv },
): CoinTypeUseCaseInterface => {
  const create = async (
    familyId: CoinTypeDataModel['familyId'],
    name: CoinTypeDataModel['name'],
    durationMinutes: CoinTypeDataModel['durationMinutes'],
    dailyDistribution: CoinTypeDataModel['dailyDistribution'],
  ): ReturnType<CoinTypeUseCaseInterface['create']> => {
    const id = generateUuid()
    const now = getTimestamp()

    const coinType: CoinTypeDataModel = {
      id,
      familyId,
      name,
      durationMinutes,
      dailyDistribution,
      active: true,
      createdAt: now,
      updatedAt: now,
    }

    // ヘルパー関数を使用
    await deps.kv.set(toKvKey([familyId, id,],), coinType,)
    return coinType
  }

  const findById = async (
    key: CoinTypeUniqueKey,
  ): ReturnType<CoinTypeUseCaseInterface['findById']> => {
    // ヘルパー関数を使用
    const result = await deps.kv.get<CoinTypeDataModel>(toKvKey(key,),)
    return result.value
  }

  const update = async (
    key: CoinTypeUniqueKey,
    properties: Partial<
      Pick<
        CoinTypeDataModel,
        'name' | 'durationMinutes' | 'dailyDistribution' | 'active'
      >
    >,
  ): ReturnType<CoinTypeUseCaseInterface['update']> => {
    return await withRetry(async () => {
      // ヘルパー関数を使用
      const currentEntry = await deps.kv.get<CoinTypeDataModel>(toKvKey(key,),)

      if (currentEntry.value === null) {
        throw new Error(`CoinType not found`,)
      }

      const updatedCoinType: CoinTypeDataModel = {
        ...currentEntry.value,
        ...properties,
        updatedAt: getTimestamp(),
      }

      const res = await deps.kv.atomic()
        .check(currentEntry,)
        .set(toKvKey(key,), updatedCoinType,)
        .commit()

      if (res.ok === false) {
        throw new Error('Conflict detected',)
      }

      return updatedCoinType
    },)
  }

  return { create, findById, update, }
}

export { makeCoinTypeUseCase, }
```

**ポイント:**

- `toKvKey` 関数でキー構造を一元管理
- すべてのKV操作（`set`、`get`、`atomic`）で同じヘルパーを使用
- キー構造の変更は `toKvKey` 一箇所の修正で完結

#### 参考: アプローチD（key変数宣言）の実装例

```typescript
// packages/data/usecases/CoinTypeUseCase.ts

const findById = async (
  familyId: CoinTypeDataModel['familyId'],
  id: CoinTypeDataModel['id'],
): ReturnType<CoinTypeUseCaseInterface['findById']> => {
  const key = ['coinTypes', familyId, id,] as const
  const result = await deps.kv.get<CoinTypeDataModel>(key,)
  return result.value
}

const update = async (
  familyId: CoinTypeDataModel['familyId'],
  id: CoinTypeDataModel['id'],
  properties: Partial<
    Pick<
      CoinTypeDataModel,
      'name' | 'durationMinutes' | 'dailyDistribution' | 'active'
    >
  >,
): ReturnType<CoinTypeUseCaseInterface['update']> => {
  return await withRetry(async () => {
    const key = ['coinTypes', familyId, id,] as const
    const currentEntry = await deps.kv.get<CoinTypeDataModel>(key,)

    if (currentEntry.value === null) {
      throw new Error(`CoinType with id ${id} not found`,)
    }

    const updatedCoinType: CoinTypeDataModel = {
      ...currentEntry.value,
      ...properties,
      updatedAt: getTimestamp(),
    }

    const res = await deps.kv.atomic()
      .check(currentEntry,)
      .set(key, updatedCoinType,)
      .commit()

    if (res.ok === false) {
      throw new Error('Conflict detected',)
    }

    return updatedCoinType
  },)
}
```

#### その他のアプローチの実装例（参考）

**アプローチB（オブジェクト形式）:**

```typescript
type CoinTypeKey = {
  familyId: CoinTypeDataModel['familyId']
  id: CoinTypeDataModel['id']
}

interface CoinTypeUseCaseInterface {
  findById(key: CoinTypeKey,): Promise<CoinTypeDataModel | null>
  update(
    key: CoinTypeKey,
    properties: Partial<
      Pick<
        CoinTypeDataModel,
        'name' | 'durationMinutes' | 'dailyDistribution' | 'active'
      >
    >,
  ): Promise<CoinTypeDataModel>
}

const findById = async (key: CoinTypeKey,) => {
  const result = await deps.kv.get<CoinTypeDataModel>([
    'coinTypes',
    key.familyId,
    key.id,
  ],)
  return result.value
}
```

### 留意点

- **`create` や `listAllByFamily` など、完全なキーが不要なメソッド**は従来通り個別引数で問題ない（key変数を宣言する必要はない）
- **段階的な移行が可能**: すぐに全てを変更する必要はなく、新規メソッドや修正時に適用していける
- **Coinなど他のエンティティにも同じパターンを適用可能**: `const key = ['coins', userId, familyId, coinTypeId] as const` のように統一
- **コーディング規約として明文化**: チーム全体で「キーを使うメソッドは一行目で `const key = ...` を宣言する」というルールを共有することで一貫性を保つ

## 総評（再評価版）

各アプローチを「キー構造の一元管理」という観点も含めて比較検討した結果：

### 最も堅牢: タプル型+ヘルパー関数

**キー構造の一元管理を実現できる最良の選択肢**

```typescript
type CoinTypeUniqueKey = [familyId: string, id: string,]
const toKvKey = (key: CoinTypeUniqueKey,): Deno.KvKey => ['coinTypes', ...key,]

// すべてのKV操作で使用
kv.get(toKvKey([familyId, id,],),)
kv.set(toKvKey([familyId, id,],), value,)
```

**優れている点:**

- **キー構造が `toKvKey` 関数一箇所に集約される** ← これが決定的に重要
- `create`で保存したキーを、`find`や`update`で確実に再現できる
- キー構造の変更時も一箇所の修正で済む
- インターフェースレベルで「これはキーである」と型で明示できる
- KVの引数と順序が完全に一致（スプレッド演算子で自然）
- オブジェクト形式より簡潔

**元の提案のタプル型は、ヘルパー関数と組み合わせることで真価を発揮する。**

### 手軽に始められる: アプローチD（key変数宣言）

**すぐに適用できるが、一元管理はできない**

```typescript
const findById = async (familyId: string, id: string,) => {
  const key = ['coinTypes', familyId, id,] as const
  const result = await deps.kv.get<CoinTypeDataModel>(key,)
  return result.value
}
```

**利点:**

- 型定義不要で、今すぐ適用できる
- KVの引数との対応が明確

**致命的な欠点:**

- キー構造が各関数に散らばる
- `create`、`findById`、`update`でそれぞれキー構造を記述する必要がある
- キー構造の変更時に複数箇所を修正する必要があり、整合性を保つのが難しい

コーディング規約で統一しても、**キー構造の一元管理はできない**。

### オブジェクト形式+ヘルパー関数も有効

キー要素の意味を明確にしたい場合は、オブジェクト形式も選択肢：

```typescript
type CoinTypeUniqueKey = { familyId: string; id: string }
const toKvKey = (
  key: CoinTypeUniqueKey,
): Deno.KvKey => ['coinTypes', key.familyId, key.id,]
```

ただし、タプル型のほうがKVの引数との一致という点でよりシンプル。

### 推奨する段階的アプローチ（修正版）

**「キー構造の一元管理」の重要性を踏まえた推奨:**

1. **短期的**: アプローチD（key変数宣言）で今すぐ設計意図を明示
2. **中期的**: **タプル型+ヘルパー関数に移行** ← これが最終的なゴール
3. **判断基準**:
   - エンティティが少ないうちはアプローチDでも管理できる
   - エンティティが増えたら、キー構造の一元管理が必須になる

**結論: 元の提案のタプル型は、ヘルパー関数と組み合わせることで、キー構造の一元管理を実現できる最良のアプローチである。**

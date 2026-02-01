# 実装戦略とデータ設計の検討レポート

**日付:** 2026-01-12
**目的:** アプリケーション開発の開始にあたり、実装順序、認証戦略、ID設計方針を決定する

## 調査概要

子供向けコイン管理アプリの実装を開始するにあたり、以下の疑問点が浮上：

1. **何から作り始めるべきか？** - データモデル、Repository、UI のどれが先か
2. **認証をどう扱うか？** - 最初から実装するか、後回しにするか
3. **ID の設計方針は？** - UUID、整数、その他の選択肢

本レポートでは、これらの疑問に対する検討結果と推奨アプローチをまとめる。

---

## 1. 実装順序の検討

### 背景：何から作るべきか

アプリケーション開発において、以下の3つのアプローチが考えられる：

```
A. データモデル（型定義）から
   └─ 型 → Repository → UI

B. Repository（データアクセス層）から
   └─ Repository → 型 → UI

C. UI（動くもの）から
   └─ UI → 型 → Repository
```

### 各アプローチの比較

#### アプローチ A: データモデル優先

```typescript
// 1. 最初に型を定義
// packages/data/types.ts
export interface User {
  _version: 1
  id: string
  name: string
  familyId: string
  role: 'manager' | 'member'
  createdAt: string
  updatedAt: string
}

export interface Coin {
  _version: 1
  id: string
  userId: string
  type: 'gold' | 'silver' | 'bronze'
  amount: number
  reason: string
  createdAt: string
}

// 2. Repository を実装
// 3. UI を実装
```

**メリット:**

- 型安全性が最初から確保される
- 全体の設計を俯瞰できる
- 後の実装がスムーズ

**デメリット:**

- 動くものが見えるまで時間がかかる
- 過剰設計のリスク

#### アプローチ B: Repository 優先

```typescript
// 1. Repository を実装しながら型を定義
export class CoinRepository {
  async addCoin(coin: Coin,) {/* ... */}
  async getUserCoins(userId: string,) {/* ... */}
}

// 2. 型を整理
// 3. UI を実装
```

**メリット:**

- 実践的な設計になる
- データアクセスパターンが明確になる

**デメリット:**

- 型定義が後手に回る
- リファクタリングが必要になる可能性

#### アプローチ C: UI 優先

```typescript
// 1. ページを作る
export default define.page(function CoinsPage() {
  return <div>My Coins</div>
},)

// 2. データ取得を追加
// 3. Repository を整理
```

**メリット:**

- すぐに動くものが見える
- モチベーションが維持できる

**デメリット:**

- 設計が場当たり的になりがち
- 大幅なリファクタリングが必要

### 推奨アプローチ：段階的な開発

**結論: データモデル定義 → Repository実装 → UI の順番を推奨**

理由：

1. 型安全性を最初から確保
2. Deno KV のベストプラクティスを実践
3. しっかりした基盤が後の開発を楽にする

---

## 2. 認証とユーザー管理の戦略

### 課題：認証をどう扱うか

開発を始める前に決めるべき重要な疑問：

```
疑問点:
├─ 最初から認証システムを作るべきか？
├─ Family の概念をどう実装するか？
├─ Manager/Member の権限をどうチェックするか？
└─ 開発初期はダミーユーザーでいいのか？
```

### 選択肢の比較

#### オプション A: 最初から本格的な認証システム

```
apps/web/
├─ routes/
│   ├─ auth/
│   │   ├─ signin.tsx
│   │   ├─ signup.tsx
│   │   └─ signout.tsx
│   └─ (authenticated)/
│       ├─ dashboard.tsx
│       └─ coins/

packages/data/
└─ repositories/
    ├─ UserRepository.ts
    ├─ FamilyRepository.ts
    └─ SessionRepository.ts
```

**メリット:**

- 実際の使用に近い環境で開発
- 権限チェックを最初から考慮
- 後から大きく変更する必要がない

**デメリット:**

- 初期実装が重い
- コイン管理の本質的な部分になかなか入れない
- 認証周りのバグに時間を取られる可能性

#### オプション B: ダミーユーザーで進める

```typescript
// 開発初期は認証をスキップ
export function getCurrentContext(): AppContext {
  // TODO: 後で認証システムから取得
  return {
    userId: 'dummy-user-1',
    familyId: 'dummy-family-1',
    role: 'manager',
  }
}
```

**メリット:**

- コイン管理の本質的な機能に集中できる
- 後から認証を差し込みやすい
- 開発速度が速い

**デメリット:**

- 認証の複雑さを後回しにしているだけ
- 「後でやる」が「やらない」になるリスク

#### オプション C: 段階的アプローチ（推奨）

```
フェーズ1: 認証なし、単一ユーザー（Week 1-2）
├─ Repository と基本機能を実装
├─ UI/UX を固める
└─ ビジネスロジックを確立

フェーズ2: 簡易認証を追加（Week 3）
├─ パスワードなしの「名前だけ」認証
├─ Family 選択機能
└─ セッション管理（Deno KV）

フェーズ3: 本格的な認証（Week 4+）
├─ パスワード認証
├─ OAuth（将来的に）
└─ 権限管理の強化
```

### 推奨実装：明示的なパラメータ渡しとミドルウェアパターン

#### セキュリティ上の重要な設計原則

**Repository層では認証・認可を行わない**。Repository は必要なパラメータを明示的に受け取り、データアクセスに専念する。

```typescript
// ❌ セキュリティリスクのあるパターン（使用しない）
async addCoin(ctx: AppContext, coin: Omit<Coin, 'id' | 'userId'>) {
  // ctx.userId が正しいという保証がない
  // 呼び出し側が不正なctxを渡せてしまう
  const newCoin = { ...coin, userId: ctx.userId }
}

// ✅ セキュアなパターン（推奨）
async addCoin(userId: string, familyId: string, coin: Omit<Coin, 'id' | 'userId'>) {
  // 必要なパラメータを明示的に受け取る
  // 認証・認可は呼び出し側（ハンドラー層）の責任
  const newCoin = { ...coin, userId }
}
```

#### Repository の実装

```typescript
// packages/data/repositories/CoinRepository.ts
export class CoinRepository {
  async addCoin(
    userId: string,
    familyId: string,
    coin: Omit<Coin, 'id' | 'userId' | 'createdAt'>,
  ) {
    const kv = await getKv()
    const id = crypto.randomUUID()

    const newCoin: Coin = {
      ...coin,
      id,
      userId,
      createdAt: new Date().toISOString(),
    }

    await kv.set(['coins', familyId, userId, id,], newCoin,)
    return newCoin
  }

  async getUserCoins(userId: string, familyId: string,): Promise<Coin[]> {
    const kv = await getKv()
    const entries = kv.list<Coin>({
      prefix: ['coins', familyId, userId,],
    },)

    const coins: Coin[] = []
    for await (const entry of entries) {
      coins.push(entry.value,)
    }
    return coins
  }

  async getCoin(
    userId: string,
    familyId: string,
    coinId: string,
  ): Promise<Coin | null> {
    const kv = await getKv()
    const result = await kv.get<Coin>(['coins', familyId, userId, coinId,],)
    return result.value
  }
}
```

#### ミドルウェアで認証を実施

```typescript
// packages/web/middleware/auth.ts

export interface AuthContext {
  userId: string
  familyId: string
  role: 'manager' | 'member'
}

// 開発用：ダミー認証（フェーズ1）
export async function requireAuth(req: Request,): Promise<AuthContext> {
  // TODO: フェーズ2以降でセッション管理を実装
  return {
    userId: 'dev-user-1',
    familyId: 'dev-family-1',
    role: 'manager',
  }
}

// 将来的な実装（フェーズ2以降）
/*
export async function requireAuth(req: Request): Promise<AuthContext> {
  const sessionId = getCookie(req.headers, 'session_id')
  if (!sessionId) {
    throw new Error('Unauthorized')
  }

  const kv = await getKv()
  const session = await kv.get(['sessions', sessionId])
  if (!session.value) {
    throw new Error('Unauthorized')
  }

  return session.value as AuthContext
}
*/
```

#### Fresh ハンドラーでの使用

```typescript
// apps/web/routes/coins/index.tsx
import { define, } from '@workspace/utils'
import { requireAuth, } from '@workspace/web/middleware/auth'
import { CoinRepository, } from '@workspace/data/repositories/CoinRepository'

export const handler = define.handlers({
  async GET(req,) {
    // 1. 認証チェック（明示的）
    const { userId, familyId, role, } = await requireAuth(req,)

    // 2. Repository に明示的な値を渡す
    const coinRepo = new CoinRepository()
    const coins = await coinRepo.getUserCoins(userId, familyId,)

    return Response.json({ coins, user: { userId, familyId, role, }, },)
  },

  async POST(req,) {
    // 1. 認証チェック
    const { userId, familyId, } = await requireAuth(req,)

    // 2. リクエストボディを取得
    const coin = await req.json()

    // 3. Repository に明示的な値を渡す
    const coinRepo = new CoinRepository()
    const newCoin = await coinRepo.addCoin(userId, familyId, coin,)

    return Response.json(newCoin,)
  },
},)
```

### この方針のメリット

1. **セキュリティが明確**: 認証・認可はハンドラー層で明示的に実施
2. **責任の分離**: Repository はデータアクセスのみに専念
3. **テストが容易**: Repository に直接値を渡せるため単体テストが書きやすい
4. **段階的な移行**: `requireAuth()` を変更するだけで認証方式を切り替え可能
5. **可読性**: 必要なパラメータが一目瞭然

---

## 3. ID 設計の方針

### Deno KV におけるキーの仕様

Deno KV では**キー自体が配列**で、各要素に使える型が決まっている。

#### 使用可能な型（公式仕様）

```typescript
type KvKey = readonly [KvKeyPart, ...KvKeyPart[],]

type KvKeyPart =
  | string
  | number
  | bigint
  | boolean
  | Uint8Array
```

出典: [Deno.Kv API Reference](https://docs.deno.com/api/deno/~/Deno.Kv)

#### 実際の使用例

```typescript
// ✅ 良い例：様々な型の組み合わせ
await kv.set(['users', 'user-123',], userData,) // string
await kv.set(['users', 12345,], userData,) // number
await kv.set(['users', 12345n,], userData,) // bigint
await kv.set(['coins', 'family-1', 'user-123', 'coin-456',], coin,) // 複数のstring
await kv.set(['sessions', true, 'session-789',], session,) // boolean + string

// ❌ 使えない型
await kv.set(['users', { id: 123, },], userData,) // オブジェクトは不可
await kv.set(['users', null,], userData,) // null は不可
await kv.set(['users', undefined,], userData,) // undefined は不可
```

### ID 設計パターンの比較

#### パターン1: UUID（推奨）

```typescript
const userId = crypto.randomUUID() // "550e8400-e29b-41d4-a716-446655440000"
await kv.set(['users', userId,], user,)
```

**メリット:**

- 衝突の心配がない
- 分散システムに適している
- Deno 標準の `crypto.randomUUID()` が使える
- Deno Deploy で問題なく動作

**デメリット:**

- 人間が読みにくい
- キーが長い（ストレージを少し多く使う）

**評価: ★★★★★（最推奨）**

#### パターン2: ULID（推奨、時系列順）

```typescript
import { ulid, } from 'https://deno.land/x/ulid/mod.ts'

const userId = ulid() // "01ARZ3NDEKTSV4RRFFQ69G5FAV"
await kv.set(['users', userId,], user,)
```

**メリット:**

- 時系列順にソート可能
- UUID より少し短い
- 衝突の心配がない

**デメリット:**

- 外部ライブラリが必要

**評価: ★★★★☆（UUID の代替案）**

### 推奨事項：UUID を採用

**理由:**

1. **Deno 標準機能**: `crypto.randomUUID()` が使える
2. **衝突の心配がない**: グローバルで一意
3. **Deno Deploy 対応**: 本番環境で問題なく動作
4. **分散システム対応**: 将来的なスケールに対応
5. **実装が簡単**: 外部ライブラリ不要

### 実装例

```typescript
// packages/data/types.ts
export interface User {
  _version: 1
  id: string // UUID
  name: string
  familyId: string // UUID
  role: 'manager' | 'member'
  createdAt: string
  updatedAt: string
}

export interface Coin {
  _version: 1
  id: string // UUID
  userId: string // UUID
  type: 'gold' | 'silver' | 'bronze'
  amount: number
  reason: string
  createdAt: string
}

export interface Family {
  _version: 1
  id: string // UUID
  name: string
  createdAt: string
  updatedAt: string
}

// packages/data/repositories/CoinRepository.ts
export class CoinRepository {
  async addCoin(
    userId: string,
    familyId: string,
    coin: Omit<Coin, 'id' | 'userId' | 'createdAt'>,
  ) {
    const kv = await getKv()
    const id = crypto.randomUUID() // ← UUID を生成

    const newCoin: Coin = {
      ...coin,
      _version: 1,
      id,
      userId,
      createdAt: new Date().toISOString(),
    }

    // キー構造: ['coins', familyId, userId, coinId]
    await kv.set(['coins', familyId, userId, id,], newCoin,)
    return newCoin
  }

  async getCoin(
    userId: string,
    familyId: string,
    coinId: string,
  ): Promise<Coin | null> {
    const kv = await getKv()
    const result = await kv.get<Coin>(['coins', familyId, userId, coinId,],)
    return result.value
  }

  async getUserCoins(userId: string, familyId: string,): Promise<Coin[]> {
    const kv = await getKv()
    const entries = kv.list<Coin>({
      prefix: ['coins', familyId, userId,],
    },)

    const coins: Coin[] = []
    for await (const entry of entries) {
      coins.push(entry.value,)
    }
    return coins
  }
}
```

---

## 4. キー設計のベストプラクティス

### 階層的なキー構造

```typescript
// ✅ 良い例：階層的で検索しやすい
;[
  'users',
  userId,
]['families', familyId]['coins', familyId, userId, coinId][
  'stamp_cards', familyId, userId, cardId
]['help_passport_definitions', familyId, passportId]

// 検索が容易
const userCoins = kv.list({ prefix: ['coins', familyId, userId,], },)
const familyCoins = kv.list({ prefix: ['coins', familyId,], },)
```

### キー設計の原則

1. **Family でグループ化**: マルチテナント対応
2. **User で分離**: ユーザーごとのデータ取得が高速
3. **ID は最後**: 個別アイテムへのアクセス
4. **一貫性を保つ**: 全エンティティで同じパターン

### 複雑なクエリへの対応

セカンダリインデックスの実装例：

```typescript
// プライマリキー
await kv.set(['users', userId,], user,)

// セカンダリインデックス（email で検索用）
await kv.set(['users_by_email', user.email,], userId,)

// 検索
async function findUserByEmail(email: string,): Promise<User | null> {
  const kv = await getKv()

  // セカンダリインデックスから userId を取得
  const indexResult = await kv.get<string>(['users_by_email', email,],)
  if (!indexResult.value) return null

  // プライマリキーでユーザーを取得
  const userResult = await kv.get<User>(['users', indexResult.value,],)
  return userResult.value
}
```

---

## 5. 具体的な実装ステップ

### フェーズ1: 基礎実装（Week 1-2）

#### Step 1: データモデルの定義

```
packages/data/
├─ types.ts          # 型定義
└─ schema.ts         # バリデーション（Zod）
```

#### Step 2: KV 接続管理

```
packages/data/
└─ kv.ts             # KV 接続の抽象化
```

#### Step 3: Repository の実装

```
packages/data/repositories/
├─ CoinRepository.ts
├─ StampCardRepository.ts
└─ HelpPassportRepository.ts
```

#### Step 4: 認証ミドルウェアの実装

```
packages/web/middleware/
└─ auth.ts           # 認証チェック（開発用ダミー実装）
```

#### Step 5: UI の実装

```
apps/web/routes/
├─ coins/
│   ├─ index.tsx     # 一覧
│   └─ add.tsx       # 追加
└─ stamps/
    └─ index.tsx     # スタンプカード一覧
```

### フェーズ2: 簡易認証（Week 3）

```
1. セッション管理の実装
   └─ Deno KV でセッション保存

2. ログイン画面の実装
   └─ 名前だけで「ログイン」

3. requireAuth() の本番実装
   └─ セッションから認証情報を取得
   └─ 未認証の場合はエラーを返す
```

### フェーズ3: 本格認証（Week 4+）

```
1. パスワード認証
   └─ bcrypt でハッシュ化

2. Family 招待機能
   └─ 招待リンクの生成

3. 権限チェック
   └─ Manager/Member の権限制御
```

---

## 6. ファイル構成

### 推奨ディレクトリ構造

```
manage-kids-coin/
├─ apps/
│   └─ web/
│       ├─ routes/
│       │   ├─ coins/
│       │   │   ├─ index.tsx
│       │   │   └─ add.tsx
│       │   ├─ stamps/
│       │   │   └─ index.tsx
│       │   └─ help-passport/
│       │       └─ index.tsx
│       └─ components/
│           └─ CoinCard.tsx
├─ packages/
│   ├─ data/
│   │   ├─ types.ts              # 型定義
│   │   ├─ schema.ts             # Zod スキーマ
│   │   ├─ kv.ts                 # KV 接続管理
│   │   └─ repositories/
│   │       ├─ CoinRepository.ts
│   │       ├─ StampCardRepository.ts
│   │       ├─ HelpPassportRepository.ts
│   │       ├─ UserRepository.ts
│   │       └─ FamilyRepository.ts
│   ├─ web/
│   │   └─ middleware/
│   │       └─ auth.ts           # 認証ミドルウェア
│   └─ ui/
│       └─ components/
└─ docs/
    └─ reports/
```

---

## 7. チェックリスト

### 実装前の確認事項

- [ ] ER 図を確認（`docs/whats.md`）
- [ ] Deno KV のレポートを読む（`docs/reports/2026-01-04_deno-kv-usage-and-local-behavior.md`）
- [ ] Deno Deploy のレポートを読む（`docs/reports/2026-01-04_deno-deploy-production-considerations.md`）

### フェーズ1の実装チェックリスト

- [ ] `packages/data/types.ts` - 全エンティティの型定義
- [ ] `packages/data/kv.ts` - KV 接続管理（開発/本番の切り替え）
- [ ] `packages/web/middleware/auth.ts` - 認証ミドルウェア（開発用ダミー実装）
- [ ] `packages/data/repositories/CoinRepository.ts` - コイン管理
- [ ] `apps/web/routes/coins/index.tsx` - コイン一覧ページ
- [ ] `apps/web/routes/coins/add.tsx` - コイン追加ページ

### フェーズ2の実装チェックリスト

- [ ] セッション管理（Deno KV）
- [ ] ログイン画面
- [ ] `requireAuth()` の本番実装（セッション認証）
- [ ] ユーザー切り替え機能

### フェーズ3の実装チェックリスト

- [ ] パスワード認証
- [ ] Family 招待機能
- [ ] 権限チェック
- [ ] OAuth 対応（将来的に）

---

## 8. まとめ

### 推奨アプローチ

```
1. データモデル定義
   └─ UUID を ID として使用
   └─ エンティティの型定義

2. Repository 実装
   └─ 必要なパラメータを明示的に受け取る設計
   └─ 認証・認可はハンドラー層で実施

3. 認証ミドルウェア実装
   └─ requireAuth() で認証チェック
   └─ 開発初期はダミー実装、後で本番実装に置き換え

4. UI 実装
   └─ Fresh 2.0 で高速開発
   └─ Islands Architecture で最適化
   └─ ハンドラーで認証→Repository呼び出し

5. 段階的に認証を追加
   └─ フェーズ1: ダミー認証
   └─ フェーズ2: 簡易認証（セッション管理）
   └─ フェーズ3: 本格認証（パスワード、OAuth）
```

### 重要な設計原則

1. **型安全性**: 最初から TypeScript の型を定義
2. **セキュリティ**: Repository は認証・認可を行わず、明示的なパラメータを受け取る
3. **責任の分離**: 認証・認可はハンドラー層、データアクセスは Repository 層
4. **UUID**: ID は UUID を使用（auto increment は避ける）
5. **段階的**: 認証は後から追加できる設計（ミドルウェアパターン）
6. **ベストプラクティス**: Deno KV のレポートで学んだパターンを適用

### 次のアクション

以下の順番で実装を開始：

1. `packages/data/types.ts` の作成
2. `packages/data/kv.ts` の作成
3. `packages/web/middleware/auth.ts` の作成（開発用ダミー実装）
4. `packages/data/repositories/CoinRepository.ts` の作成
5. `apps/web/routes/coins/index.tsx` の作成

---

## 参考資料

### 内部ドキュメント

- [ER 図・仕様書](../../whats.md)
- [Deno KV 調査レポート](./2026-01-04_deno-kv-usage-and-local-behavior.md)
- [Deno Deploy 考慮事項](./2026-01-04_deno-deploy-production-considerations.md)

### 公式ドキュメント

- [Deno.Kv API Reference](https://docs.deno.com/api/deno/~/Deno.Kv)
- [Deno KV Key Space](https://docs.deno.com/deploy/kv/manual/key_space/)
- [Web Crypto API - randomUUID()](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
- [Fresh 2.0 Documentation](https://fresh.deno.dev/)

### 技術記事

- [Conventional Commits](https://www.conventionalcommits.org/)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

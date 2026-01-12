# Deno Deploy 本番リリース時の考慮事項

**日付:** 2026-01-04
**目的:** Deno Deploy への本番リリースにおける制限事項、ベストプラクティス、パフォーマンス最適化手法を調査し、スムーズなデプロイメントを実現する

## 調査概要

Deno Deploy は Deno アプリケーションを世界 35 リージョンから配信できるエッジプラットフォーム。V8 isolate による高速なコールドスタート（100ms 以下）と、Fresh 2.0 フレームワークとの優れた統合が特徴。本レポートでは、Fresh 2.0 を使用したローカル開発環境から本番環境への移行時に考慮すべき事項をまとめる。

---

## 1. リソース制限と制約事項

### デプロイメント制限

| 項目                      | 制限値   | 備考                                |
| ------------------------- | -------- | ----------------------------------- |
| 最大メモリ                | 512MB    | アプリケーション全体                |
| デプロイサイズ            | 1GB      | ソースファイル + 静的ファイルの合計 |
| TLS 終端                  | 必須     | ポート 443 への送信接続             |
| デプロイレート（Free）    | 60/時間  | -                                   |
| デプロイレート（Builder） | 300/時間 | -                                   |

### メモリ制限への対応

```typescript
// ❌ 悪い例: メモリに全データを読み込む
async function processBadLargeFile(filePath: string,) {
  const data = await Deno.readTextFile(filePath,) // 全体を読み込み
  return processData(data,)
}

// ✅ 良い例: ストリーミング処理
async function* processGoodLargeFile(filePath: string,) {
  const file = await Deno.open(filePath,)
  const buffer = new Uint8Array(1024 * 64,) // 64KB chunks

  try {
    while (true) {
      const bytesRead = await file.read(buffer,)
      if (bytesRead === null) break
      yield buffer.slice(0, bytesRead,)
    }
  } finally {
    file.close()
  }
}

// 使用例
for await (const chunk of processGoodLargeFile('./large-file.txt',)) {
  // チャンクごとに処理
  await processChunk(chunk,)
}
```

### デプロイサイズの最適化

```typescript
// 不要なファイルを除外する .gitignore の設定
// node_modules/
// .env
// *.test.ts
// dev-kv.db

// 静的ファイルの最適化
import { optimize, } from 'https://deno.land/x/imageoptimize/mod.ts'

// 画像を事前に最適化
await optimize('./static/images/**/*.{jpg,png}', {
  quality: 80,
  maxWidth: 1920,
},)
```

---

## 2. Deno KV の本番環境での違い

### バックエンドの切り替わり

| 環境         | バックエンド | データ保存 | レイテンシー | 特徴                                 |
| ------------ | ------------ | ---------- | ------------ | ------------------------------------ |
| ローカル開発 | SQLite       | ファイル   | ~1ms         | 軽量、シングルプロセス               |
| Deno Deploy  | FoundationDB | 分散       | ~100ms       | グローバルレプリケーション、高可用性 |

### パフォーマンス差への対応

```typescript
// 1. バッチ操作を活用してラウンドトリップを削減
async function getUserWithRelations(userId: string,) {
  // ❌ 悪い例: 3回のネットワークアクセス
  const user = await kv.get(['users', userId,],)
  const settings = await kv.get(['settings', userId,],)
  const profile = await kv.get(['profiles', userId,],)

  // ✅ 良い例: 1回のネットワークアクセス
  const [user, settings, profile,] = await kv.getMany([
    ['users', userId,],
    ['settings', userId,],
    ['profiles', userId,],
  ],)

  return { user: user.value, settings: settings.value, profile: profile.value, }
}

// 2. 一貫性レベルの調整
async function getRecentPosts() {
  // 強一貫性は不要な読み取りには eventual を使用
  const entries = kv.list(
    { prefix: ['posts',], },
    { consistency: 'eventual', }, // レイテンシー最小化
  )

  const posts = []
  for await (const entry of entries) {
    posts.push(entry.value,)
  }

  return posts
}

// 3. アプリケーション層でのキャッシュ
const cache = new Map<string, { value: unknown; expires: number }>()

async function getCachedUser(userId: string,) {
  const cacheKey = `user:${userId}`
  const cached = cache.get(cacheKey,)

  if (cached && cached.expires > Date.now()) {
    return cached.value
  }

  const result = await kv.get(['users', userId,],)
  cache.set(cacheKey, {
    value: result.value,
    expires: Date.now() + 60000, // 60秒キャッシュ
  },)

  return result.value
}
```

### KV データの本番環境での確認

```bash
# Deno Deploy ダッシュボードから KV ブラウザを使用
# または CLI ツールで確認
deno run -A https://deno.land/x/deploy/deployctl.ts kv list --project=my-project

# 特定のキーを取得
deno run -A https://deno.land/x/deploy/deployctl.ts kv get --project=my-project users alice
```

### 開発・本番でのデータ分離

```typescript
// lib/kv.ts - 環境に応じた KV インスタンスの取得
let _kv: Deno.Kv | null = null

export async function getKv(): Promise<Deno.Kv> {
  if (_kv) return _kv

  const isDeploy = Deno.env.get('DENO_DEPLOY',) === '1'

  _kv = await Deno.openKv(
    isDeploy
      ? undefined // 本番: FoundationDB（自動）
      : './dev-kv.db', // 開発: SQLite
  )

  return _kv
}

// 使用例
const kv = await getKv()
await kv.set(['users', 'alice',], { name: 'Alice', },)
```

---

## 3. 環境変数の管理

### 環境変数の種類とコンテキスト

#### Secrets（機密情報）

**特徴:**

- UI で作成後は二度と表示されない
- アプリケーションコードからのみ読み取り可能
- API キー、認証トークン、データベース URL などに使用

**設定方法:**

```bash
# Deno Deploy ダッシュボード:
# Project Settings > Environment Variables > Add Secret

# または deployctl で設定
deployctl deploy \
  --project=my-project \
  --env=API_KEY=secret_value \
  main.ts
```

#### Organization レベル変数

- 組織内の全アプリケーションに適用
- アプリケーションレベルで上書き可能
- 共通設定（ログレベル、リージョンなど）に使用

#### コンテキスト

| コンテキスト | 用途           | アクセス可能な場所       |
| ------------ | -------------- | ------------------------ |
| Build        | ビルド処理     | ビルド時のみ             |
| Production   | 本番環境       | 本番デプロイメント       |
| Preview      | プレビュー環境 | プレビューデプロイメント |

### 制限事項

- **キー名**: 最大 128 バイト
- **値**: 最大 16KB (16,384 バイト)

### 実装パターン

```typescript
// config/env.ts - 型安全な環境変数の管理
import { z, } from 'zod'

const envSchema = z.object({
  // 必須の環境変数
  API_KEY: z.string().min(1,),
  DATABASE_URL: z.string().url().optional(),

  // オプショナルな環境変数（デフォルト値あり）
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error',],).default('info',),
  PORT: z.string().transform(Number,).default('8000',),

  // Deno Deploy 自動設定
  DENO_DEPLOY: z.string().optional(),
  DENO_DEPLOYMENT_ID: z.string().optional(),
},)

export type Env = z.infer<typeof envSchema>

let _env: Env | null = null

export function getEnv(): Env {
  if (_env) return _env

  _env = envSchema.parse({
    API_KEY: Deno.env.get('API_KEY',),
    DATABASE_URL: Deno.env.get('DATABASE_URL',),
    LOG_LEVEL: Deno.env.get('LOG_LEVEL',),
    PORT: Deno.env.get('PORT',),
    DENO_DEPLOY: Deno.env.get('DENO_DEPLOY',),
    DENO_DEPLOYMENT_ID: Deno.env.get('DENO_DEPLOYMENT_ID',),
  },)

  return _env
}

// 使用例
const env = getEnv()
console.log('Running in:', env.DENO_DEPLOY ? 'Production' : 'Development',)
```

### 環境別の設定管理

```typescript
// config/index.ts
const isDevelopment = !Deno.env.get('DENO_DEPLOY',)

export const config = {
  isDevelopment,
  isProduction: !isDevelopment,

  kv: {
    path: isDevelopment ? './dev-kv.db' : undefined,
  },

  logging: {
    level: Deno.env.get('LOG_LEVEL',) || (isDevelopment ? 'debug' : 'info'),
    pretty: isDevelopment, // 開発環境では見やすい形式
  },

  features: {
    analytics: !isDevelopment, // 本番のみ
    debugMode: isDevelopment,
  },

  api: {
    baseUrl: Deno.env.get('API_BASE_URL',) || 'https://api.example.com',
    timeout: Number(Deno.env.get('API_TIMEOUT',),) || 30000,
  },
}
```

### デプロイメントの不変性に関する注意

**重要:** デプロイメントは環境変数を含めて**イミュータブル**

```bash
# プロジェクトの環境変数を変更すると...
# → 現在の本番デプロイメントが自動的に再デプロイされる
# → 新しい DENO_DEPLOYMENT_ID が発行される

# 環境変数の変更履歴を追跡
echo "Deployment ID: $(deno eval 'console.log(Deno.env.get("DENO_DEPLOYMENT_ID"))')"
```

---

## 4. デプロイメント戦略

### Fresh 2.0 フレームワークのデプロイ

Fresh 2.0 は Vite ベースの新しいビルドシステムを採用し、パフォーマンスが大幅に向上しています。デプロイ手順は Fresh 1.x と同様ですが、ビルドコマンド（`deno task build`）が必須となります。

#### 初回セットアップ

1. **GitHub リポジトリとの連携**
   - Deno Deploy ダッシュボードで「New Project」
   - GitHub アカウントを接続
   - リポジトリを選択

2. **ビルド設定**
   ```yaml
   Framework Preset: Fresh
   Build Command: deno task build
   Root Directory: / (デフォルト)
   ```

3. **環境変数の設定**
   - Project Settings > Environment Variables
   - 必要な Secrets を追加

#### 自動デプロイメントフロー

```
コードプッシュ
    ↓
GitHub Webhook
    ↓
Deno Deploy ビルド開始
    ↓
┌─────────────────────┬─────────────────────┐
│  main/master ブランチ   │  その他のブランチ/PR   │
│  → 本番デプロイメント    │  → プレビューデプロイ  │
└─────────────────────┴─────────────────────┘
    ↓                       ↓
本番 URL に反映          プレビュー URL 生成
```

**URL 構造:**

- 本番: `https://$PROJECT_NAME.deno.dev`
- プレビュー: `https://$PROJECT_NAME-$BRANCH.deno.dev`
- カスタムドメイン: `https://example.com`（設定可能）

#### GitHub Actions との統合

```yaml
# .github/workflows/deploy.yml
name: Deploy to Deno Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x

      - name: Build
        run: deno task build

      - name: Deploy to Deno Deploy
        uses: denoland/deployctl@v1
        with:
          project: my-project
          entrypoint: main.ts
          root: .
```

### デプロイメント戦略のベストプラクティス

#### 1. ブランチ戦略

```
main (本番)
  ↑
  merge
  ↑
develop (ステージング)
  ↑
  merge
  ↑
feature/* (機能開発)
```

#### 2. プレビューデプロイメントの活用

```typescript
// プレビュー環境でのみ有効化する機能
const isPreview = Deno.env.get('DENO_DEPLOYMENT_ID',)?.includes('preview',)

if (isPreview) {
  console.log('Running in preview mode - enabling debug features',)
}
```

#### 3. カナリアデプロイメント

```typescript
// 一部のユーザーにのみ新機能を提供
function shouldEnableFeature(userId: string,): boolean {
  const deploymentId = Deno.env.get('DENO_DEPLOYMENT_ID',)

  // 新しいデプロイメントでは10%のユーザーに提供
  if (isNewDeployment(deploymentId,)) {
    return hashUserId(userId,) % 10 === 0
  }

  return true
}
```

---

## 5. パフォーマンス最適化

### コールドスタート対策

Deno Deploy のコールドスタートは **100ms 以下**と高速だが、さらに最適化可能：

```typescript
// ❌ 悪い例: リクエストごとに初期化
export default async function handler(req: Request,) {
  const kv = await Deno.openKv() // 毎回接続
  const data = await kv.get(['key',],)
  return new Response(JSON.stringify(data,),)
}

// ✅ 良い例: トップレベルで初期化（isolate ごとに1回）
const kv = await Deno.openKv()
const configCache = new Map<string, unknown>()

export default async function handler(req: Request,) {
  // 初期化済みのインスタンスを使用
  const data = await kv.get(['key',],)
  return new Response(JSON.stringify(data,),)
}
```

### キャッシュ戦略

#### 1. HTTP キャッシュヘッダー

```typescript
export default function handler(req: Request,) {
  const data = generateStaticContent()

  return new Response(data, {
    headers: {
      // CDN と ブラウザでキャッシュ
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'ETag': generateETag(data,),
      'Vary': 'Accept-Encoding',
    },
  },)
}
```

#### 2. アプリケーション層キャッシュ

```typescript
// メモリキャッシュ（isolate 内で共有）
class Cache<T,> {
  private store = new Map<string, { value: T; expires: number }>()

  set(key: string, value: T, ttlMs: number,) {
    this.store.set(key, {
      value,
      expires: Date.now() + ttlMs,
    },)
  }

  get(key: string,): T | null {
    const item = this.store.get(key,)
    if (!item) return null

    if (item.expires < Date.now()) {
      this.store.delete(key,)
      return null
    }

    return item.value
  }

  clear() {
    this.store.clear()
  }
}

// 使用例
const userCache = new Cache<User>()

async function getUser(userId: string,): Promise<User> {
  const cached = userCache.get(userId,)
  if (cached) return cached

  const kv = await getKv()
  const result = await kv.get(['users', userId,],)

  if (result.value) {
    userCache.set(userId, result.value as User, 60000,) // 60秒
  }

  return result.value as User
}
```

#### 3. KV を使ったキャッシュ

```typescript
async function getCachedData(key: string, fetcher: () => Promise<unknown>,) {
  const kv = await getKv()
  const cacheKey = ['cache', key,]

  // キャッシュをチェック
  const cached = await kv.get(cacheKey,)
  if (cached.value) {
    return cached.value
  }

  // データ取得
  const data = await fetcher()

  // KV にキャッシュ（TTL 付き）
  await kv.set(cacheKey, data, { expireIn: 3600000, },) // 1時間

  return data
}
```

### 静的アセットの最適化

```typescript
// Fresh での静的ファイル配信
// static/ ディレクトリのファイルは自動的に最適化される

// 手動で最適化する場合
import { serveDir, } from 'https://deno.land/std/http/file_server.ts'

export default async function handler(req: Request,) {
  const url = new URL(req.url,)

  // 静的ファイルの配信
  return serveDir(req, {
    fsRoot: 'static',
    quiet: true,
    headers: [
      // 長期キャッシュ
      'Cache-Control: public, max-age=31536000, immutable',
    ],
  },)
}
```

---

## 6. 料金とスペンドリミット

### 料金プラン

| プラン | 無料枠             | 超過料金 | 特徴               |
| ------ | ------------------ | -------- | ------------------ |
| Free   | 100万リクエスト/月 | -        | 開発・小規模サイト |
| Pro    | 500万リクエスト/月 | 従量課金 | 本番環境推奨       |

### スペンドリミット設定（Pro プラン）

**機能:**

- 組織全体の月次支出上限を設定
- アラート閾値の設定（例: 80%, 90%）
- 上限到達時は自動的にサービス停止

**エラーハンドリング:**

```typescript
export default async function handler(req: Request,) {
  try {
    // アプリケーションロジック
    const kv = await getKv()
    const data = await kv.get(['data',],)

    return new Response(JSON.stringify(data.value,),)
  } catch (error) {
    // スペンドリミット超過エラー
    if (
      error.message?.includes('QUOTA EXCEEDED',) ||
      error.message?.includes('403',)
    ) {
      return new Response(
        JSON.stringify({
          error: 'Service temporarily unavailable',
          message: 'Please try again later',
        },),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json', },
        },
      )
    }

    // その他のエラー
    console.error('Handler error:', error,)
    return new Response('Internal Server Error', { status: 500, },)
  }
}
```

### コスト最適化のヒント

```typescript
// 1. 不要なリクエストを減らす
export default function handler(req: Request,) {
  // robots.txt, favicon.ico などを早期リターン
  const url = new URL(req.url,)
  if (url.pathname === '/favicon.ico') {
    return new Response(null, { status: 204, },)
  }

  // ...
}

// 2. KV 操作を最小限に
// バッチ操作、キャッシュを活用

// 3. 大きなレスポンスは圧縮
import { gzip, } from 'https://deno.land/x/compress/mod.ts'

export default async function handler(req: Request,) {
  const data = getLargeData()
  const compressed = await gzip(new TextEncoder().encode(data,),)

  return new Response(compressed, {
    headers: {
      'Content-Encoding': 'gzip',
      'Content-Type': 'application/json',
    },
  },)
}
```

---

## 7. モニタリングとログ

### ログ出力のベストプラクティス

#### 構造化ログ

```typescript
// lib/logger.ts
interface LogEntry {
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  deploymentId?: string
  requestId?: string
  [key: string]: unknown
}

export class Logger {
  private deploymentId = Deno.env.get('DENO_DEPLOYMENT_ID',)

  log(
    level: LogEntry['level'],
    message: string,
    meta: Record<string, unknown> = {},
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      deploymentId: this.deploymentId,
      ...meta,
    }

    // Deno Deploy のログは自動的に収集される
    console.log(JSON.stringify(entry,),)
  }

  debug(message: string, meta?: Record<string, unknown>,) {
    this.log('debug', message, meta,)
  }

  info(message: string, meta?: Record<string, unknown>,) {
    this.log('info', message, meta,)
  }

  warn(message: string, meta?: Record<string, unknown>,) {
    this.log('warn', message, meta,)
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>,) {
    this.log('error', message, {
      ...meta,
      error: error?.message,
      stack: error?.stack,
    },)
  }
}

// 使用例
const logger = new Logger()

export default async function handler(req: Request,) {
  const requestId = crypto.randomUUID()

  logger.info('Request received', {
    requestId,
    method: req.method,
    url: req.url,
  },)

  try {
    // 処理
    const result = await processRequest(req,)

    logger.info('Request completed', {
      requestId,
      duration: performance.now(),
    },)

    return new Response(result,)
  } catch (error) {
    logger.error('Request failed', error as Error, { requestId, },)
    return new Response('Error', { status: 500, },)
  }
}
```

### パフォーマンスモニタリング

```typescript
// lib/metrics.ts
export class Metrics {
  private metrics = new Map<string, number[]>()

  record(name: string, value: number,) {
    if (!this.metrics.has(name,)) {
      this.metrics.set(name, [],)
    }
    this.metrics.get(name,)!.push(value,)
  }

  getStats(name: string,) {
    const values = this.metrics.get(name,) || []
    if (values.length === 0) return null

    const sorted = [...values,].sort((a, b,) => a - b)
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b,) => a + b, 0,) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5,)],
      p95: sorted[Math.floor(sorted.length * 0.95,)],
      p99: sorted[Math.floor(sorted.length * 0.99,)],
    }
  }

  report() {
    const report: Record<string, unknown> = {}
    for (const [name, _values,] of this.metrics.entries()) {
      report[name] = this.getStats(name,)
    }
    return report
  }
}

// 使用例
const metrics = new Metrics()

export default async function handler(req: Request,) {
  const start = performance.now()

  try {
    const response = await processRequest(req,)
    const duration = performance.now() - start

    metrics.record('request.duration', duration,)
    metrics.record('request.success', 1,)

    return response
  } catch (error) {
    metrics.record('request.error', 1,)
    throw error
  }
}

// 定期的にメトリクスをログ出力
setInterval(() => {
  console.log(JSON.stringify({
    type: 'metrics',
    data: metrics.report(),
  },),)
}, 60000,) // 1分ごと
```

### Deno Deploy ダッシュボード

**利用可能な機能:**

- リアルタイムログ表示
- デプロイメント履歴
- トラフィック統計
- エラーレート
- レスポンスタイム
- KV データブラウザ

---

## 8. セキュリティ考慮事項

### 環境変数の保護

```typescript
// ❌ 悪い例: 機密情報をログに出力
console.log('API Key:', Deno.env.get('API_KEY',),)

// ✅ 良い例: マスクして出力
const apiKey = Deno.env.get('API_KEY',)
console.log('API Key:', apiKey ? `${apiKey.slice(0, 4,)}****` : 'not set',)
```

### CORS 設定

```typescript
export default function handler(req: Request,) {
  // Preflight リクエストの処理
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': 'https://example.com',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    },)
  }

  // 実際のリクエスト処理
  const response = handleRequest(req,)

  // CORS ヘッダーを追加
  response.headers.set('Access-Control-Allow-Origin', 'https://example.com',)

  return response
}
```

### レート制限

```typescript
// KV を使ったシンプルなレート制限
const RATE_LIMIT = 100 // 100リクエスト/分
const WINDOW_MS = 60000 // 1分

async function checkRateLimit(identifier: string,): Promise<boolean> {
  const kv = await getKv()
  const key = ['rate_limit', identifier, Math.floor(Date.now() / WINDOW_MS,),]

  const result = await kv.get(key,)
  const count = (result.value as number) || 0

  if (count >= RATE_LIMIT) {
    return false
  }

  await kv.set(key, count + 1, { expireIn: WINDOW_MS, },)
  return true
}

export default async function handler(req: Request,) {
  const ip = req.headers.get('x-forwarded-for',) || 'unknown'

  if (!(await checkRateLimit(ip,))) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': '60',
      },
    },)
  }

  return handleRequest(req,)
}
```

---

## 9. データマイグレーション戦略

### ローカルから本番への初回データ移行

```typescript
// scripts/migrate-to-production.ts
import { parse, } from 'https://deno.land/std/flags/mod.ts'

const args = parse(Deno.args,)
const sourceDbPath = args.source || './dev-kv.db'

async function migrateToProduction() {
  // ローカル KV を開く
  const localKv = await Deno.openKv(sourceDbPath,)

  // 本番 KV を開く（DENO_DEPLOY=1 の環境で実行）
  const prodKv = await Deno.openKv()

  console.log('Starting migration...',)

  let count = 0
  const entries = localKv.list({ prefix: [], },)

  for await (const entry of entries) {
    await prodKv.set(entry.key, entry.value,)
    count++

    if (count % 100 === 0) {
      console.log(`Migrated ${count} entries...`,)
    }
  }

  console.log(`Migration complete! Total entries: ${count}`,)

  localKv.close()
  prodKv.close()
}

// 実行前に確認
if (
  confirm('Migrate data to production? This will overwrite existing data.',)
) {
  await migrateToProduction()
}
```

### 本番環境でのマイグレーション実行

```bash
# 環境変数を設定して本番 KV に接続
DENO_DEPLOY=1 deno run --unstable-kv -A scripts/migrate-to-production.ts --source=./dev-kv.db
```

---

## 10. トラブルシューティング

### よくある問題と解決策

#### 1. メモリ不足エラー

**症状:**

```
Error: Memory limit exceeded
```

**解決策:**

- ストリーミング処理を使用
- メモリキャッシュのサイズを制限
- 大きなオブジェクトを早期に解放

```typescript
// メモリキャッシュのサイズ制限
class LRUCache<T,> {
  private maxSize = 100
  private cache = new Map<string, T>()

  set(key: string, value: T,) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey,)
    }
    this.cache.set(key, value,)
  }
}
```

#### 2. KV レイテンシーが高い

**症状:**

- ローカルは高速だが、本番環境で遅い

**解決策:**

```typescript
// バッチ操作を活用
const results = await kv.getMany([...keys,],)

// 一貫性レベルを調整
const result = await kv.get(key, { consistency: 'eventual', },)

// アプリケーション層でキャッシュ
const cached = cache.get(key,)
if (cached) return cached
```

#### 3. 環境変数が読み取れない

**症状:**

```
Deno.env.get('API_KEY') // undefined
```

**チェックポイント:**

- Deno Deploy ダッシュボードで環境変数が設定されているか
- デプロイメントが最新か（環境変数変更後に自動再デプロイされる）
- Secret として設定されているか（Organization 変数ではないか）

#### 4. デプロイが失敗する

**症状:**

- GitHub push 後にデプロイが失敗

**確認事項:**

```bash
# ローカルでビルドが成功するか確認
deno task build

# 型チェック
deno check main.ts

# 依存関係のキャッシュ
deno cache --reload main.ts
```

---

## チェックリスト：本番リリース前の確認事項

### コード・アーキテクチャ

- [ ] メモリ使用量が 512MB 以内に収まることを確認
- [ ] ストリーミング処理を使用（大きなファイル処理）
- [ ] KV 操作はバッチ化されているか
- [ ] エラーハンドリングが適切か
- [ ] ログが構造化されているか

### 環境設定

- [ ] 本番用の環境変数を Secrets として設定
- [ ] `.env` ファイルを `.gitignore` に追加
- [ ] `DENO_DEPLOY` 環境変数で本番環境を検出
- [ ] ビルドコマンドが正しく設定されているか

### Deno KV

- [ ] ローカル開発用の SQLite パスを設定
- [ ] 本番環境では `Deno.openKv()` を引数なしで呼び出し
- [ ] バッチ操作（`getMany`, `atomic`）を活用
- [ ] 一貫性レベルを適切に設定
- [ ] 初回データマイグレーション計画

### パフォーマンス

- [ ] トップレベルで初期化（KV 接続など）
- [ ] HTTP キャッシュヘッダーを設定
- [ ] 静的アセットの最適化
- [ ] アプリケーション層キャッシュの実装

### セキュリティ

- [ ] CORS 設定が適切か
- [ ] レート制限の実装
- [ ] 機密情報がログに出力されていないか
- [ ] HTTPS のみで通信

### モニタリング

- [ ] 構造化ログの実装
- [ ] エラートラッキング
- [ ] パフォーマンスメトリクスの記録
- [ ] アラート設定（スペンドリミットなど）

### デプロイメント

- [ ] GitHub Actions のワークフロー設定
- [ ] プレビューデプロイメントのテスト
- [ ] 本番デプロイ前のステージング環境確認
- [ ] ロールバック計画

### ドキュメント

- [ ] README に環境変数リストを記載
- [ ] デプロイ手順のドキュメント化
- [ ] トラブルシューティングガイド

---

## 参考資料

### 公式ドキュメント

- [Deno Deploy Pricing and Limitations](https://docs.deno.com/deploy/manual/pricing-and-limits/)
- [Environment Variables and Contexts](https://docs.deno.com/deploy/reference/env_vars_and_contexts/)
- [Deno Deploy Runtime](https://docs.deno.com/deploy/reference/runtime/)
- [Deno KV Quick Start](https://docs.deno.com/deploy/kv/)
- [Fresh Deploy to Production](https://fresh.deno.dev/docs/getting-started/deploy-to-production)

### 技術記事・リソース

- [Benchmarking AWS Lambda Cold Starts](https://deno.com/blog/aws-lambda-coldstart-benchmarks)
- [Protect your cloud spend with new Deno Deploy spend limits](https://deno.com/blog/deploy-spend-limits)
- [An Update on Fresh](https://deno.com/blog/an-update-on-fresh) - Fresh 2.0 への移行情報を含む

### コミュニティリソース

- [Deno Deploy Beta - First look & start up times](https://dev.to/aidangee/deno-deploy-beta-first-look-start-up-times-4gj3)
- [What is Deno Deploy: A Review of Deployment Features](https://bejamas.com/hub/hosting/deno-deploy)

---

## まとめ

Deno Deploy は高速なコールドスタートとグローバル配信を実現する優れたプラットフォームだが、以下の点に注意が必要：

### 主要な考慮事項

1. **リソース制限**: メモリ 512MB、デプロイサイズ 1GB を超えないよう設計
2. **KV のパフォーマンス**: ローカル（1ms）と本番（100ms）の差を考慮し、バッチ操作とキャッシュを活用
3. **環境変数管理**: Secrets の適切な設定とイミュータブルなデプロイメントの理解
4. **コールドスタート最適化**: トップレベルでの初期化とキャッシュ戦略
5. **モニタリング**: 構造化ログとメトリクスの記録

### 推奨アプローチ

- 開発環境と本番環境を明確に分離
- 段階的なデプロイメント（プレビュー → ステージング → 本番）
- パフォーマンスとコストのバランスを意識
- 継続的なモニタリングと改善

適切な準備と設定により、Deno Deploy は高パフォーマンスで信頼性の高い本番環境を提供する。

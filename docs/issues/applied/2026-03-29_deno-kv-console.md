Status: Applied

# Summary

マイグレーション計画を安全に立てるために、ローカル環境から本番・開発の Deno KV に接続してデータの確認や操作ができるコンソール環境を整備する。

マイグレーションランナーを実装する前段として、現在のKVの状態（キー構造・データ内容）を調査・確認する手段が必要。Rails console に相当する開発者ツールとして位置づける。

---

# Details

`deno task console` で各環境へのコンソール環境へ入れるようにする。中身は `deno repl` を利用したコンソール環境の起動である。
実行時の環境変数は、以下を受け取る。 `.env` ファイルは現時点では扱う値も少なく、AI利用によるリスク回避のため原則使用しない。

- `DENO_KV_ACCESS_TOKEN` - 認証情報。local 時は不要
- `DENO_KV_PATH` - local 接続時の SQLite ファイルパス（他の apps と同様）
- `PROD_DB_ID` - production 環境の `DB_ID`
- `PREVIEW_DB_ID` - preview 環境の `DB_ID`
- `DB_ID` どちらも指定されていたとき、 preview を優先する

### 要件

- 起動時に読み込むのは Deno KVへの接続と、 `packages/data/usecases` 、また各 DataModel が初期状態で利用可能なことが望ましい
- 本番接続時には confirm を挟むようにしたい
- デフォルトは read 操作のみ許可し、write 操作は `ALLOW_WRITE=1` を明示的に指定した場合のみ有効にする
  - usecase の read/write 分離が前提となる（別途 issue 参照）

# Approach

### ファイル構成

```
packages/data/tools/console.ts   ← REPL 起動前に実行される初期化スクリプト（新規作成）
deno.json                         ← console タスクを追加
```

`packages/data` の usecases を使う付随ツールとして、同パッケージ内の `tools/` に配置する。

### deno task console の定義

```json
"console": "deno repl --unstable-kv --allow-env --allow-net --eval-file=packages/data/tools/console.ts"
```

`deno repl --eval-file` で初期化スクリプトを実行後、REPL セッションが開始される。

### console.ts の処理フロー

1. 環境変数を読み取る（`DENO_KV_ACCESS_TOKEN`, `DENO_KV_PATH`, `PROD_DB_ID`, `PREVIEW_DB_ID`, `ALLOW_WRITE`）
2. 接続先を決定する:
   - `PREVIEW_DB_ID` があれば preview（remote URL）
   - `PROD_DB_ID` のみあれば production（remote URL）
   - どちらもなければ local（`DENO_KV_PATH` を使用、他の apps と同様）
3. production 接続時は confirm を挟み、No なら `Deno.exit(1)`
4. 以下のように `Deno.openKv` で KV を開く:
   ```typescript
   // local
   const kv = await Deno.openKv(Deno.env.get('DENO_KV_PATH'))
   // remote (preview / production)
   const kv = await Deno.openKv(
     `https://api.deno.com/databases/${dbId}/connect`
   )
   ```
5. 全 usecases を初期化する
6. `ALLOW_WRITE` が未設定なら `ReadOnlyInterface` 型として公開し、write メソッドを隠蔽する
7. 起動メッセージを表示する（環境名・write 可否）

### REPL への公開

全 usecases を `globalThis` に登録し、REPL 上で直接呼び出せるようにする。

```typescript
Object.assign(globalThis, {
  kv,
  coinUseCase, // CoinUseCaseReadOnlyInterface or CoinUseCaseInterface
  coinTypeUseCase, // CoinTypeUseCaseReadOnlyInterface or CoinTypeUseCaseInterface
  coinDistributionUseCase, // CoinDistributionUseCaseReadOnlyInterface or CoinDistributionUseCaseInterface
  // KV prefix key constants (for raw kv operations)
  COIN_PREFIX_KEY,
  COIN_TYPE_PREFIX_KEY,
  COIN_TRANSACTION_PREFIX_KEY,
  DAILY_COIN_DISTRIBUTION_PREFIX_KEY
})
```

### Read-only 制御

`packages/data` の `ReadOnlyInterface` を利用した型レベルの制御。`ALLOW_WRITE=1` 未指定時は read メソッドのみ公開する:

```typescript
const allowWrite = Deno.env.get('ALLOW_WRITE') === '1'
const fullUseCase = makeCoinUseCase({ kv })
const coinUseCase: CoinUseCaseReadOnlyInterface | typeof fullUseCase =
  allowWrite
    ? fullUseCase
    : { listByUser: fullUseCase.listByUser, findById: fullUseCase.findById }
```

---

# Results

以下のファイルを新規作成・更新した。

- `packages/data/tools/console.ts` — REPL 初期化スクリプト
- `deno.json` — `console:local` / `console:remote` タスクを追加

タスクを local / remote で分離し、それぞれ必須の環境変数が未指定の場合はエラーメッセージを出して終了するバリデーションを実装した。起動時に環境名・モード（read-only / read/write）を表示する。

| タスク           | 必須環境変数                                             | `--allow-write`       |
| ---------------- | -------------------------------------------------------- | --------------------- |
| `console:local`  | `DENO_KV_PATH`                                           | あり（SQLite のため） |
| `console:remote` | `DENO_KV_ACCESS_TOKEN` + `PREVIEW_DB_ID` or `PROD_DB_ID` | なし                  |

### 実装時のメモ

- `deno repl --eval-file` は相対 import を CWD 基準で解決するため、`../mod.ts` のような相対パスは使えない。`@workspace/data` のワークスペース import を使って解決した。
- local KV の SQLite ファイルへは read だけでなく write 権限も必要（WAL・ロックファイル書き込みのため）。remote 接続には不要なためタスク分離で対応した。

# References

- `docs/issues/applied/2026-03-30_usecase-read-write-separation.md`

# Feedback

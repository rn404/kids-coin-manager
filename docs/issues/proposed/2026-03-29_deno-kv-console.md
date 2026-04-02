Status: Proposed

# Summary

マイグレーション計画を安全に立てるために、ローカル環境から本番・開発の Deno KV に接続してデータの確認や操作ができるコンソール環境を整備する。

マイグレーションランナーを実装する前段として、現在のKVの状態（キー構造・データ内容）を調査・確認する手段が必要。Rails console に相当する開発者ツールとして位置づける。

---

# Details

`deno task console` で各環境へのコンソール環境へ入れるようにする。中身は `deno repl` を利用したコンソール環境の起動である。
実行時の環境変数は、以下を受け取る。 `.env` ファイルは現時点では扱う値も少なく、AI利用によるリスク回避のため原則使用しない。

- `DENO_KV_ACCESS_TOKEN` - 認証情報。local 時は不要
- `PROD_DB_ID` - production 環境の `DB_ID`
- `PREVIEW_DB_ID` - preview 環境の `DB_ID`
- `DB_ID` どちらも指定されていたとき、 preview を優先する

### 要件

- 起動時に読み込むのは Deno KVへの接続と、 `packages/data/usecases` 、また各 DataModel が初期状態で利用可能なことが望ましい
- 本番接続時には confirm を挟むようにしたい
- デフォルトは read 操作のみ許可し、write 操作は `ALLOW_WRITE=1` を明示的に指定した場合のみ有効にする
  - usecase の read/write 分離が前提となる（別途 issue 参照）

# Approach

以下のように Deno.openKv 実行時にパスを指定し接続したあと、console 環境を立ち上げる

```typescript
const kv = await Deno.openKv(
  'https://api.deno.com/databases/<database-id>/connect'
)
```

---

# Results

# References

# Feedback

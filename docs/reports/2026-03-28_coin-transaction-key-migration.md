# CoinTransaction KVキー構造変更とマイグレーション

## 背景

利用履歴ページの実装にあたり、CoinTransaction の KV キー構造に問題が発覚した。

### 旧キー構造

```
['coin_transactions', userId, familyId, coinTypeId, transactionId]
```

KV はキーの辞書順で結果を返すため、`coinTypeId` が `transactionId`（UUID v7）より前にあると、異なる coinType をまたいだ時刻順のリストが取得できない。`reverse: true` を使っても coinTypeId でグループ化された状態で逆順になるだけで、時刻順にはならない。

### 新キー構造

```
['coin_transactions', userId, familyId, transactionId, coinTypeId]
```

`transactionId`（UUID v7）を先に置くことで、`prefix: ['coin_transactions', userId, familyId]` での全件取得が時刻順になる。coinTypeId による絞り込みは KV prefix では行えなくなるが、value に `coinTypeId` が含まれているためアプリ側フィルタリングで対応できる。

## 変更されたファイル

- `packages/data/usecases/CoinUseCase.ts` - トランザクション書き込みキー変更
- `packages/data/usecases/CoinDistributionUseCase.ts` - トランザクション書き込みキー変更
- `packages/data/test-helpers/factories/CoinTransactionFactory.ts` - テスト用書き込みキー変更
- `packages/data/usecases/CoinUseCase_test.ts` - テストの listTransactions ヘルパーを coinTypeId prefix から userId/familyId prefix に変更

## マイグレーション

### 対象

旧キー形式で保存されている全 CoinTransaction レコード。

### 判定方法

value には `id`（transactionId）と `coinTypeId` が両方含まれている。`key[3] === value.coinTypeId` であれば旧フォーマットと判定できる。

### マイグレーション処理

```typescript
const kv = await Deno.openKv(Deno.env.get('DENO_KV_PATH'))

const entries = kv.list<CoinTransactionDataModel>({
  prefix: ['coin_transactions']
})

for await (const entry of entries) {
  const key = entry.key
  const value = entry.value

  if (key.length !== 5) continue

  const [prefix, userId, familyId, fourth, fifth] = key as [
    string,
    string,
    string,
    string,
    string
  ]

  // fourth === coinTypeId なら旧フォーマット
  if (fourth !== value.coinTypeId) continue

  const transactionId = fifth
  const newKey = [prefix, userId, familyId, transactionId, value.coinTypeId]

  await kv.atomic()
    .check(entry) // 楽観的ロックで競合防止
    .set(newKey, value) // 新キーで書き込み
    .delete(key) // 旧キーを削除
    .commit()
}

kv.close()
```

### 注意事項

- `.check(entry)` による楽観的ロックを使い、移行中の並行書き込みによるデータ消失を防ぐ
- マイグレーション実行中はアプリを停止することを推奨
- 本番実行前にステージング環境で動作確認すること
- `.delete(key)` と `.set(newKey, value)` を atomic にまとめることで、中断時にデータが二重保持される状態で残ることを防ぐ

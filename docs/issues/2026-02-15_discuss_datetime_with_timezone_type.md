Status: Draft

# Summary

コインの配布日などデイリーの概念がある本アプリケーションで、どこの標準時に従うかを考慮する必要があるため、アプリケーション内部で変換処理を容易にするためのタイムゾーンを考慮した型定義をしておきたい。

---

# Details

以下のようなイメージで、

```typescript
interface DatetimeWithTimezone {
  datetime: ISODateTimeString // '2026-02-14T22:46:20.000Z' UTC前提
  timezone: string // 'Asia/Tokyo'
  // 以下は提案
  localDatetime: string // '2026-02-15T07:46:20+09:00' ローカルでのISO表記
  localDateString: ISODateString // '2026-02-15' ローカルでの日付表記
}
```

※ `ISODateTimeString` と `ISODateString` は `packages/types` に既存の型定義。

この型同士で diff とか between とか計算できるとうれしい。
すでにライブラリなどで同様のことができるものがあればそれを採用する。

## 具体的に問題になるケース

`CoinDistributionUseCase` の `ensure` では、前回の配布日（`summaryDate`）と今日の日付の差分で配布日数を計算している。
この「今日の日付」がタイムゾーンによって変わるため、正しいローカル日付を算出する仕組みが必要。

例: UTC 2026-02-14T16:00:00Z（JST 2026-02-15 01:00）のとき

- UTC 基準で `summaryDate` を出すと `'2026-02-14'`
- JST 基準で `summaryDate` を出すと `'2026-02-15'`

前回配布が `'2026-02-14'` の場合：

- UTC 基準 → 差分 0 日 → **配布されない**（ユーザーの体感では日付が変わっているのに）
- JST 基準 → 差分 1 日 → 正しく配布される

# Approach

---

# Results

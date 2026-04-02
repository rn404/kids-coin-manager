Status: Applied

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

## 採用: ネイティブ `Intl.DateTimeFormat`

外部ライブラリは追加せず、ネイティブ API で実装する。

### 検討した選択肢

1. **`date-fns` + `date-fns-tz`** — 軽量で tree-shaking 対応だが、必要な機能（UTC→ローカル日付変換、日数差分、TZ バリデーション）がネイティブ API で十分カバーできるため、依存追加のメリットが薄い
2. **`luxon`** — `DateTime.fromISO().setZone()` が直感的だが、ランタイムサイズが大きく、本プロジェクトが現時点で外部日時ライブラリをゼロで運用していることを考えると導入コストが高い
3. **`Temporal` API** — `Temporal.ZonedDateTime` が理想的な API 設計だが、Stage 3 提案のため Deno でも `--unstable-temporal` フラグが必要で、本番利用には時期尚早

### 採用理由

- Deno の V8 エンジンは完全な ICU サポートを持ち、`Intl.DateTimeFormat` のタイムゾーン変換は安定している
- プロジェクトの外部日時ライブラリゼロの方針を維持できる
- 必要な操作が限定的（UTC→ローカル日付、日数差分）であり、ネイティブ API で十分実装可能
- 将来 `Temporal` が安定した際には、内部実装をファクトリ関数の中で差し替えるだけで移行可能

## 実装

- 型定義: `packages/types/DatetimeWithTimezone.ts`
- ユーティリティ: `packages/foundations/datetime-with-timezone.ts`
  - `createDatetimeWithTimezone(datetime, timezone)` — ファクトリ関数
  - `createDatetimeWithTimezoneFromNow(timezone)` — 現在時刻からのファクトリ
  - `diffLocalDays(from, to)` — ローカル日付間の日数差
  - `isTimezone(value)` — IANA タイムゾーン識別子のバリデーション
- テスト: `packages/foundations/datetime-with-timezone_test.ts`

---

# Results

`DatetimeWithTimezone` 型とユーティリティを実装した。

- `packages/types/DatetimeWithTimezone.ts` — 型定義
- `packages/foundations/datetime-with-timezone.ts` — ユーティリティ関数
- `packages/foundations/datetime-with-timezone_test.ts` — テスト（4 describe / 12 steps 全 pass）

`CoinDistributionUseCase` への適用は別途対応する。呼び出し元が `createDatetimeWithTimezoneFromNow('Asia/Tokyo').localDateString` を `summaryDate` として渡す形になり、UseCase 側のインターフェースは変更不要。

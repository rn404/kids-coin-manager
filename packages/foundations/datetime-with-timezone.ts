import type { ISODateString, ISODateTimeString } from './timestamp.ts'

/**
 * UTC の datetime にタイムゾーン情報を付与し、
 * ローカル日時・ローカル日付を確定させた値オブジェクト。
 *
 * ファクトリ関数 `createDatetimeWithTimezone` で生成する。
 */
interface DatetimeWithTimezone {
  /** UTC の ISO 8601 datetime（例: '2026-02-14T22:46:20.000Z'） */
  readonly datetime: ISODateTimeString
  /** IANA タイムゾーン識別子（例: 'Asia/Tokyo'） */
  readonly timezone: string
  /** ローカルのオフセット付き ISO 8601 datetime（例: '2026-02-15T07:46:20.000+09:00'） */
  readonly localDatetime: string
  /** ローカルの日付（例: '2026-02-15'） */
  readonly localDateString: ISODateString
}

/**
 * IANA タイムゾーン識別子として有効かどうかを判定する。
 */
const isTimezone = (value: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value })
    return true
  } catch {
    return false
  }
}

/**
 * `Intl.DateTimeFormat('en-CA')` を使い、指定タイムゾーンでの YYYY-MM-DD を得る。
 * `en-CA` ロケールは ISO 8601 形式（YYYY-MM-DD）で日付を出力する。
 */
const toLocalDateString = (
  date: Date,
  timezone: string
): ISODateString => {
  return Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

/**
 * `'GMT+9:00'` や `'GMT-5:00'` のような timeZoneName を `'+09:00'` / `'-05:00'` に変換する。
 * `'GMT'`（オフセット 0）は `'+00:00'` を返す。
 */
const parseOffset = (gmtString: string): string => {
  if (gmtString === 'GMT') {
    return '+00:00'
  }

  const match = gmtString.match(/^GMT([+-])(\d{1,2}):?(\d{2})?$/)
  if (match === null) {
    return '+00:00'
  }

  const sign = match[1]
  const hours = match[2].padStart(2, '0')
  const minutes = (match[3] ?? '00').padStart(2, '0')
  return `${sign}${hours}:${minutes}`
}

/**
 * `formatToParts` でオフセット付き ISO 8601 文字列を組み立てる。
 * 例: '2026-02-15T07:46:20.000+09:00'
 */
const toLocalDatetime = (
  date: Date,
  timezone: string
): string => {
  const formatter = Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'shortOffset'
  })

  const parts = formatter.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? ''

  const year = get('year')
  const month = get('month')
  const day = get('day')
  const hour = get('hour') === '24' ? '00' : get('hour')
  const minute = get('minute')
  const second = get('second')
  const ms = String(date.getMilliseconds()).padStart(3, '0')
  const offset = parseOffset(get('timeZoneName'))

  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}${offset}`
}

/**
 * UTC の ISO 8601 datetime とタイムゾーンから `DatetimeWithTimezone` を生成する。
 */
const createDatetimeWithTimezone = (
  datetime: ISODateTimeString,
  timezone: string
): DatetimeWithTimezone => {
  if (isTimezone(timezone) === false) {
    throw new Error(`Invalid timezone: ${timezone}`)
  }

  const date = new Date(datetime)
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid datetime: ${datetime}`)
  }

  return {
    datetime,
    timezone,
    localDatetime: toLocalDatetime(date, timezone),
    localDateString: toLocalDateString(date, timezone)
  }
}

/**
 * 現在時刻から `DatetimeWithTimezone` を生成する。
 */
const createDatetimeWithTimezoneFromNow = (
  timezone: string
): DatetimeWithTimezone => {
  return createDatetimeWithTimezone(new Date().toISOString(), timezone)
}

/**
 * 2つの `DatetimeWithTimezone` の `localDateString` 間の日数差を返す。
 * `to` が `from` より未来なら正の値、過去なら負の値を返す。
 */
const diffLocalDays = (
  from: DatetimeWithTimezone,
  to: DatetimeWithTimezone
): number => {
  const msPerDay = 86_400_000
  const fromMs = new Date(from.localDateString).getTime()
  const toMs = new Date(to.localDateString).getTime()
  return Math.round((toMs - fromMs) / msPerDay)
}

export {
  createDatetimeWithTimezone,
  createDatetimeWithTimezoneFromNow,
  diffLocalDays,
  isTimezone
}
export type { DatetimeWithTimezone }

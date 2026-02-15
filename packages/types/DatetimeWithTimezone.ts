import type { ISODateString, } from './ISODateString.ts'
import type { ISODateTimeString, } from './ISODateTimeString.ts'

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

export type { DatetimeWithTimezone, }

import { assertEquals, assertThrows, } from '@std/assert'
import { describe, it, } from '@std/testing/bdd'
import {
  createDatetimeWithTimezone,
  createDatetimeWithTimezoneFromNow,
  diffLocalDays,
  isTimezone,
} from './datetime-with-timezone.ts'

describe('createDatetimeWithTimezone()', () => {
  it('UTC 深夜が JST では翌日になるケース（日付境界）', () => {
    const result = createDatetimeWithTimezone(
      '2026-02-14T16:00:00.000Z',
      'Asia/Tokyo',
    )

    assertEquals(result.datetime, '2026-02-14T16:00:00.000Z',)
    assertEquals(result.timezone, 'Asia/Tokyo',)
    assertEquals(result.localDateString, '2026-02-15',)
    assertEquals(result.localDatetime, '2026-02-15T01:00:00.000+09:00',)
  })

  it('UTC と同じタイムゾーンでは日付が変わらない', () => {
    const result = createDatetimeWithTimezone(
      '2026-02-14T16:00:00.000Z',
      'UTC',
    )

    assertEquals(result.localDateString, '2026-02-14',)
    assertEquals(result.localDatetime, '2026-02-14T16:00:00.000+00:00',)
  })

  it('負のオフセット（US Eastern）で前日になるケース', () => {
    const result = createDatetimeWithTimezone(
      '2026-02-15T03:00:00.000Z',
      'America/New_York',
    )

    assertEquals(result.localDateString, '2026-02-14',)
    assertEquals(result.localDatetime, '2026-02-14T22:00:00.000-05:00',)
  })

  it('ミリ秒が保持される', () => {
    const result = createDatetimeWithTimezone(
      '2026-02-14T16:30:45.123Z',
      'Asia/Tokyo',
    )

    assertEquals(result.localDatetime, '2026-02-15T01:30:45.123+09:00',)
  })

  it('無効なタイムゾーンで例外を投げる', () => {
    assertThrows(
      () =>
        createDatetimeWithTimezone('2026-02-14T16:00:00.000Z', 'Invalid/TZ',),
      Error,
      'Invalid timezone',
    )
  })

  it('無効な datetime で例外を投げる', () => {
    assertThrows(
      () => createDatetimeWithTimezone('not-a-datetime', 'Asia/Tokyo',),
      Error,
      'Invalid datetime',
    )
  })
})

describe('createDatetimeWithTimezoneFromNow()', () => {
  it('現在時刻から DatetimeWithTimezone を生成できる', () => {
    const result = createDatetimeWithTimezoneFromNow('Asia/Tokyo',)

    assertEquals(result.timezone, 'Asia/Tokyo',)
    assertEquals(typeof result.datetime, 'string',)
    assertEquals(typeof result.localDatetime, 'string',)
    assertEquals(typeof result.localDateString, 'string',)
    assertEquals(/^\d{4}-\d{2}-\d{2}$/.test(result.localDateString,), true,)
  })
})

describe('diffLocalDays()', () => {
  it('同じ UTC でもタイムゾーンが違えば localDateString が異なり差分が出る', () => {
    const jst = createDatetimeWithTimezone(
      '2026-02-14T16:00:00.000Z',
      'Asia/Tokyo',
    )
    const utc = createDatetimeWithTimezone(
      '2026-02-14T16:00:00.000Z',
      'UTC',
    )

    // JST: 2026-02-15, UTC: 2026-02-14
    assertEquals(jst.localDateString, '2026-02-15',)
    assertEquals(utc.localDateString, '2026-02-14',)
    assertEquals(diffLocalDays(utc, jst,), 1,)
  })

  it('過去日での差分は負値を返す', () => {
    const earlier = createDatetimeWithTimezone(
      '2026-02-15T00:00:00.000Z',
      'Asia/Tokyo',
    )
    const later = createDatetimeWithTimezone(
      '2026-02-12T00:00:00.000Z',
      'Asia/Tokyo',
    )

    assertEquals(diffLocalDays(earlier, later,), -3,)
  })

  it('同日の場合は 0 を返す', () => {
    const a = createDatetimeWithTimezone(
      '2026-02-15T01:00:00.000Z',
      'Asia/Tokyo',
    )
    const b = createDatetimeWithTimezone(
      '2026-02-15T10:00:00.000Z',
      'Asia/Tokyo',
    )

    assertEquals(diffLocalDays(a, b,), 0,)
  })
})

describe('isTimezone()', () => {
  it('有効な IANA タイムゾーンで true を返す', () => {
    const validTimezones = [
      'Asia/Tokyo',
      'America/New_York',
      'Europe/London',
      'UTC',
      'US/Pacific',
    ]

    for (const tz of validTimezones) {
      assertEquals(isTimezone(tz,), true, `"${tz}" should be valid`,)
    }
  })

  it('無効なタイムゾーンで false を返す', () => {
    const invalidTimezones = [
      'Invalid/TZ',
      'NotATimezone',
      '',
      'Asia/Tokyooo',
    ]

    for (const tz of invalidTimezones) {
      assertEquals(isTimezone(tz,), false, `"${tz}" should be invalid`,)
    }
  })
})

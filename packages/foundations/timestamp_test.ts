import { assertEquals, assertMatch, } from '@std/assert'
import { describe, it, } from '@std/testing/bdd'
import { getTimestamp, isTimestamp, } from './timestamp.ts'

describe('getTimestamp()', () => {
  it('returns ISO8601 formatted datetime string', () => {
    const timestamp = getTimestamp()
    assertMatch(timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,)
  })

  it('returns current timestamp', () => {
    const before = Date.now()
    const timestamp = getTimestamp()
    const after = Date.now()

    const timestampMillis = new Date(timestamp,).getTime()
    assertEquals(timestampMillis >= before, true,)
    assertEquals(timestampMillis <= after, true,)
  })

  it('returns timestamp that can be validated by isTimestamp()', () => {
    const timestamp = getTimestamp()
    assertEquals(isTimestamp(timestamp,), true,)
  })
})

describe('isTimestamp()', () => {
  describe('when given valid datetime string', () => {
    it('returns true', () => {
      const validDateTime = '2026-01-29T12:34:56.789Z'
      assertEquals(isTimestamp(validDateTime,), true,)
    })
  })

  describe('when given valid date-only string', () => {
    it('returns true', () => {
      const validDate = '2026-01-29'
      assertEquals(isTimestamp(validDate,), true,)
    })
  })

  describe('when given invalid date', () => {
    it('returns false', () => {
      const invalidDate = '2026-02-31' // February 31st does not exist
      assertEquals(isTimestamp(invalidDate,), false,)
    })
  })

  describe('when given invalid format strings', () => {
    it('returns false', () => {
      // TODO: introduce parameterized test helper
      const testCases = [
        'not-a-date',
        '2026/01/29',
        '2026-1-29',
        '2026-01-29T12:34:56', // missing milliseconds and Z
        '2026-01-29T12:34:56.789', // missing Z
        '2026-01-29T12:34:56.789+09:00', // timezone offset
        '2026-01-29 12:34:56', // space separator
      ]

      for (const testCase of testCases) {
        assertEquals(
          isTimestamp(testCase,),
          false,
          `"${testCase}" should be rejected`,
        )
      }
    })
  })

  describe('when given non-string value', () => {
    it('returns false', () => {
      // TODO: introduce parameterized test helper
      const testCases: Array<unknown> = [
        null,
        undefined,
        123,
        true,
        {},
        [],
        new Date(),
      ]

      for (const testCase of testCases) {
        assertEquals(
          isTimestamp(testCase,),
          false,
          `${typeof testCase} should be rejected`,
        )
      }
    })
  })
})

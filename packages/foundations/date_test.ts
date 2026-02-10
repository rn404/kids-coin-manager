import { assertEquals, assertMatch, } from '@std/assert'
import { describe, it, } from '@std/testing/bdd'
import { getDate, isDate, } from './date.ts'

describe('getDate()', () => {
  it('returns YYYY-MM-DD formatted date string', () => {
    const date = getDate()
    assertMatch(date, /^\d{4}-\d{2}-\d{2}$/,)
  })

  it('returns current UTC date', () => {
    const before = new Date()
    const date = getDate()
    const after = new Date()

    const expectedDates = new Set([
      `${before.getUTCFullYear()}-${
        String(before.getUTCMonth() + 1,).padStart(2, '0',)
      }-${String(before.getUTCDate(),).padStart(2, '0',)}`,
      `${after.getUTCFullYear()}-${
        String(after.getUTCMonth() + 1,).padStart(2, '0',)
      }-${String(after.getUTCDate(),).padStart(2, '0',)}`,
    ],)

    assertEquals(expectedDates.has(date,), true,)
  })

  it('returns date that can be validated by isDate()', () => {
    const date = getDate()
    assertEquals(isDate(date,), true,)
  })
})

describe('isDate()', () => {
  describe('when given valid date string', () => {
    it('returns true', () => {
      assertEquals(isDate('2026-02-11',), true,)
    })
  })

  describe('when given invalid date', () => {
    it('returns false for non-existent date', () => {
      assertEquals(isDate('2026-02-31',), false,)
    })
  })

  describe('when given invalid format strings', () => {
    it('returns false', () => {
      const testCases = [
        'not-a-date',
        '2026/02/11',
        '2026-2-11',
        '2026-02-1',
        '2026-02-11T00:00:00.000Z', // datetime は受け付けない
        '20260211',
        '2026-02',
      ]

      for (const testCase of testCases) {
        assertEquals(
          isDate(testCase,),
          false,
          `"${testCase}" should be rejected`,
        )
      }
    })
  })

  describe('when given non-string value', () => {
    it('returns false', () => {
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
          isDate(testCase,),
          false,
          `${typeof testCase} should be rejected`,
        )
      }
    })
  })
})

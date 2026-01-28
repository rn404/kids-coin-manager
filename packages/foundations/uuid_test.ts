import { assertEquals, assertMatch, assertNotEquals, } from '@std/assert'
import { describe, it, } from '@std/testing/bdd'
import { generateUuid, isUuid, } from './uuid.ts'

describe('generateUuid()', () => {
  it('returns UUID v7 formatted string', () => {
    const uuid = generateUuid()
    // UUID format: 8-4-4-4-12 hexadecimal characters separated by hyphens
    assertMatch(
      uuid,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  it('returns UUID v7 with correct version bit', () => {
    const uuid = generateUuid()
    // UUID v7 has version '7' in the 13th character (after removing hyphens, at index 12)
    // In the formatted string, it's at position 14 (8 chars + hyphen + 4 chars + hyphen + first char of third group)
    const versionChar = uuid.charAt(14,)
    assertEquals(versionChar, '7',)
  })

  it('returns UUID that can be validated by isUuid()', () => {
    const uuid = generateUuid()
    assertEquals(isUuid(uuid,), true,)
  })

  it('generates unique UUIDs on each call', () => {
    const uuid1 = generateUuid()
    const uuid2 = generateUuid()
    const uuid3 = generateUuid()

    assertNotEquals(uuid1, uuid2,)
    assertNotEquals(uuid2, uuid3,)
    assertNotEquals(uuid1, uuid3,)
  })
})

describe('isUuid()', () => {
  describe('when given valid UUID v7 string', () => {
    it('returns true', () => {
      const validUuid = generateUuid()
      assertEquals(isUuid(validUuid,), true,)
    })
  })

  describe('when given invalid UUID format', () => {
    it('returns false', () => {
      // TODO: introduce parameterized test helper
      const testCases = [
        'not-a-uuid',
        '12345678-1234-1234-1234-123456789012', // valid format but invalid variant/version
        '123456789-1234-7234-1234-123456789012', // wrong segment lengths
        'xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx', // non-hex characters
        '01234567-89ab-7cde-8fgh-012345678901', // invalid hex characters (g, h)
        '',
      ]

      for (const testCase of testCases) {
        assertEquals(
          isUuid(testCase,),
          false,
          `"${testCase}" should be rejected`,
        )
      }
    })
  })

  describe('when given non-string value', () => {
    it('returns false', () => {
      // TODO: introduce parameterized test helper
      const testCases: unknown[] = [
        null,
        undefined,
        123,
        true,
        {},
        [],
      ]

      for (const testCase of testCases) {
        assertEquals(
          isUuid(testCase,),
          false,
          `${typeof testCase} should be rejected`,
        )
      }
    })
  })
})

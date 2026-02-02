import { describe, it, } from '@std/testing/bdd'
import { assertEquals, assertRejects, } from '@std/assert'
import { withRetry, } from './retry.ts'

describe('withRetry', () => {
  it('should succeed on first attempt', async () => {
    let attempts = 0

    const result = await withRetry(() => {
      attempts++
      return Promise.resolve('success',)
    },)

    assertEquals(result, 'success',)
    assertEquals(attempts, 1,)
  })

  it('should retry on failure and eventually succeed', async () => {
    let attempts = 0

    const result = await withRetry(() => {
      attempts++
      if (attempts < 3) {
        return Promise.reject(new Error('Temporary error',),)
      }
      return Promise.resolve('success',)
    },)

    assertEquals(result, 'success',)
    assertEquals(attempts, 3,)
  })

  it('should throw error after max retries', async () => {
    let attempts = 0

    await assertRejects(
      async () => {
        await withRetry(
          () => {
            attempts++
            return Promise.reject(new Error('Persistent error',),)
          },
          { maxRetries: 2, },
        )
      },
      Error,
      'Failed after 2 retries: Persistent error',
    )

    assertEquals(attempts, 3,) // initial + 2 retries
  })

  it('should use custom maxRetries', async () => {
    let attempts = 0

    await assertRejects(
      async () => {
        await withRetry(
          () => {
            attempts++
            return Promise.reject(new Error('Error',),)
          },
          { maxRetries: 5, },
        )
      },
      Error,
      'Failed after 5 retries',
    )

    assertEquals(attempts, 6,) // initial + 5 retries
  })

  it('should apply exponential backoff', async () => {
    const timestamps: number[] = []

    await assertRejects(async () => {
      await withRetry(
        () => {
          timestamps.push(Date.now(),)
          return Promise.reject(new Error('Error',),)
        },
        { maxRetries: 2, backoffMultiplier: 50, },
      )
    },)

    assertEquals(timestamps.length, 3,)

    // 各試行間の待機時間を確認
    // 1回目 -> 2回目: 2^1 * 50 = 100ms
    // 2回目 -> 3回目: 2^2 * 50 = 200ms
    const delay1 = timestamps[1] - timestamps[0]
    const delay2 = timestamps[2] - timestamps[1]

    // 多少の誤差を許容
    assertEquals(delay1 >= 100 && delay1 < 150, true,)
    assertEquals(delay2 >= 200 && delay2 < 250, true,)
  })
})

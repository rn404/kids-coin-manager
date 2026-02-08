import { afterEach, beforeEach, describe, it, } from '@std/testing/bdd'
import { assertEquals, assertExists, assertRejects, } from '@std/assert'
import { makeCoinUseCase, } from './CoinUseCase.ts'
import { cleanupTestKv, createCoin, setupTestKv, } from '../test-helpers/mod.ts'

let kv: Deno.Kv
let useCase: ReturnType<typeof makeCoinUseCase>

beforeEach(async () => {
  kv = await setupTestKv()
  useCase = makeCoinUseCase({ kv, },)
},)

afterEach(async () => {
  await cleanupTestKv(kv,)
},)

describe('CoinUseCase#findById', () => {
  it('should retrieve existing coin', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    const created = await createCoin(kv, {
      userId,
      familyId,
      coinTypeId,
      amount: 1000,
    },)

    const retrieved = await useCase.findById(userId, familyId, coinTypeId,)

    assertExists(retrieved,)
    assertEquals(retrieved, created,)
  })

  it('should return null when coin does not exist', async () => {
    const result = await useCase.findById(
      'user-1',
      'family-1',
      'non-existent-cointype',
    )
    assertEquals(result, null,)
  })

  it('should not retrieve coin with different userId', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 1000, },)

    const result = await useCase.findById('user-2', familyId, coinTypeId,)
    assertEquals(result, null,)
  })

  it('should not retrieve coin with different familyId', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 1000, },)

    const result = await useCase.findById(userId, 'family-2', coinTypeId,)
    assertEquals(result, null,)
  })
})

describe('CoinUseCase#decreaseBy', () => {
  it('should decrease coins and reduce amount', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 1000, },)

    const result = await useCase.decreaseBy(userId, familyId, coinTypeId, {
      amount: 300,
    },)

    assertEquals(result.amount, 700,)
    assertEquals(result.userId, userId,)
    assertEquals(result.familyId, familyId,)
    assertEquals(result.coinTypeId, coinTypeId,)
    assertExists(result.updatedAt,)

    // DBから取得して確認
    const retrieved = await useCase.findById(userId, familyId, coinTypeId,)
    assertEquals(retrieved?.amount, 700,)
  })

  it('should decrease multiple times sequentially', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 1000, },)

    await useCase.decreaseBy(userId, familyId, coinTypeId, { amount: 200, },)
    await useCase.decreaseBy(userId, familyId, coinTypeId, { amount: 300, },)
    await useCase.decreaseBy(userId, familyId, coinTypeId, { amount: 100, },)

    const retrieved = await useCase.findById(userId, familyId, coinTypeId,)
    assertEquals(retrieved?.amount, 400,)
  })

  it('should throw error when coin does not exist', async () => {
    await assertRejects(
      async () => {
        await useCase.decreaseBy(
          'user-1',
          'family-1',
          'non-existent-cointype',
          { amount: 100, },
        )
      },
      Error,
      'Coin not found',
    )
  })

  it('should throw error when insufficient balance', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 500, },)

    await assertRejects(
      async () => {
        await useCase.decreaseBy(userId, familyId, coinTypeId, {
          amount: 600,
        },)
      },
      Error,
      'Insufficient coin balance',
    )

    // 残高は変わっていないことを確認
    const retrieved = await useCase.findById(userId, familyId, coinTypeId,)
    assertEquals(retrieved?.amount, 500,)
  })

  it('should allow decreasing exact amount to reach zero', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 500, },)

    const result = await useCase.decreaseBy(userId, familyId, coinTypeId, {
      amount: 500,
    },)

    assertEquals(result.amount, 0,)
  })
})

describe('CoinUseCase#increaseBy', () => {
  it('should increase coins and add to amount', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 1000, },)

    const result = await useCase.increaseBy(userId, familyId, coinTypeId, {
      amount: 300,
    },)

    assertEquals(result.amount, 1300,)
    assertEquals(result.userId, userId,)
    assertEquals(result.familyId, familyId,)
    assertEquals(result.coinTypeId, coinTypeId,)
    assertExists(result.updatedAt,)

    // DBから取得して確認
    const retrieved = await useCase.findById(userId, familyId, coinTypeId,)
    assertEquals(retrieved?.amount, 1300,)
  })

  it('should throw error when coin does not exist', async () => {
    await assertRejects(
      async () => {
        await useCase.increaseBy(
          'user-1',
          'family-1',
          'non-existent-cointype',
          { amount: 100, },
        )
      },
      Error,
      'Coin not found',
    )
  })

  it('should increase from zero balance', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 0, },)

    const result = await useCase.increaseBy(userId, familyId, coinTypeId, {
      amount: 500,
    },)

    assertEquals(result.amount, 500,)
  })
})

describe('CoinUseCase#concurrent operations', () => {
  it('should handle concurrent increases and decreases with retry mechanism', async (t,) => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await t.step('setup: create test coin with 1000', async () => {
      await createCoin(kv, { userId, familyId, coinTypeId, amount: 1000, },)
    },)

    await t.step(
      'concurrent operations: execute mixed increases and decreases in parallel',
      async () => {
        const results = await Promise.all([
          useCase.increaseBy(userId, familyId, coinTypeId, { amount: 100, },),
          useCase.decreaseBy(userId, familyId, coinTypeId, { amount: 200, },),
          useCase.increaseBy(userId, familyId, coinTypeId, { amount: 150, },),
          useCase.decreaseBy(userId, familyId, coinTypeId, { amount: 50, },),
        ],)

        // すべて成功することを確認
        assertEquals(results.length, 4,)
      },
    )

    await t.step('verify: final balance should be 1000', async () => {
      // 最終的な残高を確認（1000 + 100 - 200 + 150 - 50 = 1000）
      const retrieved = await useCase.findById(userId, familyId, coinTypeId,)
      assertEquals(retrieved?.amount, 1000,)
    },)
  })
})

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

describe('CoinUseCase#spend', () => {
  it('should spend coins and reduce amount', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 1000, },)

    const result = await useCase.spend(userId, familyId, coinTypeId, {
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

  it('should spend multiple times sequentially', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 1000, },)

    await useCase.spend(userId, familyId, coinTypeId, { amount: 200, },)
    await useCase.spend(userId, familyId, coinTypeId, { amount: 300, },)
    await useCase.spend(userId, familyId, coinTypeId, { amount: 100, },)

    const retrieved = await useCase.findById(userId, familyId, coinTypeId,)
    assertEquals(retrieved?.amount, 400,)
  })

  it('should throw error when coin does not exist', async () => {
    await assertRejects(
      async () => {
        await useCase.spend('user-1', 'family-1', 'non-existent-cointype', {
          amount: 100,
        },)
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
        await useCase.spend(userId, familyId, coinTypeId, {
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

  it('should allow spending exact amount to reach zero', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 500, },)

    const result = await useCase.spend(userId, familyId, coinTypeId, {
      amount: 500,
    },)

    assertEquals(result.amount, 0,)
  })

  it('should handle concurrent spends with retry mechanism', async (t,) => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await t.step('setup: create test coin with 1000', async () => {
      await createCoin(kv, { userId, familyId, coinTypeId, amount: 1000, },)
    },)

    await t.step(
      'concurrent spends: execute 3 spends in parallel',
      async () => {
        const results = await Promise.all([
          useCase.spend(userId, familyId, coinTypeId, { amount: 100, },),
          useCase.spend(userId, familyId, coinTypeId, { amount: 200, },),
          useCase.spend(userId, familyId, coinTypeId, { amount: 150, },),
        ],)

        // すべて成功することを確認
        assertEquals(results.length, 3,)
      },
    )

    await t.step('verify: final balance should be 550', async () => {
      // 最終的な残高を確認（1000 - 100 - 200 - 150 = 550）
      const retrieved = await useCase.findById(userId, familyId, coinTypeId,)
      assertEquals(retrieved?.amount, 550,)
    },)
  })
})

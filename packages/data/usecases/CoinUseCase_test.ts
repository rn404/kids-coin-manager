import { afterEach, beforeEach, describe, it } from '@std/testing/bdd'
import { assertEquals, assertExists } from '@std/assert'
import { makeCoinUseCase } from './CoinUseCase.ts'
import { cleanupTestKv, createCoin, setupTestKv } from '../test-helpers/mod.ts'
import { COIN_TRANSACTION_PREFIX_KEY } from '../CoinTransaction.ts'
import type { CoinTransactionDataModel } from '../CoinTransaction.ts'

/**
 * KV から指定ユーザー・コインタイプのトランザクション一覧を取得する
 */
async function listTransactions(
  kv: Deno.Kv,
  userId: string,
  familyId: string,
  coinTypeId: string
): Promise<Array<CoinTransactionDataModel>> {
  const entries = kv.list<CoinTransactionDataModel>({
    prefix: [COIN_TRANSACTION_PREFIX_KEY, userId, familyId, coinTypeId]
  })
  const results: Array<CoinTransactionDataModel> = []
  for await (const entry of entries) {
    results.push(entry.value)
  }
  return results
}

let kv: Deno.Kv
let useCase: ReturnType<typeof makeCoinUseCase>

beforeEach(async () => {
  kv = await setupTestKv()
  useCase = makeCoinUseCase({ kv })
})

afterEach(async () => {
  await cleanupTestKv(kv)
})

describe('CoinUseCase#listByUser', () => {
  it('should return all coins for a user in a family', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'

    await createCoin(kv, {
      userId,
      familyId,
      coinTypeId: 'cointype-1',
      amount: 100
    })
    await createCoin(kv, {
      userId,
      familyId,
      coinTypeId: 'cointype-2',
      amount: 200
    })
    await createCoin(kv, {
      userId,
      familyId,
      coinTypeId: 'cointype-3',
      amount: 300
    })

    const results = await useCase.listByUser(userId, familyId)

    assertEquals(results.length, 3)
    assertEquals(results.map((c) => c.amount).sort(), [100, 200, 300])
  })

  it('should return empty array when no coins exist', async () => {
    const results = await useCase.listByUser('user-1', 'family-1')
    assertEquals(results, [])
  })

  it('should not include coins from different userId', async () => {
    const familyId = 'family-1'

    await createCoin(kv, {
      userId: 'user-1',
      familyId,
      coinTypeId: 'cointype-1',
      amount: 100
    })
    await createCoin(kv, {
      userId: 'user-2',
      familyId,
      coinTypeId: 'cointype-1',
      amount: 200
    })

    const results = await useCase.listByUser('user-1', familyId)

    assertEquals(results.length, 1)
    assertEquals(results[0].amount, 100)
  })

  it('should not include coins from different familyId', async () => {
    const userId = 'user-1'

    await createCoin(kv, {
      userId,
      familyId: 'family-1',
      coinTypeId: 'cointype-1',
      amount: 100
    })
    await createCoin(kv, {
      userId,
      familyId: 'family-2',
      coinTypeId: 'cointype-1',
      amount: 200
    })

    const results = await useCase.listByUser(userId, 'family-1')

    assertEquals(results.length, 1)
    assertEquals(results[0].amount, 100)
  })
})

describe('CoinUseCase#findById', () => {
  it('should retrieve existing coin', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    const created = await createCoin(kv, {
      userId,
      familyId,
      coinTypeId,
      amount: 1000
    })

    const retrieved = await useCase.findById(userId, familyId, coinTypeId)

    assertExists(retrieved)
    assertEquals(retrieved, created)
  })

  it('should return null when coin does not exist', async () => {
    const result = await useCase.findById(
      'user-1',
      'family-1',
      'non-existent-cointype'
    )
    assertEquals(result, null)
  })

  it('should not retrieve coin with different userId', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 1000 })

    const result = await useCase.findById('user-2', familyId, coinTypeId)
    assertEquals(result, null)
  })

  it('should not retrieve coin with different familyId', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 1000 })

    const result = await useCase.findById(userId, 'family-2', coinTypeId)
    assertEquals(result, null)
  })
})

describe('CoinUseCase#decreaseBy', () => {
  it('should decrease coins and reduce amount', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 1000 })

    const result = await useCase.decreaseBy(userId, familyId, coinTypeId, {
      amount: 300,
      transactionType: 'use',
      metadata: { type: 'use' }
    })

    assertEquals(result.amount, 700)
    assertEquals(result.userId, userId)
    assertEquals(result.familyId, familyId)
    assertEquals(result.coinTypeId, coinTypeId)
    assertExists(result.updatedAt)

    // DBから取得して確認
    const retrieved = await useCase.findById(userId, familyId, coinTypeId)
    assertEquals(retrieved?.amount, 700)

    // トランザクションが保存されていることを確認
    const transactions = await listTransactions(
      kv,
      userId,
      familyId,
      coinTypeId
    )
    assertEquals(transactions.length, 1)
    assertEquals(transactions[0].amount, -300)
    assertEquals(transactions[0].balance, 700)
    assertEquals(transactions[0].transactionType, 'use')
    assertEquals(transactions[0].metadata, { type: 'use' })
    assertEquals(transactions[0].userId, userId)
    assertEquals(transactions[0].familyId, familyId)
    assertEquals(transactions[0].coinTypeId, coinTypeId)
    assertExists(transactions[0].id)
    assertExists(transactions[0].createdAt)
    assertExists(transactions[0].updatedAt)
  })

  it('should decrease multiple times sequentially', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 1000 })

    await useCase.decreaseBy(userId, familyId, coinTypeId, {
      amount: 200,
      transactionType: 'use',
      metadata: { type: 'use' }
    })
    await useCase.decreaseBy(userId, familyId, coinTypeId, {
      amount: 300,
      transactionType: 'use',
      metadata: { type: 'use' }
    })
    await useCase.decreaseBy(userId, familyId, coinTypeId, {
      amount: 100,
      transactionType: 'use',
      metadata: { type: 'use' }
    })

    const retrieved = await useCase.findById(userId, familyId, coinTypeId)
    assertEquals(retrieved?.amount, 400)

    // 3件のトランザクションが保存されていることを確認
    const transactions = await listTransactions(
      kv,
      userId,
      familyId,
      coinTypeId
    )
    assertEquals(transactions.length, 3)
  })

  it('should create coin and go negative when coin does not exist', async () => {
    const result = await useCase.decreaseBy(
      'user-1',
      'family-1',
      'non-existent-cointype',
      {
        amount: 100,
        transactionType: 'use',
        metadata: { type: 'use' }
      }
    )

    assertEquals(result.amount, -100)
    assertEquals(result.userId, 'user-1')
    assertEquals(result.familyId, 'family-1')
    assertEquals(result.coinTypeId, 'non-existent-cointype')
  })

  it('should allow negative balance (borrowing)', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 500 })

    const result = await useCase.decreaseBy(
      userId,
      familyId,
      coinTypeId,
      {
        amount: 600,
        transactionType: 'use',
        metadata: { type: 'use' }
      }
    )

    assertEquals(result.amount, -100)

    // トランザクションが保存されていることを確認
    const transactions = await listTransactions(
      kv,
      userId,
      familyId,
      coinTypeId
    )
    assertEquals(transactions.length, 1)
  })

  it('should allow decreasing exact amount to reach zero', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 500 })

    const result = await useCase.decreaseBy(userId, familyId, coinTypeId, {
      amount: 500,
      transactionType: 'use',
      metadata: { type: 'use' }
    })

    assertEquals(result.amount, 0)
  })
})

describe('CoinUseCase#increaseBy', () => {
  it('should increase coins and add to amount', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 1000 })

    const result = await useCase.increaseBy(userId, familyId, coinTypeId, {
      amount: 300,
      transactionType: 'daily_distribution',
      metadata: { type: 'daily_distribution' }
    })

    assertEquals(result.amount, 1300)
    assertEquals(result.userId, userId)
    assertEquals(result.familyId, familyId)
    assertEquals(result.coinTypeId, coinTypeId)
    assertExists(result.updatedAt)

    // DBから取得して確認
    const retrieved = await useCase.findById(userId, familyId, coinTypeId)
    assertEquals(retrieved?.amount, 1300)

    // トランザクションが保存されていることを確認
    const transactions = await listTransactions(
      kv,
      userId,
      familyId,
      coinTypeId
    )
    assertEquals(transactions.length, 1)
    assertEquals(transactions[0].amount, 300)
    assertEquals(transactions[0].balance, 1300)
    assertEquals(transactions[0].transactionType, 'daily_distribution')
    assertEquals(
      transactions[0].metadata,
      { type: 'daily_distribution' }
    )
    assertEquals(transactions[0].userId, userId)
    assertEquals(transactions[0].familyId, familyId)
    assertEquals(transactions[0].coinTypeId, coinTypeId)
    assertExists(transactions[0].id)
    assertExists(transactions[0].createdAt)
    assertExists(transactions[0].updatedAt)
  })

  it('should create coin when it does not exist', async () => {
    const result = await useCase.increaseBy(
      'user-1',
      'family-1',
      'new-cointype',
      {
        amount: 100,
        transactionType: 'daily_distribution',
        metadata: { type: 'daily_distribution' }
      }
    )

    assertEquals(result.amount, 100)
    assertEquals(result.userId, 'user-1')
    assertEquals(result.familyId, 'family-1')
    assertEquals(result.coinTypeId, 'new-cointype')
    assertExists(result.id)
    assertExists(result.createdAt)
  })

  it('should increase from zero balance', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 0 })

    const result = await useCase.increaseBy(userId, familyId, coinTypeId, {
      amount: 500,
      transactionType: 'daily_distribution',
      metadata: { type: 'daily_distribution' }
    })

    assertEquals(result.amount, 500)
  })

  it('should increase coins with manage_grant transactionType', async () => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await createCoin(kv, { userId, familyId, coinTypeId, amount: 100 })

    const result = await useCase.increaseBy(userId, familyId, coinTypeId, {
      amount: 50,
      transactionType: 'manage_grant',
      metadata: { type: 'manage_grant' }
    })

    assertEquals(result.amount, 150)

    const transactions = await listTransactions(
      kv,
      userId,
      familyId,
      coinTypeId
    )
    assertEquals(transactions.length, 1)
    assertEquals(transactions[0].amount, 50)
    assertEquals(transactions[0].balance, 150)
    assertEquals(transactions[0].transactionType, 'manage_grant')
    assertEquals(transactions[0].metadata, { type: 'manage_grant' })
  })
})

describe('CoinUseCase#concurrent operations', () => {
  it('should handle concurrent increases and decreases with retry mechanism', async (t) => {
    const userId = 'user-1'
    const familyId = 'family-1'
    const coinTypeId = 'cointype-1'

    await t.step('setup: create test coin with 1000', async () => {
      await createCoin(kv, { userId, familyId, coinTypeId, amount: 1000 })
    })

    await t.step(
      'concurrent operations: execute mixed increases and decreases in parallel',
      async () => {
        const results = await Promise.all([
          useCase.increaseBy(userId, familyId, coinTypeId, {
            amount: 100,
            transactionType: 'daily_distribution',
            metadata: { type: 'daily_distribution' }
          }),
          useCase.decreaseBy(userId, familyId, coinTypeId, {
            amount: 200,
            transactionType: 'use',
            metadata: { type: 'use' }
          }),
          useCase.increaseBy(userId, familyId, coinTypeId, {
            amount: 150,
            transactionType: 'stamp_reward',
            metadata: { type: 'stamp_reward', stampCardId: 'stamp-1' }
          }),
          useCase.decreaseBy(userId, familyId, coinTypeId, {
            amount: 50,
            transactionType: 'use',
            metadata: { type: 'use', timeSessionId: 'session-1' }
          })
        ])

        // すべて成功することを確認
        assertEquals(results.length, 4)
      }
    )

    await t.step('verify: final balance should be 1000', async () => {
      // 最終的な残高を確認（1000 + 100 - 200 + 150 - 50 = 1000）
      const retrieved = await useCase.findById(userId, familyId, coinTypeId)
      assertEquals(retrieved?.amount, 1000)

      // 4件のトランザクションが保存されていることを確認
      const transactions = await listTransactions(
        kv,
        userId,
        familyId,
        coinTypeId
      )
      assertEquals(transactions.length, 4)
    })
  })
})

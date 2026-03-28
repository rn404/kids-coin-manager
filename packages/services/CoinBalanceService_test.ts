import { afterEach, beforeEach, describe, it } from '@std/testing/bdd'
import { assertEquals } from '@std/assert'
import {
  cleanupTestKv,
  createCoin,
  createCoinType,
  setupTestKv
} from '@workspace/data/test-helpers'
import { makeCoinBalanceService } from './CoinBalanceService.ts'

let kv: Deno.Kv
let service: ReturnType<typeof makeCoinBalanceService>

beforeEach(async () => {
  kv = await setupTestKv()
  service = makeCoinBalanceService({ kv })
})

afterEach(async () => {
  await cleanupTestKv(kv)
})

describe('CoinBalanceService#listBalances', () => {
  it('should return balances only for active CoinTypes', async () => {
    const activeCt = await createCoinType(kv, {
      familyId: 'family-1',
      name: 'アクティブコイン',
      active: true
    })
    await createCoinType(kv, {
      familyId: 'family-1',
      name: '非アクティブコイン',
      active: false
    })

    await createCoin(kv, {
      userId: 'user-1',
      familyId: 'family-1',
      coinTypeId: activeCt.id,
      amount: 10
    })

    const balances = await service.listBalances('family-1', 'user-1')

    assertEquals(balances.length, 1)
    assertEquals(balances[0].coinTypeId, activeCt.id)
    assertEquals(balances[0].name, 'アクティブコイン')
    assertEquals(balances[0].amount, 10)
  })

  it('should return amount: 0 for CoinType with no Coin created', async () => {
    await createCoinType(kv, {
      familyId: 'family-1',
      name: 'ゴールドコイン',
      active: true
    })

    const balances = await service.listBalances('family-1', 'user-1')

    assertEquals(balances.length, 1)
    assertEquals(balances[0].amount, 0)
    assertEquals(balances[0].name, 'ゴールドコイン')
  })

  it('should return empty array when no active CoinTypes exist', async () => {
    await createCoinType(kv, {
      familyId: 'family-1',
      name: '非アクティブコイン',
      active: false
    })

    const balances = await service.listBalances('family-1', 'user-1')

    assertEquals(balances, [])
  })
})

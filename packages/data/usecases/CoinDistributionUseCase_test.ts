import { afterEach, beforeEach, describe, it, } from '@std/testing/bdd'
import { assertEquals, } from '@std/assert'
import { makeCoinDistributionUseCase, } from './CoinDistributionUseCase.ts'
import { makeCoinUseCase, } from './CoinUseCase.ts'
import { cleanupTestKv, setupTestKv, } from '../test-helpers/kv.ts'
import {
  createCoinType,
  createDailyCoinDistribution,
} from '../test-helpers/factories/mod.ts'
import { createDatetimeWithTimezone, } from '@workspace/foundations'

let kv: Deno.Kv
let useCase: ReturnType<typeof makeCoinDistributionUseCase>

beforeEach(async () => {
  kv = await setupTestKv()
  useCase = makeCoinDistributionUseCase({ kv, },)
},)

afterEach(async () => {
  await cleanupTestKv(kv,)
},)

describe('CoinDistributionUseCase#findById', () => {
  it('should return null when no distribution exists', async () => {
    const result = await useCase.findById(
      'family-1',
      'user-1',
      '2026-02-14',
    )
    assertEquals(result, null,)
  })

  it('should return distributions for existing record', async () => {
    const distributions = { 'cointype-1': { amount: 2, }, }
    await createDailyCoinDistribution(kv, {
      familyId: 'family-1',
      userId: 'user-1',
      distributions,
      summaryDate: '2026-02-14',
    },)

    const result = await useCase.findById(
      'family-1',
      'user-1',
      '2026-02-14',
    )
    assertEquals(result, distributions,)
  })

  it('should not return distributions for different userId', async () => {
    await createDailyCoinDistribution(kv, {
      familyId: 'family-1',
      userId: 'user-1',
      distributions: { 'cointype-1': { amount: 2, }, },
      summaryDate: '2026-02-14',
    },)

    const result = await useCase.findById(
      'family-1',
      'user-2',
      '2026-02-14',
    )
    assertEquals(result, null,)
  })

  it('should not return distributions for different summaryDate', async () => {
    await createDailyCoinDistribution(kv, {
      familyId: 'family-1',
      userId: 'user-1',
      distributions: { 'cointype-1': { amount: 2, }, },
      summaryDate: '2026-02-13',
    },)

    const result = await useCase.findById(
      'family-1',
      'user-1',
      '2026-02-14',
    )
    assertEquals(result, null,)
  })
})

describe('CoinDistributionUseCase#ensure', () => {
  it('should create distribution and increase coins', async () => {
    const ct1 = await createCoinType(kv, {
      familyId: 'family-1',
      name: 'テレビコイン',
      dailyDistribution: 3,
    },)
    const ct2 = await createCoinType(kv, {
      familyId: 'family-1',
      name: 'ゲームコイン',
      dailyDistribution: 2,
    },)

    await useCase.ensure(
      'family-1',
      'user-1',
      createDatetimeWithTimezone('2026-02-14T00:00:00.000Z', 'Asia/Tokyo',),
    )

    const result = await useCase.findById(
      'family-1',
      'user-1',
      '2026-02-14',
    )
    const entries = Object.values(result!,)
    assertEquals(entries.length, 2,)

    // Coin が作成されて残高が増加していることを確認
    const coinUseCase = makeCoinUseCase({ kv, },)
    const coin1 = await coinUseCase.findById(
      'user-1',
      'family-1',
      ct1.id,
    )
    const coin2 = await coinUseCase.findById(
      'user-1',
      'family-1',
      ct2.id,
    )
    assertEquals(coin1!.amount, 3,)
    assertEquals(coin2!.amount, 2,)
  })

  it('should skip inactive CoinTypes', async () => {
    await createCoinType(kv, {
      familyId: 'family-1',
      name: 'アクティブ',
      dailyDistribution: 3,
      active: true,
    },)
    await createCoinType(kv, {
      familyId: 'family-1',
      name: '非アクティブ',
      dailyDistribution: 5,
      active: false,
    },)

    await useCase.ensure(
      'family-1',
      'user-1',
      createDatetimeWithTimezone('2026-02-14T00:00:00.000Z', 'Asia/Tokyo',),
    )

    const result = await useCase.findById(
      'family-1',
      'user-1',
      '2026-02-14',
    )
    const entries = Object.values(result!,)
    assertEquals(entries.length, 1,)
    assertEquals(entries[0].amount, 3,)
  })

  it('should be idempotent (no-op on second call)', async () => {
    const ct = await createCoinType(kv, {
      familyId: 'family-1',
      name: 'テレビコイン',
      dailyDistribution: 3,
    },)

    await useCase.ensure(
      'family-1',
      'user-1',
      createDatetimeWithTimezone('2026-02-14T00:00:00.000Z', 'Asia/Tokyo',),
    )
    const first = await useCase.findById(
      'family-1',
      'user-1',
      '2026-02-14',
    )

    // 2回目の呼び出し — 既存レコードを上書きしない
    await useCase.ensure(
      'family-1',
      'user-1',
      createDatetimeWithTimezone('2026-02-14T00:00:00.000Z', 'Asia/Tokyo',),
    )
    const second = await useCase.findById(
      'family-1',
      'user-1',
      '2026-02-14',
    )

    assertEquals(first, second,)

    // コインも2回目で増加しない
    const coinUseCase = makeCoinUseCase({ kv, },)
    const coin = await coinUseCase.findById(
      'user-1',
      'family-1',
      ct.id,
    )
    assertEquals(coin!.amount, 3,)
  })

  it('should not affect different users', async () => {
    await createCoinType(kv, {
      familyId: 'family-1',
      name: 'テレビコイン',
      dailyDistribution: 3,
    },)

    await useCase.ensure(
      'family-1',
      'user-1',
      createDatetimeWithTimezone('2026-02-14T00:00:00.000Z', 'Asia/Tokyo',),
    )

    // user-2 にはまだ配布されていない
    const result = await useCase.findById(
      'family-1',
      'user-2',
      '2026-02-14',
    )
    assertEquals(result, null,)
  })

  it('should create empty distributions when no active CoinTypes exist', async () => {
    await useCase.ensure(
      'family-1',
      'user-1',
      createDatetimeWithTimezone('2026-02-14T00:00:00.000Z', 'Asia/Tokyo',),
    )

    const result = await useCase.findById(
      'family-1',
      'user-1',
      '2026-02-14',
    )
    assertEquals(result, {},)
  })

  it('should multiply distribution by days since last distribution', async () => {
    const ct = await createCoinType(kv, {
      familyId: 'family-1',
      name: 'テレビコイン',
      dailyDistribution: 3,
    },)

    // 2/11 に初回配布（1日分 = 3）
    await useCase.ensure(
      'family-1',
      'user-1',
      createDatetimeWithTimezone('2026-02-11T00:00:00.000Z', 'Asia/Tokyo',),
    )

    // 2/14 に再配布（3日分 = 9）
    await useCase.ensure(
      'family-1',
      'user-1',
      createDatetimeWithTimezone('2026-02-14T00:00:00.000Z', 'Asia/Tokyo',),
    )

    const result = await useCase.findById(
      'family-1',
      'user-1',
      '2026-02-14',
    )
    assertEquals(result![ct.id].amount, 9,)

    // Coin 残高は累積（3 + 9 = 12）
    const coinUseCase = makeCoinUseCase({ kv, },)
    const coin = await coinUseCase.findById(
      'user-1',
      'family-1',
      ct.id,
    )
    assertEquals(coin!.amount, 12,)
  })

  it('should not distribute when summaryDate is before latest distribution', async () => {
    await createCoinType(kv, {
      familyId: 'family-1',
      name: 'テレビコイン',
      dailyDistribution: 3,
    },)

    // 2/14 に配布済み
    await useCase.ensure(
      'family-1',
      'user-1',
      createDatetimeWithTimezone('2026-02-14T00:00:00.000Z', 'Asia/Tokyo',),
    )

    // 2/13 で ensure しても配布されない（過去日）
    await useCase.ensure(
      'family-1',
      'user-1',
      createDatetimeWithTimezone('2026-02-13T00:00:00.000Z', 'Asia/Tokyo',),
    )

    const result = await useCase.findById(
      'family-1',
      'user-1',
      '2026-02-13',
    )
    assertEquals(result, null,)
  })
})

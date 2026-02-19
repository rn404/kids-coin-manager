import { afterEach, beforeEach, describe, it, } from '@std/testing/bdd'
import { assertEquals, assertExists, } from '@std/assert'
import { makeCoinManageService, } from './CoinManageService.ts'
import {
  cleanupTestKv,
  createCoinType,
  setupTestKv,
} from '@workspace/data/test-helpers'

let kv: Deno.Kv
let service: ReturnType<typeof makeCoinManageService>

beforeEach(async () => {
  kv = await setupTestKv()
  service = makeCoinManageService({ kv, },)
},)

afterEach(async () => {
  await cleanupTestKv(kv,)
},)

describe('CoinManageService#addCoinType', () => {
  it('should create CoinType with valid input', async () => {
    const result = await service.addCoinType('family-1', {
      name: 'ゴールドコイン',
      durationMinutes: 30,
      dailyDistribution: 4,
    },)

    assertEquals(result.ok, true,)
    if (result.ok) {
      assertExists(result.coinType.id,)
      assertEquals(result.coinType.familyId, 'family-1',)
      assertEquals(result.coinType.name, 'ゴールドコイン',)
      assertEquals(result.coinType.durationMinutes, 30,)
      assertEquals(result.coinType.dailyDistribution, 4,)
      assertEquals(result.coinType.active, true,)
    }
  })

  it('should return validation error when name is empty', async () => {
    const result = await service.addCoinType('family-1', {
      name: '',
      durationMinutes: 30,
      dailyDistribution: 4,
    },)

    assertEquals(result.ok, false,)
    if (result.ok === false) {
      assertEquals(result.errors.length, 1,)
      assertEquals(result.errors[0].field, 'name',)
    }
  })

  it('should return validation error when durationMinutes is 0 or less', async () => {
    const result = await service.addCoinType('family-1', {
      name: 'テストコイン',
      durationMinutes: 0,
      dailyDistribution: 4,
    },)

    assertEquals(result.ok, false,)
    if (result.ok === false) {
      assertEquals(result.errors.length, 1,)
      assertEquals(result.errors[0].field, 'durationMinutes',)
    }
  })

  it('should return validation error when dailyDistribution is negative', async () => {
    const result = await service.addCoinType('family-1', {
      name: 'テストコイン',
      durationMinutes: 30,
      dailyDistribution: -1,
    },)

    assertEquals(result.ok, false,)
    if (result.ok === false) {
      assertEquals(result.errors.length, 1,)
      assertEquals(result.errors[0].field, 'dailyDistribution',)
    }
  })
})

describe('CoinManageService#listCoinTypes', () => {
  it('should return all CoinTypes for the family', async () => {
    await createCoinType(kv, {
      familyId: 'family-1',
      name: 'ゴールドコイン',
    },)
    await createCoinType(kv, {
      familyId: 'family-1',
      name: 'シルバーコイン',
    },)
    await createCoinType(kv, {
      familyId: 'family-2',
      name: '別ファミリーのコイン',
    },)

    const result = await service.listCoinTypes('family-1',)

    assertEquals(result.length, 2,)
    assertEquals(result.some((ct,) => ct.name === 'ゴールドコイン'), true,)
    assertEquals(result.some((ct,) => ct.name === 'シルバーコイン'), true,)
  })
})

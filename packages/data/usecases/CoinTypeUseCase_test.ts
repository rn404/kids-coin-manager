import { afterEach, beforeEach, describe, it, } from '@std/testing/bdd'
import { assertEquals, assertExists, assertRejects, } from '@std/assert'
import { makeCoinTypeUseCase, } from './CoinTypeUseCase.ts'
import { cleanupTestKv, setupTestKv, } from '../test-helpers/kv.ts'

let kv: Deno.Kv
let useCase: ReturnType<typeof makeCoinTypeUseCase>

beforeEach(async () => {
  kv = await setupTestKv()
  useCase = makeCoinTypeUseCase({ kv, },)
},)

afterEach(async () => {
  await cleanupTestKv(kv,)
},)

describe('CoinTypeUseCase#create', () => {
  it('should create a CoinType and retrieve it by ID', async () => {
    const familyId = 'family-1'
    const created = await useCase.create(
      familyId,
      'ゴールドコイン',
      30,
      4,
    )

    // 作成されたデータの検証
    assertExists(created.id,)
    assertEquals(created.familyId, familyId,)
    assertEquals(created.name, 'ゴールドコイン',)
    assertEquals(created.durationMinutes, 30,)
    assertEquals(created.dailyDistribution, 4,)
    assertEquals(created.active, true,)
    assertExists(created.createdAt,)
    assertExists(created.updatedAt,)

    // findByIdで取得できることを確認
    const retrieved = await useCase.findById(familyId, created.id,)
    assertEquals(retrieved, created,)
  })
})

describe('CoinTypeUseCase#findById', () => {
  it('should return null when CoinType does not exist', async () => {
    const result = await useCase.findById('family-1', 'non-existent-id',)
    assertEquals(result, null,)
  })

  it('should not retrieve CoinType with different familyId', async () => {
    const created = await useCase.create(
      'family-1',
      'ゴールドコイン',
      30,
      4,
    )

    // 異なるfamilyIdでは取得できない
    const result = await useCase.findById('family-2', created.id,)
    assertEquals(result, null,)
  })
})

describe('CoinTypeUseCase#listAllByFamily', () => {
  it('should list all CoinTypes belonging to the family', async () => {
    const familyId = 'family-1'
    const coin1 = await useCase.create(familyId, 'ゴールド', 30, 4,)
    const coin2 = await useCase.create(familyId, 'シルバー', 15, 7,)

    const list = await useCase.listAllByFamily(familyId,)

    assertEquals(list.length, 2,)
    assertEquals(list.some((c,) => c.id === coin1.id), true,)
    assertEquals(list.some((c,) => c.id === coin2.id), true,)
  })

  it('should not include CoinTypes from different families', async () => {
    await useCase.create('family-1', 'ゴールド', 30, 4,)
    await useCase.create('family-2', 'シルバー', 15, 7,)

    const family1List = await useCase.listAllByFamily('family-1',)
    const family2List = await useCase.listAllByFamily('family-2',)

    assertEquals(family1List.length, 1,)
    assertEquals(family2List.length, 1,)
    assertEquals(family1List[0].name, 'ゴールド',)
    assertEquals(family2List[0].name, 'シルバー',)
  })
})

describe('CoinTypeUseCase#update', () => {
  it('should update properties (partial update)', async () => {
    const familyId = 'family-1'
    const created = await useCase.create(
      familyId,
      'ゴールドコイン',
      30,
      4,
    )

    // 部分更新
    const updated = await useCase.update(familyId, created.id, {
      name: '新ゴールドコイン',
      durationMinutes: 45,
    },)

    assertEquals(updated.name, '新ゴールドコイン',)
    assertEquals(updated.durationMinutes, 45,)
    assertEquals(updated.dailyDistribution, created.dailyDistribution,) // 更新していないプロパティは保持
    assertEquals(updated.active, true,)
    assertEquals(updated.createdAt, created.createdAt,) // createdAtは変わらない
  })

  it('should throw error when updating non-existent CoinType', async () => {
    await assertRejects(
      async () => {
        await useCase.update('family-1', 'non-existent-id', {
          name: '新しい名前',
        },)
      },
      Error,
      'not found',
    )
  })
})

describe('CoinTypeUseCase#discard', () => {
  it('should return null from findById after deletion', async () => {
    const familyId = 'family-1'
    const created = await useCase.create(
      familyId,
      'ゴールドコイン',
      30,
      4,
    )

    // 削除前は取得できる
    const beforeDiscard = await useCase.findById(familyId, created.id,)
    assertExists(beforeDiscard,)

    // 削除
    await useCase.discard(familyId, created.id,)

    // 削除後はnullが返る
    const afterDiscard = await useCase.findById(familyId, created.id,)
    assertEquals(afterDiscard, null,)
  })
})

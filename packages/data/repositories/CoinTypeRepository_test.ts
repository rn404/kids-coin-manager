import { afterEach, beforeEach, describe, it, } from '@std/testing/bdd'
import { assertEquals, assertExists, assertRejects, } from '@std/assert'
import { CoinTypeRepository, } from './CoinTypeRepository.ts'
import { cleanupTestKv, setupTestKv, } from '../test-helpers/kv.ts'

let kv: Deno.Kv
let repo: CoinTypeRepository

beforeEach(async () => {
  kv = await setupTestKv()
  repo = new CoinTypeRepository(kv,)
},)

afterEach(async () => {
  await cleanupTestKv(kv,)
},)

describe('CoinTypeRepository#create', () => {
  it('should create a CoinType and retrieve it by ID', async () => {
    const familyId = 'family-1'
    const created = await repo.create(
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

    // getByIdで取得できることを確認
    const retrieved = await repo.getById(familyId, created.id,)
    assertEquals(retrieved, created,)
  })
})

describe('CoinTypeRepository#getById', () => {
  it('should return null when CoinType does not exist', async () => {
    const result = await repo.getById('family-1', 'non-existent-id',)
    assertEquals(result, null,)
  })

  it('should not retrieve CoinType with different familyId', async () => {
    const created = await repo.create(
      'family-1',
      'ゴールドコイン',
      30,
      4,
    )

    // 異なるfamilyIdでは取得できない
    const result = await repo.getById('family-2', created.id,)
    assertEquals(result, null,)
  })
})

describe('CoinTypeRepository#listAllByFamily', () => {
  it('should list all CoinTypes belonging to the family', async () => {
    const familyId = 'family-1'
    const coin1 = await repo.create(familyId, 'ゴールド', 30, 4,)
    const coin2 = await repo.create(familyId, 'シルバー', 15, 7,)

    const list = await repo.listAllByFamily(familyId,)

    assertEquals(list.length, 2,)
    assertEquals(list.some((c,) => c.id === coin1.id), true,)
    assertEquals(list.some((c,) => c.id === coin2.id), true,)
  })

  it('should not include CoinTypes from different families', async () => {
    await repo.create('family-1', 'ゴールド', 30, 4,)
    await repo.create('family-2', 'シルバー', 15, 7,)

    const family1List = await repo.listAllByFamily('family-1',)
    const family2List = await repo.listAllByFamily('family-2',)

    assertEquals(family1List.length, 1,)
    assertEquals(family2List.length, 1,)
    assertEquals(family1List[0].name, 'ゴールド',)
    assertEquals(family2List[0].name, 'シルバー',)
  })
})

describe('CoinTypeRepository#update', () => {
  it('should update properties (partial update)', async () => {
    const familyId = 'family-1'
    const created = await repo.create(
      familyId,
      'ゴールドコイン',
      30,
      4,
    )

    // 部分更新
    const updated = await repo.update(familyId, created.id, {
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
        await repo.update('family-1', 'non-existent-id', {
          name: '新しい名前',
        },)
      },
      Error,
      'not found',
    )
  })
})

describe('CoinTypeRepository#delete', () => {
  it('should return null from getById after deletion', async () => {
    const familyId = 'family-1'
    const created = await repo.create(
      familyId,
      'ゴールドコイン',
      30,
      4,
    )

    // 削除前は取得できる
    const beforeDelete = await repo.getById(familyId, created.id,)
    assertExists(beforeDelete,)

    // 削除
    await repo.delete(familyId, created.id,)

    // 削除後はnullが返る
    const afterDelete = await repo.getById(familyId, created.id,)
    assertEquals(afterDelete, null,)
  })
})

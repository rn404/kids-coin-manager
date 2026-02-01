import type { CoinTypeDataModel, } from '../CoinType.ts'
import { generateUuid, getTimestamp, } from '@workspace/foundations'

interface CoinTypeRepositoryInterface {
  create(
    familyId: CoinTypeDataModel['familyId'],
    name: CoinTypeDataModel['name'],
    durationMinutes: CoinTypeDataModel['durationMinutes'],
    dailyDistribution: CoinTypeDataModel['dailyDistribution'],
  ): Promise<CoinTypeDataModel>
  getById(
    familyId: CoinTypeDataModel['familyId'],
    id: CoinTypeDataModel['id'],
  ): Promise<CoinTypeDataModel | null>
  listAllByFamily(
    familyId: CoinTypeDataModel['familyId'],
  ): Promise<Array<CoinTypeDataModel>>
  update(
    familyId: CoinTypeDataModel['familyId'],
    id: CoinTypeDataModel['id'],
    properties: Partial<
      Pick<
        CoinTypeDataModel,
        'name' | 'durationMinutes' | 'dailyDistribution' | 'active'
      >
    >,
  ): Promise<CoinTypeDataModel>
  delete(
    familyId: CoinTypeDataModel['familyId'],
    id: CoinTypeDataModel['id'],
  ): Promise<void>
}

class CoinTypeRepository implements CoinTypeRepositoryInterface {
  constructor(
    private kv: Deno.Kv,
  ) {}

  public async create(
    familyId: CoinTypeDataModel['familyId'],
    name: CoinTypeDataModel['name'],
    durationMinutes: CoinTypeDataModel['durationMinutes'],
    dailyDistribution: CoinTypeDataModel['dailyDistribution'],
  ): Promise<CoinTypeDataModel> {
    const id = generateUuid()
    const now = getTimestamp()

    const coinType: CoinTypeDataModel = {
      id,
      familyId,
      name,
      durationMinutes,
      dailyDistribution,
      active: true,
      createdAt: now,
      updatedAt: now,
    }

    await this.kv.set(['coinTypes', familyId, id,], coinType,)

    return coinType
  }

  public async getById(
    familyId: CoinTypeDataModel['familyId'],
    id: CoinTypeDataModel['id'],
  ): Promise<CoinTypeDataModel | null> {
    const result = await this.kv.get<CoinTypeDataModel>([
      'coinTypes',
      familyId,
      id,
    ],)
    return result.value
  }

  public async listAllByFamily(
    familyId: CoinTypeDataModel['familyId'],
  ): Promise<CoinTypeDataModel[]> {
    const coinTypes: CoinTypeDataModel[] = []
    const entries = this.kv.list<CoinTypeDataModel>({
      prefix: ['coinTypes', familyId,],
    },)

    for await (const entry of entries) {
      coinTypes.push(entry.value,)
    }

    return coinTypes
  }

  public async update(
    familyId: CoinTypeDataModel['familyId'],
    id: CoinTypeDataModel['id'],
    properties: Partial<
      Pick<
        CoinTypeDataModel,
        'name' | 'durationMinutes' | 'dailyDistribution' | 'active'
      >
    >,
  ): Promise<CoinTypeDataModel> {
    // リトライロジック付きの更新
    let success = false
    let retries = 0
    const maxRetries = 3
    let updatedCoinType: CoinTypeDataModel | null = null

    while (success === false && retries < maxRetries) {
      // 現在のデータを取得
      const currentEntry = await this.kv.get<CoinTypeDataModel>([
        'coinTypes',
        familyId,
        id,
      ],)

      if (currentEntry.value === null) {
        throw new Error(`CoinType with id ${id} not found`,)
      }

      const now = getTimestamp()
      updatedCoinType = {
        ...currentEntry.value,
        ...properties,
        updatedAt: now,
      }

      // Atomic操作で更新
      const res = await this.kv.atomic()
        .check(currentEntry,)
        .set(['coinTypes', familyId, id,], updatedCoinType,)
        .commit()

      if (res.ok) {
        success = true
      } else {
        retries++
        // 指数バックオフで待機
        await new Promise((resolve,) =>
          setTimeout(resolve, Math.pow(2, retries,) * 100,)
        )
      }
    }

    if (success === false || updatedCoinType === null) {
      throw new Error(`Failed to update CoinType after ${maxRetries} retries`,)
    }

    return updatedCoinType
  }

  public async delete(
    familyId: CoinTypeDataModel['familyId'],
    id: CoinTypeDataModel['id'],
  ): Promise<void> {
    await this.kv.delete(['coinTypes', familyId, id,],)
  }
}

export { CoinTypeRepository, }
export type { CoinTypeRepositoryInterface, }

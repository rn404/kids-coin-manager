import type { CoinTypeDataModel, } from '../CoinType.ts'
import { generateUuid, getTimestamp, withRetry, } from '@workspace/foundations'

interface CoinTypeUseCaseInterface {
  create(
    familyId: CoinTypeDataModel['familyId'],
    name: CoinTypeDataModel['name'],
    durationMinutes: CoinTypeDataModel['durationMinutes'],
    dailyDistribution: CoinTypeDataModel['dailyDistribution'],
  ): Promise<CoinTypeDataModel>
  findById(
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
  discard(
    familyId: CoinTypeDataModel['familyId'],
    id: CoinTypeDataModel['id'],
  ): Promise<void>
}

const makeCoinTypeUseCase = (
  deps: { kv: Deno.Kv },
): CoinTypeUseCaseInterface => {
  const create = async (
    familyId: CoinTypeDataModel['familyId'],
    name: CoinTypeDataModel['name'],
    durationMinutes: CoinTypeDataModel['durationMinutes'],
    dailyDistribution: CoinTypeDataModel['dailyDistribution'],
  ): ReturnType<CoinTypeUseCaseInterface['create']> => {
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

    await deps.kv.set(['coinTypes', familyId, id,], coinType,)

    return coinType
  }

  const findById = async (
    familyId: CoinTypeDataModel['familyId'],
    id: CoinTypeDataModel['id'],
  ): ReturnType<CoinTypeUseCaseInterface['findById']> => {
    const result = await deps.kv.get<CoinTypeDataModel>([
      'coinTypes',
      familyId,
      id,
    ],)
    return result.value
  }

  const listAllByFamily = async (
    familyId: CoinTypeDataModel['familyId'],
  ): ReturnType<CoinTypeUseCaseInterface['listAllByFamily']> => {
    const coinTypes: Array<CoinTypeDataModel> = []
    const entries = deps.kv.list<CoinTypeDataModel>({
      prefix: ['coinTypes', familyId,],
    },)

    for await (const entry of entries) {
      coinTypes.push(entry.value,)
    }

    return coinTypes
  }

  const update = async (
    familyId: CoinTypeDataModel['familyId'],
    id: CoinTypeDataModel['id'],
    properties: Partial<
      Pick<
        CoinTypeDataModel,
        'name' | 'durationMinutes' | 'dailyDistribution' | 'active'
      >
    >,
  ): ReturnType<CoinTypeUseCaseInterface['update']> => {
    return await withRetry(async () => {
      const currentEntry = await deps.kv.get<CoinTypeDataModel>([
        'coinTypes',
        familyId,
        id,
      ],)

      if (currentEntry.value === null) {
        throw new Error(`CoinType with id ${id} not found`,)
      }

      const updatedCoinType: CoinTypeDataModel = {
        ...currentEntry.value,
        ...properties,
        updatedAt: getTimestamp(),
      }

      const res = await deps.kv.atomic()
        .check(currentEntry,)
        .set(['coinTypes', familyId, id,], updatedCoinType,)
        .commit()

      if (res.ok === false) {
        throw new Error('Conflict detected',)
      }

      return updatedCoinType
    },)
  }

  const discard = async (
    familyId: CoinTypeDataModel['familyId'],
    id: CoinTypeDataModel['id'],
  ): ReturnType<CoinTypeUseCaseInterface['discard']> => {
    await deps.kv.delete(['coinTypes', familyId, id,],)
  }

  return {
    create,
    findById,
    listAllByFamily,
    update,
    discard,
  }
}

export { makeCoinTypeUseCase, }

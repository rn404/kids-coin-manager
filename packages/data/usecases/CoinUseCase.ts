import type { CoinDataModel, } from '../Coin.ts'
import { getTimestamp, withRetry, } from '@workspace/foundations'

interface CoinUseCaseInterface {
  increaseBy(
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId'],
    coinTypeId: CoinDataModel['coinTypeId'],
    properties: {
      amount: number
    },
  ): Promise<CoinDataModel>
  decreaseBy(
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId'],
    coinTypeId: CoinDataModel['coinTypeId'],
    properties: {
      amount: number
    },
  ): Promise<CoinDataModel>
  findById(
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId'],
    coinTypeId: CoinDataModel['coinTypeId'],
  ): Promise<CoinDataModel | null>
}

const makeCoinUseCase = (
  deps: { kv: Deno.Kv },
): CoinUseCaseInterface => {
  const updateAmount = async (
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId'],
    coinTypeId: CoinDataModel['coinTypeId'],
    delta: number,
  ): Promise<CoinDataModel> => {
    return await withRetry(async () => {
      const currentEntry = await deps.kv.get<CoinDataModel>([
        'coins',
        userId,
        familyId,
        coinTypeId,
      ],)

      if (currentEntry.value === null) {
        throw new Error(
          `Coin not found for userId: ${userId}, familyId: ${familyId}, coinTypeId: ${coinTypeId}`,
        )
      }

      const newAmount = currentEntry.value.amount + delta

      if (newAmount < 0) {
        throw new Error(
          `Insufficient coin balance. Current: ${currentEntry.value.amount}, Required: ${
            Math.abs(delta,)
          }`,
        )
      }

      const updatedCoin: CoinDataModel = {
        ...currentEntry.value,
        amount: newAmount,
        updatedAt: getTimestamp(),
      }

      const res = await deps.kv.atomic()
        .check(currentEntry,)
        .set(['coins', userId, familyId, coinTypeId,], updatedCoin,)
        .commit()

      if (res.ok === false) {
        throw new Error('Conflict detected',)
      }

      return updatedCoin
    },)
  }

  const increaseBy = async (
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId'],
    coinTypeId: CoinDataModel['coinTypeId'],
    properties: {
      amount: number
    },
  ): ReturnType<CoinUseCaseInterface['increaseBy']> => {
    return await updateAmount(
      userId,
      familyId,
      coinTypeId,
      Math.abs(properties.amount,),
    )
  }

  const decreaseBy = async (
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId'],
    coinTypeId: CoinDataModel['coinTypeId'],
    properties: {
      amount: number
    },
  ): ReturnType<CoinUseCaseInterface['decreaseBy']> => {
    return await updateAmount(
      userId,
      familyId,
      coinTypeId,
      -Math.abs(properties.amount,),
    )
  }

  const findById = async (
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId'],
    coinTypeId: CoinDataModel['coinTypeId'],
  ): ReturnType<
    CoinUseCaseInterface['findById']
  > => {
    const result = await deps.kv.get<CoinDataModel>([
      'coins',
      userId,
      familyId,
      coinTypeId,
    ],)
    return result.value
  }

  return {
    increaseBy,
    decreaseBy,
    findById,
  }
}

export { makeCoinUseCase, }

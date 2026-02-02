import type { CoinDataModel, } from '../Coin.ts'
import { getTimestamp, withRetry, } from '@workspace/foundations'

interface CoinUseCaseInterface {
  spend(
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId'],
    coinTypeId: CoinDataModel['coinTypeId'],
    properties: {
      amount: CoinDataModel['amount']
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
  const spend = async (
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId'],
    coinTypeId: CoinDataModel['coinTypeId'],
    properties: {
      amount: CoinDataModel['amount']
    },
  ): ReturnType<
    CoinUseCaseInterface['spend']
  > => {
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

      const newAmount = currentEntry.value.amount - properties.amount

      if (newAmount < 0) {
        throw new Error(
          `Insufficient coin balance. Current: ${currentEntry.value.amount}, Required: ${properties.amount}`,
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
    spend,
    findById,
  }
}

export { makeCoinUseCase, }

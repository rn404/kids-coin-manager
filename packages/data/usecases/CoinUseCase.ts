import { COIN_PREFIX_KEY, } from '../Coin.ts'
import type { CoinDataModel, } from '../Coin.ts'
import { COIN_TRANSACTION_PREFIX_KEY, } from '../CoinTransaction.ts'
import type { CoinTransactionDataModel, } from '../CoinTransaction.ts'
import { getTimestamp, withRetry, } from '@workspace/foundations'

interface CoinUseCaseInterface {
  increaseBy(
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId'],
    coinTypeId: CoinDataModel['coinTypeId'],
    properties: {
      amount: number
      transactionType: CoinTransactionDataModel['transactionType']
      metadata: CoinTransactionDataModel['metadata']
    },
  ): Promise<CoinDataModel>
  decreaseBy(
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId'],
    coinTypeId: CoinDataModel['coinTypeId'],
    properties: {
      amount: number
      transactionType: CoinTransactionDataModel['transactionType']
      metadata: CoinTransactionDataModel['metadata']
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
    transactionInfo: Pick<
      CoinTransactionDataModel,
      'transactionType' | 'metadata'
    >,
  ): Promise<CoinDataModel> => {
    return await withRetry(async () => {
      const currentEntry = await deps.kv.get<CoinDataModel>([
        COIN_PREFIX_KEY,
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

      const timestamp = getTimestamp()
      const transactionId = crypto.randomUUID()

      const transaction: CoinTransactionDataModel = {
        id: transactionId,
        userId,
        familyId,
        coinTypeId,
        amount: delta,
        balance: newAmount,
        transactionType: transactionInfo.transactionType,
        metadata: transactionInfo.metadata,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      const res = await deps.kv.atomic()
        .check(currentEntry,)
        .set([COIN_PREFIX_KEY, userId, familyId, coinTypeId,], updatedCoin,)
        .set([
          COIN_TRANSACTION_PREFIX_KEY,
          userId,
          familyId,
          coinTypeId,
          transactionId,
        ], transaction,)
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
      transactionType: CoinTransactionDataModel['transactionType']
      metadata: CoinTransactionDataModel['metadata']
    },
  ): ReturnType<CoinUseCaseInterface['increaseBy']> => {
    return await updateAmount(
      userId,
      familyId,
      coinTypeId,
      Math.abs(properties.amount,),
      {
        transactionType: properties.transactionType,
        metadata: properties.metadata,
      },
    )
  }

  const decreaseBy = async (
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId'],
    coinTypeId: CoinDataModel['coinTypeId'],
    properties: {
      amount: number
      transactionType: CoinTransactionDataModel['transactionType']
      metadata: CoinTransactionDataModel['metadata']
    },
  ): ReturnType<CoinUseCaseInterface['decreaseBy']> => {
    return await updateAmount(
      userId,
      familyId,
      coinTypeId,
      -Math.abs(properties.amount,),
      {
        transactionType: properties.transactionType,
        metadata: properties.metadata,
      },
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
      COIN_PREFIX_KEY,
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

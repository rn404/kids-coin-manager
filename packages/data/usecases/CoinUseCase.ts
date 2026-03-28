import type { CoinDataModel } from '../Coin.ts'
import type { CoinTransactionDataModel } from '../CoinTransaction.ts'
import { generateUuid, getTimestamp, withRetry } from '@workspace/foundations'
import { COIN_PREFIX_KEY } from '../Coin.ts'
import { COIN_TRANSACTION_PREFIX_KEY } from '../CoinTransaction.ts'

interface CoinUseCaseInterface {
  listByUser(
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId']
  ): Promise<Array<CoinDataModel>>
  increaseBy(
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId'],
    coinTypeId: CoinDataModel['coinTypeId'],
    properties: {
      amount: number
      transactionType: CoinTransactionDataModel['transactionType']
      metadata: CoinTransactionDataModel['metadata']
    }
  ): Promise<CoinDataModel>
  decreaseBy(
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId'],
    coinTypeId: CoinDataModel['coinTypeId'],
    properties: {
      amount: number
      transactionType: CoinTransactionDataModel['transactionType']
      metadata: CoinTransactionDataModel['metadata']
    }
  ): Promise<CoinDataModel>
  findById(
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId'],
    coinTypeId: CoinDataModel['coinTypeId']
  ): Promise<CoinDataModel | null>
}

const makeCoinUseCase = (
  deps: { kv: Deno.Kv }
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
    options?: { allowCreate?: boolean }
  ): Promise<CoinDataModel> => {
    return await withRetry(async () => {
      const currentEntry = await deps.kv.get<CoinDataModel>([
        COIN_PREFIX_KEY,
        userId,
        familyId,
        coinTypeId
      ])

      if (currentEntry.value === null && options?.allowCreate !== true) {
        throw new Error(
          `Coin not found for userId: ${userId}, familyId: ${familyId}, coinTypeId: ${coinTypeId}`
        )
      }

      const now = getTimestamp()

      const baseCoin: CoinDataModel = currentEntry.value ?? {
        id: generateUuid(),
        userId,
        familyId,
        coinTypeId,
        amount: 0,
        createdAt: now,
        updatedAt: now
      }

      const newAmount = baseCoin.amount + delta

      const updatedCoin: CoinDataModel = {
        ...baseCoin,
        amount: newAmount,
        updatedAt: now
      }

      const transactionId = generateUuid()

      const transaction: CoinTransactionDataModel = {
        id: transactionId,
        userId,
        familyId,
        coinTypeId,
        amount: delta,
        balance: newAmount,
        transactionType: transactionInfo.transactionType,
        metadata: transactionInfo.metadata,
        createdAt: now,
        updatedAt: now
      }

      const res = await deps.kv.atomic()
        .check(currentEntry)
        .set([COIN_PREFIX_KEY, userId, familyId, coinTypeId], updatedCoin)
        .set([
          COIN_TRANSACTION_PREFIX_KEY,
          userId,
          familyId,
          coinTypeId,
          transactionId
        ], transaction)
        .commit()

      if (res.ok === false) {
        throw new Error('Conflict detected')
      }

      return updatedCoin
    })
  }

  const increaseBy = async (
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId'],
    coinTypeId: CoinDataModel['coinTypeId'],
    properties: {
      amount: number
      transactionType: CoinTransactionDataModel['transactionType']
      metadata: CoinTransactionDataModel['metadata']
    }
  ): ReturnType<CoinUseCaseInterface['increaseBy']> => {
    return await updateAmount(
      userId,
      familyId,
      coinTypeId,
      Math.abs(properties.amount),
      {
        transactionType: properties.transactionType,
        metadata: properties.metadata
      },
      { allowCreate: true }
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
    }
  ): ReturnType<CoinUseCaseInterface['decreaseBy']> => {
    return await updateAmount(
      userId,
      familyId,
      coinTypeId,
      -Math.abs(properties.amount),
      {
        transactionType: properties.transactionType,
        metadata: properties.metadata
      },
      { allowCreate: true }
    )
  }

  const findById = async (
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId'],
    coinTypeId: CoinDataModel['coinTypeId']
  ): ReturnType<
    CoinUseCaseInterface['findById']
  > => {
    const result = await deps.kv.get<CoinDataModel>([
      COIN_PREFIX_KEY,
      userId,
      familyId,
      coinTypeId
    ])
    return result.value
  }

  const listByUser = async (
    userId: CoinDataModel['userId'],
    familyId: CoinDataModel['familyId']
  ): ReturnType<CoinUseCaseInterface['listByUser']> => {
    const coins: Array<CoinDataModel> = []
    const entries = deps.kv.list<CoinDataModel>({
      prefix: [COIN_PREFIX_KEY, userId, familyId]
    })

    for await (const entry of entries) {
      coins.push(entry.value)
    }

    return coins
  }

  return {
    listByUser,
    increaseBy,
    decreaseBy,
    findById
  }
}

export { makeCoinUseCase }

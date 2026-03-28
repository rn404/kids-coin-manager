import type { CoinTransactionDataModel } from '../CoinTransaction.ts'
import { COIN_TRANSACTION_PREFIX_KEY } from '../CoinTransaction.ts'

interface CoinTransactionUseCaseInterface {
  listByUser(
    userId: CoinTransactionDataModel['userId'],
    familyId: CoinTransactionDataModel['familyId'],
    options?: { cursor?: string; limit?: number }
  ): Promise<{
    transactions: Array<CoinTransactionDataModel>
    nextCursor: string | null
  }>
}

const makeCoinTransactionUseCase = (
  deps: { kv: Deno.Kv }
): CoinTransactionUseCaseInterface => {
  const listByUser = async (
    userId: CoinTransactionDataModel['userId'],
    familyId: CoinTransactionDataModel['familyId'],
    options?: { cursor?: string; limit?: number }
  ): ReturnType<CoinTransactionUseCaseInterface['listByUser']> => {
    const limit = options?.limit ?? 10
    const iter = deps.kv.list<CoinTransactionDataModel>(
      { prefix: [COIN_TRANSACTION_PREFIX_KEY, userId, familyId] },
      {
        reverse: true,
        ...(options?.cursor !== undefined && { cursor: options.cursor })
      }
    )

    const transactions: Array<CoinTransactionDataModel> = []
    let cursorAfterPage: string | null = null
    let hasMore = false

    for await (const entry of iter) {
      if (transactions.length === limit) {
        hasMore = true
        break
      }
      transactions.push(entry.value)
      cursorAfterPage = iter.cursor
    }

    return {
      transactions,
      nextCursor: hasMore ? cursorAfterPage : null
    }
  }

  return { listByUser }
}

export { makeCoinTransactionUseCase }

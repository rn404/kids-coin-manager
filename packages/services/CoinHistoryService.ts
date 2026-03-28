import {
  makeCoinTransactionUseCase,
  makeCoinTypeUseCase
} from '@workspace/data'
import type { CoinTransactionDataModel } from '@workspace/data'

const PAGE_SIZE = 10

interface CoinHistoryItem {
  id: string
  coinTypeName: string
  transactionType: CoinTransactionDataModel['transactionType']
  amount: number
  balance: number
  createdAt: string
}

interface CoinHistoryResult {
  items: Array<CoinHistoryItem>
  nextCursor: string | null
}

const makeCoinHistoryService = (deps: { kv: Deno.Kv }) => {
  const listHistory = async (
    familyId: string,
    userId: string,
    cursor?: string
  ): Promise<CoinHistoryResult> => {
    const coinTransactionUseCase = makeCoinTransactionUseCase(deps)
    const coinTypeUseCase = makeCoinTypeUseCase(deps)

    const [{ transactions, nextCursor }, coinTypes] = await Promise.all([
      coinTransactionUseCase.listByUser(userId, familyId, {
        cursor,
        limit: PAGE_SIZE
      }),
      coinTypeUseCase.listAllByFamily(familyId)
    ])

    const coinTypeMap = new Map(coinTypes.map((ct) => [ct.id, ct.name]))

    const items: Array<CoinHistoryItem> = transactions.map((t) => ({
      id: t.id,
      coinTypeName: coinTypeMap.get(t.coinTypeId) ?? t.coinTypeId,
      transactionType: t.transactionType,
      amount: t.amount,
      balance: t.balance,
      createdAt: t.createdAt
    }))

    return { items, nextCursor }
  }

  return { listHistory }
}

export { makeCoinHistoryService }
export type { CoinHistoryItem, CoinHistoryResult }

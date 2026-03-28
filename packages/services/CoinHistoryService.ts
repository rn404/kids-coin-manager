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

interface CoinHistoryPage {
  items: Array<CoinHistoryItem>
  page: number
  totalPages: number
  hasPrev: boolean
  hasNext: boolean
}

const makeCoinHistoryService = (deps: { kv: Deno.Kv }) => {
  const listHistory = async (
    familyId: string,
    userId: string,
    page: number
  ): Promise<CoinHistoryPage> => {
    const coinTransactionUseCase = makeCoinTransactionUseCase(deps)
    const coinTypeUseCase = makeCoinTypeUseCase(deps)

    const [transactions, coinTypes] = await Promise.all([
      coinTransactionUseCase.listByUser(userId, familyId),
      coinTypeUseCase.listAllByFamily(familyId)
    ])

    const coinTypeMap = new Map(coinTypes.map((ct) => [ct.id, ct.name]))

    const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE))
    const currentPage = Math.min(Math.max(1, page), totalPages)
    const start = (currentPage - 1) * PAGE_SIZE
    const pageItems = transactions.slice(start, start + PAGE_SIZE)

    const items: Array<CoinHistoryItem> = pageItems.map((t) => ({
      id: t.id,
      coinTypeName: coinTypeMap.get(t.coinTypeId) ?? t.coinTypeId,
      transactionType: t.transactionType,
      amount: t.amount,
      balance: t.balance,
      createdAt: t.createdAt
    }))

    return {
      items,
      page: currentPage,
      totalPages,
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPages
    }
  }

  return { listHistory }
}

export { makeCoinHistoryService }
export type { CoinHistoryItem, CoinHistoryPage }

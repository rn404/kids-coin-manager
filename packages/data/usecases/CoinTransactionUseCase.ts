import { COIN_TRANSACTION_PREFIX_KEY } from '../CoinTransaction.ts'
import type { CoinTransactionDataModel } from '../CoinTransaction.ts'

interface CoinTransactionUseCaseInterface {
  listByUser(
    userId: CoinTransactionDataModel['userId'],
    familyId: CoinTransactionDataModel['familyId']
  ): Promise<Array<CoinTransactionDataModel>>
}

const makeCoinTransactionUseCase = (
  deps: { kv: Deno.Kv }
): CoinTransactionUseCaseInterface => {
  const listByUser = async (
    userId: CoinTransactionDataModel['userId'],
    familyId: CoinTransactionDataModel['familyId']
  ): ReturnType<CoinTransactionUseCaseInterface['listByUser']> => {
    const transactions: Array<CoinTransactionDataModel> = []
    const entries = deps.kv.list<CoinTransactionDataModel>({
      prefix: [COIN_TRANSACTION_PREFIX_KEY, userId, familyId]
    })

    for await (const entry of entries) {
      transactions.push(entry.value)
    }

    transactions.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return transactions
  }

  return { listByUser }
}

export { makeCoinTransactionUseCase }

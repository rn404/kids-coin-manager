import type { CoinTypeDataModel } from '@workspace/data'
import { makeCoinTypeUseCase, makeCoinUseCase } from '@workspace/data'

interface CoinBalance {
  coinTypeId: string
  name: CoinTypeDataModel['name']
  amount: number
}

const makeCoinBalanceService = (deps: { kv: Deno.Kv }) => {
  const coinUseCase = makeCoinUseCase(deps)
  const coinTypeUseCase = makeCoinTypeUseCase(deps)

  const listBalances = async (
    familyId: string,
    userId: string
  ): Promise<Array<CoinBalance>> => {
    const coinTypes = await coinTypeUseCase.listAllByFamily(familyId)
    const coins = await coinUseCase.listByUser(userId, familyId)

    const coinMap = new Map(
      coins.map((coin) => [coin.coinTypeId, coin.amount])
    )

    return coinTypes
      .filter((coinType) => coinType.active)
      .map((coinType) => ({
        coinTypeId: coinType.id,
        name: coinType.name,
        amount: coinMap.get(coinType.id) ?? 0
      }))
  }

  return { listBalances }
}

export { makeCoinBalanceService }
export type { CoinBalance }

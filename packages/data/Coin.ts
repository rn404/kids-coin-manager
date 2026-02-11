import type { DataModel, } from '@workspace/types'

const COIN_PREFIX_KEY = 'coins'

type CoinDataModel = DataModel<{
  familyId: string // TODO
  userId: string // TODO
  coinTypeId: string
  amount: number
}>

export { COIN_PREFIX_KEY, }
export type { CoinDataModel, }

import type { DataModel, } from '@workspace/types'

type CoinDataModel = DataModel<{
  familyId: string // TODO
  userId: string // TODO
  coinTypeId: string
  amount: number
}>

export type { CoinDataModel, }

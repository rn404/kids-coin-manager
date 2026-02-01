import type { DataModel, } from '@workspace/types'

type CoinTypeDataModel = DataModel<{
  familyId: string // TODO
  name: string
  durationMinutes: number
  dailyDistribution: number
  active: boolean
}>

export type { CoinTypeDataModel, }

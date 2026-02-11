import type { DataModel, } from '@workspace/types'

const COIN_TYPE_PREFIX_KEY = 'coin_types'

type CoinTypeDataModel = DataModel<{
  familyId: string // TODO
  name: string
  durationMinutes: number
  dailyDistribution: number
  active: boolean
}>

export { COIN_TYPE_PREFIX_KEY, }
export type { CoinTypeDataModel, }

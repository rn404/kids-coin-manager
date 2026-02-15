import { define, } from '../main.ts'
import { makeCoinDistributionService, } from '../services/CoinDistributionService.ts'

// TODO: 認証処理から取得する
const FAMILY_ID = 'default-family'
const USER_ID = 'default-user'
const TIMEZONE = 'Asia/Tokyo'

export const handler = define.middleware(async (ctx,) => {
  const coinDistributionService = makeCoinDistributionService({
    kv: ctx.state.kv,
  },)
  await coinDistributionService.ensureDaily(FAMILY_ID, USER_ID, TIMEZONE,)

  return await ctx.next()
},)

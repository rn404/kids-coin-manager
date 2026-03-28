import { define } from '../main.ts'
import type { Me } from '../main.ts'
import { makeCoinDistributionService } from '@workspace/services'

// TODO: 認証処理から取得する
const DEFAULT_TIMEZONE = 'Asia/Tokyo'
const STUB_ME: Omit<Me, 'timezone'> = {
  userId: 'default-user',
  familyId: 'default-family'
}

export const handler = define.middleware(async (ctx) => {
  const timezone = ctx.req.headers.get('cookie')?.match(/tz=([^;]+)/)?.[1] ??
    DEFAULT_TIMEZONE

  ctx.state.me = {
    ...STUB_ME,
    timezone
  }

  const coinDistributionService = makeCoinDistributionService({
    kv: ctx.state.kv
  })
  await coinDistributionService.ensureDaily(
    ctx.state.me.familyId,
    ctx.state.me.userId,
    ctx.state.me.timezone
  )

  return await ctx.next()
})

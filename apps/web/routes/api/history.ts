import { define } from '../../main.ts'
import { makeCoinHistoryService } from '@workspace/services'

export const handler = define.handlers({
  async GET(ctx) {
    const cursor = new URL(ctx.req.url).searchParams.get('cursor') ?? undefined
    const service = makeCoinHistoryService({ kv: ctx.state.kv })
    const result = await service.listHistory(
      ctx.state.me.familyId,
      ctx.state.me.userId,
      cursor
    )
    return Response.json(result)
  }
})

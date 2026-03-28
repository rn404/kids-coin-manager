import { makeCoinUseCase } from '@workspace/data'
import { define } from '../../../main.ts'

const handler = define.handlers({
  async POST(ctx) {
    const body = await ctx.req.json()
    const { coinTypeId, amount } = body as {
      coinTypeId: string
      amount: number
    }

    const coinUseCase = makeCoinUseCase({ kv: ctx.state.kv })
    const updatedCoin = await coinUseCase.decreaseBy(
      ctx.state.me.userId,
      ctx.state.me.familyId,
      coinTypeId,
      {
        amount,
        transactionType: 'use',
        metadata: { type: 'use' }
      }
    )

    return Response.json({ ok: true, amount: updatedCoin.amount })
  }
})

export { handler }

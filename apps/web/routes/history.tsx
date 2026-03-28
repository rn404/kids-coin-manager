import { Head } from 'fresh/runtime'
import { page } from 'fresh'
import { define } from '../main.ts'
import { makeCoinHistoryService } from '@workspace/services'
import type { CoinHistoryItem } from '@workspace/services'
import CoinHistory from '../islands/CoinHistory.tsx'

const handler = define.handlers({
  async GET(ctx) {
    const service = makeCoinHistoryService({ kv: ctx.state.kv })
    const { items, nextCursor } = await service.listHistory(
      ctx.state.me.familyId,
      ctx.state.me.userId
    )
    return page({ items, nextCursor })
  }
})

const HistoryPage = define.page<typeof handler>(
  ({ data }) => {
    const { items, nextCursor } = data as {
      items: Array<CoinHistoryItem>
      nextCursor: string | null
    }

    return (
      <div class='px-4 py-8 mx-auto min-h-screen'>
        <Head>
          <title>利用履歴 - Kids Coin Manager</title>
        </Head>
        <div class='max-w-screen-md mx-auto'>
          <h1 class='text-4xl font-bold mb-8'>利用履歴</h1>
          <CoinHistory initialItems={items} initialNextCursor={nextCursor} />
          <div class='mt-8'>
            <a href='/' class='text-blue-500 hover:underline'>← トップへ戻る</a>
          </div>
        </div>
      </div>
    )
  }
)

export { handler }

// deno-lint-ignore internal/no-default-export
export default HistoryPage

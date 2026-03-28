import { Head } from 'fresh/runtime'
import { page } from 'fresh'
import { define } from '../main.ts'
import { makeCoinHistoryService } from '@workspace/services'
import type { CoinHistoryItem, CoinHistoryPage } from '@workspace/services'

const handler = define.handlers({
  async GET(ctx) {
    const pageParam = Number(
      new URL(ctx.req.url).searchParams.get('page') ?? 1
    )
    const service = makeCoinHistoryService({ kv: ctx.state.kv })
    const history = await service.listHistory(
      ctx.state.me.familyId,
      ctx.state.me.userId,
      pageParam
    )
    return page({ history })
  }
})

const TRANSACTION_TYPE_LABELS: Record<
  CoinHistoryItem['transactionType'],
  string
> = {
  daily_distribution: '毎日配布',
  use: '使用',
  exchange: '交換',
  stamp_reward: 'スタンプ報酬',
  manage_grant: '管理者付与'
}

const HistoryPage = define.page<typeof handler>(
  ({ data }) => {
    const { history } = data as { history: CoinHistoryPage }
    const { items, page: currentPage, totalPages, hasPrev, hasNext } = history

    return (
      <div class='px-4 py-8 mx-auto min-h-screen'>
        <Head>
          <title>利用履歴 - Kids Coin Manager</title>
        </Head>
        <div class='max-w-screen-md mx-auto'>
          <h1 class='text-4xl font-bold mb-8'>利用履歴</h1>

          {items.length === 0
            ? <p class='text-gray-500'>履歴がありません</p>
            : (
              <ul class='flex flex-col gap-2'>
                {items.map((item: CoinHistoryItem) => (
                  <li
                    key={item.id}
                    class='p-3 border border-gray-200 rounded flex justify-between items-center'
                  >
                    <div>
                      <span class='font-medium'>{item.coinTypeName}</span>
                      <span class='ml-2 text-sm text-gray-500'>
                        {TRANSACTION_TYPE_LABELS[item.transactionType]}
                      </span>
                      <div class='text-xs text-gray-400 mt-1'>
                        {new Date(item.createdAt).toLocaleString('ja-JP')}
                      </div>
                    </div>
                    <div class='text-right'>
                      <div
                        class={item.amount >= 0
                          ? 'text-green-600 font-bold'
                          : 'text-red-600 font-bold'}
                      >
                        {item.amount >= 0 ? '+' : ''}
                        {item.amount}
                      </div>
                      <div class='text-sm text-gray-500'>
                        残高 {item.balance}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

          <div class='mt-6 flex gap-4 justify-center items-center'>
            {hasPrev
              ? (
                <a
                  href={`/history?page=${currentPage - 1}`}
                  class='px-4 py-2 border border-gray-300 rounded hover:bg-gray-100'
                >
                  Prev
                </a>
              )
              : (
                <span class='px-4 py-2 border border-gray-200 rounded text-gray-300'>
                  Prev
                </span>
              )}
            <span class='text-sm text-gray-600'>
              {currentPage} / {totalPages}
            </span>
            {hasNext
              ? (
                <a
                  href={`/history?page=${currentPage + 1}`}
                  class='px-4 py-2 border border-gray-300 rounded hover:bg-gray-100'
                >
                  Next
                </a>
              )
              : (
                <span class='px-4 py-2 border border-gray-200 rounded text-gray-300'>
                  Next
                </span>
              )}
          </div>

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

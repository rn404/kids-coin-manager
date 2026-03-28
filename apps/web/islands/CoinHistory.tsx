import { useSignal } from '@preact/signals'

interface CoinHistoryItem {
  id: string
  coinTypeName: string
  transactionType:
    | 'daily_distribution'
    | 'use'
    | 'exchange'
    | 'stamp_reward'
    | 'manage_grant'
  amount: number
  balance: number
  createdAt: string
}

interface CoinHistoryProps {
  initialItems: Array<CoinHistoryItem>
  initialNextCursor: string | null
}

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

const CoinHistory = ({ initialItems, initialNextCursor }: CoinHistoryProps) => {
  const items = useSignal<Array<CoinHistoryItem>>(initialItems)
  const nextCursor = useSignal<string | null>(initialNextCursor)
  const isLoading = useSignal(false)
  const error = useSignal<string | null>(null)

  const loadMore = async () => {
    if (nextCursor.value === null) return

    isLoading.value = true
    error.value = null

    try {
      const res = await fetch(`/api/history?cursor=${nextCursor.value}`)
      if (res.ok === false) {
        error.value = '読み込みに失敗しました'
        return
      }
      const data = await res.json() as {
        items: Array<CoinHistoryItem>
        nextCursor: string | null
      }
      items.value = [...items.value, ...data.items]
      nextCursor.value = data.nextCursor
    } catch {
      error.value = 'エラーが発生しました'
    } finally {
      isLoading.value = false
    }
  }

  return (
    <div>
      {items.value.length === 0
        ? <p class='text-gray-500'>履歴がありません</p>
        : (
          <ul class='flex flex-col gap-2'>
            {items.value.map((item) => (
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
                  <div class='text-sm text-gray-500'>残高 {item.balance}</div>
                </div>
              </li>
            ))}
          </ul>
        )}

      {error.value !== null && (
        <p class='mt-4 text-red-500 text-sm'>{error.value}</p>
      )}

      {nextCursor.value !== null && (
        <div class='mt-6 flex justify-center'>
          <button
            onClick={loadMore}
            disabled={isLoading.value}
            class='px-6 py-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50'
          >
            {isLoading.value ? '読み込み中...' : 'もっと見る'}
          </button>
        </div>
      )}
    </div>
  )
}

// deno-lint-ignore internal/no-default-export
export default CoinHistory

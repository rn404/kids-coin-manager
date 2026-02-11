import { page, } from 'fresh'
import { define, } from '@/main.ts'
import {
  COIN_PREFIX_KEY,
  COIN_TRANSACTION_PREFIX_KEY,
  COIN_TYPE_PREFIX_KEY,
  DAILY_COIN_DISTRIBUTION_PREFIX_KEY,
} from '@workspace/data'

const KV_PREFIXES = [
  { prefix: COIN_TYPE_PREFIX_KEY, label: 'CoinType', },
  { prefix: COIN_PREFIX_KEY, label: 'Coin', },
  { prefix: COIN_TRANSACTION_PREFIX_KEY, label: 'CoinTransaction', },
  {
    prefix: DAILY_COIN_DISTRIBUTION_PREFIX_KEY,
    label: 'DailyCoinDistribution',
  },
] as const

export const handler = define.handlers({
  async GET(ctx,) {
    const kv = ctx.state.kv
    const counts = await Promise.all(
      KV_PREFIXES.map(async ({ prefix, },) => {
        let count = 0
        for await (const _ of kv.list({ prefix: [prefix,], },)) {
          count++
        }
        return count
      },),
    )
    return page({ counts, },)
  },
},)

export default define.page<typeof handler>(function Index({ data, },) {
  const { counts, } = data
  return (
    <div class='max-w-2xl mx-auto'>
      <h1 class='text-2xl font-bold mb-6'>Models</h1>
      <div class='grid gap-4'>
        {KV_PREFIXES.map(({ prefix, label, }, i,) => (
          <a
            key={prefix}
            href={`/kv/${prefix}`}
            class='block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow'
          >
            <div class='flex items-center justify-between'>
              <div>
                <div class='font-semibold text-lg'>{label}</div>
                <div class='text-sm text-gray-500'>prefix: [{prefix}]</div>
              </div>
              <div class='text-2xl font-bold text-gray-700'>
                {counts[i]}
                <span class='text-sm font-normal text-gray-400 ml-1'>
                  entries
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
},)

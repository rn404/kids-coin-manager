import { Head, } from 'fresh/runtime'
import { page, } from 'fresh'
import { define, } from '../main.ts'
import { makeCoinBalanceService, } from '@workspace/services'
import type { CoinBalance, } from '@workspace/services'
import CoinUseForm from '../islands/CoinUseForm.tsx'

const handler = define.handlers({
  async GET(ctx,) {
    const service = makeCoinBalanceService({ kv: ctx.state.kv, },)
    const balances = await service.listBalances(
      ctx.state.me.familyId,
      ctx.state.me.userId,
    )
    return page({ balances, },)
  },
},)

const Dashboard = define.page<typeof handler>(
  ({ data, },) => {
    const { balances, } = data

    return (
      <div class='px-4 py-8 mx-auto min-h-screen'>
        <Head>
          <title>Kids Coin Manager</title>
        </Head>
        <div class='max-w-screen-md mx-auto flex flex-col items-center justify-center'>
          <h1 class='text-4xl font-bold'>Kids Coin Manager</h1>

          <section class='mt-8 w-full'>
            {balances.length === 0
              ? <p class='text-gray-500'>コインがありません</p>
              : (
                <ul class='flex flex-col gap-2'>
                  {balances.map((balance: CoinBalance,) => (
                    <CoinUseForm
                      key={balance.coinTypeId}
                      coinTypeId={balance.coinTypeId}
                      name={balance.name}
                      initialAmount={balance.amount}
                    />
                  ))}
                </ul>
              )}
          </section>

          <nav class='mt-8 flex flex-col gap-4 w-full'>
            <a
              href='/timer'
              class='px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-center'
            >
              Timer
            </a>
            <a
              href='/stamps'
              class='px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 text-center'
            >
              Stamps
            </a>
            <a
              href='/coin-types'
              class='px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-center'
            >
              コイン種類管理
            </a>
          </nav>
        </div>
      </div>
    )
  },
)

export { handler, }

// deno-lint-ignore internal/no-default-export
export default Dashboard

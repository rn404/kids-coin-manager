import type { CoinBalance } from '@workspace/services'
import { Head } from 'fresh/runtime'
import { page } from 'fresh'
import { makeCoinBalanceService } from '@workspace/services'
import { define } from '../main.ts'
import CoinUseForm from '../islands/CoinUseForm.tsx'
import AdminButton from '../islands/AdminButton.tsx'

const handler = define.handlers({
  async GET(ctx) {
    const service = makeCoinBalanceService({ kv: ctx.state.kv })
    const balances = await service.listBalances(
      ctx.state.me.familyId,
      ctx.state.me.userId
    )
    return page({ balances })
  }
})

const Dashboard = define.page<typeof handler>(
  ({ data }) => {
    const { balances } = data

    return (
      <div class='px-4 py-8'>
        <Head>
          <title>Kids Coin Manager</title>
        </Head>
        <div class='absolute top-0 right-0 pt-3 pr-3'>
          <AdminButton />
        </div>
        <div class='max-w-screen-md mx-auto flex flex-col items-center justify-center'>
          <h1 class='text-4xl font-bold'>Kids Coin Manager</h1>

          <section class='mt-8 w-full'>
            {balances.length === 0
              ? <p class='text-gray-500'>コインがありません</p>
              : (
                <ul class='flex flex-col gap-2'>
                  {balances.map((balance: CoinBalance) => (
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
        </div>
      </div>
    )
  }
)

export { handler }

// deno-lint-ignore internal/no-default-export
export default Dashboard

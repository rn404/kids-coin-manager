import type { CoinTypeDataModel } from '@workspace/data'
import type { ValidationError } from '@workspace/services'
import { Head } from 'fresh/runtime'
import { page } from 'fresh'
import { makeCoinManageService } from '@workspace/services'
import { makeCoinUseCase } from '@workspace/data'
import { define } from '../../main.ts'

const handler = define.handlers({
  async GET(ctx) {
    const service = makeCoinManageService({ kv: ctx.state.kv })
    const coinTypes = await service.listCoinTypes(ctx.state.me.familyId)
    return page({ coinTypes, errors: [] as Array<ValidationError> })
  },
  async POST(ctx) {
    const formData = await ctx.req.formData()
    const action = formData.get('_action')?.toString()

    if (action === 'grant') {
      const coinTypeId = formData.get('coinTypeId')?.toString() ?? ''
      const amount = Number(formData.get('amount') ?? 0)

      const coinUseCase = makeCoinUseCase({ kv: ctx.state.kv })
      await coinUseCase.increaseBy(
        ctx.state.me.userId,
        ctx.state.me.familyId,
        coinTypeId,
        {
          amount,
          transactionType: 'manage_grant',
          metadata: { type: 'manage_grant' }
        }
      )

      return new Response(null, {
        status: 303,
        headers: { Location: '/coin-types' }
      })
    }

    const name = formData.get('name')?.toString() ?? ''
    const durationMinutes = Number(formData.get('durationMinutes') ?? 0)
    const dailyDistribution = Number(formData.get('dailyDistribution') ?? 0)

    const service = makeCoinManageService({ kv: ctx.state.kv })
    const result = await service.addCoinType(ctx.state.me.familyId, {
      name,
      durationMinutes,
      dailyDistribution
    })

    if (result.ok === false) {
      const coinTypes = await service.listCoinTypes(ctx.state.me.familyId)
      return page({ coinTypes, errors: result.errors })
    }

    return new Response(null, {
      status: 303,
      headers: { Location: '/coin-types' }
    })
  }
})

const CoinTypesPage = define.page<typeof handler>(
  ({ data }) => {
    const { coinTypes, errors } = data

    return (
      <div class='px-4 py-8 mx-auto min-h-screen'>
        <Head>
          <title>コイン種類管理 - Kids Coin Manager</title>
        </Head>
        <div class='max-w-screen-md mx-auto'>
          <h1 class='text-4xl font-bold mb-8'>コイン種類管理</h1>

          <section class='mb-8'>
            <h2 class='text-2xl font-bold mb-4'>新規登録</h2>
            {errors.length > 0 && (
              <div class='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded'>
                <ul>
                  {errors.map((error) => (
                    <li key={error.field}>{error.message}</li>
                  ))}
                </ul>
              </div>
            )}
            <form method='post' class='flex flex-col gap-4'>
              <input type='hidden' name='_action' value='add_coin_type' />
              <div>
                <label class='block text-sm font-medium mb-1' for='name'>
                  名前
                </label>
                <input
                  type='text'
                  id='name'
                  name='name'
                  class='w-full px-3 py-2 border border-gray-300 rounded'
                />
              </div>
              <div>
                <label
                  class='block text-sm font-medium mb-1'
                  for='durationMinutes'
                >
                  時間（分）
                </label>
                <input
                  type='number'
                  id='durationMinutes'
                  name='durationMinutes'
                  min='1'
                  class='w-full px-3 py-2 border border-gray-300 rounded'
                />
              </div>
              <div>
                <label
                  class='block text-sm font-medium mb-1'
                  for='dailyDistribution'
                >
                  1日の配布数
                </label>
                <input
                  type='number'
                  id='dailyDistribution'
                  name='dailyDistribution'
                  min='0'
                  class='w-full px-3 py-2 border border-gray-300 rounded'
                />
              </div>
              <button
                type='submit'
                class='px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer'
              >
                登録
              </button>
            </form>
          </section>

          <section class='mb-8'>
            <h2 class='text-2xl font-bold mb-4'>コイン付与</h2>
            <form method='post' class='flex flex-col gap-4'>
              <input type='hidden' name='_action' value='grant' />
              <div>
                <label class='block text-sm font-medium mb-1' for='coinTypeId'>
                  コイン種類
                </label>
                <select
                  id='coinTypeId'
                  name='coinTypeId'
                  class='w-full px-3 py-2 border border-gray-300 rounded'
                >
                  {coinTypes.map((coinType: CoinTypeDataModel) => (
                    <option key={coinType.id} value={coinType.id}>
                      {coinType.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label class='block text-sm font-medium mb-1' for='amount'>
                  枚数
                </label>
                <input
                  type='number'
                  id='amount'
                  name='amount'
                  min='1'
                  class='w-full px-3 py-2 border border-gray-300 rounded'
                />
              </div>
              <button
                type='submit'
                class='px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer'
              >
                付与
              </button>
            </form>
          </section>

          <section>
            <h2 class='text-2xl font-bold mb-4'>登録済み一覧</h2>
            {coinTypes.length === 0
              ? <p class='text-gray-500'>まだコイン種類が登録されていません</p>
              : (
                <ul class='flex flex-col gap-2'>
                  {coinTypes.map((coinType: CoinTypeDataModel) => (
                    <li
                      key={coinType.id}
                      class='p-3 border border-gray-200 rounded'
                    >
                      {coinType.name}（{coinType.durationMinutes}分,{' '}
                      {coinType.dailyDistribution}枚/日）
                    </li>
                  ))}
                </ul>
              )}
          </section>

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
export default CoinTypesPage

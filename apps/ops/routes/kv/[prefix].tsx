import { page, } from 'fresh'
import { define, } from '@/main.ts'

const DEFAULT_LIMIT = 100

export const handler = define.handlers({
  async GET(ctx,) {
    const prefix = ctx.params.prefix
    const url = new URL(ctx.req.url,)
    const limit = Number(url.searchParams.get('limit',),) || DEFAULT_LIMIT

    const entries: Array<{ key: Deno.KvKey; value: unknown }> = []
    for await (
      const entry of ctx.state.kv.list(
        { prefix: [prefix,], },
        { limit, },
      )
    ) {
      entries.push({ key: entry.key, value: entry.value, },)
    }

    return page({ prefix, entries, limit, },)
  },
},)

export default define.page<typeof handler>(function PrefixPage({ data, },) {
  const { prefix, entries, limit, } = data
  return (
    <div class='max-w-5xl mx-auto'>
      <div class='flex items-center gap-4 mb-6'>
        <a href='/' class='text-blue-600 hover:underline'>&larr; Back</a>
        <h1 class='text-2xl font-bold'>
          [{prefix}]
          <span class='text-base font-normal text-gray-500 ml-2'>
            {entries.length} entries (limit: {limit})
          </span>
        </h1>
      </div>

      {entries.length === 0
        ? <p class='text-gray-500'>No entries found.</p>
        : (
          <div class='overflow-x-auto'>
            <table class='w-full bg-white rounded-lg shadow text-sm'>
              <thead>
                <tr class='bg-gray-100 text-left'>
                  <th class='px-4 py-2 font-semibold'>#</th>
                  <th class='px-4 py-2 font-semibold'>Key</th>
                  <th class='px-4 py-2 font-semibold'>Value</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i,) => (
                  <tr key={i} class='border-t hover:bg-gray-50'>
                    <td class='px-4 py-2 text-gray-400'>{i + 1}</td>
                    <td class='px-4 py-2 font-mono text-xs whitespace-nowrap'>
                      {JSON.stringify(entry.key,)}
                    </td>
                    <td class='px-4 py-2'>
                      <pre class='font-mono text-xs whitespace-pre-wrap max-w-3xl overflow-auto'>
                        {JSON.stringify(entry.value, null, 2,)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
},)

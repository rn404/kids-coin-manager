import { page, } from 'fresh'
import { define, } from '../../main.ts'
import { getTimestamp, } from '@workspace/foundations'
import KvTable from '../../islands/KvTable.tsx'

const DEFAULT_LIMIT = 100

const PROTECTED_FIELDS = ['id', 'createdAt', 'updatedAt',] as const

export const handler = define.handlers({
  async GET(ctx,) {
    const prefix = ctx.params.prefix
    const url = new URL(ctx.req.url,)
    const limit = Number(url.searchParams.get('limit',),) || DEFAULT_LIMIT

    const entries: Array<{ key: Array<string | number>; value: unknown }> = []
    for await (
      const entry of ctx.state.kv.list(
        { prefix: [prefix,], },
        { limit, reverse: true, },
      )
    ) {
      entries.push({
        key: entry.key as Array<string | number>,
        value: entry.value,
      },)
    }

    return page({ prefix, entries, limit, },)
  },
  async PUT(ctx,) {
    const { key, value, } = await ctx.req.json() as {
      key: Array<string | number>
      value: Record<string, unknown>
    }

    const current = await ctx.state.kv.get(key,)
    if (current.value === null) {
      return Response.json(
        { error: 'Entry not found', },
        { status: 404, },
      )
    }

    const currentValue = current.value as Record<string, unknown>

    const attributes = { ...value, }
    for (const field of PROTECTED_FIELDS) {
      delete attributes[field]
    }

    const updated = {
      ...currentValue,
      ...attributes,
      updatedAt: getTimestamp(),
    }

    await ctx.state.kv.set(key, updated,)

    return Response.json({ ok: true, },)
  },
  async DELETE(ctx,) {
    const { keys, } = await ctx.req.json() as {
      keys: Array<Array<string | number>>
    }

    const atomic = ctx.state.kv.atomic()
    for (const key of keys) {
      atomic.delete(key,)
    }
    await atomic.commit()

    return new Response(null, { status: 204, },)
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
        : <KvTable prefix={prefix} entries={entries} />}
    </div>
  )
},)

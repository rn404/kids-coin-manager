import { useSignal, } from '@preact/signals'

interface KvEntry {
  key: Array<string | number>
  value: unknown
}

interface KvTableProps {
  prefix: string
  entries: Array<KvEntry>
}

export default function KvTable({ prefix, entries, }: KvTableProps,) {
  const deleteMode = useSignal(false,)
  const selectedKeys = useSignal<Set<number>>(new Set(),)
  const isDeleting = useSignal(false,)

  const toggleDeleteMode = () => {
    if (deleteMode.value) {
      selectedKeys.value = new Set()
    }
    deleteMode.value = deleteMode.value === false
  }

  const toggleSelection = (index: number,) => {
    const next = new Set(selectedKeys.value,)
    if (next.has(index,)) {
      next.delete(index,)
    } else {
      next.add(index,)
    }
    selectedKeys.value = next
  }

  const handleDelete = async () => {
    if (selectedKeys.value.size === 0) return

    const keysToDelete = [...selectedKeys.value,].map(
      (i,) => entries[i].key,
    )

    isDeleting.value = true
    const res = await fetch(`/kv/${prefix}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', },
      body: JSON.stringify({ keys: keysToDelete, },),
    },)

    if (res.ok) {
      globalThis.location.reload()
    }
    isDeleting.value = false
  }

  return (
    <div>
      <div class='flex justify-end mb-2 gap-2'>
        {deleteMode.value && selectedKeys.value.size > 0 && (
          <button
            type='button'
            onClick={handleDelete}
            disabled={isDeleting.value}
            class='px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer disabled:opacity-50'
          >
            {isDeleting.value
              ? '削除中...'
              : `${selectedKeys.value.size}件を削除`}
          </button>
        )}
        <button
          type='button'
          onClick={toggleDeleteMode}
          class={`px-3 py-1 text-sm rounded cursor-pointer ${
            deleteMode.value
              ? 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          {deleteMode.value ? 'キャンセル' : '削除'}
        </button>
      </div>

      <div class='overflow-x-auto'>
        <table class='w-full bg-white rounded-lg shadow text-sm'>
          <thead>
            <tr class='bg-gray-100 text-left'>
              {deleteMode.value && <th class='px-4 py-2 w-8' />}
              <th class='px-4 py-2 font-semibold'>#</th>
              <th class='px-4 py-2 font-semibold'>Key</th>
              <th class='px-4 py-2 font-semibold'>Value</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i,) => (
              <tr
                key={i}
                class={`border-t hover:bg-gray-50 ${
                  selectedKeys.value.has(i,) ? 'bg-red-50' : ''
                }`}
              >
                {deleteMode.value && (
                  <td class='px-4 py-2'>
                    <input
                      type='checkbox'
                      checked={selectedKeys.value.has(i,)}
                      onChange={() => toggleSelection(i,)}
                    />
                  </td>
                )}
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
    </div>
  )
}

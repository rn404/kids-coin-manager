import { useSignal, } from '@preact/signals'

interface KvEntry {
  key: Array<string | number>
  value: unknown
}

interface KvTableProps {
  prefix: string
  entries: Array<KvEntry>
}

const PROTECTED_FIELDS = ['id', 'createdAt', 'updatedAt',]

const stripProtectedFields = (
  value: unknown,
): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return {}
  const obj = value as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const [k, v,] of Object.entries(obj,)) {
    if (PROTECTED_FIELDS.includes(k,) === false) {
      result[k] = v
    }
  }
  return result
}

export default function KvTable({ prefix, entries, }: KvTableProps,) {
  const deleteMode = useSignal(false,)
  const selectedKeys = useSignal<Set<number>>(new Set(),)
  const isDeleting = useSignal(false,)
  const editingIndex = useSignal<number | null>(null,)
  const editValue = useSignal('',)
  const editError = useSignal<string | null>(null,)
  const isSaving = useSignal(false,)

  const toggleDeleteMode = () => {
    if (deleteMode.value) {
      selectedKeys.value = new Set()
    }
    deleteMode.value = deleteMode.value === false
    editingIndex.value = null
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

  const startEdit = (index: number,) => {
    editingIndex.value = index
    const editable = stripProtectedFields(entries[index].value,)
    editValue.value = JSON.stringify(editable, null, 2,)
    editError.value = null
    deleteMode.value = false
    selectedKeys.value = new Set()
  }

  const cancelEdit = () => {
    editingIndex.value = null
    editError.value = null
  }

  const handleSave = async (index: number,) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(editValue.value,)
    } catch {
      editError.value = 'JSONの形式が正しくありません'
      return
    }

    if (
      typeof parsed !== 'object' || parsed === null || Array.isArray(parsed,)
    ) {
      editError.value = 'オブジェクトである必要があります'
      return
    }

    isSaving.value = true
    editError.value = null

    const res = await fetch(`/kv/${prefix}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', },
      body: JSON.stringify({
        key: entries[index].key,
        value: parsed,
      },),
    },)

    if (res.ok) {
      globalThis.location.reload()
    } else {
      const body = await res.json()
      editError.value = body.error ?? '更新に失敗しました'
    }
    isSaving.value = false
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
              {deleteMode.value === false && (
                <th class='px-4 py-2 font-semibold w-16' />
              )}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i,) => (
              <tr
                key={i}
                class={`border-t hover:bg-gray-50 ${
                  selectedKeys.value.has(i,) ? 'bg-red-50' : ''
                } ${editingIndex.value === i ? 'bg-blue-50' : ''}`}
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
                <td class='px-4 py-2 font-mono text-xs whitespace-nowrap align-top'>
                  {JSON.stringify(entry.key,)}
                </td>
                <td class='px-4 py-2'>
                  {editingIndex.value === i
                    ? (
                      <div class='flex flex-col gap-2'>
                        <textarea
                          class='w-full font-mono text-xs border border-gray-300 rounded p-2 min-h-[120px]'
                          value={editValue.value}
                          onInput={(e,) =>
                            editValue.value =
                              (e.target as HTMLTextAreaElement).value}
                        />
                        {editError.value !== null && (
                          <p class='text-red-600 text-xs'>
                            {editError.value}
                          </p>
                        )}
                        <div class='flex gap-2'>
                          <button
                            type='button'
                            onClick={() => handleSave(i,)}
                            disabled={isSaving.value}
                            class='px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer disabled:opacity-50'
                          >
                            {isSaving.value ? '保存中...' : '保存'}
                          </button>
                          <button
                            type='button'
                            onClick={cancelEdit}
                            class='px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 cursor-pointer'
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    )
                    : (
                      <pre class='font-mono text-xs whitespace-pre-wrap max-w-3xl overflow-auto'>
                        {JSON.stringify(entry.value, null, 2,)}
                      </pre>
                    )}
                </td>
                {deleteMode.value === false && (
                  <td class='px-4 py-2 align-top'>
                    {editingIndex.value !== i && (
                      <button
                        type='button'
                        onClick={() => startEdit(i,)}
                        class='px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 cursor-pointer'
                      >
                        編集
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

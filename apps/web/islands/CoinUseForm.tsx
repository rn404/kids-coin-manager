import { useSignal, } from '@preact/signals'
import { Button, Icon, NumberInput, } from '@workspace/ui'

interface CoinUseFormProps {
  coinTypeId: string
  name: string
  initialAmount: number
}

const CoinUseForm = (
  { coinTypeId, name, initialAmount, }: CoinUseFormProps,
) => {
  const isOpen = useSignal(false,)
  const amount = useSignal(1,)
  const currentAmount = useSignal(initialAmount,)
  const isLoading = useSignal(false,)
  const error = useSignal<string | null>(null,)

  const handleSubmit = async () => {
    isLoading.value = true
    error.value = null

    try {
      const res = await fetch('/api/coins/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ coinTypeId, amount: amount.value, },),
      },)

      if (res.ok === false) {
        error.value = 'コインの使用に失敗しました'
        return
      }

      const data = await res.json() as { ok: boolean; amount: number }
      currentAmount.value = data.amount
      isOpen.value = false
      amount.value = 1
    } catch {
      error.value = 'エラーが発生しました'
    } finally {
      isLoading.value = false
    }
  }

  return (
    <li class='border border-gray-200 rounded'>
      <div class='p-4 flex justify-between items-center'>
        <span class='font-medium'>{name}</span>
        <div class='flex items-center gap-4'>
          <span class='text-2xl font-bold'>{currentAmount} まい</span>
        </div>
      </div>
      <div class='p-4 pt-0 flex items-center gap-2 h-[42px]'>
        <Button
          onClick={() => (isOpen.value = true)}
          disabled={isOpen.value}
          aria-label='コインを使う'
        >
          <Icon name='CoinStar' />
        </Button>
        {isOpen.value && (
          <div class='shrink-0 flex items-center gap-2'>
            <NumberInput value={amount} min={1} max={currentAmount.value} />
            <Button
              onClick={handleSubmit}
              disabled={isLoading.value}
              variant='primary'
            >
              使う
            </Button>
            <Button onClick={() => (isOpen.value = false)} aria-label='やめる'>
              <Icon name='ArrowBack' />
            </Button>
          </div>
        )}
      </div>
      {error.value !== null && (
        <span class='text-red-500 text-sm'>{error.value}</span>
      )}
    </li>
  )
}

// deno-lint-ignore internal/no-default-export
export default CoinUseForm

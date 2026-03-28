import type { Signal } from '@preact/signals'
import type { JSX } from 'preact'
import { useComputed, useSignal } from '@preact/signals'
import { twMerge } from 'tailwind-merge'
import { Icon } from './Icon.tsx'

type OwnProps = {
  id?: string
  name?: string
  placeholder?: string
  disabled?: boolean
  class?: string
  value?: Signal<number>
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  onChange?: (value: number) => void
}

type NumberInputProps =
  & OwnProps
  & Omit<JSX.IntrinsicElements['div'], keyof OwnProps | 'children'>

const NumberInput = ({
  value,
  defaultValue = 0,
  onChange,
  min,
  max,
  step = 1,
  id,
  name,
  disabled = false,
  placeholder,
  class: className,
  ...rest
}: NumberInputProps) => {
  const internalSignal = useSignal(defaultValue)
  const signal = value ?? internalSignal

  const isDecrementDisabled = useComputed(
    () => disabled || (min !== undefined && signal.value <= min)
  )
  const isIncrementDisabled = useComputed(
    () => disabled || (max !== undefined && signal.value >= max)
  )

  const handleChange = (newValue: number) => {
    let result = newValue
    if (min !== undefined) result = Math.max(min, result)
    if (max !== undefined) result = Math.min(max, result)
    signal.value = result
    onChange?.(result)
  }

  const handleInputChange = (e: Event) => {
    const parsed = parseInt((e.target as HTMLInputElement).value, 10)
    if (isNaN(parsed) === false) {
      handleChange(parsed)
    }
  }

  return (
    <div
      {...rest}
      class={twMerge(
        'border border-black/20 rounded-sm bg-white relative',
        className
      )}
    >
      <input
        id={id}
        name={name}
        type='number'
        value={signal}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        disabled={disabled}
        onInput={handleInputChange}
        class='w-full p-2 pr-22 text-right bg-transparent disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
        aria-label='数値入力'
      />
      <div class='flex top-0 right-0 absolute h-full'>
        <button
          type='button'
          onClick={() => handleChange(signal.value + step)}
          disabled={isIncrementDisabled}
          aria-label='増やす'
          class='w-10 content-center hover:bg-gray-200 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 border-l border-black/20'
        >
          <Icon name='Plus' size={14} class='mx-auto' />
        </button>
        <button
          type='button'
          onClick={() => handleChange(signal.value - step)}
          disabled={isDecrementDisabled}
          aria-label='減らす'
          class='w-10 content-center hover:bg-gray-200 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 border-l border-black/20'
        >
          <Icon name='Minus' size={14} class='mx-auto' />
        </button>
      </div>
    </div>
  )
}

export type { NumberInputProps }
export { NumberInput }

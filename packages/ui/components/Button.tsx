import type { ComponentChildren, } from 'preact'
import { twMerge, } from 'tailwind-merge'

const variantClass = {
  default:
    'border-gray-400 border rounded-sm bg-white hover:bg-gray-100 text-gray-800',
  primary:
    'border-transparent border rounded-sm bg-gray-900 hover:bg-gray-700 text-white',
  danger:
    'border-transparent border rounded-sm bg-red-500 hover:bg-red-400 text-white',
} as const

export interface ButtonProps {
  id?: string
  onClick?: () => void
  children?: ComponentChildren
  disabled?: boolean
  variant?: keyof typeof variantClass
  class?: string
}

export const Button = ({
  variant = 'default',
  class: className,
  ...props
}: ButtonProps,) => {
  return (
    <button
      {...props}
      type='button'
      class={twMerge(
        'px-3 py-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
        variantClass[variant],
        className,
      )}
    />
  )
}

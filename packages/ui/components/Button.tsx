import type { ComponentChildren } from 'preact'
import { twMerge } from 'tailwind-merge'

const variantClass = {
  default:
    'border-gray-400 border rounded-sm bg-white hover:bg-gray-100 text-gray-800',
  primary:
    'border-transparent border rounded-sm bg-gray-900 hover:bg-gray-700 text-white',
  danger:
    'border-transparent border rounded-sm bg-red-500 hover:bg-red-400 text-white'
} as const

interface ButtonProps {
  id?: string
  onClick?: () => void
  children?: ComponentChildren
  disabled?: boolean
  variant?: keyof typeof variantClass
  class?: string
  as?: 'button' | 'link'
  href?: string
  'aria-label'?: string
}

const Button = ({
  variant = 'default',
  class: className,
  as = 'button',
  href,
  ...props
}: ButtonProps) => {
  const classes = twMerge(
    'inline-flex items-center justify-center px-3 py-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
    variantClass[variant],
    className
  )

  if (as === 'link') {
    return (
      <a
        {...props}
        href={href}
        class={classes}
      />
    )
  }

  return (
    <button
      {...props}
      type='button'
      class={classes}
    />
  )
}

export type { ButtonProps }
export { Button }

import type { ComponentChildren } from 'preact'
import { twMerge } from 'tailwind-merge'

const TextButton = ({ class: className, ...props }: {
  onClick?: () => void
  children?: ComponentChildren
  disabled?: boolean
  class?: string
}) => {
  return (
    <button
      type='button'
      {...props}
      class={twMerge(
        'underline hover:opacity-70 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
        className
      )}
    />
  )
}

export { TextButton }

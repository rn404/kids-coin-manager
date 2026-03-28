import type { ComponentChildren } from 'preact'
import { twMerge } from 'tailwind-merge'
import { Icon } from './Icon.tsx'

const Link = ({ class: className, externalLink = false, children, ...props }: {
  href?: string
  onClick?: () => void
  children?: ComponentChildren
  class?: string
  externalLink?: boolean
}) => {
  return (
    <a
      {...props}
      {...(externalLink ? { target: '_blank', rel: 'noreferrer' } : {})}
      class={twMerge(
        'inline-flex items-center gap-1 underline hover:opacity-70 transition-opacity',
        className
      )}
    >
      {children}
      {externalLink && <Icon name='ExternalLink' size={14} />}
    </a>
  )
}

export { Link }

import { icons, } from '@workspace/icons'
import type { IconName, } from '@workspace/icons'
import { twMerge, } from 'tailwind-merge'

function Icon({ name, size = 24, class: className, ...rest }: {
  /**
   * IconName
   */
  name: IconName

  /**
   * Icon size
   * @default 24
   */
  size?: number | string

  /**
   * Component class
   */
  class?: string
},) {
  const Component = icons[name]
  return (
    <i
      class={twMerge('inline-flex items-center align-middle', className,)}
      {...rest}
    >
      <Component size={size} class='block' />
    </i>
  )
}

export { Icon, }

import { icons, } from '@workspace/icons'
import type { IconName, } from '@workspace/icons'

function Icon({ name, size = 24, ...rest }: {
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
  return <Component size={size} {...rest} />
}

export { Icon, }

import { icons, } from '@workspace/icons'
import type { IconName, } from '@workspace/icons'

export interface IconProps {
  size?: number | string
  class?: string
}

interface Props extends IconProps {
  name: IconName
}

export function Icon({ name, size = 24, ...rest }: Props,) {
  const Component = icons[name]
  return <Component size={size} {...rest} />
}

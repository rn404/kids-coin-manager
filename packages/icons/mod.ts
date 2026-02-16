import { IconCoin, } from './IconCoin.tsx'
import { IconEdit, } from './IconEdit.tsx'

const icons = {
  Coin: IconCoin,
  Edit: IconEdit,
} as const

type IconName = keyof typeof icons

export { IconCoin, IconEdit, icons, }
export type { IconName, }

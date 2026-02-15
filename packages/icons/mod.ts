import { IconCoin, } from './IconCoin.tsx'

const icons = {
  Coin: IconCoin,
} as const

type IconName = keyof typeof icons

export { IconCoin, icons, }
export type { IconName, }

import { IconCoin, } from './IconCoin.tsx'
import { IconEdit, } from './IconEdit.tsx'
import { IconArrowBack, } from './IconArrowBack.tsx'
import { IconCheck, } from './IconCheck.tsx'
import { IconTrashX, } from './IconTrashX.tsx'

const icons = {
  Coin: IconCoin,
  Edit: IconEdit,
  ArrowBack: IconArrowBack,
  Check: IconCheck,
  TrashX: IconTrashX,
} as const

type IconName = keyof typeof icons

export { IconArrowBack, IconCheck, IconCoin, IconEdit, icons, IconTrashX, }
export type { IconName, }

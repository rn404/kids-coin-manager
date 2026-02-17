import { IconCoin, } from './IconCoin.tsx'
import { IconEdit, } from './IconEdit.tsx'
import { IconArrowBack, } from './IconArrowBack.tsx'
import { IconCheck, } from './IconCheck.tsx'
import { IconTrashX, } from './IconTrashX.tsx'
import { IconX, } from './IconX.tsx'
import { IconCircle, } from './IconCircle.tsx'

const icons = {
  Coin: IconCoin,
  Edit: IconEdit,
  ArrowBack: IconArrowBack,
  Check: IconCheck,
  TrashX: IconTrashX,
  X: IconX,
  Circle: IconCircle,
} as const

type IconName = keyof typeof icons

export {
  IconArrowBack,
  IconCheck,
  IconCoin,
  IconEdit,
  icons,
  IconTrashX,
  IconX,
}
export type { IconName, }

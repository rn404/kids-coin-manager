import { IconCoin, } from './IconCoin.tsx'
import { IconEdit, } from './IconEdit.tsx'
import { IconArrowBack, } from './IconArrowBack.tsx'
import { IconCheck, } from './IconCheck.tsx'
import { IconTrashX, } from './IconTrashX.tsx'
import { IconX, } from './IconX.tsx'
import { IconCircle, } from './IconCircle.tsx'
import { IconHourglassEmpty, } from './IconHourglassEmpty.tsx'
import { IconSettings, } from './IconSettings.tsx'

const icons = {
  Coin: IconCoin,
  Edit: IconEdit,
  ArrowBack: IconArrowBack,
  Check: IconCheck,
  TrashX: IconTrashX,
  X: IconX,
  Circle: IconCircle,
  HourglassEmpty: IconHourglassEmpty,
  Settings: IconSettings,
} as const

type IconName = keyof typeof icons

export {
  IconArrowBack,
  IconCheck,
  IconCircle,
  IconCoin,
  IconEdit,
  IconHourglassEmpty,
  icons,
  IconSettings,
  IconTrashX,
  IconX,
}
export type { IconName, }

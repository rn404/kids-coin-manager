import { IconCoin, } from './IconCoin.tsx'
import { IconEdit, } from './IconEdit.tsx'
import { IconArrowBack, } from './IconArrowBack.tsx'
import { IconCheck, } from './IconCheck.tsx'
import { IconTrashX, } from './IconTrashX.tsx'
import { IconX, } from './IconX.tsx'
import { IconCircle, } from './IconCircle.tsx'
import { IconHourglassEmpty, } from './IconHourglassEmpty.tsx'
import { IconSettings, } from './IconSettings.tsx'
import { IconSquare, } from './IconSquare.tsx'
import { IconSquareCheck, } from './IconSquareCheck.tsx'
import { IconPlus, } from './IconPlus.tsx'
import { IconMinus, } from './IconMinus.tsx'
import { IconExternalLink, } from './IconExternalLink.tsx'
import { IconPalette, } from './IconPalette.tsx'

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
  Square: IconSquare,
  SquareCheck: IconSquareCheck,
  Plus: IconPlus,
  Minus: IconMinus,
  ExternalLink: IconExternalLink,
  Palette: IconPalette,
} as const

type IconName = keyof typeof icons

export {
  IconArrowBack,
  IconCheck,
  IconCircle,
  IconCoin,
  IconEdit,
  IconExternalLink,
  IconHourglassEmpty,
  IconMinus,
  IconPalette,
  IconPlus,
  icons,
  IconSettings,
  IconSquare,
  IconSquareCheck,
  IconTrashX,
  IconX,
}
export type { IconName, }

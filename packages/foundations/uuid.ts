import type { UuidV7, } from '@workspace/types'
import { v7, } from '@std/uuid'

const isUuid = (value: unknown,): value is UuidV7 => {
  return v7.validate(value as string,)
}

const generateUuid = (): UuidV7 => {
  return v7.generate()
}

export { generateUuid, isUuid, }

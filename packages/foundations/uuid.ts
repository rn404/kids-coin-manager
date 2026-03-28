import { v7 } from '@std/uuid'

type UuidV7 = string

const isUuid = (value: unknown): value is UuidV7 => {
  return v7.validate(value as string)
}

const generateUuid = (): UuidV7 => {
  return v7.generate()
}

export { generateUuid, isUuid }
export type { UuidV7 }

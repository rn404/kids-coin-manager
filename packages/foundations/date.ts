import type { ISODateString, } from '@workspace/types'

export const isDate = (value: unknown,): value is ISODateString => {
  if (typeof value !== 'string') {
    return false
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  if (datePattern.test(value,) === false) {
    return false
  }

  const timestamp = Date.parse(value,)
  if (isNaN(timestamp,)) return false

  const date = new Date(timestamp,)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1,).padStart(2, '0',)
  const day = String(date.getUTCDate(),).padStart(2, '0',)
  return `${year}-${month}-${day}` === value
}

export const getDate = (): ISODateString => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1,).padStart(2, '0',)
  const day = String(now.getUTCDate(),).padStart(2, '0',)
  return `${year}-${month}-${day}`
}

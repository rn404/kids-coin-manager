import type { ISODateTimeString, } from '@workspace/types'

export const isTimestamp = (value: unknown,): value is ISODateTimeString => {
  if (typeof value !== 'string') {
    return false
  }

  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/
  const dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

  if (dateOnlyPattern.test(value,)) {
    const timestamp = Date.parse(value,)
    if (isNaN(timestamp,)) return false

    const date = new Date(timestamp,)
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1,).padStart(2, '0',)
    const day = String(date.getUTCDate(),).padStart(2, '0',)
    return `${year}-${month}-${day}` === value
  }

  if (dateTimePattern.test(value,)) {
    const timestamp = Date.parse(value,)
    if (isNaN(timestamp,)) return false

    const date = new Date(timestamp,)
    return date.toISOString() === value
  }

  return false
}

export const getTimestamp = (): ISODateTimeString => {
  return new Date().toISOString()
}

import type { ISODateString, ISODateTimeString, } from '@workspace/types'

const isDateOnly = (value: unknown,): value is ISODateString => {
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

const getDateOnly = (): ISODateString => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1,).padStart(2, '0',)
  const day = String(now.getUTCDate(),).padStart(2, '0',)
  return `${year}-${month}-${day}`
}

const isTimestamp = (value: unknown,): value is ISODateTimeString => {
  if (typeof value !== 'string') {
    return false
  }

  if (isDateOnly(value,)) {
    return true
  }

  const dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
  if (dateTimePattern.test(value,)) {
    const timestamp = Date.parse(value,)
    if (isNaN(timestamp,)) return false

    const date = new Date(timestamp,)
    return date.toISOString() === value
  }

  return false
}

const getTimestamp = (): ISODateTimeString => {
  return new Date().toISOString()
}

export { getDateOnly, getTimestamp, isDateOnly, isTimestamp, }

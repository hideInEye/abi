const EMPTY_DISPLAY = '-'

const TRUE_VALUES = new Set(['1', 'active', 'enable', 'enabled', 'true', 'valid', 'y', 'yes'])
const FALSE_VALUES = new Set(['0', 'disable', 'disabled', 'false', 'invalid', 'n', 'no'])

function padNumber(value: number): string {
  return String(value).padStart(2, '0')
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())} ${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`
}

export function formatDisplayValue(value: unknown): string {
  return value === null || value === undefined || String(value).trim() === '' ? EMPTY_DISPLAY : String(value)
}

export function formatBoolean(value: unknown, trueLabel = '是', falseLabel = '否'): string {
  if (value === null || value === undefined || String(value).trim() === '') {
    return EMPTY_DISPLAY
  }

  const normalizedValue = String(value).trim().toLowerCase()
  if (TRUE_VALUES.has(normalizedValue)) {
    return trueLabel
  }
  if (FALSE_VALUES.has(normalizedValue)) {
    return falseLabel
  }
  return EMPTY_DISPLAY
}

export function formatDateTime(value: unknown): string {
  if (value === null || value === undefined || String(value).trim() === '') {
    return EMPTY_DISPLAY
  }

  const source = String(value).trim()
  const matched = source.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/)
  if (matched) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = matched
    return `${year}-${padNumber(Number(month))}-${padNumber(Number(day))} ${padNumber(Number(hour))}:${padNumber(Number(minute))}:${padNumber(Number(second))}`
  }

  const numericValue = Number(source)
  const timestamp = Number.isFinite(numericValue) && /^\d{10,13}$/.test(source) ? numericValue * (source.length === 10 ? 1000 : 1) : Number.NaN
  const date = Number.isNaN(timestamp) ? new Date(source) : new Date(timestamp)
  return Number.isNaN(date.getTime()) ? EMPTY_DISPLAY : formatDate(date)
}

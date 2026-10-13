export interface ExpressionFieldOption {
  category: string
  id: string
  label: string
  name: string
}

export interface ExpressionCompletionToken {
  end: number
  query: string
  start: number
}

export function getExpressionCompletionToken(value: string, start: number, end = start): ExpressionCompletionToken | null {
  if (start !== end) return null
  const prefix = value.slice(0, start)
  // Do not suggest source fields while entering a quoted SQL string.
  let quote = ''
  for (let index = 0; index < prefix.length; index += 1) {
    const character = prefix[index]
    if (quote && character === quote && prefix[index + 1] === quote) index += 1
    else if (character === quote) quote = ''
    else if (!quote && (character === "'" || character === '"')) quote = character
  }
  if (quote) return null
  const match = prefix.match(/[A-Za-z_\u4e00-\u9fff][A-Za-z0-9_\u4e00-\u9fff]*$/)
  if (!match) return null
  const suffix = value.slice(start).match(/^[A-Za-z0-9_\u4e00-\u9fff]*/)?.[0] || ''
  return { end: start + suffix.length, query: match[0], start: start - match[0].length }
}

export function filterExpressionFields(fields: readonly ExpressionFieldOption[], query: string): ExpressionFieldOption[] {
  const keyword = query.toLowerCase()
  if (!keyword) return []
  return fields.filter((field) => field.name.toLowerCase() !== keyword && (field.name.toLowerCase().includes(keyword) || field.label.toLowerCase().includes(keyword)))
}

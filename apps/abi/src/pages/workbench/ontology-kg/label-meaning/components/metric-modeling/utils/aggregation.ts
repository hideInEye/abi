import type { AggregationCode } from '../types/metricModeling.types'

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function normalizeAggregationCode(value: unknown): AggregationCode | undefined {
  const code = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
  if (!code) return undefined
  return /^[A-Z][A-Z0-9]*(?:[ _-][A-Z0-9]+)*$/u.test(code) ? code : undefined
}

export function normalizeAggregationCodes(value: unknown, fallback: AggregationCode[] = []): AggregationCode[] {
  const parsed = parseJson(value)
  let values: unknown[] = []
  if (Array.isArray(parsed)) {
    values = parsed
  } else if (parsed && typeof parsed === 'object') {
    values = Array.isArray((parsed as { data?: unknown }).data)
      ? ((parsed as { data: unknown[] }).data)
      : [(parsed as { data?: unknown }).data]
  } else if (typeof parsed === 'string') {
    values = parsed.split(/[,，]/)
  }

  const normalized = Array.from(
    new Set(
      values
        .map(item => String(item ?? '').trim())
        .filter((item): item is AggregationCode => Boolean(item))
    )
  )
  return normalized.length ? normalized : [...fallback]
}

export function toLegacyProjectionFunc(value: unknown): string {
  const code = normalizeAggregationCode(value)
  if (!code) return ''
  if (code === 'COUNT DISTINCT') return 'distinct'
  return code.toLowerCase()
}

export function toDerivedAggregationPayloadValue(value: unknown): string | undefined {
  const code = normalizeAggregationCode(value)
  if (code) return toLegacyProjectionFunc(code)
  const expression = String(value ?? '').trim()
  return expression || undefined
}

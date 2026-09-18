import type { AggregationCode } from '../types/metricModeling.types'

const AGGREGATION_CODES = new Set<AggregationCode>([
  'SUM',
  'COUNT',
  'COUNT DISTINCT',
  'AVG',
  'MAX',
  'MIN',
  'STDDEV',
  'VARIANCE',
  'MEDIAN'
])

const AGGREGATION_ALIASES: Record<string, AggregationCode> = {
  AGG: 'SUM',
  AVERAGE: 'AVG',
  DISTINCT: 'COUNT DISTINCT',
  COUNT_DISTINCT: 'COUNT DISTINCT',
  'COUNT-DISTINCT': 'COUNT DISTINCT',
  合计: 'SUM',
  去重: 'COUNT DISTINCT',
  去重计数: 'COUNT DISTINCT',
  平均值: 'AVG',
  方差: 'VARIANCE',
  最大值: 'MAX',
  最小值: 'MIN',
  标准差: 'STDDEV',
  求和: 'SUM',
  计数: 'COUNT',
  中位数: 'MEDIAN'
}

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
  if (AGGREGATION_CODES.has(code as AggregationCode)) return code as AggregationCode
  return AGGREGATION_ALIASES[code]
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
    new Set(values.map(normalizeAggregationCode).filter((item): item is AggregationCode => Boolean(item)))
  )
  return normalized.length ? normalized : [...fallback]
}

export function toLegacyProjectionFunc(value: unknown): string {
  const code = normalizeAggregationCode(value) || 'SUM'
  if (code === 'COUNT DISTINCT') return 'distinct'
  return code.toLowerCase()
}

export function toDerivedAggregationPayloadValue(value: unknown): string | undefined {
  const code = normalizeAggregationCode(value)
  if (code) return toLegacyProjectionFunc(code)
  const expression = String(value ?? '').trim()
  return expression || undefined
}

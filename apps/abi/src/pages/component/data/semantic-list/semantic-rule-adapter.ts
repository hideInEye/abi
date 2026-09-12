import type {
  SemanticAdvancedSetting,
  SemanticDictionaryOption,
  SemanticListType,
  SemanticMatchMethod,
  SemanticRule,
  SemanticRuleApiRecord,
  SemanticRuleId,
  SemanticRulePage,
  SemanticVisibility
} from './types'

type UnknownRecord = Record<string, unknown>

const WRAPPER_KEYS = ['data', 'page', 'response', 'result'] as const
const ROW_KEYS = ['records', 'rows', 'list'] as const

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(record: UnknownRecord, key: string): boolean {
  return Object.hasOwn(record, key)
}

function toText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function normalizeRuleId(value: unknown): SemanticRuleId | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) return value
  return null
}

function normalizeListType(value: unknown): SemanticListType {
  return value === 'BLACKLIST' ? 'BLACKLIST' : 'WHITELIST'
}

function normalizeMatchMethod(value: unknown): SemanticMatchMethod {
  return value === 'AST' || value === 'EXACT' || value === 'LIKE' || value === 'REGEX' ? value : 'REGEX'
}

function normalizeVisibility(value: unknown): SemanticVisibility {
  return value === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC'
}

function findRows(value: unknown, depth = 0): unknown[] | null {
  if (depth > 5) return null
  if (Array.isArray(value)) return value
  if (!isRecord(value)) return null

  for (const key of ROW_KEYS) {
    if (Array.isArray(value[key])) return value[key] as unknown[]
  }

  for (const key of WRAPPER_KEYS) {
    const nested = findRows(value[key], depth + 1)
    if (nested) return nested
  }

  return null
}

function findTotal(value: unknown, depth = 0): number | null {
  if (depth > 5 || !isRecord(value)) return null

  for (const key of ['total', 'totalCount', 'count']) {
    if (hasOwn(value, key)) {
      const total = toFiniteNumber(value[key], Number.NaN)
      if (Number.isFinite(total) && total >= 0) return total
    }
  }

  for (const key of WRAPPER_KEYS) {
    const nested = findTotal(value[key], depth + 1)
    if (nested !== null) return nested
  }

  return null
}

function findRuleRecord(value: unknown, depth = 0): SemanticRuleApiRecord | null {
  if (depth > 5 || !isRecord(value)) return null
  if (hasOwn(value, 'ruleId')) return value as SemanticRuleApiRecord

  for (const key of ['data', 'record', 'response', 'result']) {
    const nested = findRuleRecord(value[key], depth + 1)
    if (nested) return nested
  }

  return null
}

function stringifySettingValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function parseAdvancedSettings(value: unknown): SemanticAdvancedSetting[] {
  let parsed = value
  if (typeof value === 'string') {
    if (!value.trim()) return []
    try {
      parsed = JSON.parse(value) as unknown
    } catch {
      return []
    }
  }

  if (!isRecord(parsed)) return []
  return Object.entries(parsed).map(([key, itemValue]) => ({ key, value: stringifySettingValue(itemValue) }))
}

function normalizeHitExamples(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(item => toText(item)).filter(Boolean)
}

export function mapSemanticRuleRecord(record: SemanticRuleApiRecord): SemanticRule | null {
  const id = normalizeRuleId(record.ruleId)
  if (id === null) return null

  return {
    advancedSettings: parseAdvancedSettings(record.extConditions),
    category: toText(record.bizType),
    code: toText(record.ruleCode),
    enabled: toText(record.status, '1') === '1',
    hitExamples: normalizeHitExamples(record.hitExamples),
    id,
    method: normalizeMatchMethod(record.matchMethod),
    name: toText(record.ruleName),
    pattern: toText(record.matchPattern),
    priority: toFiniteNumber(record.priority, 0),
    remark: toText(record.remark),
    target: toText(record.matchTarget),
    type: normalizeListType(record.listType),
    updatedAt: toText(record.updateTime) || toText(record.createTime),
    visibility: normalizeVisibility(record.visibility)
  }
}

export function adaptSemanticRulePage(result: unknown): SemanticRulePage {
  const rows = findRows(result) ?? []
  const records = rows
    .filter(isRecord)
    .map(row => mapSemanticRuleRecord(row as SemanticRuleApiRecord))
    .filter((rule): rule is SemanticRule => rule !== null)
  return { records, total: findTotal(result) ?? records.length }
}

export function adaptSemanticRuleDetail(result: unknown): SemanticRule | null {
  const record = findRuleRecord(result)
  return record ? mapSemanticRuleRecord(record) : null
}

export function adaptSemanticDictionaryOptions(result: unknown): SemanticDictionaryOption[] {
  const rows = findRows(result) ?? []
  const normalized = rows
    .filter(isRecord)
    .map((row, index) => ({
      index,
      label: toText(row.dictLabel) || toText(row.label) || toText(row.dictValue) || toText(row.value),
      sort: toFiniteNumber(row.dictSort ?? row.sort, Number.MAX_SAFE_INTEGER),
      value: toText(row.dictValue) || toText(row.value)
    }))
    .filter(item => item.value)
    .sort((left, right) => left.sort - right.sort || left.index - right.index)

  const seen = new Set<string>()
  return normalized.flatMap(item => {
    if (seen.has(item.value)) return []
    seen.add(item.value)
    return [{ label: item.label || item.value, value: item.value }]
  })
}

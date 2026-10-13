import { queryDictDataList } from '@/service/api/dictionary'
import { assertFlatRequestSuccess } from '@/service/request/flat-result'

type UnknownRecord = Record<string, unknown>

export type OntologyFunctionDictionaryKind = 'atomic' | 'composite'

export interface OntologyFunctionOption {
  dictType: string
  id: string
  label: string
  value: string
}

export interface OntologyAggregationMethodOption {
  label: string
  shortLabel: string
  value: string
}

export const ONTOLOGY_FUNCTION_DICTIONARY_TYPES: Record<OntologyFunctionDictionaryKind, readonly string[]> = {
  atomic: ['ontology_fun', 'ontology_atomic'],
  composite: ['ontology_fun', 'ontology_derivative']
}

export const ONTOLOGY_ATOMIC_AGGREGATION_DICTIONARY_TYPES = ['ontology_atomic'] as const
export const ONTOLOGY_OPERATOR_DICTIONARY_TYPES = ['ontology_operator'] as const

const ROW_KEYS = ['records', 'rows', 'list'] as const
const WRAPPER_KEYS = ['data', 'page', 'response', 'result'] as const

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string {
  return String(value ?? '').trim()
}

function findRows(value: unknown, depth = 0): unknown[] {
  if (depth > 5) return []
  if (Array.isArray(value)) return value
  if (!isRecord(value)) return []

  for (const key of ROW_KEYS) {
    if (Array.isArray(value[key])) return value[key]
  }
  for (const key of WRAPPER_KEYS) {
    const rows = findRows(value[key], depth + 1)
    if (rows.length) return rows
  }
  return []
}

export function adaptOntologyFunctionOptions(
  results: readonly unknown[],
  dictTypes: readonly string[]
): OntologyFunctionOption[] {
  const options = results.flatMap((result, groupIndex) =>
    findRows(result)
      .filter(isRecord)
      .filter(item => text(item.status) !== '1')
      .map((item, index) => {
        const dictType = text(item.dictType) || dictTypes[groupIndex] || ''
        const sort = item.dictSort === '' || item.dictSort === null || item.dictSort === undefined
          ? Number.MAX_SAFE_INTEGER
          : Number(item.dictSort)
        return {
          dictType,
          id: text(item.dictCode) || `${dictTypes[groupIndex] || 'dictionary'}-${index}`,
          index,
          label: text(item.dictLabel) || text(item.dictValue),
          sort: Number.isFinite(sort) ? sort : Number.MAX_SAFE_INTEGER,
          value: dictType === 'ontology_operator' ? String(item.dictValue ?? '') : text(item.dictValue)
        }
      })
      .filter(item => item.label && item.value.trim())
      .sort((left, right) => left.sort - right.sort || left.index - right.index)
  )

  const seen = new Set<string>()
  return options.flatMap(item => {
    const key = item.value.toLowerCase()
    if (seen.has(key)) return []
    seen.add(key)
    return [
      {
        dictType: item.dictType,
        id: `${item.dictType}:${item.id}`,
        label: item.label,
        value: item.value
      }
    ]
  })
}

export async function loadOntologyFunctionOptions(dictTypes: readonly string[]): Promise<OntologyFunctionOption[]> {
  const results = await Promise.all(
    dictTypes.map(async dictType => {
      const result = await queryDictDataList({ dictType, pageNum: 1, pageSize: 1000 })
      assertFlatRequestSuccess(result)
      return result
    })
  )
  return adaptOntologyFunctionOptions(results, dictTypes)
}

export function adaptOntologyAggregationMethodOptions(
  options: readonly OntologyFunctionOption[]
): OntologyAggregationMethodOption[] {
  const seen = new Set<string>()
  return options.flatMap(option => {
    const value = option.value
    if (!value || seen.has(value)) return []
    seen.add(value)
    return [{ label: `${option.label}（${value}）`, shortLabel: option.label, value }]
  })
}

function replaceFieldPlaceholder(template: string, fieldName: string): string {
  return template
    .replace(/\{\{\s*(?:field|字段)\s*\}\}/giu, fieldName)
    .replace(/\$\{\s*(?:field|字段)\s*\}/giu, fieldName)
    .replace(/\{\s*(?:field|字段)\s*\}/giu, fieldName)
    .replace(/##\s*(?:field|字段)\s*##/giu, fieldName)
    .replace(/%s/iu, fieldName)
    .replace(/\bX\b/giu, fieldName)
}

export function buildOntologyFunctionSnippet(option: OntologyFunctionOption, fieldName: string): string {
  const template = option.value.trim()
  return replaceFieldPlaceholder(template, fieldName)
}

import type { KnowledgeTechField } from '../types/metricModeling.types'

import { getKnowledgeTechFieldId } from './atomicMetricSource'

export type CustomAtomicFunctionKey =
  | 'abs'
  | 'avg'
  | 'ceil'
  | 'count'
  | 'countDistinct'
  | 'distinct'
  | 'floor'
  | 'max'
  | 'median'
  | 'min'
  | 'round'
  | 'roundPrecision'
  | 'stddev'
  | 'substring'
  | 'sum'
  | 'variance'

export const CUSTOM_ATOMIC_FUNCTION_OPTIONS: Array<{ label: string; value: CustomAtomicFunctionKey }> = [
  { label: '求和', value: 'sum' },
  { label: '计数', value: 'count' },
  { label: '去重计数', value: 'countDistinct' },
  { label: '平均值', value: 'avg' },
  { label: '最大值', value: 'max' },
  { label: '最小值', value: 'min' },
  { label: '标准差', value: 'stddev' },
  { label: '方差', value: 'variance' },
  { label: '中位数', value: 'median' },
  { label: '去重', value: 'distinct' },
  { label: '绝对值', value: 'abs' },
  { label: '向上取整', value: 'ceil' },
  { label: '向下取整', value: 'floor' },
  { label: '四舍五入', value: 'round' },
  { label: '保留小数', value: 'roundPrecision' },
  { label: '字符串截取', value: 'substring' }
]

const SEMANTIC_TYPE_LABELS: Record<string, string> = {
  categorical: '维度',
  datetime: '日期',
  measure: '度量',
  primary_key: '主键'
}

export function getCustomAtomicSemanticTypeLabel(value: unknown): string {
  const semanticType = String(value || '').trim()
  return SEMANTIC_TYPE_LABELS[semanticType] || semanticType || '-'
}

export function getCustomAtomicFieldTechnicalName(field?: KnowledgeTechField): string {
  return String(field?.originName || field?.fieldName || field?.tfieldName || field?.techName || '').trim()
}

export function getCustomAtomicFieldOptionLabel(field: KnowledgeTechField): string {
  const bizName = String(field.bizName || field.tfieldAlias || field.fieldShortName || field.fieldName || '-').trim()
  const techName = getCustomAtomicFieldTechnicalName(field) || getKnowledgeTechFieldId(field) || '-'
  const fieldType = String(field.dataType || field.fieldType || '-').trim() || '-'
  return `${bizName} · ${techName} · ${fieldType} · ${getCustomAtomicSemanticTypeLabel(field.semanticType)}`
}

export function buildCustomAtomicFunctionSnippet(key: CustomAtomicFunctionKey, fieldName: string): string {
  const templates: Record<CustomAtomicFunctionKey, string> = {
    abs: `ABS(${fieldName})`,
    avg: `AVG(${fieldName})`,
    ceil: `CEIL(${fieldName})`,
    count: `COUNT(${fieldName})`,
    countDistinct: `COUNT(DISTINCT ${fieldName})`,
    distinct: `DISTINCT ${fieldName}`,
    floor: `FLOOR(${fieldName})`,
    max: `MAX(${fieldName})`,
    median: `MEDIAN(${fieldName})`,
    min: `MIN(${fieldName})`,
    round: `ROUND(${fieldName})`,
    roundPrecision: `ROUND(${fieldName}, 2)`,
    stddev: `STDDEV(${fieldName})`,
    substring: `SUBSTRING(${fieldName}, 1, 1)`,
    sum: `SUM(${fieldName})`,
    variance: `VARIANCE(${fieldName})`
  }
  return templates[key]
}

export function insertCustomAtomicFunction(
  expression: string,
  snippet: string,
  selection: { end: number; start: number }
): { cursor: number; expression: string } {
  const start = Math.max(0, Math.min(selection.start, expression.length))
  const end = Math.max(start, Math.min(selection.end, expression.length))
  const nextExpression = `${expression.slice(0, start)}${snippet}${expression.slice(end)}`
  return {
    cursor: start + snippet.length,
    expression: nextExpression
  }
}

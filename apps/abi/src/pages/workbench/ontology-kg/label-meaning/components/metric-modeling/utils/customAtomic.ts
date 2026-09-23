import type { KnowledgeTechField } from '../types/metricModeling.types'

import { getKnowledgeTechFieldId } from './atomicMetricSource'

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function getCustomExpressionSourceFields(
  expression: unknown,
  fields: readonly KnowledgeTechField[]
): KnowledgeTechField[] {
  const text = String(expression || '')
  if (!text) return []
  return fields.filter(field => {
    const fieldName = getCustomAtomicFieldTechnicalName(field)
    if (!fieldName) return false
    return new RegExp(`(^|[^A-Za-z0-9_])${escapeRegExp(fieldName)}(?=$|[^A-Za-z0-9_])`).test(text)
  })
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

import { getMappedBizNameParts, getMappedTechNameParts } from '../../../utils/ontologyName'
import type { KnowledgeIndicatorItem, KnowledgeTechField } from '../types/metricModeling.types'

type UnknownRecord = Record<string, unknown>

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}
}

export interface AtomicTechnicalSource {
  fieldName: string
  tableName: string
}

export function getAtomicTechnicalSource(value: unknown): AtomicTechnicalSource {
  const parts = getMappedTechNameParts(value)
  if (!parts.rawName) return { fieldName: '', tableName: '' }
  if (parts.isMapped && parts.displayName && parts.tableName) {
    return { fieldName: parts.displayName, tableName: parts.tableName }
  }
  return { fieldName: parts.rawName, tableName: parts.rawName }
}

export function getApiResponseData(response: unknown): UnknownRecord {
  const source = asRecord(response)
  const responseData = asRecord(asRecord(source.response).data)
  const nestedData = asRecord(responseData.data)
  const directData = asRecord(source.data)
  const directNestedData = asRecord(directData.data)
  return (
    [directNestedData, nestedData, directData, responseData, source].find(item => Object.keys(item).length > 0) || {}
  )
}

export function parseAtomicSourceFields(value: unknown): KnowledgeTechField[] {
  const parsed = parseJson(value)
  let sources: unknown[] = []
  if (Array.isArray(parsed)) {
    sources = parsed
  } else if (parsed) {
    sources = [parsed]
  }
  const fields = new Map<string, KnowledgeTechField>()
  sources.forEach(source => {
    const item = asRecord(source) as KnowledgeTechField
    const key = String(item.techId || item.tfieldId || item.fieldName || item.originName || item.name || '').trim()
    if (!key) return
    fields.set(key, {
      ...item,
      fieldName: item.fieldName || item.originName || item.name || key,
      techId: key
    })
  })
  return Array.from(fields.values())
}

function parseCalcLogic(value: unknown): UnknownRecord {
  const parsed = parseJson(value)
  return asRecord(parsed)
}

export function getAtomicProjection(item?: KnowledgeIndicatorItem): string {
  if (!item) return 'sum'
  const firstField = parseAtomicSourceFields(item.techId)[0]
  return String(
    item.projectionFunc ||
      parseCalcLogic(item.calcLogic).projectionFunc ||
      firstField?.projectionFunc ||
      firstField?.agg ||
      'sum'
  )
}

export function getAtomicSemanticSchemaId(item?: KnowledgeIndicatorItem): number | string | undefined {
  if (!item) return undefined
  const source = item as KnowledgeIndicatorItem & UnknownRecord
  return (source.relSchemaId ?? source.semanticSchemaId ?? source.schemaId) as number | string | undefined
}

export function getAtomicSemanticSchemaName(item?: KnowledgeIndicatorItem): string {
  if (!item) return '-'
  const source = item as KnowledgeIndicatorItem & UnknownRecord
  const explicitName = String(
    source.relSchemaName || source.semanticSchemaName || source.schemaName || source.semanticName || ''
  ).trim()
  if (explicitName) return explicitName

  const sourceField = parseAtomicSourceFields(source.techId)[0] as (KnowledgeTechField & UnknownRecord) | undefined
  const sourceFieldSchemaName = String(
    sourceField?.semanticSchemaName ||
      sourceField?.relSchemaName ||
      sourceField?.rtableName ||
      sourceField?.tableBizName ||
      ''
  ).trim()
  if (sourceFieldSchemaName) return sourceFieldSchemaName

  const mappedBizName = getMappedBizNameParts(source.rawBizName || source.bizName)
  return mappedBizName.isMapped ? mappedBizName.tableName || '-' : '-'
}

export function parseSemanticModelFields(detailValue: unknown): KnowledgeTechField[] {
  const detail = asRecord(detailValue)
  const modelDetail = parseJson(detail.modelDetail ?? detail.model_detail)
  const model = asRecord(modelDetail)
  const schemaTableName = String(
    detail.tableName || detail.rtableName || detail.schemaName || detail.name || '未分组字段'
  )
  const fields: KnowledgeTechField[] = []

  ;(['dimensions', 'measures'] as const).forEach(category => {
    const values = model[category]
    if (!Array.isArray(values)) return
    values.forEach(value => {
      const source = asRecord(value) as KnowledgeTechField
      const key = String(
        source.techId || source.tfieldId || source.fieldName || source.originName || source.name || ''
      ).trim()
      if (!key) return
      const isDate =
        category === 'dimensions' &&
        String(source.fieldType || (source as UnknownRecord).type || '').toLowerCase() === 'datetime'
      fields.push({
        ...source,
        fieldName: source.fieldName || source.originName || source.tfieldName || source.name || key,
        tableName: source.tableName || schemaTableName,
        techId: key,
        tfieldType: isDate ? 'dates' : category
      })
    })
  })

  return fields
}

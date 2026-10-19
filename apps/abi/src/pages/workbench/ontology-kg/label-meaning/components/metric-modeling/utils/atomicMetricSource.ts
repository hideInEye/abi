import {
  buildMappedBizName,
  buildMappedTechName,
  getMappedBizNameParts,
  getMappedTechNameParts
} from '../../../utils/ontologyName'
import type {
  AggregationCode,
  KnowledgeAggregation,
  KnowledgeFormValues,
  KnowledgeIndicatorItem,
  KnowledgeTechField
} from '../types/metricModeling.types'

import { normalizeAggregationCodes, toLegacyProjectionFunc } from './aggregation'

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

export function getKnowledgeTechFieldId(value?: KnowledgeTechField): string {
  return String(value?.techId || value?.tfieldId || value?.fieldName || value?.originName || value?.name || '').trim()
}

export function buildCustomAtomicSourceField(value?: KnowledgeTechField): KnowledgeTechField | null {
  const techId = getKnowledgeTechFieldId(value)
  if (!value || !techId) return null
  const rawFieldBizName = value.bizName || value.tfieldAlias || value.fieldShortName || value.fieldName || techId
  const rawFieldTechName = value.originName || value.fieldName || value.tfieldName || value.techName || techId
  const bizNameParts = getMappedBizNameParts(rawFieldBizName)
  const techNameParts = getMappedTechNameParts(rawFieldTechName)
  return {
    ...value,
    bizName: buildMappedBizName(
      value.tableBizName || value.rtableName || bizNameParts.tableName,
      bizNameParts.displayName
    ),
    fieldName: value.fieldName || value.originName || value.tfieldName || techId,
    techId,
    techName: buildMappedTechName(value.tableName || techNameParts.tableName, techNameParts.displayName)
  }
}

export function buildSimpleAtomicSourceField(
  value: KnowledgeTechField | undefined,
  aggregationMethods: unknown
): KnowledgeTechField | null {
  const sourceField = buildCustomAtomicSourceField(value)
  if (!sourceField) return null
  const methods = normalizeAggregationCodes(aggregationMethods)
  return {
    ...sourceField,
    agg: {
      data: methods,
      type: 'simple'
    },
    projectionFunc: toLegacyProjectionFunc(methods[0])
  }
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
    const key = getKnowledgeTechFieldId(item)
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

function parseAtomicAggregation(value: unknown): KnowledgeAggregation | undefined {
  const source = asRecord(parseJson(value))
  if (source.type === 'complex') {
    const expression = String(source.data ?? '').trim()
    return expression ? { data: expression, type: 'complex' } : undefined
  }
  if (source.type === 'simple') {
    return { data: normalizeAggregationCodes(source.data), type: 'simple' }
  }
  return undefined
}

export function getAtomicAggregationDefinition(item?: KnowledgeIndicatorItem): KnowledgeAggregation | undefined {
  if (!item) return undefined
  const calcLogic = parseCalcLogic(item.calcLogic)
  const firstField = parseAtomicSourceFields(item.techId)[0]
  return [item.agg, firstField?.agg, calcLogic.agg]
    .map(parseAtomicAggregation)
    .find((value): value is NonNullable<typeof value> => Boolean(value))
}

export function getAtomicAggregationType(item?: KnowledgeIndicatorItem): 'complex' | 'simple' | undefined {
  return getAtomicAggregationDefinition(item)?.type
}

export function getAtomicComplexAggregationExpression(item?: KnowledgeIndicatorItem): string {
  const definition = getAtomicAggregationDefinition(item)
  return definition?.type === 'complex' ? definition.data : ''
}

export function getAtomicProjection(item?: KnowledgeIndicatorItem): string {
  const complexExpression = getAtomicComplexAggregationExpression(item)
  if (complexExpression) return complexExpression
  return toLegacyProjectionFunc(getAtomicAggregationMethods(item)[0])
}

export function getAtomicAggregationMethods(item?: KnowledgeIndicatorItem): AggregationCode[] {
  if (!item) return []
  const definition = getAtomicAggregationDefinition(item)
  if (definition?.type === 'complex') return []
  if (definition?.type === 'simple') return definition.data
  const calcLogic = parseCalcLogic(item.calcLogic)
  const firstField = parseAtomicSourceFields(item.techId)[0]
  return normalizeAggregationCodes(
    item.projectionFunc || calcLogic.aggMethod || calcLogic.projectionFunc || firstField?.projectionFunc
  )
}

export function hasAtomicAggregationMetadata(item?: KnowledgeIndicatorItem): boolean {
  return Boolean(getAtomicAggregationDefinition(item))
}

export function getAtomicSourceFieldTechnicalName(item?: KnowledgeIndicatorItem): string {
  if (!item) return ''
  const calcLogic = parseCalcLogic(item.calcLogic)
  const sourceField = parseAtomicSourceFields(item.techId)[0]
  return String(
    sourceField?.techName ||
      calcLogic.techName ||
      sourceField?.originName ||
      sourceField?.fieldName ||
      sourceField?.tfieldName ||
      item.rawTechName ||
      item.techName ||
      ''
  ).trim()
}

export function resolveDerivedAggregationMethod(
  item?: KnowledgeIndicatorItem,
  currentValue?: unknown,
  preserveCurrent = false
): string {
  const complexExpression = getAtomicComplexAggregationExpression(item)
  if (complexExpression) {
    const currentExpression = String(currentValue ?? '').trim()
    return preserveCurrent && currentExpression === complexExpression ? currentExpression : complexExpression
  }
  const aggregationMethods = getAtomicAggregationMethods(item)
  const currentMethod = String(currentValue ?? '').trim()
  if (preserveCurrent && currentMethod && aggregationMethods.includes(currentMethod)) {
    return currentMethod
  }
  return aggregationMethods[0]
}

export function getAtomicSemanticSchemaId(item?: KnowledgeIndicatorItem): number | string | undefined {
  if (!item) return undefined
  const source = item as KnowledgeIndicatorItem & UnknownRecord
  return (source.relSchemaId ?? source.semanticSchemaId ?? source.schemaId) as number | string | undefined
}

export function getSelectedMetricSemanticSchemaId(
  values: KnowledgeFormValues,
  options: ReadonlyArray<{ item: KnowledgeIndicatorItem; value: string }>
): number | string | undefined {
  const templateMetricFields: Partial<Record<string, keyof KnowledgeFormValues>> = {
    comparison: 'compareMetricId',
    cumulative: 'cumulativeMetricId',
    percentile: 'techId',
    // 占比类的分子、分母来自同一数据语义，使用分子读取共同的语义 ID。
    ratio: 'ratioNumeratorId',
    volatility: 'volatilityMetricId'
  }
  const metricField =
    values.indicatorClass === 'derived'
      ? 'techId'
      : values.indicatorClass === 'composite'
        ? templateMetricFields[values.templateType || '']
        : undefined
  if (!metricField) return values.semanticSchemaId ?? values.relSchemaId

  // 必须在 techId 转为来源字段数组前按当前模板取值，避免读取其他模板残留的语义 ID。
  const selectedId = values[metricField]
  if (typeof selectedId !== 'string' && typeof selectedId !== 'number') return undefined
  const selectedMetric = options.find(option => option.value === String(selectedId))
  return getAtomicSemanticSchemaId(selectedMetric?.item)
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

function getSemanticType(source: KnowledgeTechField, category: string, isDate: boolean) {
  if (source.semanticType) return source.semanticType
  if (category === 'measures') return 'measure'
  if (category === 'identifiers') return 'primary_key'
  return isDate ? 'datetime' : 'categorical'
}

// eslint-disable-next-line complexity
export function parseSemanticModelFields(detailValue: unknown): KnowledgeTechField[] {
  const detail = asRecord(detailValue)
  const modelDetail = parseJson(detail.modelDetail ?? detail.model_detail)
  const model = asRecord(modelDetail)
  const schemaBizName = String(detail.rtableName || detail.bizName || detail.schemaName || detail.name || '')
  const schemaTechName = String(
    detail.tableName || detail.techName || detail.originName || detail.schemaName || detail.name || '未分组字段'
  )
  const fields: KnowledgeTechField[] = []

  ;(['dimensions', 'identifiers', 'measures'] as const).forEach(category => {
    const values = model[category]
    if (!Array.isArray(values)) return
    // eslint-disable-next-line complexity
    values.forEach(value => {
      const source = asRecord(value) as KnowledgeTechField
      const key = String(
        source.techId || source.tfieldId || source.fieldName || source.originName || source.name || ''
      ).trim()
      if (!key) return
      const isDate =
        category === 'dimensions' &&
        String(source.fieldType || (source as UnknownRecord).type || '').toLowerCase() === 'datetime'
      const semanticType = getSemanticType(source, category, isDate)
      fields.push({
        ...source,
        bizName: source.bizName || source.tfieldAlias || source.fieldShortName || source.fieldName || key,
        dataType: source.dataType || source.fieldType || String((source as UnknownRecord).type || ''),
        fieldName: source.fieldName || source.originName || source.tfieldName || source.name || key,
        semanticType,
        tableBizName: source.tableBizName || source.rtableName || schemaBizName,
        tableName: source.tableName || schemaTechName,
        techId: key,
        tfieldType: isDate ? 'dates' : category
      })
    })
  })

  return fields
}

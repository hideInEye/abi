import type { RuleFieldOption, RuleLayer, RuleOperator } from '../../rule-expression'
import { compileRulePredicate, normalizeRuleLayers, validateRuleLayers } from '../../rule-expression'
import type { KnowledgeIndicatorItem, KnowledgeTechField, StatisticalCaliber } from '../types/metricModeling.types'

import {
  getAtomicComplexAggregationExpression,
  getAtomicProjection,
  getAtomicTechnicalSource,
  parseAtomicSourceFields
} from './atomicMetricSource'
import { getStatisticalDateRangeSummary, normalizeStatisticalCaliber } from './precomputeConfig'

interface DimensionSelection {
  key: string
  techName?: string
}

export interface DerivedMetricPreviewDimensionOption {
  key: string
  techName: string
  title: string
}

export interface DerivedMetricPreviewParams {
  allFields: readonly KnowledgeTechField[]
  atomicLabel?: unknown
  atomicMetric?: KnowledgeIndicatorItem
  bizName?: unknown
  dimensionFieldIds?: unknown
  dimensionOptions: readonly DerivedMetricPreviewDimensionOption[]
  indicatorCode?: unknown
  projectionFunc?: unknown
  ruleFields: readonly RuleFieldOption[]
  ruleLayers: unknown
  statisticalCaliber?: StatisticalCaliber
}

export interface DerivedMetricPreviewResult {
  businessPreview: string
  displaySql: string
  predicate: string
  submissionExpression: string
}

const NULL_OPERATORS = new Set<RuleOperator>(['IS NULL', 'IS NOT NULL'])

const OPERATOR_LABELS: Record<RuleOperator, string> = {
  '!=': '不等于',
  '<': '小于',
  '<=': '小于等于',
  '=': '等于',
  '>': '大于',
  '>=': '大于等于',
  'IS NOT NULL': '不为空',
  'IS NULL': '为空',
  LIKE: '包含',
  'NOT LIKE': '不包含'
}

function text(value: unknown): string {
  return String(value ?? '').trim()
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function getFieldIdentities(field?: KnowledgeTechField): string[] {
  if (!field) return []
  return unique(
    [field.techId, field.tfieldId, field.fieldName, field.originName, field.name, field.techName, field.tfieldName].map(
      text
    )
  )
}

function findSemanticField(
  sourceField: KnowledgeTechField,
  semanticFields: readonly KnowledgeTechField[]
): KnowledgeTechField | undefined {
  const sourceIdentities = new Set(getFieldIdentities(sourceField))
  return semanticFields.find(field => getFieldIdentities(field).some(identity => sourceIdentities.has(identity)))
}

function getTechnicalFieldName(field?: KnowledgeTechField, sourceId?: string): string {
  if (!field) return ''
  const fieldName = text(field.fieldName)
  const candidates = [
    fieldName !== sourceId ? fieldName : '',
    field.originName,
    field.tfieldName,
    field.techName,
    field.name
  ]
  return candidates.map(text).find(Boolean) || ''
}

function resolveAtomicSource(
  atomicMetric: KnowledgeIndicatorItem | undefined,
  semanticFields: readonly KnowledgeTechField[]
): { fieldName: string; tableName: string } {
  const technicalSource = getAtomicTechnicalSource(atomicMetric?.techName || atomicMetric?.rawTechName)
  if (technicalSource.fieldName) return technicalSource

  const parsedSourceFields = parseAtomicSourceFields(atomicMetric?.techId)
  const rawTechId: unknown = atomicMetric?.techId
  const rawSourceId = typeof rawTechId === 'string' || typeof rawTechId === 'number' ? text(rawTechId) : ''
  const sourceFields = [...parsedSourceFields]
  if (!sourceFields.length && rawSourceId) {
    sourceFields.push({ techId: rawSourceId })
  }
  for (const sourceField of sourceFields) {
    const sourceId = text(sourceField.techId || sourceField.tfieldId)
    const semanticField = findSemanticField(sourceField, semanticFields)
    const fieldName = getTechnicalFieldName(semanticField, sourceId) || getTechnicalFieldName(sourceField, sourceId)
    if (fieldName) {
      return {
        fieldName,
        tableName: text(
          semanticField?.tableName || semanticField?.rtableName || sourceField.tableName || sourceField.rtableName
        )
      }
    }
  }

  return { fieldName: '', tableName: '' }
}

function parseDimensionSelections(value: unknown): DimensionSelection[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (item && typeof item === 'object') {
          const source = item as Record<string, unknown>
          const key = text(source.dimId ?? source.id)
          return key ? { key, techName: text(source.techName) || undefined } : null
        }
        const key = text(item)
        return key ? { key } : null
      })
      .filter(Boolean) as DimensionSelection[]
  }
  if (typeof value === 'string') {
    try {
      return parseDimensionSelections(JSON.parse(value))
    } catch {
      return value
        .split(',')
        .map(item => text(item))
        .filter(Boolean)
        .map(key => ({ key }))
    }
  }
  return []
}

function conditionDescription(
  condition: RuleLayer['groups'][number]['conditions'][number],
  conditionIndex: number,
  fieldMap: Map<string, RuleFieldOption>
): string {
  const field = fieldMap.get(condition.fieldId)
  const fieldLabel = field?.label || (condition.fieldId ? `【字段已失效：${condition.fieldId}】` : '【请选择字段】')
  const operatorLabel = OPERATOR_LABELS[condition.operator] || '【请选择操作符】'
  const value = text(condition.value)
  const valueLabel = NULL_OPERATORS.has(condition.operator) ? '' : ` ${value || '【请输入值】'}`
  const logicLabel = conditionIndex > 0 ? `${condition.logicWithPrevious === 'OR' ? '或' : '且'} ` : ''
  const conditionKey = String.fromCharCode(65 + conditionIndex)
  return `${logicLabel}${conditionKey}. ${fieldLabel} ${operatorLabel}${valueLabel}`
}

export function buildDerivedConditionDescription(layersValue: unknown, fields: readonly RuleFieldOption[]): string {
  const fieldMap = new Map(fields.map(field => [field.id, field]))
  const layers = normalizeRuleLayers(layersValue, false)
  if (!layers.length) return '【未配置业务限定表达式】'

  return layers
    .map((layer, layerIndex) => {
      const layerName = text(layer.name) || '【未命名分层】'
      const groupLines = layer.groups.length
        ? layer.groups.map((group, groupIndex) => {
            const groupName = text(group.name) || '【未命名条件分组】'
            const conditions = group.conditions.length
              ? group.conditions
                  .map((condition, conditionIndex) => conditionDescription(condition, conditionIndex, fieldMap))
                  .join(' ')
              : '【未配置条件】'
            const logicLabel = groupIndex > 0 ? `${group.logicWithPrevious === 'OR' ? '或' : '且'} ` : ''
            return `  ${logicLabel}${groupName}（${conditions}）`
          })
        : ['  【未配置条件分组】']
      return `${layerIndex > 0 ? '且\n' : ''}${layerName}：\n${groupLines.join('\n')}`
    })
    .join('\n')
}

export function buildDerivedConditionPredicate(layersValue: unknown, fields: readonly RuleFieldOption[]): string {
  return compileRulePredicate(layersValue, fields)
    .split('\n')
    .filter(Boolean)
    .map(item => `(${item})`)
    .join(' AND ')
}

function getTimeRangeSummary(caliber: StatisticalCaliber): string {
  return caliber.timeRangeType === 'specified'
    ? `指定时段 ${caliber.startTime || '--:--'}～${caliber.endTime || '--:--'}`
    : '全天'
}

export function buildDerivedMetricPreview(params: DerivedMetricPreviewParams): DerivedMetricPreviewResult {
  const caliber = normalizeStatisticalCaliber(params.statisticalCaliber)
  const selectedAtomicLabel = text(params.atomicLabel)
  const atomicLabel = selectedAtomicLabel || '请选择原子指标'
  const legacyAtomicLabel = selectedAtomicLabel || '原子指标'
  const predicate = buildDerivedConditionPredicate(params.ruleLayers, params.ruleFields)
  const displayPredicate = validateRuleLayers(params.ruleLayers, params.ruleFields).valid ? predicate : ''
  const conditionText = buildDerivedConditionDescription(params.ruleLayers, params.ruleFields)
  const dimensionMap = new Map(params.dimensionOptions.map(option => [String(option.key), option]))
  const subjectDimensions = (caliber.subjectDimensionIds || []).map(dimensionId => {
    const option = dimensionMap.get(dimensionId)
    return {
      displayName:
        option?.title || caliber.subjectDimensionNameMap?.[dimensionId] || `待加载维度（${dimensionId}）`,
      techName: option?.techName || dimensionId
    }
  })
  const dimensionSelections = parseDimensionSelections(params.dimensionFieldIds)
  const statisticDimensions = dimensionSelections.map(selection => {
    const option = dimensionMap.get(selection.key)
    return {
      displayName: option?.title || selection.techName || `待加载维度（${selection.key}）`,
      techName: option?.techName || selection.techName || selection.key
    }
  })
  const statisticDimensionLabels = unique(statisticDimensions.map(item => item.displayName))
  const groupByFields = unique(
    [...subjectDimensions.map(item => item.techName), ...statisticDimensions.map(item => item.techName)].map(text)
  )
  const source = resolveAtomicSource(params.atomicMetric, params.allFields)
  const sourceField = source.fieldName || 'source_field /* 来源字段待接口返回 */'
  const sourceTable = source.tableName || 'source_table /* 来源表待接口返回 */'
  const customAggregationExpression = getAtomicComplexAggregationExpression(params.atomicMetric)
  const displayAggregation = text(params.projectionFunc) || getAtomicProjection(params.atomicMetric)
  const simpleAggregation = String(params.projectionFunc || 'sum').toUpperCase()
  const selectedAggregationExpression = customAggregationExpression
    ? displayAggregation || customAggregationExpression
    : `${displayAggregation.toUpperCase()}(${sourceField})`
  const submissionAggregationExpression = customAggregationExpression
    ? displayAggregation || customAggregationExpression
    : `${simpleAggregation}(${legacyAtomicLabel})`
  const timeRangeSummary = getTimeRangeSummary(caliber)
  const dateRangeSummary = getStatisticalDateRangeSummary(caliber)
  const sqlLines = [`SELECT ${selectedAggregationExpression} FROM ${sourceTable}`]
  if (displayPredicate) sqlLines.push(`WHERE ${displayPredicate}`)
  if (groupByFields.length) sqlLines.push(`GROUP BY ${groupByFields.join(', ')}`)

  return {
    businessPreview: [
      `指标：${text(params.bizName) || '未命名指标'}`,
      `计算基础：${atomicLabel}`,
      `统计范围：${dateRangeSummary}，${timeRangeSummary}`,
      `主体维度：${unique(subjectDimensions.map(item => item.displayName)).join('、') || '请选择主体维度'}`,
      `统计维度：${statisticDimensionLabels.join('、') || '未设置'}`,
      `配置表达式：\n${conditionText}`
    ].join('\n\n'),
    displaySql: sqlLines.join('\n'),
    predicate,
    submissionExpression: `${submissionAggregationExpression}${predicate ? `\nWHERE ${predicate}` : ''}`
  }
}

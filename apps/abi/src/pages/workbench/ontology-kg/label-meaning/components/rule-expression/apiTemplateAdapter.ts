import type {
  ApiRuleOperator,
  ApiRuleTemplateCondition,
  ApiRuleTemplates,
  RuleLayer,
  RuleOperator,
  RuleTemplateFieldMeta
} from './types'
import { createRuleId, normalizeRuleLayers } from './utils'

type UnknownRecord = Record<string, unknown>

const FORM_OPERATOR_TO_API: Record<
  string,
  Pick<ApiRuleTemplateCondition, 'operator' | 'operatorName'>
> = {
  '!=': { operator: 'NE', operatorName: '不等于' },
  '<': { operator: 'LT', operatorName: '小于' },
  '<=': { operator: 'LE', operatorName: '小于等于' },
  '=': { operator: 'EQ', operatorName: '等于' },
  '>': { operator: 'GT', operatorName: '大于' },
  '>=': { operator: 'GE', operatorName: '大于等于' },
  'IS NOT NULL': { operator: 'NOT_NULL', operatorName: '不为空' },
  'IS NULL': { operator: 'NULL', operatorName: '为空' },
  LIKE: { operator: 'IN', operatorName: '包含' },
  'NOT LIKE': { operator: 'NOT_IN', operatorName: '不包含' }
}

const API_OPERATOR_TO_FORM: Record<ApiRuleOperator | 'IS_NOT_NULL' | 'IS_NULL', RuleOperator> = {
  EQ: '=',
  GE: '>=',
  GT: '>',
  IN: 'LIKE',
  IS_NOT_NULL: 'IS NOT NULL',
  IS_NULL: 'IS NULL',
  LE: '<=',
  LT: '<',
  NE: '!=',
  NOT_IN: 'NOT LIKE',
  NOT_NULL: 'IS NOT NULL',
  NULL: 'IS NULL'
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}
}

function text(value: unknown): string {
  return String(value ?? '').trim()
}

function logic(value: unknown): 'AND' | 'OR' {
  return text(value).toUpperCase() === 'OR' ? 'OR' : 'AND'
}

function normalizeConditionValue(value: unknown): number | string {
  return Array.isArray(value) ? value.map(item => String(item)).join(',') : ((value ?? '') as number | string)
}

export function buildApiRuleTemplates(
  layersValue: unknown,
  fieldMetaMap?: Record<string, RuleTemplateFieldMeta>
): ApiRuleTemplates | undefined {
  const normalizedLayers = normalizeRuleLayers(layersValue, false)
  if (!normalizedLayers.length) return undefined

  return {
    layers: normalizedLayers.map((layer, layerIndex) => ({
      expressions: layer.groups.map(group => ({
        conditions: group.conditions.map(condition => {
          const fieldMeta = fieldMetaMap?.[condition.fieldId]
          const operatorMeta = FORM_OPERATOR_TO_API[condition.operator]
          const payload: ApiRuleTemplateCondition = {
            conditionId: fieldMeta?.value || condition.fieldId,
            field: fieldMeta?.field || condition.fieldId,
            fieldName: fieldMeta?.fieldName || condition.fieldId,
            operator: operatorMeta?.operator || 'EQ',
            operatorName: operatorMeta?.operatorName || condition.operator
          }
          if (condition.operator !== 'IS NULL' && condition.operator !== 'IS NOT NULL') {
            payload.value = normalizeConditionValue(condition.value)
          }
          return payload
        }),
        expressionId: group.id,
        innerLogic: group.conditions[1]?.logicWithPrevious || 'AND',
        name: group.name.trim()
      })),
      groupLogic: layer.groups[1]?.logicWithPrevious || 'AND',
      layerName: layer.name.trim(),
      sortOrder: layerIndex + 1
    }))
  }
}

export function parseApiRuleTemplates(value: unknown): RuleLayer[] | undefined {
  const source = asRecord(value)
  if (!Array.isArray(source.layers)) return undefined

  return source.layers
    .map((layerValue, sourceIndex) => ({ layer: asRecord(layerValue), sourceIndex }))
    .sort(
      (left, right) =>
        Number(left.layer.sortOrder || left.sourceIndex + 1) -
        Number(right.layer.sortOrder || right.sourceIndex + 1)
    )
    .map(({ layer }, layerIndex) => {
      const groupLogic = logic(layer.groupLogic)
      const expressionValues = Array.isArray(layer.expressions) ? layer.expressions : []
      return {
        groups: expressionValues.map((expressionValue, groupIndex) => {
          const expression = asRecord(expressionValue)
          const innerLogic = logic(expression.innerLogic)
          const conditionValues = Array.isArray(expression.conditions) ? expression.conditions : []
          return {
            conditions: conditionValues.map((conditionValue, conditionIndex) => {
              const condition = asRecord(conditionValue)
              const operator = text(condition.operator)
              return {
                fieldId: text(condition.conditionId || condition.field || condition.fieldName),
                id: createRuleId('condition'),
                ...(conditionIndex > 0 ? { logicWithPrevious: innerLogic } : {}),
                operator: API_OPERATOR_TO_FORM[operator as keyof typeof API_OPERATOR_TO_FORM] || '=',
                value: ['NULL', 'NOT_NULL', 'IS_NULL', 'IS_NOT_NULL'].includes(operator)
                  ? ''
                  : normalizeConditionValue(condition.value)
              }
            }),
            id: text(expression.expressionId) || createRuleId('group'),
            ...(groupIndex > 0 ? { logicWithPrevious: groupLogic } : {}),
            name: text(expression.name) || `条件分组 ${groupIndex + 1}`
          }
        }),
        id: createRuleId('layer'),
        name: text(layer.layerName) || (layerIndex === 0 ? '新分层' : `新分层 ${layerIndex + 1}`)
      }
    })
}

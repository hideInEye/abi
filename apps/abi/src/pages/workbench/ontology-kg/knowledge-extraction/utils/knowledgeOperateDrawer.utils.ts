import { DEFAULT_FORM_VALUES } from '../constants'
import type { KnowledgeFormValues, KnowledgeIndicatorItem } from '../types'

export interface TransferItem {
  key: string
  title: string
}

export interface StepItem {
  key: 'business' | 'dimension' | 'technical'
  title: string
}

export function getStepItems(_indicatorType: string): StepItem[] {
  return [
    { key: 'business', title: '业务配置' },
    { key: 'technical', title: '技术属性' },
    { key: 'dimension', title: '维度配置' }
  ]
}

export function parseAliasTags(alias?: string) {
  if (!alias) {
    return []
  }
  return alias
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

export function parseDimensionKeys(dimensionFieldIds?: any) {
  if (!dimensionFieldIds) {
    return []
  }
  if (Array.isArray(dimensionFieldIds)) {
    return dimensionFieldIds.map(item => String(item?.dimId ?? item?.id ?? item).trim()).filter(Boolean)
  }
  if (typeof dimensionFieldIds === 'string') {
    try {
      const parsed = JSON.parse(dimensionFieldIds)
      if (Array.isArray(parsed)) {
        return parseDimensionKeys(parsed)
      }
    } catch {
      // compatible with old comma-separated dim ids
    }
    return dimensionFieldIds
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }
  return []
}

export function extractUniqueIds(expression: string): string[] {
  if (!expression) {
    return []
  }
  const regex = /##(\d+)##/g
  const matches = expression.matchAll(regex)
  const idSet = new Set<string>()
  for (const match of matches) {
    idSet.add(match[1])
  }
  return Array.from(idSet)
}

export function parseTemplateParams(templateParams?: Record<string, any> | string) {
  if (!templateParams) {
    return {}
  }
  if (typeof templateParams === 'string') {
    try {
      return JSON.parse(templateParams)
    } catch {
      return {}
    }
  }
  return templateParams
}

export function isFieldNameLike(text: string) {
  return /^[A-Za-z_][A-Za-z0-9_.]*$/.test(text)
}

export function isBalancedParentheses(expr: string) {
  const stack: string[] = []
  for (const char of expr) {
    if (char === '(') {
      stack.push(char)
    } else if (char === ')') {
      if (!stack.length) {
        return false
      }
      stack.pop()
    }
  }
  return stack.length === 0
}

export function isValidNumberInput(value: string) {
  return /^-?\d+(\.\d+)?$/.test(value)
}

function normalizeTechIdForForm(value: any): string | undefined {
  if (!value) {
    return undefined
  }
  if (typeof value === 'object') {
    const objectId = String(value.techId || value.tfieldId || value.fieldName || value.originName || '').trim()
    return objectId || undefined
  }
  const text = String(value).trim()
  return text || undefined
}

export function validateGeneratedExpressionSyntax(expression?: string) {
  const text = String(expression || '').trim()
  if (!text || text === '请填写计算逻辑') {
    return { message: '请先配置完整表达式', passed: false }
  }
  if (text.length > 2000) {
    return { message: '表达式长度不能超过2000个字符', passed: false }
  }
  if (!isBalancedParentheses(text)) {
    return { message: '表达式括号不匹配', passed: false }
  }
  if (/\b(undefined|null|NaN)\b/i.test(text)) {
    return { message: '表达式包含无效参数', passed: false }
  }
  if (/[+\-*/]{2,}/.test(text.replace(/\*\*/g, ''))) {
    return { message: '表达式存在连续运算符', passed: false }
  }
  if (/^[+*/]/.test(text) || /[+\-*/]\s*$/.test(text)) {
    return { message: '表达式运算符位置不正确', passed: false }
  }
  return { message: '通过（前端校验）', passed: true }
}

export function compactArray<T>(list?: Array<T | null | undefined>): T[] {
  return (list || []).filter(Boolean) as T[]
}

export function ensureDerivedConditions(
  list?: Array<{ logic?: 'AND' | 'OR'; metric?: string; operator?: string; value?: string }>
): Array<{ logic?: 'AND' | 'OR'; metric?: string; operator?: string; value?: string }> {
  if (!list?.length) {
    return [{ logic: 'AND' as const, metric: '', operator: '>=', value: '' }]
  }
  return list.map(item => ({
    logic: item?.logic === 'OR' ? 'OR' : 'AND',
    metric: item?.metric || '',
    operator: item?.operator || '>=',
    value: item?.value || ''
  }))
}

// eslint-disable-next-line complexity
export function buildEditFormValues(editingItem: KnowledgeIndicatorItem): KnowledgeFormValues {
  const templateParams = parseTemplateParams(editingItem.templateParams)
  const calcLogic = parseTemplateParams(editingItem.calcLogic)
  return {
    accumulateStartDate: editingItem.accumulateStartDate || templateParams.accumulateStartDate,
    aggMethod: editingItem.aggMethod || DEFAULT_FORM_VALUES.aggMethod,
    bizName: editingItem.bizName,
    calcPeriod: editingItem.calcPeriod || templateParams.calcPeriod || DEFAULT_FORM_VALUES.calcPeriod,
    compareMetricId: editingItem.compareMetricId || templateParams.compareMetricId || calcLogic.compareMetricId,
    comparePeriod: editingItem.comparePeriod || templateParams.comparePeriod,
    compareType: editingItem.compareType || templateParams.compareType || calcLogic.compareType,
    comparisonOutputType:
      editingItem.comparisonOutputType || templateParams.comparisonOutputType || calcLogic.comparisonOutputType,
    cumulativeMetricId:
      editingItem.cumulativeMetricId || templateParams.cumulativeMetricId || calcLogic.cumulativeMetricId,
    cumulativeMode: editingItem.cumulativeMode || templateParams.cumulativeMode || calcLogic.cumulativeMode,
    cumulativeTimeRange:
      editingItem.cumulativeTimeRange || templateParams.cumulativeTimeRange || calcLogic.cumulativeTimeRange,
    dataFrequency: editingItem.dataFrequency || DEFAULT_FORM_VALUES.dataFrequency,
    dataType: editingItem.dataType || DEFAULT_FORM_VALUES.dataType,
    derivedConditionExpr: editingItem.derivedConditionExpr || templateParams.derivedConditionExpr,
    derivedConditions: ensureDerivedConditions(
      editingItem.derivedConditions || templateParams.derivedConditions || calcLogic.derivedConditions
    ),
    dimensionFieldIds: editingItem.dimensionFieldIds || editingItem.relateDims,
    divideZeroStrategy:
      editingItem.divideZeroStrategy || templateParams.divideZeroStrategy || DEFAULT_FORM_VALUES.divideZeroStrategy,
    expr: editingItem.expr || templateParams.expr || calcLogic.expr,
    indicatorAliasTags: parseAliasTags(editingItem.termAlias),
    indicatorCategory: editingItem.indicatorCategory || DEFAULT_FORM_VALUES.indicatorCategory,
    indicatorCode: editingItem.indicatorCode,
    indicatorType: editingItem.indicatorType || DEFAULT_FORM_VALUES.indicatorType,
    isPublic: editingItem.isPublic === '1' || editingItem.isPublic === true,
    measurementUnit: editingItem.measurementUnit,
    nullStrategy: editingItem.nullStrategy || templateParams.nullStrategy || DEFAULT_FORM_VALUES.nullStrategy,
    owner: editingItem.owner,
    ownerEmail: editingItem.ownerEmail,
    ownerPhone: editingItem.ownerPhone,
    percentileValue: Number(editingItem.percentileValue || templateParams.percentileValue) || undefined,
    qualityLevel: editingItem.qualityLevel || DEFAULT_FORM_VALUES.qualityLevel,
    ratioDenominatorId:
      editingItem.ratioDenominatorId || templateParams.ratioDenominatorId || calcLogic.ratioDenominatorId,
    ratioNumeratorId: editingItem.ratioNumeratorId || templateParams.ratioNumeratorId || calcLogic.ratioNumeratorId,
    ratioPrecision:
      editingItem.ratioPrecision ||
      templateParams.ratioPrecision ||
      calcLogic.ratioPrecision ||
      DEFAULT_FORM_VALUES.ratioPrecision,
    remark: editingItem.remark,
    rollingWindowSize: editingItem.rollingWindowSize || templateParams.rollingWindowSize,
    semanticGroupId: editingItem.semanticGroupId,
    semanticSchemaId: editingItem.semanticSchemaId,
    status: editingItem.status ?? DEFAULT_FORM_VALUES.status,
    techId: normalizeTechIdForForm(editingItem.techId || templateParams.techId || calcLogic.techId),
    techName: editingItem.techName,
    technicalRemark: editingItem.technicalRemark,
    templateType: editingItem.templateType || templateParams.templateType || DEFAULT_FORM_VALUES.templateType,
    thresholdMax: editingItem.thresholdMax || templateParams.thresholdMax,
    thresholdMin: editingItem.thresholdMin || templateParams.thresholdMin,
    variableMappings: editingItem.variableMappings || templateParams.variableMappings || [],
    variableName: templateParams.variableName,
    volatilityDataRange:
      editingItem.volatilityDataRange ||
      templateParams.volatilityDataRange ||
      calcLogic.volatilityDataRange ||
      DEFAULT_FORM_VALUES.volatilityDataRange,
    volatilityMethod:
      editingItem.volatilityMethod ||
      templateParams.volatilityMethod ||
      calcLogic.volatilityMethod ||
      DEFAULT_FORM_VALUES.volatilityMethod,
    volatilityMetricId:
      editingItem.volatilityMetricId || templateParams.volatilityMetricId || calcLogic.volatilityMetricId
  }
}

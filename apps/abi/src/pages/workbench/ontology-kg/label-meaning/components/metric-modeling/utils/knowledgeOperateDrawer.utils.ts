import type { KnowledgeIndicatorItem, KnowledgeTechField } from '../types/metricModeling.types'
import { getMappedBizNameParts, getMappedTechNameDisplay } from '../../../utils/ontologyName'

export interface TransferItem {
  key: string
  title: string
}

export interface StepItem {
  key: 'business' | 'dimension' | 'technical'
  title: string
}

type UnknownRecord = Record<string, unknown>

function trimText(value: unknown) {
  return String(value ?? '').trim()
}

function splitRelaxedMappedBizName(value: unknown) {
  const text = trimText(value)
  const match = /_\s*#\s*_?/.exec(text)
  if (!match || match.index === undefined) {
    return {
      displayName: text,
      fieldName: '',
      isMapped: false,
    }
  }

  return {
    displayName: text.slice(0, match.index).trim(),
    fieldName: text.slice(match.index + match[0].length).trim(),
    isMapped: true,
  }
}

export function getMappedMetricFieldDisplayName(value: unknown) {
  const parts = getMappedBizNameParts(value)
  if (parts.isMapped) {
    return parts.fieldName || parts.displayName || parts.rawName
  }

  const relaxedParts = splitRelaxedMappedBizName(value)
  if (relaxedParts.isMapped) {
    return relaxedParts.fieldName || relaxedParts.displayName
  }

  return parts.displayName
}

export function getMetricIndicatorOptionLabel(item: Partial<KnowledgeIndicatorItem>) {
  return getMappedMetricFieldDisplayName(
    item.rawBizName || item.bizName || item.techName || item.indicatorCode || '-'
  ) || '-'
}

export function getMetricFieldOptionLabel(item: Partial<KnowledgeTechField>) {
  const fallback = trimText(item.fieldName || item.originName || item.name || item.techId || '-')
  return getMappedMetricFieldDisplayName(
    item.bizName || item.tfieldAlias || item.fieldName || item.originName || item.name || item.techId || '-'
  ) || fallback
}

export function formatMappedDimensionOptionTitle(params: {
  bizName?: unknown
  fallback?: unknown
  techName?: unknown
}) {
  const displayName = getMappedMetricFieldDisplayName(params.bizName)
  const techName = getMappedTechNameDisplay(params.techName)
  const fallback = trimText(params.fallback)
  const name = displayName || techName || fallback

  return name && techName ? `${name}（${techName}）` : name || fallback || '-'
}

export function getStepItems(showDimensionStep = true, businessOnly = false): StepItem[] {
  if (businessOnly) {
    return [{ key: 'business', title: '业务配置' }]
  }
  const baseItems: StepItem[] = [
    { key: 'business', title: '业务配置' },
    { key: 'technical', title: '技术属性' }
  ]
  if (!showDimensionStep) {
    return baseItems
  }
  return [...baseItems, { key: 'dimension', title: '维度配置' }]
}

export function shouldShowMetricPrecomputeConfig(indicatorClass?: unknown) {
  return indicatorClass === 'derived' || indicatorClass === 'derivative'
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

export function parseDimensionKeys(dimensionFieldIds?: unknown) {
  if (!dimensionFieldIds) {
    return []
  }
  if (Array.isArray(dimensionFieldIds)) {
    return dimensionFieldIds.map(item => {
      if (item && typeof item === 'object') {
        const source = item as UnknownRecord
        return String(source.dimId ?? source.id ?? '').trim()
      }
      return String(item).trim()
    }).filter(Boolean)
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
  const regex = /##([^#]+)##/g
  const matches = expression.matchAll(regex)
  const idSet = new Set<string>()
  for (const match of matches) {
    idSet.add(match[1])
  }
  return Array.from(idSet)
}

export function parseTemplateParams(templateParams?: object | string) {
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

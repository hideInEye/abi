import type {
  JsonRecord,
  KnowledgeDerivedCondition,
  KnowledgeDerivedExpression,
  KnowledgeSubmitPayload
} from '../types/metricModeling.types'

import {
  DEFAULT_PRECOMPUTE_CONFIG,
  DEFAULT_STATISTICAL_CALIBER,
  normalizePrecomputeConfig,
  normalizeStatisticalCaliber
} from './precomputeConfig'

type UnknownRecord = Record<string, unknown>

const TEMPLATE_CONFIG = {
  comparison: {
    apiKey: 'comparison_indicator',
    description: '衡量当前周期与历史周期的变化趋势',
    name: '同环比类'
  },
  cumulative: {
    apiKey: 'cumulative_indicator',
    description: '反映时间维度上的总量变化，如累计销售额',
    name: '累积类'
  },
  custom: {
    apiKey: 'custom_indicator',
    description: '基于多个指标的自由算术运算',
    name: '自定义类'
  },
  percentile: {
    apiKey: 'quantile_indicator',
    description: '描述数据分布情况，如 P90 响应时间',
    name: '分位数'
  },
  ratio: {
    apiKey: 'proportion_indicator',
    description: '衡量部分与整体的关系，如转化率、成功率',
    name: '占比类'
  },
  volatility: {
    apiKey: 'volatility_indicator',
    description: '通过数据离散程度评估稳定性',
    name: '波动类'
  }
} as const

const OPERATOR_API_MAP: Record<string, { operator: string; operatorName: string }> = {
  '!=': { operator: 'NE', operatorName: '不等于' },
  '<': { operator: 'LT', operatorName: '小于' },
  '<=': { operator: 'LE', operatorName: '小于等于' },
  '=': { operator: 'EQ', operatorName: '等于' },
  '>': { operator: 'GT', operatorName: '大于' },
  '>=': { operator: 'GE', operatorName: '大于等于' },
  'IS NOT NULL': { operator: 'IS_NOT_NULL', operatorName: '不为空' },
  'IS NULL': { operator: 'IS_NULL', operatorName: '为空' },
  LIKE: { operator: 'IN', operatorName: '包含' },
  'NOT LIKE': { operator: 'NOT_IN', operatorName: '不包含' }
}

const API_OPERATOR_FORM_MAP: Record<string, string> = {
  EQ: '=',
  GE: '>=',
  GT: '>',
  IN: 'LIKE',
  IS_NOT_NULL: 'IS NOT NULL',
  IS_NULL: 'IS NULL',
  LE: '<=',
  LT: '<',
  NE: '!=',
  NOT_IN: 'NOT LIKE'
}

function compactRecord<T extends UnknownRecord>(payload: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ) as Partial<T>
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeNumberText(value: unknown) {
  const text = normalizeText(value)
  if (!text) {
    return undefined
  }
  const num = Number(text)
  return Number.isNaN(num) ? text : num
}

function getAtomicMeta(values: KnowledgeSubmitPayload, value: unknown) {
  const key = normalizeText(value)
  const meta = values.atomicMetricMetaMap?.[key]

  return {
    field: normalizeText(meta?.field ?? key),
    id: normalizeText(meta?.id ?? key)
  }
}

function buildMetricParameter(
  values: KnowledgeSubmitPayload,
  config: { description: string; key: string; value: unknown }
) {
  const meta = getAtomicMeta(values, config.value)

  return compactRecord({
    description: config.description,
    field: meta.field,
    id: meta.id,
    key: config.key,
    type: 'string'
  })
}

function normalizeComparisonType(value: unknown) {
  const text = normalizeText(value)
  const map: Record<string, string> = {
    MOM: 'MoM',
    QOQ: 'QoQ',
    YOY: 'YoY'
  }
  return map[text.toUpperCase()] || text
}

function normalizeComparisonOutput(value: unknown) {
  const text = normalizeText(value)
  const map: Record<string, string> = {
    ABSOLUTE_DIFF: 'absolute_diff',
    PERCENTAGE: 'percentage',
    VALUE: 'absolute_diff'
  }
  return map[text.toUpperCase()] || text
}

function normalizeCumulativeTimeRange(value: unknown) {
  return normalizeText(value)
}

function normalizeCumulativeMode(value: unknown) {
  return normalizeText(value)
}

function normalizeVolatilityMethod(value: unknown) {
  const text = normalizeText(value)
  const map: Record<string, string> = {
    CV: 'CV',
    RANGE: 'Range',
    STDDEV: 'StdDev',
    VARIANCE: 'Variance'
  }
  return map[text.toUpperCase()] || text
}

function parseJsonRecord(value: unknown): UnknownRecord {
  if (!value) {
    return {}
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as UnknownRecord) : {}
    } catch {
      return {}
    }
  }
  return typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}
}

function getTemplateParameter(parameters: unknown, key: string): UnknownRecord {
  if (!Array.isArray(parameters)) {
    return {}
  }
  return (parameters.find(item => parseJsonRecord(item).key === key) || {}) as UnknownRecord
}

function getParameterValue(parameters: unknown, key: string) {
  const param = getTemplateParameter(parameters, key)
  return param.value ?? param.id ?? param.field
}

function getMetricParameterValue(parameters: unknown, key: string) {
  const param = getTemplateParameter(parameters, key)
  return normalizeText(param.id ?? param.value ?? param.field)
}

function normalizeComparisonTypeForForm(value: unknown) {
  const text = normalizeText(value)
  const map: Record<string, string> = {
    MOM: 'MOM',
    QOQ: 'QOQ',
    YOY: 'YOY'
  }
  return map[text.toUpperCase()] || text.toUpperCase() || undefined
}

function normalizeComparisonOutputForForm(value: unknown) {
  const text = normalizeText(value)
  const map: Record<string, string> = {
    ABSOLUTE_DIFF: 'VALUE',
    PERCENTAGE: 'PERCENTAGE'
  }
  return map[text.toUpperCase()] || text.toUpperCase() || undefined
}

function normalizeVolatilityMethodForForm(value: unknown) {
  const text = normalizeText(value)
  const map: Record<string, string> = {
    RANGE: 'RANGE',
    STDDEV: 'STDDEV',
    VARIANCE: 'VARIANCE'
  }
  return map[text.toUpperCase()] || text.toUpperCase() || undefined
}

function normalizeCumulativeTimeRangeForForm(value: unknown) {
  const text = normalizeText(value)
  if (text.toUpperCase() === 'QUATER') {
    return 'QUARTER'
  }
  return text || undefined
}

function normalizeCumulativeModeForForm(value: unknown) {
  const text = normalizeText(value)
  const map: Record<string, string> = {
    '0': 'UP',
    '1': 'DOWN'
  }
  return map[text.toUpperCase()] || text || undefined
}

function getTemplateTypeByApiKey(apiKey: string) {
  return Object.entries(TEMPLATE_CONFIG).find(([, config]) => config.apiKey === apiKey)?.[0]
}

function parseThresholdRange(value: unknown) {
  return Array.isArray(value) ? value : []
}

function getStoredGroupSources(expression: UnknownRecord): unknown[] {
  if (Array.isArray(expression.groups) && expression.groups.length) {
    return expression.groups
  }
  if (Array.isArray(expression.conditions)) {
    return [{ conditions: expression.conditions, innerLogic: expression.innerLogic, name: '条件分组 1' }]
  }
  return []
}

function buildDerivedCondition(
  item: KnowledgeDerivedCondition,
  context: {
    conditionIndex: number
    expressionIndex: number
    groupIndex: number
    values: KnowledgeSubmitPayload
  }
) {
  const { conditionIndex, expressionIndex, groupIndex, values } = context
  const metricKey = normalizeText(item.fieldId ?? item.metric)
  const operatorKey = normalizeText(item.operator)
  const fieldMeta = values.derivedExpressionFieldMetaMap?.[metricKey]
  const operatorMeta = OPERATOR_API_MAP[operatorKey] || { operator: operatorKey, operatorName: operatorKey }
  return compactRecord({
    conditionId: item.id || `cond_${expressionIndex + 1}_${groupIndex + 1}_${conditionIndex + 1}`,
    field: fieldMeta?.field || metricKey,
    fieldName: fieldMeta?.fieldName || metricKey,
    ...(conditionIndex > 0 ? { logicWithPrevious: item.logicWithPrevious || item.logic || 'AND' } : {}),
    operator: operatorMeta.operator,
    operatorName: operatorMeta.operatorName,
    ...(!['IS NULL', 'IS NOT NULL'].includes(operatorKey) ? { value: item.value ?? '' } : {})
  })
}

function buildDerivedFormExpressions(calcLogic: UnknownRecord) {
  const expressions = Array.isArray(calcLogic.expressions) ? calcLogic.expressions : []
  if (!expressions.length) {
    return undefined
  }

  const parsedExpressions = expressions
    .map((source, index) => {
      const expression = parseJsonRecord(source)
      const groupSources = getStoredGroupSources(expression)
      const groups = groupSources.map((groupSource, groupIndex) => {
        const group = parseJsonRecord(groupSource)
        const conditions = Array.isArray(group.conditions) ? group.conditions : []
        const fallbackLogic = normalizeText(group.innerLogic) === 'OR' ? 'OR' : 'AND'
        const parsedConditions = conditions
          .map((conditionSource, conditionIndex) => {
            const condition = parseJsonRecord(conditionSource)
            const operator = normalizeText(condition.operator)

            return {
              fieldId: condition.field || condition.fieldName,
              id: condition.conditionId || `condition-${index + 1}-${groupIndex + 1}-${conditionIndex + 1}`,
              ...(conditionIndex > 0
                ? {
                    logicWithPrevious:
                      normalizeText(condition.logicWithPrevious || condition.logic) === 'OR' ? 'OR' : fallbackLogic
                  }
                : {}),
              operator: API_OPERATOR_FORM_MAP[operator] || operator,
              value: condition.value ?? ''
            }
          })
          .filter(item => item.fieldId && item.operator)

        return {
          conditions: parsedConditions,
          id: group.groupId || `group-${index + 1}-${groupIndex + 1}`,
          ...(groupIndex > 0
            ? { logicWithPrevious: normalizeText(group.logicWithPrevious || group.logic) === 'OR' ? 'OR' : 'AND' }
            : {}),
          name: group.name || group.groupName || `条件分组 ${groupIndex + 1}`
        }
      })

      return {
        groups,
        id: expression.expressionId || `expression-${index + 1}`,
        name: expression.name || `表达式${index + 1}`
      }
    })
    .filter(item => item.groups.length)

  return parsedExpressions.length ? parsedExpressions : undefined
}

function buildDerivativeTemplateFormValues(calcLogic: UnknownRecord) {
  const templates = parseJsonRecord(calcLogic.indicator_templates)
  const templateEntry = Object.entries(templates).find(([, value]) => value && typeof value === 'object')
  if (!templateEntry) {
    return {}
  }

  const [apiKey, template] = templateEntry
  const templateType = getTemplateTypeByApiKey(apiKey)
  const parameters = parseJsonRecord(template).parameters
  const thresholdRange = parseThresholdRange(getParameterValue(parameters, 'threshold_range'))

  if (templateType === 'ratio') {
    return compactRecord({
      ratioDenominatorId: getMetricParameterValue(parameters, 'denominator_id'),
      ratioNumeratorId: getMetricParameterValue(parameters, 'numerator_id'),
      ratioPrecision: normalizeText(getParameterValue(parameters, 'calc_precision')),
      templateType,
      thresholdMax: thresholdRange[1],
      thresholdMin: thresholdRange[0]
    })
  }

  if (templateType === 'cumulative') {
    return compactRecord({
      accumulateStartDate: getParameterValue(parameters, 'accumulation_start'),
      cumulativeMetricId: getMetricParameterValue(parameters, 'base_indicator_id'),
      cumulativeMode: normalizeCumulativeModeForForm(getParameterValue(parameters, 'accumulation_type')),
      cumulativeTimeRange: normalizeCumulativeTimeRangeForForm(getParameterValue(parameters, 'time_range')),
      templateType
    })
  }

  if (templateType === 'comparison') {
    return compactRecord({
      compareMetricId: getMetricParameterValue(parameters, 'base_indicator_id'),
      comparePeriod: getParameterValue(parameters, 'compare_cycle_num'),
      compareType: normalizeComparisonTypeForForm(getParameterValue(parameters, 'comparison_type')),
      comparisonOutputType: normalizeComparisonOutputForForm(getParameterValue(parameters, 'output_format')),
      templateType
    })
  }

  if (templateType === 'volatility') {
    return compactRecord({
      rollingWindowSize: getParameterValue(parameters, 'window_size'),
      templateType,
      volatilityMethod: normalizeVolatilityMethodForForm(getParameterValue(parameters, 'method')),
      volatilityMetricId: getMetricParameterValue(parameters, 'base_indicator_id')
    })
  }

  if (templateType === 'percentile') {
    return compactRecord({
      percentileValue: getParameterValue(parameters, 'quantile_val'),
      techId: getMetricParameterValue(parameters, 'base_indicator_id'),
      templateType
    })
  }

  if (templateType === 'custom') {
    return compactRecord({
      expr: getParameterValue(parameters, 'formula_expression'),
      templateType,
      variableMappings: getParameterValue(parameters, 'input_id_map')
    })
  }

  return compactRecord({
    templateType
  })
}

function buildCustomIndicatorMaps(values: KnowledgeSubmitPayload) {
  if (!Array.isArray(values.variableMappings)) {
    return {
      inputIdMap: values.variableMappings || {},
      inputIndicatorsMap: {}
    }
  }

  return values.variableMappings.reduce<{
    inputIdMap: Record<string, string>
    inputIndicatorsMap: Record<string, string>
  }>(
    (acc, item) => {
      const variableName = normalizeText(item?.variableName)
      if (!variableName) {
        return acc
      }
      const meta = getAtomicMeta(values, item?.indicatorId)
      acc.inputIdMap[variableName] = meta.id
      acc.inputIndicatorsMap[variableName] = meta.field
      return acc
    },
    {
      inputIdMap: {},
      inputIndicatorsMap: {}
    }
  )
}

export function buildDerivedExpressions(values: KnowledgeSubmitPayload) {
  let sourceExpressions: KnowledgeDerivedExpression[] = []
  if (values.derivedExpressions?.length) {
    sourceExpressions = values.derivedExpressions
  } else if (values.derivedConditions?.length) {
    sourceExpressions = [
      {
        conditions: values.derivedConditions,
        innerLogic: values.derivedConditions.some(item => item?.logic === 'OR') ? 'OR' : 'AND',
        name: '表达式1'
      }
    ]
  }

  const expressions = sourceExpressions
    .map((expression, expressionIndex) => {
      let groupSources = expression.groups || []
      if (!groupSources.length && expression.conditions?.length) {
        groupSources = [{ conditions: expression.conditions, name: '条件分组 1' }]
      }
      const groups = groupSources.map((group, groupIndex) => ({
        conditions: (group.conditions || [])
          .map((item, conditionIndex) =>
            buildDerivedCondition(item, { conditionIndex, expressionIndex, groupIndex, values })
          )
          .filter(item => item.field && item.operator),
        groupId: group.id || `group_${expressionIndex + 1}_${groupIndex + 1}`,
        ...(groupIndex > 0 ? { logicWithPrevious: group.logicWithPrevious || 'AND' } : {}),
        name: normalizeText(group.name) || `条件分组 ${groupIndex + 1}`
      }))

      if (!groups.some(group => group.conditions.length)) {
        return null
      }

      return {
        expressionId: expression.id || `exp_${expressionIndex + 1}`,
        groups,
        name: normalizeText(expression.name) || `表达式${expressionIndex + 1}`
      }
    })
    .filter(Boolean)

  return expressions.length ? expressions : undefined
}

export function buildDerivativeIndicatorTemplates(values: KnowledgeSubmitPayload) {
  const templateType = normalizeText(values.templateType) as keyof typeof TEMPLATE_CONFIG
  const config = TEMPLATE_CONFIG[templateType]

  if (!config) {
    return undefined
  }

  const parameters: UnknownRecord[] = []

  if (templateType === 'ratio') {
    parameters.push(
      buildMetricParameter(values, {
        description: '分子指标ID',
        key: 'numerator_id',
        value: values.ratioNumeratorId
      }),
      buildMetricParameter(values, {
        description: '分母指标ID',
        key: 'denominator_id',
        value: values.ratioDenominatorId
      }),
      compactRecord({
        description: '计算精度，代表保留小数位数',
        key: 'calc_precision',
        options: [0, 1, 2, 3, 4],
        type: 'enum',
        value: normalizeNumberText(values.ratioPrecision)
      }),
      compactRecord({
        description: '阈值范围 [min, max]',
        key: 'threshold_range',
        type: 'array',
        value: [values.thresholdMin, values.thresholdMax].map(item => normalizeText(item)).filter(Boolean)
      })
    )
  }

  if (templateType === 'cumulative') {
    parameters.push(
      buildMetricParameter(values, {
        description: '原子指标ID',
        key: 'base_indicator_id',
        value: values.cumulativeMetricId
      }),
      compactRecord({
        description: '时间范围',
        key: 'time_range',
        options: ['YEAR', 'QUARTER', 'MONTH', 'WEEK'],
        type: 'enum',
        value: normalizeCumulativeTimeRange(values.cumulativeTimeRange)
      }),
      compactRecord({
        description: '累加起点日期',
        key: 'accumulation_start',
        type: 'date',
        value: normalizeText(values.accumulateStartDate)
      }),
      compactRecord({
        description: '累加方式',
        key: 'accumulation_type',
        type: 'string',
        value: normalizeCumulativeMode(values.cumulativeMode)
      })
    )
  }

  if (templateType === 'comparison') {
    parameters.push(
      buildMetricParameter(values, {
        description: '基准指标ID',
        key: 'base_indicator_id',
        value: values.compareMetricId
      }),
      compactRecord({
        description: '对比类型',
        key: 'comparison_type',
        options: ['YoY', 'MoM'],
        type: 'enum',
        value: normalizeComparisonType(values.compareType)
      }),
      compactRecord({
        description: '比较周期长度',
        key: 'compare_cycle_num',
        type: 'integer',
        value: normalizeNumberText(values.comparePeriod)
      }),
      compactRecord({
        description: '产出格式',
        key: 'output_format',
        options: ['percentage', 'absolute_diff'],
        type: 'enum',
        value: normalizeComparisonOutput(values.comparisonOutputType)
      })
    )
  }

  if (templateType === 'volatility') {
    parameters.push(
      buildMetricParameter(values, {
        description: '原始指标ID',
        key: 'base_indicator_id',
        value: values.volatilityMetricId
      }),
      compactRecord({
        description: '计算方法',
        key: 'method',
        options: ['StdDev', 'Variance', 'Range'],
        type: 'enum',
        value: normalizeVolatilityMethod(values.volatilityMethod)
      }),
      compactRecord({
        description: '滚动窗口大小',
        key: 'window_size',
        type: 'integer',
        value: normalizeNumberText(values.rollingWindowSize)
      })
    )
  }

  if (templateType === 'percentile') {
    parameters.push(
      buildMetricParameter(values, {
        description: '原子指标ID',
        key: 'base_indicator_id',
        value: values.techId
      }),
      compactRecord({
        description: '分位数值（0到1之间）',
        key: 'quantile_val',
        type: 'float',
        value: normalizeNumberText(values.percentileValue)
      })
    )
  }

  if (templateType === 'custom') {
    const { inputIdMap, inputIndicatorsMap } = buildCustomIndicatorMaps(values)
    parameters.push(
      compactRecord({
        description: '计算逻辑表达式',
        key: 'formula_expression',
        type: 'string',
        value: normalizeText(values.expr)
      }),
      compactRecord({
        description: '表达式变量与指标ID的映射关系',
        key: 'input_id_map',
        type: 'object',
        value: inputIdMap
      }),
      compactRecord({
        description: '表达式变量与字段/指标英文名称的映射关系',
        key: 'input_indicators_map',
        type: 'object',
        value: inputIndicatorsMap
      })
    )
  }

  return {
    [config.apiKey]: {
      description: config.description,
      name: config.name,
      parameters
    }
  }
}

function buildBaseCalcLogic(values: KnowledgeSubmitPayload) {
  return compactRecord({
    accumulateStartDate: values.accumulateStartDate,
    calcPeriod: values.calcPeriod,
    compareMetricId: values.compareMetricId,
    comparePeriod: values.comparePeriod,
    compareType: values.compareType,
    comparisonOutputType: values.comparisonOutputType,
    cumulativeMetricId: values.cumulativeMetricId,
    cumulativeMode: values.cumulativeMode,
    cumulativeTimeRange: values.cumulativeTimeRange,
    derivedConditionExpr: values.derivedConditionExpr,
    derivedConditions: values.derivedConditions,
    divideZeroStrategy: values.divideZeroStrategy,
    expr: values.expr,
    nullStrategy: values.nullStrategy,
    percentileValue: values.percentileValue,
    precomputeConfig:
      values.precomputeConfig || values.updateFrequency
        ? normalizePrecomputeConfig(values.precomputeConfig, values.updateFrequency)
        : undefined,
    projectionFunc: values.projectionFunc,
    ratioDenominatorId: values.ratioDenominatorId,
    ratioNumeratorId: values.ratioNumeratorId,
    ratioPrecision: values.ratioPrecision,
    relItemId: values.relItemId,
    rollingWindowSize: values.rollingWindowSize,
    statisticalCaliber: values.statisticalCaliber ? normalizeStatisticalCaliber(values.statisticalCaliber) : undefined,
    techId: values.techId,
    templateType: values.templateType,
    thresholdMax: values.thresholdMax,
    thresholdMin: values.thresholdMin,
    variableMappings: values.variableMappings,
    variableName: values.variableName,
    volatilityDataRange: values.volatilityDataRange,
    volatilityMethod: values.volatilityMethod,
    volatilityMetricId: values.volatilityMetricId
  }) as JsonRecord
}

export function buildKnowledgeCalcLogic(values: KnowledgeSubmitPayload): JsonRecord {
  const indicatorClass = normalizeText(values.indicatorClass)

  if (indicatorClass === 'derived') {
    return compactRecord({
      ...buildBaseCalcLogic(values),
      expressions: buildDerivedExpressions(values)
    }) as JsonRecord
  }

  if (indicatorClass === 'derivative') {
    return compactRecord({
      calcPeriod: values.calcPeriod,
      indicator_templates: buildDerivativeIndicatorTemplates(values),
      precomputeConfig:
        values.precomputeConfig || values.updateFrequency
          ? normalizePrecomputeConfig(values.precomputeConfig, values.updateFrequency)
          : undefined
    }) as JsonRecord
  }

  return buildBaseCalcLogic(values)
}

export function parseKnowledgeCalcLogicFormValues(calcLogicValue: unknown): Partial<KnowledgeSubmitPayload> {
  const calcLogic = parseJsonRecord(calcLogicValue)
  if (!Object.keys(calcLogic).length) {
    return {
      precomputeConfig: DEFAULT_PRECOMPUTE_CONFIG,
      statisticalCaliber: DEFAULT_STATISTICAL_CALIBER,
      updateFrequency: DEFAULT_PRECOMPUTE_CONFIG.frequency
    }
  }

  const baseValues = compactRecord({
    accumulateStartDate: calcLogic.accumulateStartDate,
    calcPeriod: calcLogic.calcPeriod,
    compareMetricId: calcLogic.compareMetricId,
    comparePeriod: calcLogic.comparePeriod,
    compareType: calcLogic.compareType,
    comparisonOutputType: calcLogic.comparisonOutputType,
    cumulativeMetricId: calcLogic.cumulativeMetricId,
    cumulativeMode: calcLogic.cumulativeMode,
    cumulativeTimeRange: calcLogic.cumulativeTimeRange,
    derivedConditionExpr: calcLogic.derivedConditionExpr,
    derivedConditions: calcLogic.derivedConditions,
    divideZeroStrategy: calcLogic.divideZeroStrategy,
    expr: calcLogic.expr,
    nullStrategy: calcLogic.nullStrategy,
    percentileValue: calcLogic.percentileValue,
    precomputeConfig: normalizePrecomputeConfig(calcLogic.precomputeConfig, calcLogic.updateFrequency),
    projectionFunc: calcLogic.projectionFunc,
    ratioDenominatorId: calcLogic.ratioDenominatorId,
    ratioNumeratorId: calcLogic.ratioNumeratorId,
    ratioPrecision: calcLogic.ratioPrecision,
    relItemId: calcLogic.relItemId,
    rollingWindowSize: calcLogic.rollingWindowSize,
    statisticalCaliber: normalizeStatisticalCaliber(calcLogic.statisticalCaliber),
    techId: calcLogic.techId,
    templateType: calcLogic.templateType,
    thresholdMax: calcLogic.thresholdMax,
    thresholdMin: calcLogic.thresholdMin,
    updateFrequency: normalizePrecomputeConfig(calcLogic.precomputeConfig, calcLogic.updateFrequency).frequency,
    variableMappings: calcLogic.variableMappings,
    variableName: calcLogic.variableName,
    volatilityDataRange: calcLogic.volatilityDataRange,
    volatilityMethod: calcLogic.volatilityMethod,
    volatilityMetricId: calcLogic.volatilityMetricId
  })

  return compactRecord({
    ...baseValues,
    derivedExpressions: buildDerivedFormExpressions(calcLogic),
    ...buildDerivativeTemplateFormValues(calcLogic)
  }) as Partial<KnowledgeSubmitPayload>
}

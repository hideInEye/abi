import type {
  RuleCondition,
  RuleFieldCategory,
  RuleFieldOption,
  RuleFieldTreeNode,
  RuleGroup,
  RuleLayer,
  RuleLogic,
  RuleOperator,
  RuleSqlResult,
  RuleValidationIssue,
  RuleValidationResult
} from './types'
import { RULE_EXPRESSION_LIMITS } from './types'

type UnknownRecord = Record<string, unknown>

const RULE_NAME_PATTERN = /^[\u3400-\u9FFFA-Za-z0-9 _\-()（）]+$/
const NULL_OPERATORS = new Set<RuleOperator>(['IS NULL', 'IS NOT NULL'])
let ruleIdSeed = 0

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}
}

function text(value: unknown): string {
  return String(value ?? '').trim()
}

function editableText(value: unknown): string {
  return typeof value === 'string' ? value : String(value ?? '')
}

function pickText(source: UnknownRecord, keys: readonly string[]): string {
  for (const key of keys) {
    const value = text(source[key])
    if (value) return value
  }
  return ''
}

function normalizeLogic(value: unknown): RuleLogic {
  return text(value).toUpperCase() === 'OR' ? 'OR' : 'AND'
}

function normalizeOperator(value: unknown): RuleOperator {
  const operator = text(value).toUpperCase()
  const allowed = new Set<RuleOperator>(['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'NOT LIKE', 'IS NULL', 'IS NOT NULL'])
  return allowed.has(operator as RuleOperator) ? (operator as RuleOperator) : '='
}

export function createRuleId(prefix: 'condition' | 'group' | 'layer'): string {
  ruleIdSeed += 1
  return `${prefix}-${Date.now().toString(36)}-${ruleIdSeed.toString(36)}`
}

export function createDefaultRuleCondition(logicWithPrevious?: RuleLogic): RuleCondition {
  return {
    fieldId: '',
    id: createRuleId('condition'),
    logicWithPrevious,
    operator: '=',
    value: ''
  }
}

export function createDefaultRuleLayer(name = '新分层'): RuleLayer {
  return {
    groups: [],
    id: createRuleId('layer'),
    name
  }
}

export function createDefaultRuleLayers(): RuleLayer[] {
  return [createDefaultRuleLayer()]
}

function normalizeCondition(value: unknown, index: number, fallbackLogic?: unknown): RuleCondition {
  const source = asRecord(value)
  const operator = normalizeOperator(source.operator)
  const fieldId = text(source.fieldId ?? source.metric ?? source.field ?? source.fieldName)

  return {
    fieldId,
    id: text(source.id ?? source.conditionId) || createRuleId('condition'),
    ...(index > 0
      ? { logicWithPrevious: normalizeLogic(source.logicWithPrevious ?? source.logic ?? fallbackLogic) }
      : {}),
    operator,
    value: NULL_OPERATORS.has(operator) ? '' : ((source.value ?? '') as number | string)
  }
}

function normalizeGroup(value: unknown, index: number): RuleGroup {
  const source = asRecord(value)
  const conditionsSource = Array.isArray(source.conditions) ? source.conditions : []
  const fallbackLogic = source.innerLogic ?? source.logic
  const hasName = Object.hasOwn(source, 'name') || Object.hasOwn(source, 'groupName')

  return {
    conditions: conditionsSource.map((condition, conditionIndex) =>
      normalizeCondition(condition, conditionIndex, fallbackLogic)
    ),
    id: text(source.id ?? source.groupId) || createRuleId('group'),
    ...(index > 0 ? { logicWithPrevious: normalizeLogic(source.logicWithPrevious ?? source.logic) } : {}),
    name: hasName ? editableText(source.name ?? source.groupName) : `条件分组 ${index + 1}`
  }
}

function normalizeLayer(value: unknown, index: number): RuleLayer {
  const source = asRecord(value)
  const hasName = Object.hasOwn(source, 'name') || Object.hasOwn(source, 'binName')
  let groupSources: unknown[] = []
  if (Array.isArray(source.groups) && source.groups.length) {
    groupSources = source.groups
  } else if (Array.isArray(source.conditions)) {
    groupSources = [
      {
        conditions: source.conditions,
        groupName: '条件分组 1',
        innerLogic: source.innerLogic ?? source.logic
      }
    ]
  }
  const defaultName = index === 0 ? '新分层' : `新分层 ${index + 1}`

  return {
    groups: groupSources.map(normalizeGroup),
    id: text(source.id ?? source.layerId ?? source.expressionId) || createRuleId('layer'),
    name: hasName ? editableText(source.name ?? source.binName) : defaultName
  }
}

export function normalizeRuleLayers(value: unknown, ensureLayer = true): RuleLayer[] {
  const source = Array.isArray(value) ? value : []
  const layers = source.map(normalizeLayer)
  return layers.length || !ensureLayer ? layers : createDefaultRuleLayers()
}

export function normalizeRuleConnections(layers: RuleLayer[]): RuleLayer[] {
  return layers.map(layer => ({
    ...layer,
    groups: layer.groups.map((group, groupIndex) => ({
      ...group,
      conditions: group.conditions.map((condition, conditionIndex) => ({
        ...condition,
        ...(conditionIndex === 0
          ? { logicWithPrevious: undefined }
          : { logicWithPrevious: condition.logicWithPrevious || 'AND' })
      })),
      ...(groupIndex === 0 ? { logicWithPrevious: undefined } : { logicWithPrevious: group.logicWithPrevious || 'AND' })
    }))
  }))
}

export function validateRuleLogicUniformity(layersValue: unknown): RuleValidationResult {
  const layers = normalizeRuleLayers(layersValue, false)
  const issues: RuleValidationIssue[] = []

  layers.forEach((layer, layerIndex) => {
    const expectedGroupLogic = layer.groups[1]?.logicWithPrevious || 'AND'
    const mixedGroupIndex = layer.groups.findIndex(
      (group, groupIndex) => groupIndex > 1 && (group.logicWithPrevious || 'AND') !== expectedGroupLogic
    )
    if (mixedGroupIndex >= 0) {
      issues.push({
        message: '同一分层内的条件分组必须使用统一的且/或关系',
        path: `layers.${layerIndex}.groups.${mixedGroupIndex}.logicWithPrevious`
      })
    }

    layer.groups.forEach((group, groupIndex) => {
      const expectedConditionLogic = group.conditions[1]?.logicWithPrevious || 'AND'
      const mixedConditionIndex = group.conditions.findIndex(
        (condition, conditionIndex) =>
          conditionIndex > 1 && (condition.logicWithPrevious || 'AND') !== expectedConditionLogic
      )
      if (mixedConditionIndex >= 0) {
        issues.push({
          message: '同一条件分组内的条件必须使用统一的且/或关系',
          path: `layers.${layerIndex}.groups.${groupIndex}.conditions.${mixedConditionIndex}.logicWithPrevious`
        })
      }
    })
  })

  return { issues, valid: issues.length === 0 }
}

function normalizeCategory(value: unknown, fieldType: unknown): RuleFieldCategory | null {
  const category = text(value).toLowerCase()
  const type = text(fieldType).toLowerCase()
  if (category === 'dates' || ((category === 'dimensions' || category === 'dimension') && type === 'datetime')) {
    return 'dates'
  }
  if (category === 'dimensions' || category === 'dimension') {
    return 'dimensions'
  }
  if (category === 'measures' || category === 'measure') {
    return 'measures'
  }
  return null
}

export function createRuleFieldOptions(values: readonly unknown[]): RuleFieldOption[] {
  const optionMap = new Map<string, RuleFieldOption>()

  values.forEach(value => {
    const source = asRecord(value)
    const id = pickText(source, ['techId', 'tfieldId', 'id', 'fieldId', 'fieldName', 'originName'])
    const fieldType = pickText(source, ['fieldType', 'type'])
    const category = normalizeCategory(pickText(source, ['tfieldType', 'category', 'semanticType']), fieldType)
    if (!id || !category) {
      return
    }
    const sourceName = pickText(source, ['fieldName', 'originName', 'tfieldName', 'name'])
    if (!sourceName) {
      return
    }
    optionMap.set(id, {
      category,
      dataType: fieldType || undefined,
      id,
      label: pickText(source, ['fieldName', 'tfieldName', 'originName', 'bizName', 'tfieldAlias']) || sourceName,
      sourceName,
      tableName: pickText(source, ['tableName', 'rtableName', 'tableBizName']) || '未分组字段'
    })
  })

  return Array.from(optionMap.values())
}

export function buildRuleFieldTree(fields: readonly RuleFieldOption[]): RuleFieldTreeNode[] {
  const roots: Array<{ category: RuleFieldCategory; title: string }> = [
    { category: 'dimensions', title: '维度' },
    { category: 'measures', title: '度量' },
    { category: 'dates', title: '日期' }
  ]

  return roots.map(root => {
    const tableMap = new Map<string, RuleFieldOption[]>()
    fields
      .filter(field => field.category === root.category)
      .forEach(field => {
        tableMap.set(field.tableName, [...(tableMap.get(field.tableName) || []), field])
      })

    return {
      children: Array.from(tableMap.entries()).map(([tableName, tableFields]) => ({
        children: tableFields.map(field => ({
          isLeaf: true,
          title: field.label,
          value: field.id
        })),
        selectable: false,
        title: tableName,
        value: `${root.category}-table-${tableName}`
      })),
      selectable: false,
      title: root.title,
      value: root.category
    }
  })
}

function pushNameIssues(
  issues: RuleValidationIssue[],
  name: string,
  context: { label: '分层' | '条件分组'; path: string }
): void {
  const { label, path } = context
  const trimmed = name.trim()
  if (!trimmed) {
    issues.push({ message: `请输入${label}名称`, path })
    return
  }
  if (trimmed.length > 30) {
    issues.push({ message: `${label}名称最多支持 30 个字符`, path })
  }
  if (!RULE_NAME_PATTERN.test(trimmed)) {
    issues.push({ message: `${label}名称包含不支持的字符`, path })
  }
}

export function validateRuleLayers(layersValue: unknown, fields?: readonly RuleFieldOption[]): RuleValidationResult {
  const layers = normalizeRuleLayers(layersValue, false)
  const issues: RuleValidationIssue[] = []
  const fieldIds = fields ? new Set(fields.map(field => field.id)) : undefined
  let totalConditions = 0

  if (!layers.length) {
    issues.push({ message: '请至少配置一个完整有效的分层表达式', path: 'layers' })
  }
  if (layers.length > RULE_EXPRESSION_LIMITS.layers) {
    issues.push({ message: `最多支持 ${RULE_EXPRESSION_LIMITS.layers} 个分层`, path: 'layers' })
  }

  const layerNames = new Set<string>()
  layers.forEach((layer, layerIndex) => {
    const layerPath = `layers.${layerIndex}`
    pushNameIssues(issues, layer.name, { label: '分层', path: `${layerPath}.name` })
    const layerName = layer.name.trim()
    if (layerName && layerNames.has(layerName)) {
      issues.push({ message: '分层名称已存在，请修改', path: `${layerPath}.name` })
    }
    layerNames.add(layerName)

    if (!layer.groups.length) {
      issues.push({ message: '请至少配置一个完整有效的分层表达式', path: `${layerPath}.groups` })
    }
    if (layer.groups.length > RULE_EXPRESSION_LIMITS.groupsPerLayer) {
      issues.push({
        message: `每个分层最多支持 ${RULE_EXPRESSION_LIMITS.groupsPerLayer} 个条件分组`,
        path: `${layerPath}.groups`
      })
    }

    const groupNames = new Set<string>()
    layer.groups.forEach((group, groupIndex) => {
      const groupPath = `${layerPath}.groups.${groupIndex}`
      pushNameIssues(issues, group.name, { label: '条件分组', path: `${groupPath}.name` })
      const groupName = group.name.trim()
      if (groupName && groupNames.has(groupName)) {
        issues.push({ message: '当前分层已存在同名条件分组', path: `${groupPath}.name` })
      }
      groupNames.add(groupName)

      if (!group.conditions.length) {
        issues.push({ message: '请为条件分组添加至少一条条件', path: `${groupPath}.conditions` })
      }
      if (group.conditions.length > RULE_EXPRESSION_LIMITS.conditionsPerGroup) {
        issues.push({
          message: `每个条件分组最多支持 ${RULE_EXPRESSION_LIMITS.conditionsPerGroup} 条条件`,
          path: `${groupPath}.conditions`
        })
      }

      totalConditions += group.conditions.length
      group.conditions.forEach((condition, conditionIndex) => {
        const conditionPath = `${groupPath}.conditions.${conditionIndex}`
        if (!condition.fieldId) {
          issues.push({ message: '请选择字段', path: `${conditionPath}.fieldId` })
        } else if (fieldIds && !fieldIds.has(condition.fieldId)) {
          issues.push({ message: '所选字段已不在当前数据语义中，请重新选择', path: `${conditionPath}.fieldId` })
        }
        if (!condition.operator) {
          issues.push({ message: '请选择操作符', path: `${conditionPath}.operator` })
        }
        if (!NULL_OPERATORS.has(condition.operator) && !text(condition.value)) {
          issues.push({ message: '请输入值', path: `${conditionPath}.value` })
        }
      })
    })
  })

  if (totalConditions > RULE_EXPRESSION_LIMITS.totalConditions) {
    issues.push({ message: `单个标签语义最多支持 ${RULE_EXPRESSION_LIMITS.totalConditions} 条条件`, path: 'layers' })
  }

  return { issues, valid: issues.length === 0 }
}

export function collectRuleFieldIds(layersValue: unknown): string[] {
  const ids = new Set<string>()
  normalizeRuleLayers(layersValue, false).forEach(layer => {
    layer.groups.forEach(group => {
      group.conditions.forEach(condition => {
        if (condition.fieldId) {
          ids.add(condition.fieldId)
        }
      })
    })
  })
  return Array.from(ids)
}

export function hasConfiguredRuleConditions(layersValue: unknown): boolean {
  return normalizeRuleLayers(layersValue, false).some(layer => layer.groups.some(group => group.conditions.length > 0))
}

function isNumericField(field?: RuleFieldOption): boolean {
  if (!field) {
    return false
  }
  const dataType = text(field.dataType).toLowerCase()
  return field.category === 'measures' || /(int|number|numeric|decimal|float|double|amount|long)/.test(dataType)
}

function quoteSqlString(value: unknown): string {
  return `'${text(value).replaceAll("'", "''")}'`
}

function conditionToSql(condition: RuleCondition, fieldMap: Map<string, RuleFieldOption>): string {
  const field = fieldMap.get(condition.fieldId)
  const fieldName = field?.sourceName || condition.fieldId
  if (NULL_OPERATORS.has(condition.operator)) {
    return `${fieldName} ${condition.operator}`
  }
  const rawValue = text(condition.value)
  if (condition.operator === 'LIKE' || condition.operator === 'NOT LIKE') {
    return `${fieldName} ${condition.operator} ${quoteSqlString(`%${rawValue}%`)}`
  }
  const sqlValue = isNumericField(field) && /^-?\d+(\.\d+)?$/.test(rawValue) ? rawValue : quoteSqlString(rawValue)
  return `${fieldName} ${condition.operator} ${sqlValue}`
}

function isCompleteCondition(condition: RuleCondition): boolean {
  if (!condition.fieldId || !condition.operator) return false
  if (NULL_OPERATORS.has(condition.operator)) return true
  return Boolean(text(condition.value))
}

export function compileRulePredicate(layersValue: unknown, fields: readonly RuleFieldOption[]): string {
  const fieldMap = new Map(fields.map(field => [field.id, field]))
  return normalizeRuleLayers(layersValue, false)
    .map(layer => {
      const groupsSql = layer.groups
        .map(group => {
          const conditionsSql = group.conditions
            .filter(isCompleteCondition)
            .map(
              (condition, conditionIndex) =>
                `${conditionIndex > 0 ? `${condition.logicWithPrevious || 'AND'} ` : ''}${conditionToSql(condition, fieldMap)}`
            )
            .join(' ')
          return conditionsSql ? { logic: group.logicWithPrevious || 'AND', sql: `(${conditionsSql})` } : null
        })
        .filter(Boolean) as Array<{ logic: RuleLogic; sql: string }>
      return groupsSql.map((group, groupIndex) => `${groupIndex > 0 ? `${group.logic} ` : ''}${group.sql}`).join(' ')
    })
    .filter(Boolean)
    .join('\n')
}

export function compileRuleLayersToSql(layersValue: unknown, fields: readonly RuleFieldOption[]): RuleSqlResult {
  const layers = normalizeRuleLayers(layersValue, false)
  const validation = validateRuleLayers(layers, fields)
  if (!validation.valid) {
    return { sql: '', validation }
  }
  const fieldMap = new Map(fields.map(field => [field.id, field]))
  const whenLines = layers.map(layer => {
    const predicate = layer.groups
      .map((group, groupIndex) => {
        const conditionsSql = group.conditions
          .map(
            (condition, conditionIndex) =>
              `${conditionIndex > 0 ? `${condition.logicWithPrevious || 'AND'} ` : ''}${conditionToSql(condition, fieldMap)}`
          )
          .join(' ')
        return `${groupIndex > 0 ? `${group.logicWithPrevious || 'AND'} ` : ''}(${conditionsSql})`
      })
      .join(' ')
    return `  WHEN (${predicate}) THEN ${quoteSqlString(layer.name)}`
  })

  return {
    sql: ['CASE', ...whenLines, '  ELSE NULL', 'END'].join('\n'),
    validation
  }
}

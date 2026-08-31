export type RuleLogic = 'AND' | 'OR'

export type RuleOperator = '!=' | '<' | '<=' | '=' | '>' | '>=' | 'IS NOT NULL' | 'IS NULL' | 'LIKE' | 'NOT LIKE'

export type RuleFieldCategory = 'dates' | 'dimensions' | 'measures'

export interface RuleCondition {
  fieldId: string
  id: string
  logicWithPrevious?: RuleLogic
  operator: RuleOperator
  value?: number | string
}

export interface RuleGroup {
  conditions: RuleCondition[]
  id: string
  logicWithPrevious?: RuleLogic
  name: string
}

export interface RuleLayer {
  groups: RuleGroup[]
  id: string
  name: string
}

export interface RuleFieldOption {
  category: RuleFieldCategory
  dataType?: string
  id: string
  label: string
  sourceName: string
  tableName: string
}

export interface RuleTemplateFieldMeta {
  field: string
  fieldName: string
  value?: string
}

export type ApiRuleOperator = 'EQ' | 'GE' | 'GT' | 'IN' | 'LE' | 'LT' | 'NE' | 'NOT_IN' | 'NOT_NULL' | 'NULL'

export interface ApiRuleTemplateCondition {
  conditionId: string
  field: string
  fieldName: string
  operator: ApiRuleOperator
  operatorName: string
  value?: number | string
}

export interface ApiRuleTemplateExpression {
  conditions: ApiRuleTemplateCondition[]
  expressionId: string
  innerLogic: RuleLogic
  name: string
}

export interface ApiRuleTemplateLayer {
  expressions: ApiRuleTemplateExpression[]
  groupLogic: RuleLogic
  layerName: string
  sortOrder: number
}

export interface ApiRuleTemplates {
  layers: ApiRuleTemplateLayer[]
}

export interface RuleFieldTreeNode {
  children?: RuleFieldTreeNode[]
  isLeaf?: boolean
  selectable?: boolean
  title: string
  value: string
}

export interface RuleValidationIssue {
  message: string
  path: string
}

export interface RuleValidationResult {
  issues: RuleValidationIssue[]
  valid: boolean
}

export interface RuleSqlResult {
  sql: string
  validation: RuleValidationResult
}

export const RULE_EXPRESSION_LIMITS = {
  conditionsPerGroup: 20,
  groupsPerLayer: 10,
  layers: 20,
  totalConditions: 100
} as const

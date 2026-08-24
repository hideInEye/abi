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

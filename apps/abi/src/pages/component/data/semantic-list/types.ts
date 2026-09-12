export type SemanticRuleId = number | string

export type SemanticListType = 'BLACKLIST' | 'WHITELIST'

export type SemanticBusinessCategory = string

export type SemanticMatchTarget = string

export type SemanticMatchMethod = 'AST' | 'EXACT' | 'LIKE' | 'REGEX'

export type SemanticVisibility = 'PRIVATE' | 'PUBLIC'

export type SemanticRuleStatus = '0' | '1'

export interface SemanticDictionaryOption {
  label: string
  value: string
}

export interface SemanticAdvancedSetting {
  key: string
  value: string
}

export interface SemanticRule {
  advancedSettings: SemanticAdvancedSetting[]
  category: SemanticBusinessCategory
  code: string
  enabled: boolean
  hitExamples: string[]
  id: SemanticRuleId
  method: SemanticMatchMethod
  name: string
  pattern: string
  priority: number
  remark: string
  target: SemanticMatchTarget
  type: SemanticListType
  updatedAt: string
  visibility: SemanticVisibility
}

export interface SemanticRuleDraft {
  advancedSettings?: SemanticAdvancedSetting[]
  category: SemanticBusinessCategory
  method: SemanticMatchMethod
  name: string
  pattern: string
  priority?: number | null
  remark?: string
  target: SemanticMatchTarget
  type: SemanticListType
  visibility: SemanticVisibility
}

export type SemanticRuleField =
  | 'category'
  | 'method'
  | 'name'
  | 'pattern'
  | 'priority'
  | 'target'
  | 'type'
  | 'visibility'

export type SemanticRuleFieldErrors = Partial<Record<SemanticRuleField, string>>

export interface SemanticRuleFilters {
  category: string
  method: SemanticMatchMethod | ''
  ruleName: string
  status: SemanticRuleStatus | ''
  target: string
  type: SemanticListType | ''
  visibility: SemanticVisibility | ''
}

export type SemanticMatchResultStatus = 'empty' | 'invalid' | 'miss' | 'success' | 'unsupported'

export interface SemanticMatchResult {
  hit: string
  matched: boolean
  message: string
  status: SemanticMatchResultStatus
}

export interface SemanticRuleApiRecord {
  bizType?: unknown
  createTime?: unknown
  extConditions?: unknown
  hitExamples?: unknown
  listType?: unknown
  matchMethod?: unknown
  matchPattern?: unknown
  matchTarget?: unknown
  priority?: unknown
  remark?: unknown
  ruleCode?: unknown
  ruleId?: unknown
  ruleName?: unknown
  spaceId?: unknown
  status?: unknown
  updateTime?: unknown
  visibility?: unknown
}

export interface SemanticRuleListParams {
  bizType?: string
  listType?: SemanticListType
  matchMethod?: SemanticMatchMethod
  matchTarget?: string
  pageNum: number
  pageSize: number
  ruleName?: string
  spaceId: number
  status?: SemanticRuleStatus
  visibility?: SemanticVisibility
}

export interface SemanticRuleCreateParams {
  bizType: string
  extConditions: string
  listType: SemanticListType
  matchMethod: SemanticMatchMethod
  matchPattern: string
  matchTarget: string
  priority: number
  remark: string
  ruleName: string
  spaceId: number
  status: SemanticRuleStatus
  visibility: SemanticVisibility
}

export interface SemanticRuleUpdateParams extends SemanticRuleCreateParams {
  ruleId: SemanticRuleId
}

export interface SemanticRuleStatusUpdateParams {
  bizType: string
  listType: SemanticListType
  matchTarget: string
  ruleId: SemanticRuleId
  spaceId: number
  status: SemanticRuleStatus
}

export interface SemanticRulePage {
  records: SemanticRule[]
  total: number
}

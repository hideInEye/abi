export type SemanticListType = 'BLACKLIST' | 'WHITELIST'

export type SemanticBusinessCategory =
  | '个体精准分析'
  | '敏感数据'
  | '数据元信息探索'
  | '时间范围与边界'
  | '类别枚举'
  | '纯指标聚合'
  | '高危操作'

export type SemanticMatchTarget = 'DATE_TIME' | 'DB_NAME' | 'SQL_TEXT' | 'TABLE_NAME' | 'TEXT_CONTENT'

export type SemanticMatchMethod = 'EXACT' | 'LIKE' | 'REGEX'

export type SemanticVisibility = 'PRIVATE' | 'PUBLIC'

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
  id: number
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
  category: SemanticBusinessCategory | ''
  keyword: string
  method: SemanticMatchMethod | ''
  status: '' | 'DISABLED' | 'ENABLED'
  target: SemanticMatchTarget | ''
  type: SemanticListType | ''
}

export type SemanticMatchResultStatus = 'empty' | 'invalid' | 'miss' | 'success'

export interface SemanticMatchResult {
  hit: string
  matched: boolean
  message: string
  status: SemanticMatchResultStatus
}

export interface SemanticListState {
  nextSequence: number
  rules: SemanticRule[]
}

export type SemanticListAction =
  | { draft: SemanticRuleDraft; now: string; type: 'create' }
  | { draft: SemanticRuleDraft; id: number; now: string; type: 'update' }
  | { enabled: boolean; ids: number[]; now: string; type: 'set-status' }
  | { ids: number[]; type: 'delete' }

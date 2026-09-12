import type {
  SemanticListType,
  SemanticMatchMethod,
  SemanticRuleDraft,
  SemanticRuleFilters,
  SemanticVisibility
} from './types'

export const PAGE_SIZE = 20

export const LIST_TYPE_OPTIONS: Array<{ label: string; value: SemanticListType }> = [
  { label: '白名单', value: 'WHITELIST' },
  { label: '黑名单', value: 'BLACKLIST' }
]

export const MATCH_METHOD_OPTIONS: Array<{ label: string; value: SemanticMatchMethod }> = [
  { label: '精确', value: 'EXACT' },
  { label: '模糊', value: 'LIKE' },
  { label: '正则', value: 'REGEX' },
  { label: 'AST', value: 'AST' }
]

export const VISIBILITY_OPTIONS: Array<{ label: string; value: SemanticVisibility }> = [
  { label: '公开', value: 'PUBLIC' },
  { label: '私有', value: 'PRIVATE' }
]

export const LIST_TYPE_LABELS: Record<SemanticListType, string> = {
  BLACKLIST: '黑名单',
  WHITELIST: '白名单'
}

export const MATCH_METHOD_LABELS: Record<SemanticMatchMethod, string> = {
  AST: 'AST 匹配',
  EXACT: '精确匹配',
  LIKE: '模糊匹配',
  REGEX: '正则匹配'
}

export const VISIBILITY_LABELS: Record<SemanticVisibility, string> = {
  PRIVATE: '私有',
  PUBLIC: '公开'
}

export interface SmartHelperExample {
  label: string
  value: string
}

export interface SmartHelperConfig {
  description: string
  examples: SmartHelperExample[]
}

export const SMART_HELPERS: Partial<Record<string, Partial<Record<SemanticMatchMethod, SmartHelperConfig>>>> = {
  AST_FEATURE: {
    AST: { description: 'AST 表达式由服务端解析和匹配', examples: [] },
    EXACT: { description: '精确匹配完整 AST 特征值', examples: [] },
    LIKE: { description: '按 AST 特征文本模式进行模糊匹配', examples: [] },
    REGEX: { description: '使用正则表达式识别 AST 特征', examples: [] }
  },
  DB_NAME: {
    AST: { description: 'AST 匹配由服务端解析和执行', examples: [] },
    EXACT: { description: '精确匹配完整数据库名', examples: [{ label: '数据库名', value: 'prod_main' }] },
    LIKE: { description: '按数据库命名模式进行模糊匹配', examples: [{ label: '生产库前缀', value: 'prod_%' }] },
    REGEX: {
      description: '使用正则表达式匹配数据库命名模式',
      examples: [{ label: '生产/预发布库', value: '^(prod|staging)_.*' }]
    }
  },
  SQL_TEXT: {
    AST: { description: '由服务端基于 SQL AST 结构执行匹配', examples: [] },
    EXACT: { description: '完整 SQL 必须与表达式完全一致，通常不作为优先方式', examples: [] },
    LIKE: { description: '按 SQL 文本片段进行模糊匹配', examples: [{ label: '查询结构', value: 'select%from%' }] },
    REGEX: {
      description: '使用正则表达式识别 SQL 文本模式',
      examples: [{ label: '高危操作', value: '(?i)drop\\s+table' }]
    }
  },
  TABLE_NAME: {
    AST: { description: 'AST 匹配由服务端解析和执行', examples: [] },
    EXACT: { description: '精确匹配完整表名', examples: [{ label: '精确表名', value: 'dim_customer' }] },
    LIKE: { description: '按表名模式进行模糊匹配', examples: [{ label: '表名前缀', value: 'dim_%' }] },
    REGEX: { description: '使用正则表达式匹配表名模式', examples: [{ label: '维度表', value: '^dim_\\w+$' }] }
  }
}

export const MATCH_METHOD_HINTS: Record<SemanticMatchMethod, string> = {
  AST: 'AST 表达式由服务端解析，前端暂不提供匹配测试。',
  EXACT: '输入需要被完整匹配的具体内容。',
  LIKE: '支持 % 匹配任意长度内容，_ 匹配单个字符。',
  REGEX: '使用正则表达式进行匹配，可在下方先测试再保存。'
}

export const EMPTY_FILTERS: SemanticRuleFilters = {
  category: '',
  method: '',
  ruleName: '',
  status: '',
  target: '',
  type: '',
  visibility: ''
}

export const DEFAULT_RULE_DRAFT: SemanticRuleDraft = {
  advancedSettings: [],
  category: '',
  method: 'EXACT',
  name: '',
  pattern: '',
  priority: 100,
  remark: '',
  target: '',
  type: 'WHITELIST',
  visibility: 'PUBLIC'
}

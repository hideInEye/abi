import type {
  SemanticListType,
  SemanticMatchMethod,
  SemanticRuleDraft,
  SemanticRuleFilters,
  SemanticVisibility
} from './types'

export const PAGE_SIZE_OPTIONS = [12, 18, 24, 30]
export const PAGE_SIZE = PAGE_SIZE_OPTIONS[0]

export const LIST_TYPE_OPTIONS: Array<{ label: string; value: SemanticListType }> = [
  { label: '白名单', value: 'WHITELIST' },
  { label: '黑名单', value: 'BLACKLIST' }
]

export const MATCH_METHOD_OPTIONS: Array<{ label: string; value: SemanticMatchMethod }> = [
  { label: '精确', value: 'EXACT' },
  { label: '模糊', value: 'LIKE' },
  { label: '正则', value: 'REGEX' }
]

export const VISIBILITY_OPTIONS: Array<{ label: string; value: SemanticVisibility }> = [
  { label: '平台', value: 'PUBLIC' },
  { label: '空间', value: 'PRIVATE' }
]

export const LIST_TYPE_LABELS: Record<SemanticListType, string> = {
  BLACKLIST: '黑名单',
  WHITELIST: '白名单'
}

export const MATCH_METHOD_LABELS: Record<SemanticMatchMethod, string> = {
  EXACT: '精确匹配',
  LIKE: '模糊匹配',
  REGEX: '正则匹配'
}

export const VISIBILITY_LABELS: Record<SemanticVisibility, string> = {
  PRIVATE: '空间',
  PUBLIC: '平台'
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
    EXACT: { description: '精确匹配完整 AST 特征值', examples: [] },
    LIKE: { description: '按 AST 特征文本模式进行模糊匹配', examples: [] },
    REGEX: { description: '使用正则表达式识别 AST 特征', examples: [] }
  },
  DATE_TIME: {
    EXACT: {
      description: '精确匹配日期时间字符串',
      examples: [
        { label: '固定日期', value: '2026-01-01' },
        { label: '固定时间', value: '2026-01-01 00:00:00' }
      ]
    },
    LIKE: { description: '日期时间通常不建议使用模糊匹配', examples: [] },
    REGEX: {
      description: '使用正则表达式匹配日期时间格式',
      examples: [{ label: '年月格式', value: '\\d{4}-(?:0[1-9]|1[0-2])' }]
    }
  },
  DB_NAME: {
    EXACT: { description: '精确匹配完整数据库名', examples: [{ label: '数据库名', value: 'prod_main' }] },
    LIKE: { description: '按数据库命名模式进行模糊匹配', examples: [{ label: '生产库前缀', value: 'prod_%' }] },
    REGEX: {
      description: '使用正则表达式匹配数据库命名模式',
      examples: [{ label: '生产/预发布库', value: '^(prod|staging)_.*' }]
    }
  },
  SQL_TEXT: {
    EXACT: { description: '完整 SQL 必须与表达式完全一致，通常不作为优先方式', examples: [] },
    LIKE: { description: '按 SQL 文本片段进行模糊匹配', examples: [{ label: '查询结构', value: 'select%from%' }] },
    REGEX: {
      description: '使用正则表达式识别 SQL 文本模式',
      examples: [{ label: '高危操作', value: '(?i)drop\\s+table' }]
    }
  },
  TABLE_NAME: {
    EXACT: { description: '精确匹配完整表名', examples: [{ label: '精确表名', value: 'dim_customer' }] },
    LIKE: { description: '按表名模式进行模糊匹配', examples: [{ label: '表名前缀', value: 'dim_%' }] },
    REGEX: { description: '使用正则表达式匹配表名模式', examples: [{ label: '维度表', value: '^dim_\\w+$' }] }
  },
  TEXT_CONTENT: {
    EXACT: { description: '文本内容通常不建议使用精确匹配', examples: [] },
    LIKE: { description: '按文本中的关键词或片段进行模糊匹配', examples: [{ label: '关键词', value: '%password%' }] },
    REGEX: {
      description: '使用正则表达式识别文本内容模式',
      examples: [{ label: '敏感信息', value: '(?i)(secret|token)\\s*=' }]
    }
  }
}

export const MATCH_METHOD_HINTS: Record<SemanticMatchMethod, string> = {
  EXACT: '输入需要被完整匹配的具体内容。',
  LIKE: '支持 % 匹配任意长度内容，_ 匹配单个字符。',
  REGEX: '使用正则表达式进行匹配，可在下方先测试再保存。'
}

export const EMPTY_FILTERS: SemanticRuleFilters = {
  category: '',
  method: '',
  ruleCodeOrName: '',
  status: '',
  target: '',
  type: '',
  visibility: ''
}

export const DEFAULT_RULE_DRAFT: SemanticRuleDraft = {
  advancedSettings: [],
  category: '',
  method: undefined,
  name: '',
  pattern: '',
  priority: undefined,
  remark: '',
  target: undefined,
  type: undefined,
  visibility: undefined
}

export const DETAIL_HIT_EXAMPLES: Readonly<Record<string, readonly string[]>> = {
  DATE_TIME: ['2026-01-01 00:00:00'],
  DB_NAME: ['prod_finance'],
  SQL_TEXT: ['select count(*) from trade_detail'],
  TABLE_NAME: ['dim_customer'],
  TEXT_CONTENT: ['查询账户A1024的交易流水']
}

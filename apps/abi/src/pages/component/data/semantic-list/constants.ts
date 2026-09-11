import type {
  SemanticBusinessCategory,
  SemanticListType,
  SemanticMatchMethod,
  SemanticMatchTarget,
  SemanticRule,
  SemanticRuleDraft,
  SemanticRuleFilters,
  SemanticVisibility
} from './types'

export const PAGE_SIZE = 20

export const LIST_TYPE_OPTIONS: Array<{ label: string; value: SemanticListType }> = [
  { label: '白名单', value: 'WHITELIST' },
  { label: '黑名单', value: 'BLACKLIST' }
]

export const BUSINESS_CATEGORIES: Record<SemanticListType, SemanticBusinessCategory[]> = {
  BLACKLIST: ['高危操作', '敏感数据'],
  WHITELIST: ['时间范围与边界', '数据元信息探索', '纯指标聚合', '类别枚举', '个体精准分析']
}

export const ALL_BUSINESS_CATEGORIES = [...BUSINESS_CATEGORIES.WHITELIST, ...BUSINESS_CATEGORIES.BLACKLIST]

export const MATCH_TARGET_OPTIONS: Array<{ label: string; value: SemanticMatchTarget }> = [
  { label: '表名', value: 'TABLE_NAME' },
  { label: 'SQL文本', value: 'SQL_TEXT' },
  { label: '数据库名', value: 'DB_NAME' },
  { label: '日期时间', value: 'DATE_TIME' },
  { label: '文本内容', value: 'TEXT_CONTENT' }
]

export const MATCH_METHOD_OPTIONS: Array<{ label: string; value: SemanticMatchMethod }> = [
  { label: '精确', value: 'EXACT' },
  { label: '模糊', value: 'LIKE' },
  { label: '正则', value: 'REGEX' }
]

export const VISIBILITY_OPTIONS: Array<{ label: string; value: SemanticVisibility }> = [
  { label: '公开', value: 'PUBLIC' },
  { label: '私有', value: 'PRIVATE' }
]

export const LIST_TYPE_LABELS: Record<SemanticListType, string> = {
  BLACKLIST: '黑名单',
  WHITELIST: '白名单'
}

export const MATCH_TARGET_LABELS: Record<SemanticMatchTarget, string> = Object.fromEntries(
  MATCH_TARGET_OPTIONS.map(item => [item.value, item.label])
) as Record<SemanticMatchTarget, string>

export const MATCH_METHOD_LABELS: Record<SemanticMatchMethod, string> = {
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

export const SMART_HELPERS: Record<SemanticMatchTarget, Record<SemanticMatchMethod, SmartHelperConfig>> = {
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
  keyword: '',
  method: '',
  status: '',
  target: '',
  type: ''
}

export const DEFAULT_RULE_DRAFT: SemanticRuleDraft = {
  advancedSettings: [],
  category: BUSINESS_CATEGORIES.WHITELIST[0],
  method: 'EXACT',
  name: '',
  pattern: '',
  priority: 100,
  remark: '',
  target: 'TABLE_NAME',
  type: 'WHITELIST',
  visibility: 'PUBLIC'
}

export const SEMANTIC_RULE_FIXTURES: SemanticRule[] = [
  {
    advancedSettings: [],
    category: '时间范围与边界',
    code: 'WL_TIME_BOUNDARY_001',
    enabled: true,
    hitExamples: ['2026-01-01 00:00:00'],
    id: 1,
    method: 'EXACT',
    name: '时间范围与边界查询放行',
    pattern: '2026-01-01 00:00:00',
    priority: 100,
    remark: '用于时间范围与边界类查询。',
    target: 'DATE_TIME',
    type: 'WHITELIST',
    updatedAt: '2026-09-09 09:30',
    visibility: 'PUBLIC'
  },
  {
    advancedSettings: [],
    category: '数据元信息探索',
    code: 'WL_META_EXPLORE_001',
    enabled: true,
    hitExamples: ['dim_customer'],
    id: 2,
    method: 'LIKE',
    name: '数据元信息探索放行',
    pattern: 'dim_%',
    priority: 100,
    remark: '用于数据元信息探索类查询。',
    target: 'TABLE_NAME',
    type: 'WHITELIST',
    updatedAt: '2026-09-09 09:28',
    visibility: 'PUBLIC'
  },
  {
    advancedSettings: [],
    category: '纯指标聚合',
    code: 'WL_AGGREGATE_001',
    enabled: true,
    hitExamples: ['select count(*) from trade_detail'],
    id: 3,
    method: 'LIKE',
    name: '纯指标聚合查询放行',
    pattern: 'select%from%',
    priority: 90,
    remark: '用于纯指标聚合类查询。',
    target: 'SQL_TEXT',
    type: 'WHITELIST',
    updatedAt: '2026-09-09 09:25',
    visibility: 'PUBLIC'
  },
  {
    advancedSettings: [],
    category: '类别枚举',
    code: 'WL_ENUM_001',
    enabled: true,
    hitExamples: ['dim_pay_channel'],
    id: 4,
    method: 'REGEX',
    name: '类别枚举查询放行',
    pattern: '^dim_\\w+$',
    priority: 90,
    remark: '用于类别枚举类查询。',
    target: 'TABLE_NAME',
    type: 'WHITELIST',
    updatedAt: '2026-09-09 09:20',
    visibility: 'PUBLIC'
  },
  {
    advancedSettings: [],
    category: '个体精准分析',
    code: 'WL_ENTITY_DETAIL_001',
    enabled: true,
    hitExamples: ['查询账户A1024的交易流水'],
    id: 5,
    method: 'LIKE',
    name: '个体精准分析放行',
    pattern: '%交易流水%',
    priority: 120,
    remark: '用于个体精准分析类查询。',
    target: 'TEXT_CONTENT',
    type: 'WHITELIST',
    updatedAt: '2026-09-09 09:18',
    visibility: 'PUBLIC'
  },
  {
    advancedSettings: [],
    category: '高危操作',
    code: 'BL_HIGH_RISK_001',
    enabled: true,
    hitExamples: ['DROP TABLE customer'],
    id: 6,
    method: 'REGEX',
    name: '高危DDL操作拦截',
    pattern: '(?i)drop\\s+table',
    priority: 200,
    remark: '拦截高危 DDL 操作。',
    target: 'SQL_TEXT',
    type: 'BLACKLIST',
    updatedAt: '2026-09-08 16:45',
    visibility: 'PUBLIC'
  },
  {
    advancedSettings: [],
    category: '敏感数据',
    code: 'BL_SENSITIVE_DB_001',
    enabled: true,
    hitExamples: ['prod_finance'],
    id: 7,
    method: 'REGEX',
    name: '敏感数据库访问拦截',
    pattern: '^(prod|staging)_.*',
    priority: 180,
    remark: '拦截符合敏感数据库命名规则的访问。',
    target: 'DB_NAME',
    type: 'BLACKLIST',
    updatedAt: '2026-09-08 14:10',
    visibility: 'PUBLIC'
  }
]

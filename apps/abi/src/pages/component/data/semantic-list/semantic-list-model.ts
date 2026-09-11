import { BUSINESS_CATEGORIES, SEMANTIC_RULE_FIXTURES } from './constants'
import type {
  SemanticAdvancedSetting,
  SemanticListAction,
  SemanticListState,
  SemanticMatchMethod,
  SemanticMatchResult,
  SemanticRule,
  SemanticRuleDraft,
  SemanticRuleFieldErrors,
  SemanticRuleFilters
} from './types'

type NormalizedSemanticRuleDraft = Omit<SemanticRuleDraft, 'advancedSettings' | 'priority' | 'remark'> & {
  advancedSettings: SemanticAdvancedSetting[]
  priority: number
  remark: string
}

function cloneRule(rule: SemanticRule): SemanticRule {
  return {
    ...rule,
    advancedSettings: rule.advancedSettings.map(item => ({ ...item })),
    hitExamples: [...rule.hitExamples]
  }
}

export function createInitialSemanticListState(): SemanticListState {
  return {
    nextSequence: Math.max(...SEMANTIC_RULE_FIXTURES.map(rule => rule.id)) + 1,
    rules: SEMANTIC_RULE_FIXTURES.map(cloneRule)
  }
}

export function generateSemanticRuleCode(sequence: number): string {
  return `RULE_${String(sequence).padStart(6, '0')}`
}

export function normalizeSemanticRuleDraft(draft: SemanticRuleDraft): NormalizedSemanticRuleDraft {
  return {
    ...draft,
    advancedSettings: (draft.advancedSettings ?? [])
      .filter(item => item.key.trim() || item.value.trim())
      .map(item => ({ ...item })),
    name: draft.name.trim(),
    pattern: draft.pattern.trim(),
    priority: typeof draft.priority === 'number' && Number.isFinite(draft.priority) ? draft.priority : 100,
    remark: draft.remark?.trim() ?? ''
  }
}

export function semanticListReducer(state: SemanticListState, action: SemanticListAction): SemanticListState {
  if (action.type === 'create') {
    const draft = normalizeSemanticRuleDraft(action.draft)
    const newRule: SemanticRule = {
      ...draft,
      code: generateSemanticRuleCode(state.nextSequence),
      enabled: true,
      hitExamples: [],
      id: state.nextSequence,
      updatedAt: action.now
    }

    return {
      nextSequence: state.nextSequence + 1,
      rules: [newRule, ...state.rules]
    }
  }

  if (action.type === 'update') {
    const draft = normalizeSemanticRuleDraft(action.draft)
    return {
      ...state,
      rules: state.rules.map(rule => (rule.id === action.id ? { ...rule, ...draft, updatedAt: action.now } : rule))
    }
  }

  if (action.type === 'set-status') {
    const ids = new Set(action.ids)
    return {
      ...state,
      rules: state.rules.map(rule =>
        ids.has(rule.id) ? { ...rule, enabled: action.enabled, updatedAt: action.now } : rule
      )
    }
  }

  const ids = new Set(action.ids)
  return {
    ...state,
    rules: state.rules.filter(rule => !ids.has(rule.id))
  }
}

export function filterSemanticRules(rules: SemanticRule[], filters: SemanticRuleFilters): SemanticRule[] {
  const keyword = filters.keyword.trim().toLocaleLowerCase()

  return rules.filter(rule => {
    const matchesKeyword =
      !keyword || rule.name.toLocaleLowerCase().includes(keyword) || rule.code.toLocaleLowerCase().includes(keyword)
    const matchesType = !filters.type || rule.type === filters.type
    const matchesCategory = !filters.category || rule.category === filters.category
    const matchesStatus = !filters.status || rule.enabled === (filters.status === 'ENABLED')
    const matchesTarget = !filters.target || rule.target === filters.target
    const matchesMethod = !filters.method || rule.method === filters.method

    return matchesKeyword && matchesType && matchesCategory && matchesStatus && matchesTarget && matchesMethod
  })
}

export function clampSemanticListPage(page: number, total: number, pageSize: number): number {
  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  return Math.min(Math.max(1, page), lastPage)
}

export function compileSemanticRegex(rawPattern: string): RegExp {
  const caseInsensitive = rawPattern.startsWith('(?i)')
  const pattern = caseInsensitive ? rawPattern.slice(4) : rawPattern
  return new RegExp(pattern, caseInsensitive ? 'i' : '')
}

export function convertLikePatternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '.*')
    .replace(/_/g, '.')
  return new RegExp(`^${escaped}$`, 'i')
}

export function testSemanticRule(method: SemanticMatchMethod, pattern: string, text: string): SemanticMatchResult {
  if (!text) {
    return { hit: '', matched: false, message: '请输入测试文本', status: 'empty' }
  }

  try {
    let match: RegExpExecArray | string[] | null
    if (method === 'EXACT') {
      match = text === pattern ? [text] : null
    } else if (method === 'LIKE') {
      match = convertLikePatternToRegex(pattern).exec(text)
    } else {
      match = compileSemanticRegex(pattern).exec(text)
    }

    if (!match) {
      return { hit: '', matched: false, message: '未命中当前规则', status: 'miss' }
    }

    return { hit: match[0], matched: true, message: `匹配成功，命中内容：${match[0]}`, status: 'success' }
  } catch {
    return { hit: '', matched: false, message: '正则表达式格式错误', status: 'invalid' }
  }
}

export function validateSemanticRuleDraft(draft: SemanticRuleDraft): SemanticRuleFieldErrors {
  const errors: SemanticRuleFieldErrors = {}

  if (!draft.name.trim()) errors.name = '请填写规则名称'
  if (!['WHITELIST', 'BLACKLIST'].includes(draft.type)) errors.type = '请选择名单类型'
  if (!BUSINESS_CATEGORIES[draft.type]?.includes(draft.category)) errors.category = '请选择业务类别'
  if (
    draft.priority !== undefined &&
    draft.priority !== null &&
    (!Number.isFinite(draft.priority) || draft.priority < 0)
  )
    errors.priority = '请输入有效的优先级'
  if (!['PUBLIC', 'PRIVATE'].includes(draft.visibility)) errors.visibility = '请选择有效的可见性'
  if (!['TABLE_NAME', 'SQL_TEXT', 'DB_NAME', 'DATE_TIME', 'TEXT_CONTENT'].includes(draft.target))
    errors.target = '请选择匹配目标'
  if (!['EXACT', 'LIKE', 'REGEX'].includes(draft.method)) errors.method = '请选择匹配方式'
  if (!draft.pattern.trim()) errors.pattern = '请填写匹配内容'

  if (draft.method === 'REGEX' && draft.pattern.trim()) {
    try {
      compileSemanticRegex(draft.pattern.trim())
    } catch {
      errors.pattern = '正则表达式格式错误'
    }
  }

  return errors
}

export function formatSemanticRuleTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

import type {
  SemanticAdvancedSetting,
  SemanticMatchMethod,
  SemanticMatchResult,
  SemanticRule,
  SemanticRuleCreateParams,
  SemanticRuleDraft,
  SemanticRuleFieldErrors,
  SemanticRuleId,
  SemanticRuleListParams,
  SemanticRuleStatusUpdateParams,
  SemanticRuleUpdateParams
} from './types'

export type NormalizedSemanticRuleDraft = Omit<
  SemanticRuleDraft,
  'advancedSettings' | 'priority' | 'remark' | 'target'
> & {
  advancedSettings: SemanticAdvancedSetting[]
  priority?: number
  remark: string
  target: string
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function normalizeSemanticRuleDraft(draft: SemanticRuleDraft): NormalizedSemanticRuleDraft {
  return {
    ...draft,
    advancedSettings: (draft.advancedSettings ?? [])
      .filter(item => normalizeText(item.key).trim() || normalizeText(item.value).trim())
      .map(item => ({ key: normalizeText(item.key), value: normalizeText(item.value) })),
    category: normalizeText(draft.category).trim(),
    name: normalizeText(draft.name).trim(),
    pattern: normalizeText(draft.pattern).trim(),
    priority: typeof draft.priority === 'number' && Number.isFinite(draft.priority) ? draft.priority : undefined,
    remark: normalizeText(draft.remark).trim(),
    target: normalizeText(draft.target).trim()
  }
}

export function serializeAdvancedSettings(settings: readonly SemanticAdvancedSetting[] | undefined): string {
  const result = Object.create(null) as Record<string, string>
  for (const item of settings ?? []) {
    const key = normalizeText(item.key)
    const value = normalizeText(item.value)
    if (key.trim() || value.trim()) result[key] = value
  }
  return JSON.stringify(result)
}

interface SemanticRuleListQueryInput {
  filters: {
    category: string
    method: SemanticMatchMethod | ''
    ruleCodeOrName: string
    status: '' | '0' | '1'
    target: string
    type: '' | 'BLACKLIST' | 'WHITELIST'
    visibility: '' | 'PRIVATE' | 'PUBLIC'
  }
  pageNum: number
  pageSize: number
  spaceId: number
}

export function buildSemanticRuleListParams({
  filters,
  pageNum,
  pageSize,
  spaceId
}: SemanticRuleListQueryInput): SemanticRuleListParams {
  return {
    bizType: filters.category.trim() || undefined,
    listType: filters.type || undefined,
    matchMethod: filters.method || undefined,
    matchTarget: filters.target.trim() || undefined,
    pageNum,
    pageSize,
    ruleCodeOrName: filters.ruleCodeOrName.trim() || undefined,
    spaceId,
    status: filters.status || undefined,
    visibility: filters.visibility || undefined
  }
}

export function buildSemanticRuleCreateParams(spaceId: number, draft: SemanticRuleDraft): SemanticRuleCreateParams {
  const normalized = normalizeSemanticRuleDraft(draft)
  const params: SemanticRuleCreateParams = {
    bizType: normalized.category,
    extConditions: serializeAdvancedSettings(normalized.advancedSettings),
    listType: normalized.type!,
    matchMethod: normalized.method!,
    matchPattern: normalized.pattern,
    matchTarget: normalized.target,
    remark: normalized.remark,
    ruleName: normalized.name,
    spaceId,
    status: '1',
    visibility: normalized.visibility!
  }
  if (normalized.priority !== undefined) params.priority = normalized.priority
  return params
}

interface SemanticRuleUpdateInput {
  draft: SemanticRuleDraft
  enabled?: boolean
  rule: SemanticRule
  spaceId: number
}

export function buildSemanticRuleUpdateParams({
  draft,
  enabled,
  rule,
  spaceId
}: SemanticRuleUpdateInput): SemanticRuleUpdateParams {
  return {
    ...buildSemanticRuleCreateParams(spaceId, draft),
    ruleId: rule.id,
    status: (enabled ?? rule.enabled) ? '1' : '0'
  }
}

export function semanticRuleToDraft(rule: SemanticRule): SemanticRuleDraft {
  return {
    advancedSettings: rule.advancedSettings.map(item => ({ ...item })),
    category: rule.category,
    method: rule.method,
    name: rule.name,
    pattern: rule.pattern,
    priority: rule.priority,
    remark: rule.remark,
    target: rule.target,
    type: rule.type,
    visibility: rule.visibility
  }
}

export function buildSemanticRuleStatusUpdateParams(
  ruleIds: readonly SemanticRuleId[],
  enabled: boolean
): SemanticRuleStatusUpdateParams {
  return {
    ruleIds: [...ruleIds],
    status: enabled ? '1' : '0'
  }
}

export function compileSemanticRegex(rawPattern: string): RegExp {
  const caseInsensitive = rawPattern.startsWith('(?i)')
  const pattern = caseInsensitive ? rawPattern.slice(4) : rawPattern
  return new RegExp(pattern, caseInsensitive ? 'i' : '')
}

export function convertLikePatternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '[\\s\\S]*')
    .replace(/_/g, '[\\s\\S]')
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

  if (!normalizeText(draft.name).trim()) errors.name = '请填写规则名称'
  if (draft.type !== 'WHITELIST' && draft.type !== 'BLACKLIST') errors.type = '请选择名单类型'
  if (!normalizeText(draft.category).trim()) errors.category = '请选择或填写业务类别'
  if (
    draft.priority !== undefined &&
    draft.priority !== null &&
    (!Number.isFinite(draft.priority) || draft.priority < 0)
  )
    errors.priority = '请输入有效的优先级'
  if (draft.visibility !== 'PUBLIC' && draft.visibility !== 'PRIVATE') errors.visibility = '请选择有效的可见性'
  if (!normalizeText(draft.target).trim()) errors.target = '请选择匹配目标'
  if (draft.method !== 'EXACT' && draft.method !== 'LIKE' && draft.method !== 'REGEX') errors.method = '请选择匹配方式'
  if (!normalizeText(draft.pattern).trim()) errors.pattern = '请填写匹配内容'

  if (draft.method === 'REGEX' && normalizeText(draft.pattern).trim()) {
    try {
      compileSemanticRegex(normalizeText(draft.pattern).trim())
    } catch {
      errors.pattern = '正则表达式格式错误'
    }
  }

  return errors
}

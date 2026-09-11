import { describe, expect, it } from 'vitest'

import { EMPTY_FILTERS } from './constants'
import {
  clampSemanticListPage,
  convertLikePatternToRegex,
  createInitialSemanticListState,
  filterSemanticRules,
  formatSemanticRuleTime,
  semanticListReducer,
  testSemanticRule,
  validateSemanticRuleDraft
} from './semantic-list-model'
import type { SemanticRuleDraft } from './types'

const validDraft: SemanticRuleDraft = {
  advancedSettings: [],
  category: '时间范围与边界',
  method: 'EXACT',
  name: '测试规则',
  pattern: 'dim_customer',
  priority: 100,
  remark: '说明',
  target: 'TABLE_NAME',
  type: 'WHITELIST',
  visibility: 'PUBLIC'
}

describe('semantic list filtering and pagination', () => {
  it('fuzzy searches the trimmed keyword against name and code', () => {
    const { rules } = createInitialSemanticListState()

    expect(filterSemanticRules(rules, { ...EMPTY_FILTERS, keyword: '  meta_explore  ' }).map(rule => rule.id)).toEqual([
      2
    ])
    expect(filterSemanticRules(rules, { ...EMPTY_FILTERS, keyword: '高危ddl' }).map(rule => rule.id)).toEqual([6])
  })

  it('combines type, category, status, target and method filters', () => {
    const initial = createInitialSemanticListState()
    const state = semanticListReducer(initial, {
      enabled: false,
      ids: [6],
      now: '2026-09-10 10:00',
      type: 'set-status'
    })
    const result = filterSemanticRules(state.rules, {
      category: '高危操作',
      keyword: '',
      method: 'REGEX',
      status: 'DISABLED',
      target: 'SQL_TEXT',
      type: 'BLACKLIST'
    })

    expect(result.map(rule => rule.code)).toEqual(['BL_HIGH_RISK_001'])
    expect(filterSemanticRules(state.rules, EMPTY_FILTERS)).toHaveLength(7)
    expect(filterSemanticRules(state.rules, { ...EMPTY_FILTERS, keyword: '不存在' })).toEqual([])
  })

  it('clamps invalid and out-of-range pages', () => {
    expect(clampSemanticListPage(3, 21, 20)).toBe(2)
    expect(clampSemanticListPage(0, 21, 20)).toBe(1)
    expect(clampSemanticListPage(5, 0, 20)).toBe(1)
  })
})

describe('semantic rule matcher', () => {
  it('uses complete case-sensitive equality for exact matching', () => {
    expect(testSemanticRule('EXACT', 'dim_customer', 'dim_customer').matched).toBe(true)
    expect(testSemanticRule('EXACT', 'dim_customer', 'DIM_CUSTOMER').matched).toBe(false)
    expect(testSemanticRule('EXACT', 'dim_customer', 'prefix_dim_customer').matched).toBe(false)
  })

  it('supports LIKE percent, underscore, escaping and case-insensitive matching', () => {
    expect(testSemanticRule('LIKE', 'select%from%', 'SELECT count(*) FROM orders').matched).toBe(true)
    expect(testSemanticRule('LIKE', 'ab_d', 'abXd').matched).toBe(true)
    expect(testSemanticRule('LIKE', 'ab_d', 'abXXd').matched).toBe(false)
    expect(convertLikePatternToRegex('dim_%.v1').test('DIM_customer.v1')).toBe(true)
    expect(convertLikePatternToRegex('dim_%.v1').test('dim_customer-v1')).toBe(false)
  })

  it('supports regular expressions, the leading case-insensitive marker and invalid input', () => {
    expect(testSemanticRule('REGEX', '^dim_\\w+$', 'dim_customer').matched).toBe(true)
    expect(testSemanticRule('REGEX', '(?i)drop\\s+table', 'DROP TABLE customer').matched).toBe(true)
    expect(testSemanticRule('REGEX', '[invalid', 'anything').status).toBe('invalid')
    expect(testSemanticRule('REGEX', '^dim_', 'fact_order').status).toBe('miss')
  })

  it('reports an empty test text before attempting a match', () => {
    expect(testSemanticRule('REGEX', '[invalid', '')).toMatchObject({ message: '请输入测试文本', status: 'empty' })
  })
})

describe('semantic list state transitions', () => {
  it('creates an enabled rule with a unique demo code and normalized values', () => {
    const initial = createInitialSemanticListState()
    const state = semanticListReducer(initial, {
      draft: {
        ...validDraft,
        advancedSettings: [
          { key: ' space ', value: ' retail ' },
          { key: ' ', value: '  ' },
          { key: 'tenant', value: '' }
        ],
        name: '  新规则  ',
        pattern: '  dim_order  ',
        priority: null
      },
      now: '2026-09-10 10:10',
      type: 'create'
    })

    expect(state).not.toBe(initial)
    expect(initial.rules).toHaveLength(7)
    expect(state.rules[0]).toMatchObject({
      code: 'RULE_000008',
      enabled: true,
      id: 8,
      name: '新规则',
      pattern: 'dim_order',
      priority: 100,
      updatedAt: '2026-09-10 10:10'
    })
    expect(state.rules[0].advancedSettings).toEqual([
      { key: ' space ', value: ' retail ' },
      { key: 'tenant', value: '' }
    ])
    expect(state.nextSequence).toBe(9)
  })

  it('edits mutable fields while preserving identity, code, status and examples', () => {
    const initial = createInitialSemanticListState()
    const disabled = semanticListReducer(initial, {
      enabled: false,
      ids: [1],
      now: '2026-09-10 10:00',
      type: 'set-status'
    })
    const state = semanticListReducer(disabled, {
      draft: { ...validDraft, name: '修改后' },
      id: 1,
      now: '2026-09-10 10:11',
      type: 'update'
    })
    const updated = state.rules.find(rule => rule.id === 1)

    expect(updated).toMatchObject({
      code: 'WL_TIME_BOUNDARY_001',
      enabled: false,
      id: 1,
      name: '修改后',
      updatedAt: '2026-09-10 10:11'
    })
    expect(updated?.hitExamples).toEqual(['2026-01-01 00:00:00'])
  })

  it('updates statuses in a batch without mutating unaffected records', () => {
    const initial = createInitialSemanticListState()
    const unaffected = initial.rules[2]
    const state = semanticListReducer(initial, {
      enabled: false,
      ids: [1, 2],
      now: '2026-09-10 10:12',
      type: 'set-status'
    })

    expect(state.rules.slice(0, 2).every(rule => !rule.enabled && rule.updatedAt === '2026-09-10 10:12')).toBe(true)
    expect(state.rules[2]).toBe(unaffected)
    expect(initial.rules[0].enabled).toBe(true)
  })

  it('deletes single and multiple rules without reusing the sequence', () => {
    const initial = createInitialSemanticListState()
    const single = semanticListReducer(initial, { ids: [1], type: 'delete' })
    const batch = semanticListReducer(single, { ids: [2, 3], type: 'delete' })

    expect(batch.rules.map(rule => rule.id)).toEqual([4, 5, 6, 7])
    expect(batch.nextSequence).toBe(8)
    expect(initial.rules).toHaveLength(7)
  })
})

describe('semantic rule validation', () => {
  it('accepts the valid draft without inventing length limits', () => {
    expect(validateSemanticRuleDraft({ ...validDraft, name: 'a'.repeat(500), remark: 'b'.repeat(2000) })).toEqual({})
  })

  it('rejects whitespace required values, negative priority and invalid regex', () => {
    expect(validateSemanticRuleDraft({ ...validDraft, name: '  ', pattern: '  ', priority: -1 })).toMatchObject({
      name: '请填写规则名称',
      pattern: '请填写匹配内容',
      priority: '请输入有效的优先级'
    })
    expect(validateSemanticRuleDraft({ ...validDraft, method: 'REGEX', pattern: '[invalid' })).toMatchObject({
      pattern: '正则表达式格式错误'
    })
  })

  it('rejects a category that does not belong to the selected list type', () => {
    expect(validateSemanticRuleDraft({ ...validDraft, type: 'BLACKLIST' })).toMatchObject({
      category: '请选择业务类别'
    })
  })

  it('formats the injected clock deterministically', () => {
    expect(formatSemanticRuleTime(new Date(2026, 8, 10, 9, 7))).toBe('2026-09-10 09:07')
  })
})

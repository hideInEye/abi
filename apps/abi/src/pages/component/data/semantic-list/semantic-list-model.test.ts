import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { DEFAULT_RULE_DRAFT, DETAIL_HIT_EXAMPLES, EMPTY_FILTERS, MATCH_METHOD_OPTIONS } from './constants'
import { getResponsiveOverlayWidths, getTableScrollWidth } from './semantic-list-layout'
import {
  buildSemanticRuleCreateParams,
  buildSemanticRuleListParams,
  buildSemanticRuleStatusUpdateParams,
  buildSemanticRuleUpdateParams,
  convertLikePatternToRegex,
  normalizeSemanticRuleDraft,
  semanticRuleToDraft,
  serializeAdvancedSettings,
  testSemanticRule,
  validateSemanticRuleDraft
} from './semantic-list-model'
import type { SemanticRule, SemanticRuleDraft } from './types'

const validDraft: SemanticRuleDraft = {
  advancedSettings: [],
  category: '元数据查询',
  method: 'EXACT',
  name: '测试规则',
  pattern: 'dim_customer',
  priority: 100,
  remark: '说明',
  target: 'TABLE_NAME',
  type: 'WHITELIST',
  visibility: 'PUBLIC'
}

const existingRule: SemanticRule = {
  advancedSettings: [{ key: 'tenant', value: 'retail' }],
  category: '元数据查询',
  code: 'RULE_000001',
  enabled: false,
  id: '9007199254740993',
  method: 'LIKE',
  name: '存量规则',
  pattern: 'dim_%',
  priority: 90,
  remark: '存量说明',
  target: 'TABLE_NAME',
  type: 'WHITELIST',
  updatedAt: '2026-09-12 10:00:00',
  visibility: 'PRIVATE'
}

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
    expect(testSemanticRule('LIKE', 'select%from%', 'SELECT *\nFROM orders').matched).toBe(true)
    expect(convertLikePatternToRegex('dim_%.v1').test('DIM_customer.v1')).toBe(true)
    expect(convertLikePatternToRegex('dim_%.v1').test('dim_customer-v1')).toBe(false)
  })

  it('supports regular expressions, the leading case-insensitive marker and invalid input', () => {
    expect(testSemanticRule('REGEX', '^dim_\\w+$', 'dim_customer').matched).toBe(true)
    expect(testSemanticRule('REGEX', '(?i)drop\\s+table', 'DROP TABLE customer').matched).toBe(true)
    expect(testSemanticRule('REGEX', '[invalid', 'anything').status).toBe('invalid')
    expect(testSemanticRule('REGEX', '^dim_', 'fact_order').status).toBe('miss')
  })

  it('reports an empty test text before attempting a regex match', () => {
    expect(testSemanticRule('REGEX', '[invalid', '')).toMatchObject({ message: '请输入测试文本', status: 'empty' })
  })
})

describe('semantic rule request mapping', () => {
  it('normalizes business fields without altering non-empty advanced values', () => {
    expect(
      normalizeSemanticRuleDraft({
        ...validDraft,
        advancedSettings: [
          { key: ' space ', value: ' retail ' },
          { key: ' ', value: '  ' },
          { key: 'tenant', value: '' }
        ],
        category: '  自定义类别  ',
        name: '  新规则  ',
        pattern: '  dim_order  ',
        priority: null
      })
    ).toMatchObject({
      advancedSettings: [
        { key: ' space ', value: ' retail ' },
        { key: 'tenant', value: '' }
      ],
      category: '自定义类别',
      name: '新规则',
      pattern: 'dim_order',
      priority: undefined
    })
  })

  it('serializes advanced settings as an object, ignores empty rows and lets the last duplicate win', () => {
    expect(
      serializeAdvancedSettings([
        { key: '', value: '' },
        { key: 'tenant', value: 'first' },
        { key: 'onlyKey', value: '' },
        { key: '', value: 'onlyValue' },
        { key: '__proto__', value: 'literal-key' },
        { key: 'tenant', value: 'last' }
      ])
    ).toBe('{"tenant":"last","onlyKey":"","":"onlyValue","__proto__":"literal-key"}')
    expect(serializeAdvancedSettings([])).toBe('{}')
  })

  it('maps only confirmed list filters and keeps pagination on the server', () => {
    const params = buildSemanticRuleListParams({
      filters: {
        ...EMPTY_FILTERS,
        category: '  元数据查询 ',
        method: 'REGEX',
        ruleCodeOrName: '  禁止扫描 ',
        status: '1',
        target: ' SQL_TEXT ',
        type: 'BLACKLIST',
        visibility: 'PRIVATE'
      },
      pageNum: 3,
      pageSize: 50,
      spaceId: 1001
    })

    expect(params).toEqual({
      bizType: '元数据查询',
      listType: 'BLACKLIST',
      matchMethod: 'REGEX',
      matchTarget: 'SQL_TEXT',
      pageNum: 3,
      pageSize: 50,
      ruleCodeOrName: '禁止扫描',
      spaceId: 1001,
      status: '1',
      visibility: 'PRIVATE'
    })
    expect(params).not.toHaveProperty('ruleName')
    expect(params).not.toHaveProperty('ruleCode')
  })

  it('builds create and update payloads with explicit status and preserves Long IDs', () => {
    expect(buildSemanticRuleCreateParams(1001, validDraft)).toMatchObject({
      bizType: '元数据查询',
      extConditions: '{}',
      matchMethod: 'EXACT',
      spaceId: 1001,
      status: '1'
    })

    expect(
      buildSemanticRuleUpdateParams({
        draft: { ...validDraft, method: 'REGEX', pattern: '(?i)select\\s+\\*' },
        rule: existingRule,
        spaceId: 1001
      })
    ).toMatchObject({ ruleId: '9007199254740993', status: '0' })
    expect(
      buildSemanticRuleUpdateParams({
        draft: validDraft,
        enabled: true,
        rule: existingRule,
        spaceId: 1001
      })
    ).toMatchObject({ ruleId: '9007199254740993', status: '1' })

    const selectedRuleIds = [existingRule.id, 2]
    const enabledPayload = buildSemanticRuleStatusUpdateParams(selectedRuleIds, true)
    selectedRuleIds.push(3)
    expect(enabledPayload).toEqual({
      ruleIds: ['9007199254740993', 2],
      status: '1'
    })
    expect(buildSemanticRuleStatusUpdateParams([existingRule.id], false)).toEqual({
      ruleIds: ['9007199254740993'],
      status: '0'
    })

    expect(buildSemanticRuleCreateParams(1001, { ...validDraft, priority: null })).not.toHaveProperty('priority')
  })

  it('creates an editable draft without mutating nested settings', () => {
    const draft = semanticRuleToDraft(existingRule)
    if (draft.advancedSettings?.[0]) draft.advancedSettings[0].value = 'changed'

    expect(existingRule.advancedSettings[0].value).toBe('retail')
    expect(draft).toMatchObject({ method: 'LIKE', name: '存量规则', visibility: 'PRIVATE' })
  })
})

describe('semantic rule validation', () => {
  it('accepts dictionary-driven categories and targets but rejects AST as a match method', () => {
    expect(
      validateSemanticRuleDraft({
        ...validDraft,
        category: '后端新增类别',
        name: 'a'.repeat(500),
        pattern: '后端新增匹配内容',
        target: 'BACKEND_NEW_TARGET'
      })
    ).toEqual({})
    expect(
      validateSemanticRuleDraft({ ...validDraft, method: 'AST' as unknown as SemanticRuleDraft['method'] })
    ).toMatchObject({ method: '请选择匹配方式' })
  })

  it('rejects whitespace required values, negative priority and invalid regex', () => {
    expect(
      validateSemanticRuleDraft({
        ...validDraft,
        category: ' ',
        name: '  ',
        pattern: '  ',
        priority: -1,
        target: ' '
      })
    ).toMatchObject({
      category: '请选择或填写业务类别',
      name: '请填写规则名称',
      pattern: '请填写匹配内容',
      priority: '请输入有效的优先级',
      target: '请选择匹配目标'
    })
    expect(validateSemanticRuleDraft({ ...validDraft, method: 'REGEX', pattern: '[invalid' })).toMatchObject({
      pattern: '正则表达式格式错误'
    })
    expect(
      validateSemanticRuleDraft({
        ...validDraft,
        category: undefined as unknown as string,
        target: undefined as unknown as string
      })
    ).toMatchObject({ category: '请选择或填写业务类别', target: '请选择匹配目标' })
  })
})

describe('semantic rule design defaults and examples', () => {
  it('keeps every configurable field empty for a new rule', () => {
    expect(DEFAULT_RULE_DRAFT).toEqual({
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
    })
  })

  it('does not auto-select the first dictionary options and exposes only the confirmed match methods', () => {
    const drawerSource = readFileSync(new URL('./components/SemanticRuleDrawer.tsx', import.meta.url), 'utf8')

    expect(drawerSource).not.toContain('businessCategoryOptions[0]')
    expect(drawerSource).not.toContain('matchTargetOptions[0]')
    expect(drawerSource).not.toContain("Form.useWatch('method', form) ?? 'EXACT'")
    expect(MATCH_METHOD_OPTIONS.map(option => option.value)).toEqual(['EXACT', 'LIKE', 'REGEX'])
  })

  it('uses the five design-specified static hit examples', () => {
    expect(DETAIL_HIT_EXAMPLES).toEqual({
      DATE_TIME: ['2026-01-01 00:00:00'],
      DB_NAME: ['prod_finance'],
      SQL_TEXT: ['select count(*) from trade_detail'],
      TABLE_NAME: ['dim_customer'],
      TEXT_CONTENT: ['查询账户A1024的交易流水']
    })
  })
})

describe('semantic list layout contracts', () => {
  it('sums every visible column width plus the selection column', () => {
    expect(
      getTableScrollWidth([
        { key: 'name', width: 190 },
        { key: 'type', width: 140 },
        { key: 'operation', width: 280 }
      ])
    ).toBe(658)
  })

  it('uses half-screen desktop overlays and narrow-screen fallbacks', () => {
    expect(getResponsiveOverlayWidths(true)).toEqual({ confirmWidth: '50%', drawerWidth: '50%' })
    expect(getResponsiveOverlayWidths(false)).toEqual({ confirmWidth: '90%', drawerWidth: '96%' })
  })
})

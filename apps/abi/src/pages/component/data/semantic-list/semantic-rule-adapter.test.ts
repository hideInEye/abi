import { describe, expect, it } from 'vitest'

import {
  adaptSemanticDictionaryOptions,
  adaptSemanticRuleDetail,
  adaptSemanticRulePage,
  mapSemanticRuleRecord,
  parseAdvancedSettings
} from './semantic-rule-adapter'

const apiRecord = {
  bizType: '高危操作',
  createTime: '2026-09-11 09:00:00',
  extConditions: '{"database":"prod","level":2}',
  listType: 'BLACKLIST',
  matchMethod: 'REGEX',
  matchPattern: '(?i)drop\\s+table',
  matchTarget: 'SQL_TEXT',
  priority: '200',
  remark: '禁止高危操作',
  ruleCode: 'BL_HIGH_RISK_001',
  ruleId: '9007199254740993',
  ruleName: '禁止删除数据表',
  status: '0',
  updateTime: '2026-09-12 10:20:00',
  visibility: 'PRIVATE'
}

describe('semantic rule response adapter', () => {
  it('maps backend fields while preserving a string Long ID, status and update time', () => {
    expect(mapSemanticRuleRecord(apiRecord)).toMatchObject({
      advancedSettings: [
        { key: 'database', value: 'prod' },
        { key: 'level', value: '2' }
      ],
      category: '高危操作',
      enabled: false,
      id: '9007199254740993',
      method: 'REGEX',
      priority: 200,
      type: 'BLACKLIST',
      updatedAt: '2026-09-12 10:20:00',
      visibility: 'PRIVATE'
    })
  })

  it('uses create time and protocol defaults when optional fields are absent', () => {
    expect(
      mapSemanticRuleRecord({
        createTime: '2026-09-12 09:00:00',
        ruleId: 7,
        status: 1
      })
    ).toMatchObject({
      enabled: true,
      id: 7,
      method: 'REGEX',
      priority: 0,
      type: 'WHITELIST',
      updatedAt: '2026-09-12 09:00:00',
      visibility: 'PUBLIC'
    })
  })

  it('adapts records containers and numeric-string totals', () => {
    const page = adaptSemanticRulePage({ data: { records: [apiRecord], total: '41' }, error: null })

    expect(page.records).toHaveLength(1)
    expect(page.total).toBe(41)
  })

  it('recovers total from the raw RuoYi response when flat data only contains rows', () => {
    const page = adaptSemanticRulePage({
      data: [apiRecord],
      error: null,
      response: { data: { code: 200, rows: [apiRecord], total: 7 } }
    })

    expect(page.records.map(rule => rule.id)).toEqual(['9007199254740993'])
    expect(page.total).toBe(7)
  })

  it('supports rows/list wrappers and filters records without a valid ruleId', () => {
    expect(adaptSemanticRulePage({ rows: [apiRecord], total: 1 }).records).toHaveLength(1)
    expect(adaptSemanticRulePage({ data: { list: [{ ...apiRecord, ruleId: '' }], total: 9 } })).toEqual({
      records: [],
      total: 9
    })
  })

  it('unwraps a nested detail response and returns null for malformed detail data', () => {
    expect(adaptSemanticRuleDetail({ response: { data: { data: apiRecord } } })?.id).toBe('9007199254740993')
    expect(adaptSemanticRuleDetail({ data: { ruleName: '缺少ID' } })).toBeNull()
  })

  it('handles empty and malformed extension JSON without throwing', () => {
    expect(parseAdvancedSettings('')).toEqual([])
    expect(parseAdvancedSettings('[invalid')).toEqual([])
    expect(parseAdvancedSettings('[]')).toEqual([])
    expect(parseAdvancedSettings({ nested: { active: true }, nullable: null })).toEqual([
      { key: 'nested', value: '{"active":true}' },
      { key: 'nullable', value: '' }
    ])
  })
})

describe('semantic dictionary response adapter', () => {
  it('sorts dictionary rows, uses labels and removes duplicate values', () => {
    expect(
      adaptSemanticDictionaryOptions({
        data: [
          { dictLabel: 'SQL 文本', dictSort: 20, dictValue: 'SQL_TEXT' },
          { dictLabel: '表名', dictSort: 10, dictValue: 'TABLE_NAME' },
          { dictLabel: '重复表名', dictSort: 30, dictValue: 'TABLE_NAME' },
          { label: 'AST 特征', sort: 40, value: 'AST_FEATURE' }
        ],
        error: null
      })
    ).toEqual([
      { label: '表名', value: 'TABLE_NAME' },
      { label: 'SQL 文本', value: 'SQL_TEXT' },
      { label: 'AST 特征', value: 'AST_FEATURE' }
    ])
  })

  it('returns an empty option list for missing data', () => {
    expect(adaptSemanticDictionaryOptions({ data: null, error: null })).toEqual([])
  })
})

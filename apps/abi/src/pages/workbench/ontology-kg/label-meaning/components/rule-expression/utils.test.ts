import { describe, expect, it } from 'vitest'

import type { RuleFieldOption, RuleLayer } from './types'
import {
  collectRuleFieldIds,
  compileRuleLayersToSql,
  compileRulePredicate,
  normalizeRuleConnections,
  normalizeRuleLayers,
  validateRuleLayers
} from './utils'

const fields: RuleFieldOption[] = [
  {
    category: 'dimensions',
    dataType: 'varchar',
    id: 'status-id',
    label: '订单状态',
    sourceName: 'order_status',
    tableName: '订单表'
  },
  {
    category: 'measures',
    dataType: 'decimal',
    id: 'amount-id',
    label: '实付金额',
    sourceName: 'pay_amount',
    tableName: '订单表'
  },
  {
    category: 'dates',
    dataType: 'datetime',
    id: 'date-id',
    label: '支付时间',
    sourceName: 'pay_time',
    tableName: '订单表'
  }
]

function completeLayers(): RuleLayer[] {
  return [
    {
      groups: [
        {
          conditions: [
            { fieldId: 'status-id', id: 'c1', operator: '=', value: "已'支付" },
            { fieldId: 'amount-id', id: 'c2', logicWithPrevious: 'OR', operator: '>=', value: '100' }
          ],
          id: 'g1',
          name: '核心条件'
        },
        {
          conditions: [{ fieldId: 'date-id', id: 'c3', operator: 'IS NOT NULL', value: 'ignored' }],
          id: 'g2',
          logicWithPrevious: 'AND',
          name: '时间条件'
        }
      ],
      id: 'l1',
      name: '高价值'
    },
    {
      groups: [
        {
          conditions: [{ fieldId: 'status-id', id: 'c4', operator: 'LIKE', value: '待' }],
          id: 'g3',
          name: '待处理条件'
        }
      ],
      id: 'l2',
      name: '待处理'
    }
  ]
}

describe('rule expression compatibility and validation', () => {
  it('migrates legacy direct conditions into a default group', () => {
    const result = normalizeRuleLayers([
      {
        binName: '老分层',
        conditions: [
          { metric: 'status-id', operator: '=', value: '完成' },
          { metric: 'amount-id', operator: '>=', value: '20' }
        ],
        logic: 'OR'
      }
    ])

    expect(result[0]).toMatchObject({ name: '老分层' })
    expect(result[0].groups).toHaveLength(1)
    expect(result[0].groups[0].conditions[1].logicWithPrevious).toBe('OR')
  })

  it('falls back to legacy conditions when a transitional payload contains an empty groups array', () => {
    const result = normalizeRuleLayers([
      {
        binName: '兼容分层',
        conditions: [{ metric: 'status-id', operator: '=', value: '完成' }],
        groups: []
      }
    ])

    expect(result[0].groups[0].conditions[0]).toMatchObject({ fieldId: 'status-id', value: '完成' })
  })

  it('preserves spaces while editing names and validates the trimmed value', () => {
    const result = normalizeRuleLayers([
      {
        groups: [{ conditions: [{ fieldId: 'status-id', operator: '=', value: '完成' }], name: '条件 分组 ' }],
        name: '高 价值 '
      }
    ])

    expect(result[0].name).toBe('高 价值 ')
    expect(result[0].groups[0].name).toBe('条件 分组 ')
    expect(validateRuleLayers(result, fields).valid).toBe(true)

    const emptyName = normalizeRuleLayers([{ groups: [], name: '   ' }])
    expect(emptyName[0].name).toBe('   ')
    expect(validateRuleLayers(emptyName, fields).issues[0]?.message).toBe('请输入分层名称')
  })

  it('clears values for null operators and recursively deduplicates field ids', () => {
    const normalized = normalizeRuleLayers(completeLayers())
    expect(normalized[0].groups[1].conditions[0].value).toBe('')
    expect(collectRuleFieldIds(normalized)).toEqual(['status-id', 'amount-id', 'date-id'])
  })

  it('validates names, uniqueness, incomplete rows and global limits', () => {
    const duplicate = completeLayers()
    duplicate[1].name = '高价值'
    duplicate[0].groups[1].name = '核心条件'
    duplicate[0].groups[0].conditions[0].value = ' '
    const messages = validateRuleLayers(duplicate, fields).issues.map(item => item.message)
    expect(messages).toContain('分层名称已存在，请修改')
    expect(messages).toContain('当前分层已存在同名条件分组')
    expect(messages).toContain('请输入值')

    const overLimit = Array.from({ length: 2 }, (_layer, layerIndex) => ({
      groups: Array.from({ length: 3 }, (_group, groupIndex) => ({
        conditions: Array.from({ length: 20 }, (_condition, conditionIndex) => ({
          fieldId: 'status-id',
          id: `c-${layerIndex}-${groupIndex}-${conditionIndex}`,
          operator: '=' as const,
          value: 'x'
        })),
        id: `g-${layerIndex}-${groupIndex}`,
        name: `分组 ${groupIndex}`
      })),
      id: `l-${layerIndex}`,
      name: `分层 ${layerIndex}`
    }))
    expect(validateRuleLayers(overLimit, fields).issues).toContainEqual({
      message: '单个标签语义最多支持 100 条条件',
      path: 'layers'
    })
  })

  it('keeps the following relation and repairs the first relation after deletion', () => {
    const source = completeLayers()
    source[0].groups[0].conditions.splice(0, 1)
    source[0].groups.splice(0, 1)
    const result = normalizeRuleConnections(source)
    expect(result[0].groups[0].logicWithPrevious).toBeUndefined()
    expect(result[0].groups[0].conditions[0].logicWithPrevious).toBeUndefined()
  })
})

describe('rule expression SQL compiler', () => {
  it('compiles ordered CASE branches, mixed logic, escaping and null operators', () => {
    const result = compileRuleLayersToSql(completeLayers(), fields)
    expect(result.validation.valid).toBe(true)
    expect(result.sql).toBe(
      [
        'CASE',
        "  WHEN ((order_status = '已''支付' OR pay_amount >= 100) AND (pay_time IS NOT NULL)) THEN '高价值'",
        "  WHEN ((order_status LIKE '%待%')) THEN '待处理'",
        '  ELSE NULL',
        'END'
      ].join('\n')
    )
    expect(result.sql.indexOf("THEN '高价值'")).toBeLessThan(result.sql.indexOf("THEN '待处理'"))
  })

  it('omits incomplete conditions from the live predicate preview', () => {
    const source = completeLayers()
    source[0].groups[0].conditions[0].fieldId = ''
    source[0].groups[0].conditions[1].value = ''

    expect(compileRulePredicate(source, fields)).toBe("(pay_time IS NOT NULL)\n(order_status LIKE '%待%')")
  })
})

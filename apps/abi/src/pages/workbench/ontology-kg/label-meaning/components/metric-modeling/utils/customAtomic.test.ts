import { describe, expect, it } from 'vitest'

import {
  CUSTOM_ATOMIC_FUNCTION_OPTIONS,
  buildCustomAtomicFunctionSnippet,
  getCustomAtomicFieldOptionLabel,
  insertCustomAtomicFunction
} from './customAtomic'

describe('custom atomic metric technical configuration', () => {
  it('exposes all required quick aggregation functions', () => {
    expect(CUSTOM_ATOMIC_FUNCTION_OPTIONS.map(item => item.label)).toEqual([
      '求和',
      '计数',
      '去重计数',
      '平均值',
      '最大值',
      '最小值',
      '标准差',
      '方差',
      '中位数',
      '去重',
      '绝对值',
      '向上取整',
      '向下取整',
      '四舍五入',
      '保留小数',
      '字符串截取'
    ])
    expect(buildCustomAtomicFunctionSnippet('countDistinct', 'customer_id')).toBe('COUNT(DISTINCT customer_id)')
  })

  it('shows field name, data type and semantic type in source field options', () => {
    expect(
      getCustomAtomicFieldOptionLabel({
        bizName: '支付金额',
        dataType: 'decimal',
        fieldName: 'payment_amount',
        semanticType: 'measure',
        techId: 'field-1'
      })
    ).toBe('支付金额 · payment_amount · decimal · 度量')
  })

  it('inserts a function at the current selection and returns the next cursor', () => {
    expect(insertCustomAtomicFunction('1 + amount', 'SUM(payment_amount)', { end: 10, start: 4 })).toEqual({
      cursor: 23,
      expression: '1 + SUM(payment_amount)'
    })
  })
})

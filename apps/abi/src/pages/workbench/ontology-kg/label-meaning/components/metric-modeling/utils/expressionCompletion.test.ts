import { describe, expect, it } from 'vitest'

import { insertCustomAtomicFunction } from './customAtomic'
import { filterExpressionFields, getExpressionCompletionToken } from './expressionCompletion'

const fields = [
  { category: '维度', id: '1', label: '支付方式', name: 'payment_method' },
  { category: '度量', id: '2', label: '生命周期价值', name: 'lifetime_value' },
  { category: '度量', id: '3', label: '平均订单金额', name: 'avg_order_amount' },
]

describe('custom composite expression completion', () => {
  it('matches selected field English/Chinese names case-insensitively', () => {
    expect(filterExpressionFields(fields, 'a')).toEqual(fields)
    expect(filterExpressionFields(fields.slice(0, 1), 'a')).toEqual([fields[0]])
    expect(filterExpressionFields(fields, 'PAY')).toEqual([fields[0]])
    expect(filterExpressionFields(fields, '金额')).toEqual([fields[2]])
    expect(filterExpressionFields(fields, 'payment_method')).toEqual([])
    expect(filterExpressionFields(fields, '')).toEqual([])
  })

  it('replaces the current token while preserving surrounding text and moves the caret after the field', () => {
    const expression = 'SUM(pay) / 10'
    const token = getExpressionCompletionToken(expression, 7)!
    expect(token).toEqual({ end: 7, query: 'pay', start: 4 })
    expect(insertCustomAtomicFunction(expression, fields[0].name, token)).toEqual({
      cursor: 18,
      expression: 'SUM(payment_method) / 10',
    })
    expect(getExpressionCompletionToken('SUM(payment)', 7)).toEqual({ end: 11, query: 'pay', start: 4 })
  })

  it('does not offer completions for empty input, operators, selections or SQL strings', () => {
    expect(getExpressionCompletionToken('', 0)).toBeNull()
    expect(getExpressionCompletionToken('SUM(x) + ', 9)).toBeNull()
    expect(getExpressionCompletionToken('pay', 0, 3)).toBeNull()
    expect(getExpressionCompletionToken("city = 'pa", 10)).toBeNull()
    expect(getExpressionCompletionToken('city = "pa', 10)).toBeNull()
  })

  it('inserts operator dictionary values verbatim at the selection', () => {
    expect(insertCustomAtomicFunction('SUM(a)SUM(b)', ' / ', { end: 6, start: 6 }).expression).toBe('SUM(a) / SUM(b)')
    expect(insertCustomAtomicFunction('a + b', 'MOD', { end: 3, start: 2 }).expression).toBe('a MOD b')
  })
})

import { describe, expect, it } from 'vitest'

import {
  getCustomAtomicFieldOptionLabel,
  getCustomExpressionSourceFields,
  insertCustomAtomicFunction
} from './customAtomic'

describe('custom atomic metric technical configuration', () => {
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

  it('derives compound source fields from technical names inserted into the expression', () => {
    const fields = [
      { fieldName: 'amount', techId: 'field-1' },
      { originName: 'order_id', techId: 'field-2' },
      { fieldName: 'unused', techId: 'field-3' }
    ]

    expect(getCustomExpressionSourceFields('SUM(amount) / COUNT(DISTINCT order_id)', fields)).toEqual(fields.slice(0, 2))
  })

  it('does not confuse a technical name with a longer identifier', () => {
    const fields = [
      { fieldName: 'amount', techId: 'field-1' },
      { fieldName: 'total_amount', techId: 'field-2' }
    ]

    expect(getCustomExpressionSourceFields('SUM(total_amount)', fields)).toEqual([fields[1]])
  })
})

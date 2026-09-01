import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import RuleExpressionFormItem from './RuleExpressionFormItem'

const { formItemProps } = vi.hoisted(() => ({ formItemProps: [] as Array<Record<string, unknown>> }))

vi.mock('antd', () => ({
  Form: {
    Item: (props: Record<string, unknown>) => {
      formItemProps.push(props)
      return props.children
    }
  }
}))

describe('RuleExpressionFormItem', () => {
  it('only validates rules through explicit form validation', () => {
    const rules = [{ message: '请完善表达式', required: true }]
    renderToStaticMarkup(
      <RuleExpressionFormItem
        name="expression"
        rules={rules}
      >
        <input />
      </RuleExpressionFormItem>
    )

    expect(formItemProps.at(-1)?.validateTrigger).toEqual([])
    expect(formItemProps.at(-1)?.rules).toBe(rules)
  })
})

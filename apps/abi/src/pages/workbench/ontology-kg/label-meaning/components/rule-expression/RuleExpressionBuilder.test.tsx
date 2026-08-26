import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import RuleExpressionBuilder from './RuleExpressionBuilder'
import type { RuleLayer } from './types'

const fields = [
  {
    category: 'dimensions' as const,
    dataType: 'varchar',
    id: 'status-id',
    label: '订单状态',
    sourceName: 'order_status',
    tableName: '订单表'
  }
]

describe('RuleExpressionBuilder', () => {
  it('renders the three-level hierarchy and hides the value control for null operators', () => {
    const html = renderToStaticMarkup(
      <RuleExpressionBuilder
        fields={fields}
        value={[
          {
            groups: [
              {
                conditions: [{ fieldId: 'status-id', id: 'condition-1', operator: 'IS NULL' }],
                id: 'group-1',
                name: '订单条件'
              }
            ],
            id: 'layer-1',
            name: '高价值'
          }
        ]}
      />
    )

    expect(html).toContain('高价值')
    expect(html).toContain('订单条件')
    expect(html).toContain('添加条件')
    expect(html).not.toContain('placeholder="请输入值"')
  })

  it('only flags mixed connectors when uniform logic mode is enabled', () => {
    const value: RuleLayer[] = [
      {
        groups: [
          {
            conditions: [{ fieldId: 'status-id', id: 'condition-1', operator: '=', value: 'A' }],
            id: 'group-1',
            name: '分组一'
          },
          {
            conditions: [{ fieldId: 'status-id', id: 'condition-2', operator: '=', value: 'B' }],
            id: 'group-2',
            logicWithPrevious: 'AND',
            name: '分组二'
          },
          {
            conditions: [{ fieldId: 'status-id', id: 'condition-3', operator: '=', value: 'C' }],
            id: 'group-3',
            logicWithPrevious: 'OR',
            name: '分组三'
          }
        ],
        id: 'layer-1',
        name: '默认分层'
      }
    ]
    const labelHtml = renderToStaticMarkup(
      <RuleExpressionBuilder
        fields={fields}
        validationRequested
        value={value}
      />
    )
    const derivedHtml = renderToStaticMarkup(
      <RuleExpressionBuilder
        uniformLogic
        fields={fields}
        validationRequested
        value={value}
      />
    )

    expect(labelHtml).not.toContain('aria-invalid="true"')
    expect(derivedHtml).toContain('aria-invalid="true"')
  })
})

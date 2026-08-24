import { Form } from 'antd'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { StatisticalDateRangeFields } from './knowledgeOperateDrawer.StatisticalDateRangeFields'

describe('StatisticalDateRangeFields', () => {
  it('keeps the range value bound to Form.Item while rendering 最近 as its prefix', () => {
    const html = renderToStaticMarkup(
      <Form
        initialValues={{
          statisticalCaliber: {
            dateRangeUnit: 'day',
            dateRangeValue: 12
          }
        }}
      >
        <Form.Item name={['statisticalCaliber', 'dateRangeValue']}>
          <StatisticalDateRangeFields />
        </Form.Item>
      </Form>
    )

    expect(html).toContain('最近')
    expect(html).toContain('ant-input-number-group-addon')
    expect(html).toContain('ant-space-compact')
    expect(html).toContain('value="12"')
    expect(html).toContain('日')
  })
})

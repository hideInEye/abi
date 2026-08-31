import { Form } from 'antd'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { StatisticalDateRangeFields } from './knowledgeOperateDrawer.StatisticalDateRangeFields'

describe('StatisticalDateRangeFields', () => {
  it('keeps the dynamic amount bound to the outer Form.Item and renders three compact controls', () => {
    const html = renderToStaticMarkup(
      <Form
        initialValues={{
          statisticalCaliber: {
            dateRangeMode: 'recent',
            dateRangeUnit: 'day',
            dateRangeValue: 12
          }
        }}
      >
        <Form.Item name={['statisticalCaliber', 'dateRangeValue']}>
          <StatisticalDateRangeFields mode="recent" />
        </Form.Item>
      </Form>
    )

    expect(html).toContain('最近')
    expect(html).toContain('ant-space-compact')
    expect(html).toContain('ant-input-number')
    expect(html).toContain('value="12"')
    expect(html).toContain('日')
  })

  it('renders only a full-width mode select for natural periods', () => {
    const html = renderToStaticMarkup(
      <Form
        initialValues={{
          statisticalCaliber: {
            dateRangeMode: 'today',
            dateRangeUnit: 'day',
            dateRangeValue: 12
          }
        }}
      >
        <Form.Item name={['statisticalCaliber', 'dateRangeValue']}>
          <StatisticalDateRangeFields mode="today" />
        </Form.Item>
      </Form>
    )

    expect(html).toContain('今日')
    expect(html).toContain('ant-space-compact')
    expect(html).not.toContain('ant-input-number')
    expect(html).not.toContain('value="12"')
  })
})

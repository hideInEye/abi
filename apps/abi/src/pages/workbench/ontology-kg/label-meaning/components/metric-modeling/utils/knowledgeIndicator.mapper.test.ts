import { describe, expect, it } from 'vitest'

import { buildKnowledgeIndicatorListQuery, normalizeKnowledgeIndicatorListItem } from './knowledgeIndicator.mapper'

describe('knowledgeIndicator mapper', () => {
  it('keeps bizName as the indicator list display name', () => {
    const item = normalizeKnowledgeIndicatorListItem({
      bizName: '成交金额',
      techName: 'gmv'
    })

    expect(item.bizName).toBe('成交金额')
  })

  it('maps API biz_name alias to bizName for list display', () => {
    const item = normalizeKnowledgeIndicatorListItem({
      biz_name: '支付金额',
      techName: 'pay_amount'
    } as any)

    expect(item.bizName).toBe('支付金额')
  })

  it('uses bizName as the indicator list search request parameter', () => {
    const query = buildKnowledgeIndicatorListQuery({
      groupId: '10',
      pagination: { pageNum: 2, pageSize: 20 },
      searchParams: { bizName: '成交', status: 1, type: 'atomic' },
      spaceId: 82
    })

    expect(query).toEqual({
      bizName: '成交',
      groupId: '10',
      indicatorClass: 'atomic',
      pageNum: 2,
      pageSize: 20,
      spaceId: 82,
      status: 1
    })
    expect(query).not.toHaveProperty('techName')
  })
})

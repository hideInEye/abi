import { describe, expect, it } from 'vitest'

import { getGraphAttributeDisplayName } from './GraphDetailPanel.utils'

describe('GraphDetailPanel mapped attribute names', () => {
  it('shows only the mapped field Chinese name and keeps custom names unchanged', () => {
    expect(getGraphAttributeDisplayName({ attributeCode: 'trade_detail.pay_amount', attributeName: '交易明细表_#_支付金额', attributeType: 'indicator' })).toBe('支付金额')
    expect(getGraphAttributeDisplayName({ attributeCode: 'deal_amount', attributeName: '成交金额', attributeType: 'indicator' })).toBe('成交金额')
  })
})

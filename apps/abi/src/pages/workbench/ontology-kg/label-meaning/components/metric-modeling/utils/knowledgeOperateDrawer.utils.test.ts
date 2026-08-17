import { describe, expect, it } from 'vitest'

import {
  extractUniqueIds,
  getMappedMetricFieldDisplayName,
  getMetricFieldOptionLabel,
  getMetricIndicatorOptionLabel,
} from './knowledgeOperateDrawer.utils'

describe('extractUniqueIds', () => {
  it('extracts unique string and numeric metric ids from expression tokens', () => {
    expect(extractUniqueIds('CEIL(##226##) + ##atomic_order_id## + ##226##')).toEqual(['226', 'atomic_order_id'])
  })
})

describe('metric create/edit display names', () => {
  it('uses the field name for one-click mapped metric names', () => {
    expect(getMappedMetricFieldDisplayName('交易明细表_#_支付金额')).toBe('支付金额')
    expect(getMappedMetricFieldDisplayName('交易明细表_ # _支付金额')).toBe('支付金额')
  })

  it('keeps custom metric names unchanged', () => {
    expect(getMappedMetricFieldDisplayName('成交金额')).toBe('成交金额')
  })

  it('formats atomic metric select labels with raw mapped bizName first', () => {
    expect(
      getMetricIndicatorOptionLabel({
        bizName: '交易明细表',
        rawBizName: '交易明细表_#_支付金额',
        techName: 'trade_detail.pay_amount'
      })
    ).toBe('支付金额')
  })

  it('formats derived field labels with the mapped field part', () => {
    expect(
      getMetricFieldOptionLabel({
        bizName: '优惠券表_#_优惠券名称',
        fieldName: 'coupon_name',
        techId: 'coupon_name'
      })
    ).toBe('优惠券名称')
  })
})

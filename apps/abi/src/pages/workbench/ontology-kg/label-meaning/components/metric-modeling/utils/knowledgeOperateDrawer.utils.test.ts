import { describe, expect, it } from 'vitest'

import {
  buildMetricIndicatorSearchQuery,
  extractUniqueIds,
  formatMappedDimensionOptionTitle,
  getMappedMetricFieldDisplayName,
  getMetricFieldOptionLabel,
  getMetricIndicatorOptionLabel,
  mergeMetricIndicatorSearchResults,
  shouldShowMetricPrecomputeConfig,
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

  it('formats dimension select titles with the mapped dimension name part', () => {
    expect(
      formatMappedDimensionOptionTitle({
        bizName: '交易明细表_ # _收货城市',
        techName: 'trade_detail.receive_city',
      })
    ).toBe('收货城市（receive_city）')
  })
})

describe('metric precompute config visibility', () => {
  it('hides precompute config for atomic metrics', () => {
    expect(shouldShowMetricPrecomputeConfig('atomic')).toBe(false)
  })

  it('shows precompute config only for derived and derivative metrics', () => {
    expect(shouldShowMetricPrecomputeConfig('derived')).toBe(true)
    expect(shouldShowMetricPrecomputeConfig('derivative')).toBe(true)
    expect(shouldShowMetricPrecomputeConfig('custom')).toBe(false)
    expect(shouldShowMetricPrecomputeConfig(undefined)).toBe(false)
  })
})

describe('metric indicator fuzzy search', () => {
  it('builds the existing list query with a trimmed bizName', () => {
    expect(buildMetricIndicatorSearchQuery('  支付金额  ', 82)).toEqual({
      bizName: '支付金额',
      pageNum: 1,
      pageSize: 1000,
      spaceId: 82,
    })
    expect(buildMetricIndicatorSearchQuery('   ', 82).bizName).toBeUndefined()
  })

  it('keeps selected indicators while replacing stale unselected results', () => {
    const result = mergeMetricIndicatorSearchResults(
      [
        { bizName: '旧支付金额', indId: 1, indicatorClass: 'atomic', semanticSchemaName: '交易语义' },
        { bizName: '旧订单数量', indId: 2, indicatorClass: 'atomic' },
      ],
      [
        { bizName: '支付金额', indId: 1, indicatorClass: 'atomic' },
        { bizName: '支付笔数', indId: 3, indicatorClass: 'atomic' },
      ],
      [1],
    )

    expect(result).toEqual([
      { bizName: '支付金额', indId: 1, indicatorClass: 'atomic', semanticSchemaName: '交易语义' },
      { bizName: '支付笔数', indId: 3, indicatorClass: 'atomic' },
    ])
  })

  it('appends a selected indicator when the fuzzy response does not contain it', () => {
    const selected = { bizName: '成交金额', indId: 1, indicatorClass: 'atomic' }
    const result = mergeMetricIndicatorSearchResults(
      [selected],
      [{ bizName: '订单数量', indId: 2, indicatorClass: 'atomic' }],
      ['1'],
    )

    expect(result).toEqual([
      { bizName: '订单数量', indId: 2, indicatorClass: 'atomic' },
      selected,
    ])
  })
})

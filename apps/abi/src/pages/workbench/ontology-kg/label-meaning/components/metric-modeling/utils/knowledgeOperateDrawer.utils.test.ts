import { describe, expect, it } from 'vitest'

import {
  appendMetricIndicatorSearchResults,
  buildMetricIndicatorSearchQuery,
  extractUniqueIds,
  formatMappedDimensionOptionTitle,
  getMappedMetricFieldDisplayName,
  getMetricFieldOptionLabel,
  getMetricIndicatorOptionLabel,
  getMetricIndicatorSearchClasses,
  getStepItems,
  hasMoreMetricIndicatorSearchResults,
  mergeMetricIndicatorSearchResults,
  shouldReuseMetricIndicatorSearch,
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

  it('shows precompute config only for derived and composite metrics', () => {
    expect(shouldShowMetricPrecomputeConfig('derived')).toBe(true)
    expect(shouldShowMetricPrecomputeConfig('composite')).toBe(true)
    expect(shouldShowMetricPrecomputeConfig('derivative')).toBe(false)
    expect(shouldShowMetricPrecomputeConfig('custom')).toBe(false)
    expect(shouldShowMetricPrecomputeConfig(undefined)).toBe(false)
  })
})

describe('metric create steps', () => {
  it('uses business and technical steps for custom atomic metrics', () => {
    expect(getStepItems(false)).toEqual([
      { key: 'business', title: '业务配置' },
      { key: 'technical', title: '技术属性' }
    ])
  })

  it('uses only business configuration when editing a simple atomic metric', () => {
    expect(getStepItems(false, true)).toEqual([{ key: 'business', title: '业务配置' }])
  })

  it('keeps the dimension step for derived and composite metrics', () => {
    expect(getStepItems(true).map(item => item.key)).toEqual(['business', 'technical', 'dimension'])
  })
})

describe('metric indicator fuzzy search', () => {
  it('queries eligible classes before pagination without changing the string API contract', () => {
    expect(getMetricIndicatorSearchClasses('derived')).toEqual(['atomic'])
    expect(getMetricIndicatorSearchClasses('composite')).toEqual(['atomic', 'derived'])
    const queries = getMetricIndicatorSearchClasses('composite').map(indicatorClass =>
      buildMetricIndicatorSearchQuery(' 支付 ', 138, 2, indicatorClass)
    )
    expect(queries).toEqual([
      { bizName: '支付', indicatorClass: 'atomic', pageNum: 2, pageSize: 10, spaceId: 138 },
      { bizName: '支付', indicatorClass: 'derived', pageNum: 2, pageSize: 10, spaceId: 138 },
    ])
  })

  it('reuses pending and successful searches, including empty results and already loaded pages', () => {
    expect(shouldReuseMetricIndicatorSearch('', '', true, 0)).toBe(true)
    expect(shouldReuseMetricIndicatorSearch(' 支付 ', '支付', true, 0)).toBe(true)
    expect(shouldReuseMetricIndicatorSearch('', '', false, 1)).toBe(true)
    expect(shouldReuseMetricIndicatorSearch('', '', false, 3)).toBe(true)
  })

  it('allows new keywords, clearing search and retrying a failed first page', () => {
    expect(shouldReuseMetricIndicatorSearch('订单', '支付', true, 0)).toBe(false)
    expect(shouldReuseMetricIndicatorSearch('', '支付', false, 1)).toBe(false)
    expect(shouldReuseMetricIndicatorSearch('', '', false, 0)).toBe(false)
  })

  it('builds the existing list query with a trimmed bizName', () => {
    expect(buildMetricIndicatorSearchQuery('  支付金额  ', 82)).toEqual({
      bizName: '支付金额',
      pageNum: 1,
      pageSize: 10,
      spaceId: 82,
    })
    expect(buildMetricIndicatorSearchQuery('   ', 82).bizName).toBeUndefined()
    expect(buildMetricIndicatorSearchQuery('支付金额', 82, 2)).toEqual({
      bizName: '支付金额',
      pageNum: 2,
      pageSize: 10,
      spaceId: 82,
    })
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

  it('appends the next page in order and deduplicates repeated indicators', () => {
    const result = appendMetricIndicatorSearchResults(
      [
        { bizName: '支付金额', indId: 1, indicatorClass: 'atomic', semanticSchemaName: '交易语义' },
        { bizName: '订单数量', indId: 2, indicatorClass: 'atomic' },
      ],
      [
        { bizName: '订单笔数', indId: 2, indicatorClass: 'atomic' },
        { bizName: '客单价', indId: 3, indicatorClass: 'derived' },
      ],
    )

    expect(result).toEqual([
      { bizName: '支付金额', indId: 1, indicatorClass: 'atomic', semanticSchemaName: '交易语义' },
      { bizName: '订单笔数', indId: 2, indicatorClass: 'atomic' },
      { bizName: '客单价', indId: 3, indicatorClass: 'derived' },
    ])
  })

  it('uses total when available and falls back to the current page size', () => {
    expect(hasMoreMetricIndicatorSearchResults(21, 10, 2)).toBe(true)
    expect(hasMoreMetricIndicatorSearchResults('20', 10, 2)).toBe(false)
    expect(hasMoreMetricIndicatorSearchResults(undefined, 10, 2)).toBe(true)
    expect(hasMoreMetricIndicatorSearchResults(undefined, 9, 2)).toBe(false)
  })
})

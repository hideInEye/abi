import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import type { OntologyEntityAttribute } from '@/pages/workbench/ontology-kg/shared-network-types'
import { formatDisplayValue } from '../../utils/table-display'

import { ATTRIBUTE_TYPE_PRESENTATION, buildAttributeAssetOptions, buildAttributeFilterItems, getMappedAttributeCodeDisplay, getMappedAttributeDisplayName } from '../utils/attributePresentation'

function createAttribute(attributeType: OntologyEntityAttribute['attributeType'], attributeCode: string): OntologyEntityAttribute {
  return {
    attributeCode,
    attributeName: attributeCode,
    attributeType,
  }
}

describe('AttributeDrawer presentation', () => {
  it('shows mapped names in binding asset options without changing asset codes or values', () => {
    expect(
      buildAttributeAssetOptions([
        { attributeCode: 'coupon.atomic_issued_count', attributeName: '优惠券表_#_已发放数', id: '9007199254740993' },
        { attributeCode: 'deal_amount', attributeName: '成交金额', id: 2 },
      ]),
    ).toEqual([
      { disabled: false, label: '绑定当前分组（2 个资产）', value: '__group__' },
      { label: '已发放数（atomic_issued_count）', value: '9007199254740993' },
      { label: '成交金额（deal_amount）', value: '2' },
    ])

    expect(buildAttributeAssetOptions([])).toEqual([{ disabled: true, label: '绑定当前分组（0 个资产）', value: '__group__' }])
  })

  it('shows the mapped field part of attribute names using the metric-modeling separator rule', () => {
    expect(getMappedAttributeDisplayName('交易明细表_#_支付金额')).toBe('支付金额')
    expect(getMappedAttributeDisplayName('交易明细表_#支付金额')).toBe('支付金额')
    expect(getMappedAttributeDisplayName('交易明细表_ # _支付金额')).toBe('支付金额')
    expect(getMappedAttributeDisplayName('成交金额')).toBe('成交金额')
    expect(formatDisplayValue(getMappedAttributeDisplayName(null))).toBe('-')
    expect(getMappedAttributeCodeDisplay('trade_detail.pay_amount')).toBe('pay_amount')
    expect(getMappedAttributeCodeDisplay('deal_amount')).toBe('deal_amount')
    expect(formatDisplayValue(getMappedAttributeCodeDisplay(null))).toBe('-')
  })

  it('keeps the table background override local to the drawer and covers header and body cells', () => {
    const styles = readFileSync(new URL('./AttributeDrawer.module.scss', import.meta.url), 'utf8')

    expect(styles).toContain('.tableSection .attributeTable')
    expect(styles).toContain(':global(.ant-table-thead > tr > th)')
    expect(styles).toContain(':global(.ant-table-tbody > tr:not(.ant-table-placeholder):not(.ant-table-measure-row) > td)')
    expect(styles).toContain('background: var(--abi-card-box-draw-pop-bg, #fcfdff) !important;')
    expect(styles).not.toMatch(/^\.ant-table-wrapper/m)
  })

  it('builds the four button filters with counts in their fixed order', () => {
    const filters = buildAttributeFilterItems([
      createAttribute('dimension', 'customer_id'),
      createAttribute('dimension', 'region'),
      createAttribute('indicator', 'amount'),
      createAttribute('label', 'vip'),
      createAttribute('field', 'legacy_field'),
    ])

    expect(filters).toEqual([
      { count: 5, key: 'all', label: '全部', tone: 'blue' },
      { count: 2, key: 'dimension', label: '维度属性', tone: 'blue' },
      { count: 1, key: 'indicator', label: '指标属性', tone: 'green' },
      { count: 1, key: 'label', label: '标签属性', tone: 'orange' },
    ])
  })

  it('maps attribute types to the requested three colors with a neutral legacy fallback', () => {
    expect(ATTRIBUTE_TYPE_PRESENTATION).toEqual({
      dimension: { label: '维度属性', tone: 'blue' },
      field: { label: '字段属性', tone: 'neutral' },
      indicator: { label: '指标属性', tone: 'green' },
      label: { label: '标签属性', tone: 'orange' },
    })
  })
})

import { describe, expect, it } from 'vitest'

import type { RuleFieldOption } from '../../rule-expression'

import { buildDerivedConditionDescription, buildDerivedMetricPreview } from './derivedMetricPreview'

const fields: RuleFieldOption[] = [
  {
    category: 'measures',
    dataType: 'decimal',
    id: 'amount-id',
    label: '实付金额',
    sourceName: 'payment_amount',
    tableName: 'trade_fact'
  },
  {
    category: 'dimensions',
    id: 'region-id',
    label: '区域',
    sourceName: 'region_code',
    tableName: 'trade_fact'
  }
]

const completeLayers = [
  {
    groups: [
      {
        conditions: [
          { fieldId: 'amount-id', id: 'condition-a', operator: '>=', value: 100 },
          { fieldId: 'region-id', id: 'condition-b', logicWithPrevious: 'OR', operator: '=', value: '华东' }
        ],
        id: 'group-a',
        name: '金额或区域'
      },
      {
        conditions: [{ fieldId: 'amount-id', id: 'condition-c', operator: '<', value: 1000 }],
        id: 'group-b',
        logicWithPrevious: 'AND',
        name: '金额上限'
      }
    ],
    id: 'layer-a',
    name: '高价值'
  },
  {
    groups: [
      {
        conditions: [{ fieldId: 'region-id', id: 'condition-d', operator: 'IS NOT NULL', value: '' }],
        id: 'group-c',
        name: '区域有效'
      }
    ],
    id: 'layer-b',
    name: '有效区域'
  }
]

describe('derived metric preview', () => {
  it('builds all formula sections and a metadata-backed SQL preview', () => {
    const result = buildDerivedMetricPreview({
      allFields: [
        {
          fieldName: 'payment_amount',
          tableName: 'trade_fact',
          techId: 'amount-id',
          tfieldType: 'measures'
        }
      ],
      atomicLabel: '实付金额',
      atomicMetric: { projectionFunc: 'sum', techId: 'amount-id', techName: 'trade_fact.payment_amount' },
      bizName: '最近支付金额',
      dimensionFieldIds: JSON.stringify([
        { dimId: 'region-dim', techName: 'region_id' },
        { dimId: 'product-dim', techName: 'product_id' },
        { dimId: 'region-dim', techName: 'region_id' }
      ]),
      dimensionOptions: [
        { key: 'product-dim', techName: 'product_id', title: '产品维度（product_id）' },
        { key: 'region-dim', techName: 'region_id', title: '区域维度（region_id）' }
      ],
      indicatorCode: 'recent_payment_amount',
      projectionFunc: 'sum',
      ruleFields: fields,
      ruleLayers: completeLayers,
      statisticalCaliber: {
        dateRangeMode: 'recent',
        dateRangeUnit: 'day',
        dateRangeValue: 7,
        endTime: '18:00',
        startTime: '09:00',
        subjectDimensionId: 'product-dim',
        timeRangeType: 'specified'
      }
    })

    expect(result.businessPreview).toContain('指标：最近支付金额')
    expect(result.businessPreview).toContain('计算基础：实付金额')
    expect(result.businessPreview).toContain('统计范围：最近 7 日，指定时段 09:00～18:00')
    expect(result.businessPreview).toContain('主体维度：产品维度（product_id）')
    expect(result.businessPreview).toContain('统计维度：区域维度（region_id）、产品维度（product_id）')
    expect(result.businessPreview).toContain('高价值：')
    expect(result.businessPreview).toContain('且\n有效区域：')
    expect(result.displaySql).toBe(
      "SELECT SUM(payment_amount) FROM trade_fact\nWHERE ((payment_amount >= 100 OR region_code = '华东') AND (payment_amount < 1000)) AND ((region_code IS NOT NULL))\nGROUP BY product_id, region_id"
    )
    expect(result.displaySql).not.toMatch(/最近|09:00|18:00/)
  })

  it('keeps mixed group and condition relations readable', () => {
    const description = buildDerivedConditionDescription(completeLayers, fields)

    expect(description).toContain('金额或区域（A. 实付金额 大于等于 100 或 B. 区域 等于 华东）')
    expect(description).toContain('且 金额上限（A. 实付金额 小于 1000）')
    expect(description).toContain('且\n有效区域：')
    expect(description).toContain('区域有效（A. 区域 不为空）')
  })

  it('deduplicates subject and statistic dimensions in GROUP BY', () => {
    const result = buildDerivedMetricPreview({
      allFields: [{ fieldName: 'payment_amount', rtableName: 'trade_fact', techId: 'amount-id' }],
      atomicLabel: '实付金额',
      atomicMetric: { techId: [{ fieldName: 'payment_amount', techId: 'amount-id' }] },
      dimensionFieldIds: JSON.stringify([{ dimId: 'product-dim', techName: 'product_id' }]),
      dimensionOptions: [{ key: 'product-dim', techName: 'product_id', title: '产品维度' }],
      projectionFunc: 'avg',
      ruleFields: fields,
      ruleLayers: [],
      statisticalCaliber: {
        dateRangeMode: 'today',
        dateRangeUnit: 'day',
        dateRangeValue: 7,
        subjectDimensionId: 'product-dim',
        timeRangeType: 'allDay'
      }
    })

    expect(result.displaySql).toContain('SELECT AVG(payment_amount)')
    expect(result.displaySql).toContain('FROM trade_fact')
    expect(result.displaySql).toContain('GROUP BY product_id')
    expect(result.displaySql).not.toContain('product_id, product_id')
    expect(result.displaySql).not.toContain('WHERE')
  })

  it('shows explicit incomplete placeholders without adding an invalid WHERE clause', () => {
    const result = buildDerivedMetricPreview({
      allFields: [],
      atomicMetric: { techId: 'field-id' },
      dimensionOptions: [],
      ruleFields: fields,
      ruleLayers: [
        {
          groups: [
            {
              conditions: [
                { fieldId: 'amount-id', id: 'condition-complete', operator: '>=', value: 100 },
                { fieldId: '', id: 'condition-incomplete', logicWithPrevious: 'AND', operator: '=', value: '' }
              ],
              id: 'group-a',
              name: '待完善分组'
            }
          ],
          id: 'layer-a',
          name: '待完善分层'
        }
      ]
    })

    expect(result.businessPreview).toContain('指标：未命名指标')
    expect(result.businessPreview).toContain('计算基础：请选择原子指标')
    expect(result.businessPreview).toContain('主体维度：请选择主体维度')
    expect(result.businessPreview).toContain('统计维度：未设置')
    expect(result.businessPreview).toContain('【请选择字段】 等于 【请输入值】')
    expect(result.displaySql).toContain('source_field /* 来源字段待接口返回 */')
    expect(result.displaySql).toContain('source_table /* 来源表待接口返回 */')
    expect(result.displaySql).not.toContain('WHERE')
  })

  it('keeps the existing submission expression separate from the complete display SQL', () => {
    const result = buildDerivedMetricPreview({
      allFields: [{ fieldName: 'payment_amount', tableName: 'trade_fact', techId: 'amount-id' }],
      atomicLabel: '实付金额',
      atomicMetric: { techId: 'amount-id' },
      dimensionOptions: [],
      indicatorCode: 'recent_payment_amount',
      projectionFunc: 'sum',
      ruleFields: fields,
      ruleLayers: [completeLayers[0]]
    })

    expect(result.submissionExpression).toBe(
      "SUM(实付金额)\nWHERE ((payment_amount >= 100 OR region_code = '华东') AND (payment_amount < 1000))"
    )
    expect(result.submissionExpression).not.toContain('SELECT')
    expect(result.displaySql).toContain('SELECT SUM(payment_amount) FROM trade_fact')
  })

  it('preserves the legacy sum fallback independently from display metadata', () => {
    const result = buildDerivedMetricPreview({
      allFields: [{ fieldName: 'payment_amount', tableName: 'trade_fact', techId: 'amount-id' }],
      atomicLabel: '实付金额',
      atomicMetric: { projectionFunc: 'avg', techId: 'amount-id' },
      dimensionOptions: [],
      ruleFields: fields,
      ruleLayers: []
    })

    expect(result.displaySql).toContain('SELECT AVG(payment_amount)')
    expect(result.submissionExpression).toBe('SUM(实付金额)')
  })

  it('uses an atomic techName without a dot directly in the SQL preview', () => {
    const result = buildDerivedMetricPreview({
      allFields: [{ fieldName: 'legacy_field', tableName: 'legacy_table', techId: 'amount-id' }],
      atomicLabel: '实付金额',
      atomicMetric: { techId: 'amount-id', techName: 'payment_amount' },
      dimensionOptions: [],
      projectionFunc: 'sum',
      ruleFields: fields,
      ruleLayers: []
    })

    expect(result.displaySql).toBe('SELECT SUM(payment_amount) FROM payment_amount')
  })
})

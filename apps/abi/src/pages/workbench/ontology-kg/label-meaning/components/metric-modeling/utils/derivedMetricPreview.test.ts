import { describe, expect, it } from 'vitest'

import type { RuleFieldOption } from '../../rule-expression'
import type { KnowledgeIndicatorItem } from '../types/metricModeling.types'

import { buildDerivedConditionDescription, buildDerivedMetricPreview } from './derivedMetricPreview'
import { buildKnowledgeCalcLogic } from './knowledgeSubmitPayload'

const productAtomic: KnowledgeIndicatorItem = {
  indId: 758,
  bizName: '商品SKU表_#_商品ID',
  techName: 't_product_sku.atomic_product_id',
  techId: [{ techId: '19943704006211' }],
  calcLogic: {
    agg: { data: ['sum', 'COUNT(X)'], type: 'simple' },
    techName: 't_product_sku.product_id'
  }
}

function previewProduct(projectionFunc: string, atomicMetric = productAtomic) {
  return buildDerivedMetricPreview({
    allFields: [],
    atomicLabel: '商品ID',
    atomicMetric,
    dimensionOptions: [],
    projectionFunc,
    ruleFields: [],
    ruleLayers: []
  })
}

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
        subjectDimensionIds: ['product-dim', 'region-dim'],
        subjectDimensionNameMap: {
          'product-dim': '产品维度（product_id）',
          'region-dim': '区域维度（region_id）'
        },
        timeRangeType: 'specified'
      }
    })

    expect(result.businessPreview).toContain('指标：最近支付金额')
    expect(result.businessPreview).toContain('计算基础：实付金额')
    expect(result.businessPreview).toContain('统计范围：最近 7 日，指定时段 09:00～18:00')
    expect(result.businessPreview).toContain('主体维度：产品维度（product_id）、区域维度（region_id）')
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

  it('submits the source-field expression and conditions without the complete display SQL', () => {
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
      "SUM(payment_amount)\nWHERE ((payment_amount >= 100 OR region_code = '华东') AND (payment_amount < 1000))"
    )
    expect(result.submissionExpression).not.toContain('SELECT')
    expect(result.displaySql).toContain('SELECT SUM(payment_amount) FROM trade_fact')
  })

  it('uses the same metadata aggregation fallback for display and submission', () => {
    const result = buildDerivedMetricPreview({
      allFields: [{ fieldName: 'payment_amount', tableName: 'trade_fact', techId: 'amount-id' }],
      atomicLabel: '实付金额',
      atomicMetric: { projectionFunc: 'avg', techId: 'amount-id' },
      dimensionOptions: [],
      ruleFields: fields,
      ruleLayers: []
    })

    expect(result.displaySql).toContain('SELECT AVG(payment_amount)')
    expect(result.submissionExpression).toBe('AVG(payment_amount)')
  })

  it('uses an atomic techName without a dot directly in the SQL preview', () => {
    const result = buildDerivedMetricPreview({
      allFields: [],
      atomicLabel: '实付金额',
      atomicMetric: { techId: 'amount-id', techName: 'payment_amount' },
      dimensionOptions: [],
      projectionFunc: 'sum',
      ruleFields: fields,
      ruleLayers: []
    })

    expect(result.displaySql).toBe('SELECT SUM(payment_amount) FROM payment_amount')
  })

  it('uses a custom atomic expression directly instead of wrapping it with a fallback aggregation', () => {
    const expression = 'SUM(payment_amount) / COUNT(DISTINCT order_id)'
    const result = buildDerivedMetricPreview({
      allFields: [{ fieldName: 'payment_amount', tableName: 'trade_fact', techId: 'amount-id' }],
      atomicLabel: '客单价',
      atomicMetric: {
        calcLogic: { agg: { data: expression, type: 'complex' } },
        techId: [{ techId: 'amount-id', techName: 'trade_fact.payment_amount' }]
      },
      dimensionOptions: [],
      projectionFunc: expression,
      ruleFields: fields,
      ruleLayers: []
    })

    expect(result.displaySql).toBe(`SELECT ${expression} FROM trade_fact`)
    expect(result.submissionExpression).toBe(expression)
    expect(result.displaySql).not.toContain(`SUM(${expression})`)
  })

  it.each([productAtomic.calcLogic, JSON.stringify(productAtomic.calcLogic)])(
    'uses calcLogic source metadata instead of the atomic code or Chinese label: %j',
    calcLogic => {
      const result = previewProduct('sum', { ...productAtomic, calcLogic })
      const payload = buildKnowledgeCalcLogic({
        indicatorClass: 'derived',
        expr: result.submissionExpression,
        projectionFunc: 'sum',
        techId: productAtomic.techId
      })

      expect(result.displaySql).toBe('SELECT SUM(product_id) FROM t_product_sku')
      expect(result.submissionExpression).toBe('SUM(product_id)')
      expect(result.businessPreview).toContain('计算基础：商品ID')
      expect(payload.expr).toBe('SUM(product_id)')
      expect(payload.aggMethod).toBe('sum')
      expect(payload.techId).toEqual(productAtomic.techId)
    }
  )

  it('prefers explicit source fields over an atomic metric code', () => {
    const result = previewProduct('sum', {
      ...productAtomic,
      calcLogic: undefined,
      techId: [{ techId: '19943704006211', techName: 't_product_sku.product_id' }]
    })

    expect(result.displaySql).toBe('SELECT SUM(product_id) FROM t_product_sku')
    expect(result.submissionExpression).toBe('SUM(product_id)')
  })

  it('resolves legacy source IDs from semantic fields before falling back to the indicator code', () => {
    const result = buildDerivedMetricPreview({
      allFields: [
        {
          techId: '19943704006211',
          fieldName: '19943704006211',
          originName: 'product_id',
          tableName: 't_product_sku'
        }
      ],
      atomicLabel: '商品ID',
      atomicMetric: { ...productAtomic, calcLogic: undefined },
      dimensionOptions: [],
      projectionFunc: 'sum',
      ruleFields: [],
      ruleLayers: []
    })

    expect(result.displaySql).toBe('SELECT SUM(product_id) FROM t_product_sku')
    expect(result.submissionExpression).toBe('SUM(product_id)')
  })

  it('uses the exact first dictionary template when the selection has not been populated', () => {
    const result = previewProduct('', {
      ...productAtomic,
      calcLogic: { agg: { data: ['COUNT(X)'], type: 'simple' }, techName: 't_product_sku.product_id' }
    })

    expect(result.displaySql).toBe('SELECT COUNT(product_id) FROM t_product_sku')
    expect(result.submissionExpression).toBe('COUNT(product_id)')
  })

  it('inherits complex expressions verbatim without replacing their identifiers or literal X', () => {
    const expression = "COALESCE(SUM(product_id), 0) + CASE WHEN marker = 'X' THEN 1 ELSE 0 END"
    const result = previewProduct('', {
      ...productAtomic,
      calcLogic: { agg: { data: expression, type: 'complex' }, techName: 't_product_sku.product_id' }
    })

    expect(result.submissionExpression).toBe(expression)
    expect(result.displaySql).toBe(`SELECT ${expression} FROM t_product_sku`)
  })

  it.each([
    ['sum', 'SUM(product_id)'],
    ['COUNT DISTINCT', 'COUNT(DISTINCT product_id)'],
    ['COUNT(X)', 'COUNT(product_id)'],
    ['DISTINCT (X)', 'DISTINCT (product_id)'],
    ['COUNT(DISTINCT X)', 'COUNT(DISTINCT product_id)'],
    ['coalesce(SUM(X), 0)', 'coalesce(SUM(product_id), 0)'],
    ['SUM({field})', 'SUM(product_id)'],
    ['SUM(${field})', 'SUM(product_id)'],
    ['SUM({{field}})', 'SUM(product_id)'],
    ['SUM(##字段##)', 'SUM(product_id)'],
    ['SUM(%s)', 'SUM(product_id)'],
    ['COUNT(*)', 'COUNT(*)']
  ])('renders dictionary template %s without adding another function call', (projectionFunc, expression) => {
    const result = previewProduct(projectionFunc)

    expect(result.displaySql).toBe(`SELECT ${expression} FROM t_product_sku`)
    expect(result.submissionExpression).toBe(expression)
    const calcLogic = buildKnowledgeCalcLogic({ indicatorClass: 'derived', expr: result.submissionExpression, projectionFunc })
    expect(calcLogic.expr).toBe(expression)
    expect(calcLogic.aggMethod).toBe(projectionFunc)
  })
})

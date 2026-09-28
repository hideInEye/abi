import { describe, expect, it } from 'vitest'

import type { AggregationCode, KnowledgeIndicatorItem } from '../types/metricModeling.types'

import {
  buildCustomAtomicSourceField,
  buildSimpleAtomicSourceField,
  getAtomicAggregationMethods,
  getAtomicAggregationType,
  getAtomicComplexAggregationExpression,
  getAtomicProjection,
  getAtomicSemanticSchemaId,
  getAtomicSemanticSchemaName,
  getAtomicSourceFieldTechnicalName,
  getAtomicTechnicalSource,
  hasAtomicAggregationMetadata,
  parseAtomicSourceFields,
  parseSemanticModelFields,
  resolveDerivedAggregationMethod
} from './atomicMetricSource'

describe('atomic metric source adapter', () => {
  it('resolves source metadata with sum fallback', () => {
    const item = {
      relSchemaId: 'schema-1',
      techId: JSON.stringify([{ fieldName: 'payment_amount', projectionFunc: 'avg', techId: 'field-1' }])
    }
    expect(getAtomicSemanticSchemaId(item)).toBe('schema-1')
    expect(getAtomicProjection(item)).toBe('avg')
    expect(parseAtomicSourceFields(item.techId)).toMatchObject([{ fieldName: 'payment_amount', techId: 'field-1' }])
    expect(getAtomicProjection({ techId: [] })).toBe('')
  })

  it('prefers the new aggregation array and resets derived selection when the atomic metric changes', () => {
    const item = {
      agg: { data: ['AVG', 'MAX'] as AggregationCode[], type: 'simple' as const },
      projectionFunc: 'sum'
    }
    expect(getAtomicAggregationMethods(item)).toEqual(['AVG', 'MAX'])
    expect(resolveDerivedAggregationMethod(item, 'MAX', true)).toBe('MAX')
    expect(resolveDerivedAggregationMethod(item, 'SUM', true)).toBe('AVG')
    expect(resolveDerivedAggregationMethod(item, 'MAX')).toBe('AVG')
    expect(getAtomicAggregationMethods({ projectionFunc: 'distinct' })).toEqual(['distinct'])
    expect(getAtomicAggregationMethods({ agg: { data: [], type: 'simple' } })).toEqual([])
    expect(hasAtomicAggregationMetadata(item)).toBe(true)
    expect(hasAtomicAggregationMetadata({ relSchemaId: 'schema-1' })).toBe(false)
    expect(hasAtomicAggregationMetadata({ agg: { data: 'SUM(amount)', type: 'complex' } })).toBe(true)
  })

  it('keeps custom aggregation display separate from its real derived submission value', () => {
    const item = {
      calcLogic: {
        agg: {
          data: 'SUM(payment_amount) / COUNT(DISTINCT order_id)',
          type: 'complex'
        }
      }
    }

    expect(getAtomicAggregationType(item)).toBe('complex')
    expect(getAtomicAggregationMethods(item)).toEqual([])
    expect(getAtomicComplexAggregationExpression(item)).toBe('SUM(payment_amount) / COUNT(DISTINCT order_id)')
    expect(resolveDerivedAggregationMethod(item, 'SUM', true)).toBe(
      'SUM(payment_amount) / COUNT(DISTINCT order_id)'
    )
  })

  it('derives the English source field and table from atomic techName', () => {
    expect(getAtomicTechnicalSource('trade_fact.payment_amount')).toEqual({
      fieldName: 'payment_amount',
      tableName: 'trade_fact'
    })
    expect(getAtomicTechnicalSource('warehouse.trade_fact.payment_amount')).toEqual({
      fieldName: 'payment_amount',
      tableName: 'warehouse.trade_fact'
    })
    expect(getAtomicTechnicalSource('payment_amount')).toEqual({
      fieldName: 'payment_amount',
      tableName: 'payment_amount'
    })
    expect(
      getAtomicSourceFieldTechnicalName({
        calcLogic: { techName: 'trade_fact.payment_amount' },
        techId: { techId: 'field-1' },
        techName: 'atomic_payment_amount_custom'
      })
    ).toBe('trade_fact.payment_amount')
  })

  it('resolves the semantic schema name from the selected atomic metric metadata', () => {
    expect(getAtomicSemanticSchemaName({ relSchemaName: '订单分析语义' })).toBe('订单分析语义')
    expect(
      getAtomicSemanticSchemaName({
        techId: [{ rtableName: '支付明细语义', techId: 'payment-amount' }]
      })
    ).toBe('支付明细语义')
    expect(
      getAtomicSemanticSchemaName({
        bizName: '交易流水信息_#_交易金额'
      })
    ).toBe('交易流水信息')
    expect(getAtomicSemanticSchemaName({ bizName: '普通原子指标' })).toBe('-')
  })

  it('parses dimension, measure and date fields from semantic model detail', () => {
    const fields = parseSemanticModelFields({
      modelDetail: JSON.stringify({
        dimensions: [
          { fieldName: 'shop_id', techId: 'd1', type: 'varchar' },
          { fieldName: 'pay_time', techId: 'd2', type: 'datetime' }
        ],
        measures: [{ fieldName: 'amount', techId: 'm1', type: 'decimal' }]
      }),
      tableName: 'orders'
    })
    expect(fields.map(item => item.tfieldType)).toEqual(['dimensions', 'dates', 'measures'])
    expect(fields.every(item => item.tableName === 'orders')).toBe(true)
  })

  it('formats the selected custom atomic source field for storage', () => {
    expect(
      buildCustomAtomicSourceField({
        bizName: '支付金额',
        fieldName: 'payment_amount',
        semanticType: 'measure',
        tableBizName: '订单明细表',
        tableName: 'order_detail',
        techId: 'field-1'
      })
    ).toMatchObject({
      bizName: '订单明细表_#_支付金额',
      semanticType: 'measure',
      techId: 'field-1',
      techName: 'order_detail.payment_amount'
    })
    expect(
      buildCustomAtomicSourceField({
        bizName: '订单明细表_#_支付金额',
        tableBizName: '订单明细表',
        tableName: 'order_detail',
        techId: 'field-1',
        techName: 'order_detail.payment_amount'
      })
    ).toMatchObject({
      bizName: '订单明细表_#_支付金额',
      techName: 'order_detail.payment_amount'
    })
  })

  it('keeps a one-click mapped source field as simple aggregation when edited', () => {
    expect(
      buildSimpleAtomicSourceField(
        {
          bizName: '支付金额',
          fieldName: 'payment_amount',
          tableBizName: '订单明细表',
          tableName: 'order_detail',
          techId: 'field-1'
        },
        ['SUM', 'AVG']
      )
    ).toMatchObject({
      agg: { data: ['SUM', 'AVG'], type: 'simple' },
      projectionFunc: 'sum',
      techId: 'field-1'
    })
  })

  it('prefers the source field simple type for one-click metrics with stale calc logic', () => {
    const item: KnowledgeIndicatorItem = {
      calcLogic: { agg: { data: 'SUM(payment_amount)', type: 'complex' } },
      techId: [{ agg: { data: ['SUM', 'MAX'], type: 'simple' }, techId: 'field-1' }]
    }

    expect(getAtomicAggregationType(item)).toBe('simple')
    expect(getAtomicAggregationMethods(item)).toEqual(['SUM', 'MAX'])
    expect(getAtomicComplexAggregationExpression(item)).toBe('')
    expect(
      getAtomicAggregationType({
        techId: JSON.stringify([{ agg: { data: ['AVG'], type: 'simple' }, techId: 'field-2' }])
      })
    ).toBe('simple')
  })
})

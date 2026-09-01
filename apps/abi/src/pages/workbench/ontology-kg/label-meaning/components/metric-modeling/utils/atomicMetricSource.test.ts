import { describe, expect, it } from 'vitest'

import {
  getAtomicProjection,
  getAtomicSemanticSchemaId,
  getAtomicSemanticSchemaName,
  getAtomicTechnicalSource,
  parseAtomicSourceFields,
  parseSemanticModelFields
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
    expect(getAtomicProjection({ techId: [] })).toBe('sum')
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
})

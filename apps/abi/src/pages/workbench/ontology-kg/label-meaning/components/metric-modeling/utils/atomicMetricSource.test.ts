import { describe, expect, it } from 'vitest'

import {
  getAtomicProjection,
  getAtomicSemanticSchemaId,
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

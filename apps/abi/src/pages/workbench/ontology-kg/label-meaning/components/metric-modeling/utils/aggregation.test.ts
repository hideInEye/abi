import { describe, expect, it } from 'vitest'

import {
  normalizeAggregationCode,
  normalizeAggregationCodes,
  toDerivedAggregationPayloadValue,
  toLegacyProjectionFunc
} from './aggregation'

describe('aggregation adapter', () => {
  it('normalizes supported aggregation enums and legacy aliases', () => {
    expect(normalizeAggregationCode(' count   distinct ')).toBe('COUNT DISTINCT')
    expect(normalizeAggregationCode('distinct')).toBe('COUNT DISTINCT')
    expect(normalizeAggregationCode('avg')).toBe('AVG')
    expect(normalizeAggregationCode('unknown')).toBeUndefined()
  })

  it('prefers new agg data while deduplicating values', () => {
    expect(
      normalizeAggregationCodes({
        data: ['sum', 'AVG', 'SUM', 'COUNT DISTINCT'],
        type: 'simple'
      })
    ).toEqual(['SUM', 'AVG', 'COUNT DISTINCT'])
    expect(normalizeAggregationCodes(undefined, ['SUM'])).toEqual(['SUM'])
  })

  it('writes the first selection to the legacy projection value', () => {
    expect(toLegacyProjectionFunc('AVG')).toBe('avg')
    expect(toLegacyProjectionFunc('COUNT DISTINCT')).toBe('distinct')
  })

  it('keeps a custom aggregation expression unchanged for derived submission', () => {
    expect(toDerivedAggregationPayloadValue('AVG')).toBe('avg')
    expect(toDerivedAggregationPayloadValue('SUM(amount) / COUNT(DISTINCT order_id)')).toBe(
      'SUM(amount) / COUNT(DISTINCT order_id)'
    )
  })
})

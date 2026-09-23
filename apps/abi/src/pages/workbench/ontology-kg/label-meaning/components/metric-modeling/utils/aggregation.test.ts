import { describe, expect, it } from 'vitest'

import {
  normalizeAggregationCode,
  normalizeAggregationCodes,
  toDerivedAggregationPayloadValue,
  toLegacyProjectionFunc
} from './aggregation'

describe('aggregation adapter', () => {
  it('normalizes dynamic aggregation codes without a local enum allowlist', () => {
    expect(normalizeAggregationCode(' count   distinct ')).toBe('COUNT DISTINCT')
    expect(normalizeAggregationCode('distinct')).toBe('DISTINCT')
    expect(normalizeAggregationCode('avg')).toBe('AVG')
    expect(normalizeAggregationCode('custom_method')).toBe('CUSTOM_METHOD')
    expect(normalizeAggregationCode('SUM(amount)')).toBeUndefined()
  })

  it('preserves exact dictionary values while deduplicating selections', () => {
    expect(
      normalizeAggregationCodes({
        data: ['SUM(X)', 'AVG(X)', 'SUM(X)', 'DISTINCT (X)'],
        type: 'simple'
      })
    ).toEqual(['SUM(X)', 'AVG(X)', 'DISTINCT (X)'])
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

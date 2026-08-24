import { describe, expect, it } from 'vitest'

import {
  createDefaultPrecomputeConfig,
  getPrecomputeSummary,
  normalizePrecomputeConfig,
  normalizeStatisticalCaliber
} from './precomputeConfig'

describe('precompute config', () => {
  it('creates frequency-specific defaults and summaries', () => {
    expect(createDefaultPrecomputeConfig('hourly')).toEqual({ frequency: 'hourly', minute: 0 })
    expect(createDefaultPrecomputeConfig('daily')).toEqual({ frequency: 'daily', time: '00:00' })
    expect(getPrecomputeSummary({ frequency: 'hourly', minute: 7 })).toContain('第 07 分钟')
    expect(getPrecomputeSummary({ frequency: 'weekly', time: '09:00', weekday: 1 })).toContain('每周周一 09:00')
    expect(getPrecomputeSummary({ frequency: 'monthly', monthDay: 31, time: '23:30' })).toContain('每月 31 日 23:30')
  })

  it('falls back from invalid or legacy values', () => {
    expect(normalizePrecomputeConfig(undefined, 'monthly')).toEqual({
      frequency: 'monthly',
      monthDay: 1,
      time: '00:00'
    })
    expect(normalizePrecomputeConfig({ frequency: 'hourly', minute: 90 })).toEqual({ frequency: 'hourly', minute: 0 })
    expect(normalizeStatisticalCaliber({ dateRangeValue: 0, timeRangeType: 'specified' })).toEqual({
      dateRangeUnit: 'hour',
      dateRangeValue: 7,
      endTime: '23:59',
      startTime: '00:00',
      timeRangeType: 'specified'
    })
  })
})

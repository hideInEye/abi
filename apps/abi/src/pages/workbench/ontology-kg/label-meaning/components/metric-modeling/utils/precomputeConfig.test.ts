import { describe, expect, it } from 'vitest'

import {
  createDefaultPrecomputeConfig,
  getPrecomputeSummary,
  getStatisticalDateRangeHint,
  getStatisticalDateRangeSummary,
  getStatisticalDateRangeUnitOptions,
  isDynamicStatisticalDateRangeMode,
  isValidStatisticalDateRangeValue,
  normalizePrecomputeConfig,
  normalizeStatisticalCaliber,
  normalizeStatisticalDateRangeUnit
} from './precomputeConfig'

describe('precompute config', () => {
  it('creates frequency-specific defaults and summaries', () => {
    expect(createDefaultPrecomputeConfig('hourly')).toEqual({ frequency: 'hourly', minute: 0 })
    expect(createDefaultPrecomputeConfig('daily')).toEqual({ frequency: 'daily', time: '00:00' })
    expect(getPrecomputeSummary({ frequency: 'hourly', minute: 7 })).toContain('第 07 分钟')
    expect(getPrecomputeSummary({ frequency: 'weekly', time: '09:00', weekday: 1 })).toContain('每周周一 09:00')
    expect(getPrecomputeSummary({ frequency: 'monthly', monthDay: 31, time: '23:30' })).toContain('每月 31 日 23:30')
  })

  it('falls back from invalid values while migrating legacy statistical caliber to recent', () => {
    expect(normalizePrecomputeConfig(undefined, 'monthly')).toEqual({
      frequency: 'monthly',
      monthDay: 1,
      time: '00:00'
    })
    expect(normalizePrecomputeConfig({ frequency: 'hourly', minute: 90 })).toEqual({ frequency: 'hourly', minute: 0 })
    expect(normalizeStatisticalCaliber({ dateRangeValue: 0, timeRangeType: 'specified' })).toEqual({
      dateRangeMode: 'recent',
      dateRangeUnit: 'day',
      dateRangeValue: 7,
      endTime: '23:59',
      startTime: '00:00',
      timeRangeType: 'specified'
    })
    expect(normalizeStatisticalCaliber({ dateRangeUnit: 'hour', dateRangeValue: 30 })).toMatchObject({
      dateRangeMode: 'recent',
      dateRangeUnit: 'hour',
      dateRangeValue: 30
    })
  })

  it('enforces the dynamic mode unit whitelist and amount boundary', () => {
    expect(isDynamicStatisticalDateRangeMode('recent')).toBe(true)
    expect(isDynamicStatisticalDateRangeMode('previous_full')).toBe(true)
    expect(isDynamicStatisticalDateRangeMode('today')).toBe(false)
    expect(getStatisticalDateRangeUnitOptions('recent').map(item => item.value)).toEqual([
      'hour',
      'day',
      'week',
      'month',
      'quarter',
      'year'
    ])
    expect(getStatisticalDateRangeUnitOptions('previous_full').map(item => item.value)).toEqual([
      'day',
      'week',
      'month',
      'quarter',
      'year'
    ])
    expect(normalizeStatisticalDateRangeUnit('previous_full', 'hour')).toBe('day')
    expect(normalizeStatisticalDateRangeUnit('previous_full', 'quarter')).toBe('quarter')
    expect(isValidStatisticalDateRangeValue(1)).toBe(true)
    expect(isValidStatisticalDateRangeValue(999)).toBe(true)
    expect(isValidStatisticalDateRangeValue(null)).toBe(false)
    expect(isValidStatisticalDateRangeValue(0)).toBe(false)
    expect(isValidStatisticalDateRangeValue(1000)).toBe(false)
    expect(isValidStatisticalDateRangeValue(1.5)).toBe(false)
  })

  it('normalizes multiple subject dimensions and the cross-dimension flag', () => {
    expect(
      normalizeStatisticalCaliber({
        isCrossDim: '是',
        subjectDimensionIds: ['dim-1', 'dim-1', 'dim-2'],
        subjectDimensionNameMap: { 'dim-1': '产品维度', 'dim-2': '区域维度' }
      })
    ).toMatchObject({
      isCrossDim: true,
      subjectDimensionId: 'dim-1',
      subjectDimensionIds: ['dim-1', 'dim-2'],
      subjectDimensionName: '产品维度',
      subjectDimensionNameMap: { 'dim-1': '产品维度', 'dim-2': '区域维度' }
    })
  })

  it.each([
    {
      hint: '每次预计算时，动态统计最近 7 日的数据。',
      summary: '最近 7 日',
      value: { dateRangeMode: 'recent', dateRangeUnit: 'day', dateRangeValue: 7 }
    },
    {
      hint: '每次预计算时，统计前 2 天的数据，不包含今天。',
      summary: '前 2 天',
      value: { dateRangeMode: 'previous_full', dateRangeUnit: 'day', dateRangeValue: 2 }
    },
    {
      hint: '每次预计算时，统计前 2 个完整周的数据，不包含本周。',
      summary: '前 2 个完整周',
      value: { dateRangeMode: 'previous_full', dateRangeUnit: 'week', dateRangeValue: 2 }
    },
    {
      hint: '每次预计算时，统计前 2 个完整月的数据，不包含本月。',
      summary: '前 2 个完整月',
      value: { dateRangeMode: 'previous_full', dateRangeUnit: 'month', dateRangeValue: 2 }
    },
    {
      hint: '每次预计算时，统计前 2 个完整季度的数据，不包含本季度。',
      summary: '前 2 个完整季度',
      value: { dateRangeMode: 'previous_full', dateRangeUnit: 'quarter', dateRangeValue: 2 }
    },
    {
      hint: '每次预计算时，统计前 2 个完整年的数据，不包含本年。',
      summary: '前 2 个完整年',
      value: { dateRangeMode: 'previous_full', dateRangeUnit: 'year', dateRangeValue: 2 }
    },
    {
      hint: '每次预计算时，统计今天截至当前执行时点的数据。',
      summary: '今日',
      value: { dateRangeMode: 'today', dateRangeUnit: 'day', dateRangeValue: 7 }
    },
    {
      hint: '每次预计算时，统计昨日全天数据。',
      summary: '昨日',
      value: { dateRangeMode: 'yesterday', dateRangeUnit: 'day', dateRangeValue: 7 }
    },
    {
      hint: '每次预计算时，统计本周截至当前执行时点的数据。',
      summary: '本周',
      value: { dateRangeMode: 'this_week', dateRangeUnit: 'day', dateRangeValue: 7 }
    },
    {
      hint: '每次预计算时，统计上周完整自然周的数据。',
      summary: '上周',
      value: { dateRangeMode: 'last_week', dateRangeUnit: 'day', dateRangeValue: 7 }
    },
    {
      hint: '每次预计算时，统计本月截至当前执行时点的数据。',
      summary: '本月',
      value: { dateRangeMode: 'this_month', dateRangeUnit: 'day', dateRangeValue: 7 }
    },
    {
      hint: '每次预计算时，统计上月完整自然月的数据。',
      summary: '上月',
      value: { dateRangeMode: 'last_month', dateRangeUnit: 'day', dateRangeValue: 7 }
    },
    {
      hint: '每次预计算时，统计本季度截至当前执行时点的数据。',
      summary: '本季度',
      value: { dateRangeMode: 'this_quarter', dateRangeUnit: 'day', dateRangeValue: 7 }
    },
    {
      hint: '每次预计算时，统计上季度完整自然季度的数据。',
      summary: '上季度',
      value: { dateRangeMode: 'last_quarter', dateRangeUnit: 'day', dateRangeValue: 7 }
    },
    {
      hint: '每次预计算时，统计本年截至当前执行时点的数据。',
      summary: '本年',
      value: { dateRangeMode: 'this_year', dateRangeUnit: 'day', dateRangeValue: 7 }
    },
    {
      hint: '每次预计算时，统计上年完整自然年的数据。',
      summary: '上年',
      value: { dateRangeMode: 'last_year', dateRangeUnit: 'day', dateRangeValue: 7 }
    }
  ])('builds the $value.dateRangeMode hint and summary', ({ hint, summary, value }) => {
    expect(getStatisticalDateRangeHint(value)).toBe(hint)
    expect(getStatisticalDateRangeSummary(value)).toBe(summary)
  })

  it('shows the empty amount hint for dynamic modes only', () => {
    expect(getStatisticalDateRangeHint({ dateRangeMode: 'recent', dateRangeUnit: 'day', dateRangeValue: null })).toBe(
      '请输入统计窗口数量。'
    )
    expect(getStatisticalDateRangeHint({ dateRangeMode: 'today', dateRangeUnit: 'day', dateRangeValue: null })).toBe(
      '每次预计算时，统计今天截至当前执行时点的数据。'
    )
  })
})

import { describe, expect, it } from 'vitest'

import {
  buildApiCalcPeriod,
  buildApiSubjectDimension,
  buildApiUpdateFrequency,
  parseApiCalcPeriod,
  parseApiSubjectDimension,
  parseApiUpdateFrequency
} from './indicatorApiAdapter'

describe('indicator api adapter', () => {
  it.each([
    [
      { frequency: 'hourly', minute: 7 },
      { day_of_month: null, day_of_week: null, frequency: 'hourly', minute: '7' }
    ],
    [
      { frequency: 'daily', time: '08:30' },
      { day_of_month: null, day_of_week: null, frequency: 'daily', minute: '08:30' }
    ],
    [
      { frequency: 'weekly', time: '09:00', weekday: 7 },
      { day_of_month: null, day_of_week: 7, frequency: 'weekly', minute: '09:00' }
    ],
    [
      { frequency: 'monthly', monthDay: 31, time: '23:45' },
      { day_of_month: 31, day_of_week: null, frequency: 'monthly', minute: '23:45' }
    ]
  ] as const)('maps precompute config %# to the api object', (formValue, expected) => {
    expect(buildApiUpdateFrequency(formValue)).toEqual(expected)
    expect(parseApiUpdateFrequency(expected)).toEqual(formValue)
  })

  it('falls back to the legacy string and calcLogic config', () => {
    expect(parseApiUpdateFrequency('weekly', { frequency: 'weekly', time: '10:00', weekday: 2 })).toEqual({
      frequency: 'weekly',
      time: '10:00',
      weekday: 2
    })
  })

  it.each([
    ['recent', 'recent'],
    ['previous_full', 'previous'],
    ['today', 'today'],
    ['yesterday', 'yesterday'],
    ['this_week', 'current_week'],
    ['last_week', 'last_week'],
    ['this_month', 'current_month'],
    ['last_month', 'last_month'],
    ['this_quarter', 'current_quarter'],
    ['last_quarter', 'last_quarter'],
    ['this_year', 'current_year'],
    ['last_year', 'last_year']
  ] as const)('maps date range mode %s to %s', (formMode, apiMode) => {
    const dynamic = formMode === 'recent' || formMode === 'previous_full'
    const result = buildApiCalcPeriod({
      dateRangeMode: formMode,
      dateRangeUnit: 'day',
      dateRangeValue: 7,
      timeRangeType: 'allDay'
    })
    expect(result).toEqual({
      date_range: {
        type: apiMode,
        unit: dynamic ? 'day' : null,
        value: dynamic ? 7 : null
      },
      time_range: { end_time: null, start_time: null, type: 'all_day' }
    })
    expect(parseApiCalcPeriod(result).dateRangeMode).toBe(formMode)
  })

  it('maps a custom time range and subject dimension in both directions', () => {
    const caliber = {
      dateRangeMode: 'previous_full',
      dateRangeUnit: 'month',
      dateRangeValue: 3,
      endTime: '06:59',
      startTime: '00:00',
      subjectDimensionId: 'dim-1',
      subjectDimensionName: '产品维度',
      timeRangeType: 'specified'
    }
    expect(buildApiCalcPeriod(caliber)).toMatchObject({
      time_range: { end_time: '06:59', start_time: '00:00', type: 'custom' }
    })
    expect(buildApiSubjectDimension(caliber)).toEqual({ dim_id: 'dim-1', dim_name: '产品维度' })
    expect(parseApiSubjectDimension({ dim_id: 'dim-1', dim_name: '产品维度' })).toEqual({
      subjectDimensionId: 'dim-1',
      subjectDimensionName: '产品维度'
    })
  })
})

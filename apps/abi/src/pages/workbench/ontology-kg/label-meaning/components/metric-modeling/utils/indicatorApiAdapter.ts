import type {
  ApiCalcPeriod,
  ApiStatisticalDateRangeType,
  ApiSubjectDimension,
  ApiUpdateFrequency,
  PrecomputeConfig,
  PrecomputeFrequency,
  StatisticalCaliber,
  StatisticalDateRangeMode
} from '../types/metricModeling.types'

import {
  isDynamicStatisticalDateRangeMode,
  normalizePrecomputeConfig,
  normalizeStatisticalCaliber
} from './precomputeConfig'

type UnknownRecord = Record<string, unknown>

const PRECOMPUTE_FREQUENCIES = new Set<PrecomputeFrequency>(['hourly', 'daily', 'weekly', 'monthly'])

const DATE_RANGE_MODE_TO_API: Record<StatisticalDateRangeMode, ApiStatisticalDateRangeType> = {
  last_month: 'last_month',
  last_quarter: 'last_quarter',
  last_week: 'last_week',
  last_year: 'last_year',
  previous_full: 'previous',
  recent: 'recent',
  this_month: 'current_month',
  this_quarter: 'current_quarter',
  this_week: 'current_week',
  this_year: 'current_year',
  today: 'today',
  yesterday: 'yesterday'
}

const API_DATE_RANGE_MODE_TO_FORM: Record<ApiStatisticalDateRangeType, StatisticalDateRangeMode> = {
  current_month: 'this_month',
  current_quarter: 'this_quarter',
  current_week: 'this_week',
  current_year: 'this_year',
  last_month: 'last_month',
  last_quarter: 'last_quarter',
  last_week: 'last_week',
  last_year: 'last_year',
  previous: 'previous_full',
  recent: 'recent',
  today: 'today',
  yesterday: 'yesterday'
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function asRecord(value: unknown): UnknownRecord {
  const parsed = parseJson(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as UnknownRecord) : {}
}

function normalizeApiFrequency(value: unknown): PrecomputeFrequency | undefined {
  const frequency = String(value || '') as PrecomputeFrequency
  return PRECOMPUTE_FREQUENCIES.has(frequency) ? frequency : undefined
}

export function buildApiUpdateFrequency(value: unknown): ApiUpdateFrequency {
  const config = normalizePrecomputeConfig(value)
  if (config.frequency === 'hourly') {
    return {
      day_of_month: null,
      day_of_week: null,
      frequency: config.frequency,
      minute: String(config.minute)
    }
  }
  if (config.frequency === 'weekly') {
    return {
      day_of_month: null,
      day_of_week: config.weekday,
      frequency: config.frequency,
      minute: config.time
    }
  }
  if (config.frequency === 'monthly') {
    return {
      day_of_month: config.monthDay,
      day_of_week: null,
      frequency: config.frequency,
      minute: config.time
    }
  }
  return {
    day_of_month: null,
    day_of_week: null,
    frequency: config.frequency,
    minute: config.time
  }
}

export function parseApiUpdateFrequency(value: unknown, legacyConfig?: unknown): PrecomputeConfig {
  const source = asRecord(value)
  const frequency = normalizeApiFrequency(source.frequency)
  const isApiShape =
    frequency &&
    (Object.hasOwn(source, 'day_of_month') || Object.hasOwn(source, 'day_of_week') || Object.hasOwn(source, 'minute'))

  if (isApiShape && frequency === 'hourly') {
    return normalizePrecomputeConfig({ frequency, minute: Number(source.minute) })
  }
  if (isApiShape && frequency === 'weekly') {
    return normalizePrecomputeConfig({
      frequency,
      time: String(source.minute || '00:00'),
      weekday: source.day_of_week
    })
  }
  if (isApiShape && frequency === 'monthly') {
    return normalizePrecomputeConfig({
      frequency,
      monthDay: source.day_of_month,
      time: String(source.minute || '00:00')
    })
  }
  if (isApiShape && frequency === 'daily') {
    return normalizePrecomputeConfig({ frequency, time: String(source.minute || '00:00') })
  }
  if (frequency) {
    return normalizePrecomputeConfig(source)
  }

  const legacyFrequency = typeof value === 'string' ? value : undefined
  return normalizePrecomputeConfig(legacyConfig, legacyFrequency)
}

export function buildApiCalcPeriod(value: unknown): ApiCalcPeriod {
  const caliber = normalizeStatisticalCaliber(value)
  const dynamicRange = isDynamicStatisticalDateRangeMode(caliber.dateRangeMode)
  const customTimeRange = caliber.timeRangeType === 'specified'

  return {
    date_range: {
      type: DATE_RANGE_MODE_TO_API[caliber.dateRangeMode],
      unit: dynamicRange ? caliber.dateRangeUnit : null,
      value: dynamicRange ? caliber.dateRangeValue : null
    },
    time_range: {
      end_time: customTimeRange ? caliber.endTime || '23:59' : null,
      start_time: customTimeRange ? caliber.startTime || '00:00' : null,
      type: customTimeRange ? 'custom' : 'all_day'
    }
  }
}

export function parseApiCalcPeriod(value: unknown, legacyValue?: unknown): StatisticalCaliber {
  const source = asRecord(value)
  const dateRange = asRecord(source.date_range)
  const timeRange = asRecord(source.time_range)
  const hasApiShape = Object.keys(dateRange).length > 0 || Object.keys(timeRange).length > 0
  const legacy = normalizeStatisticalCaliber(legacyValue)
  if (!hasApiShape) return legacy

  const apiMode = String(dateRange.type || '') as ApiStatisticalDateRangeType
  const dateRangeMode = API_DATE_RANGE_MODE_TO_FORM[apiMode] || legacy.dateRangeMode
  const dynamicRange = isDynamicStatisticalDateRangeMode(dateRangeMode)
  const customTimeRange = timeRange.type === 'custom'

  return normalizeStatisticalCaliber({
    ...legacy,
    dateRangeMode,
    dateRangeUnit: dynamicRange ? dateRange.unit : legacy.dateRangeUnit,
    dateRangeValue: dynamicRange ? dateRange.value : legacy.dateRangeValue,
    ...(customTimeRange
      ? {
          endTime: String(timeRange.end_time || '23:59'),
          startTime: String(timeRange.start_time || '00:00')
        }
      : {}),
    timeRangeType: customTimeRange ? 'specified' : 'allDay'
  })
}

export function buildApiCrossDimension(value: unknown): '否' | '是' {
  return normalizeStatisticalCaliber(value).isCrossDim ? '是' : '否'
}

export function parseApiCrossDimension(value: unknown, legacyValue?: unknown): boolean {
  if (value === '是' || value === true) return true
  if (value === '否' || value === false) return false
  return Boolean(normalizeStatisticalCaliber(legacyValue).isCrossDim)
}

export function buildApiSubjectDimensions(value: unknown): ApiSubjectDimension[] {
  const caliber = normalizeStatisticalCaliber(value)
  return (caliber.subjectDimensionIds || []).map(dimensionId => ({
    dim_id: dimensionId,
    dim_name: caliber.subjectDimensionNameMap?.[dimensionId] || dimensionId
  }))
}

export function parseApiSubjectDimensions(value: unknown): Partial<StatisticalCaliber> {
  const parsed = parseJson(value)
  const sources = Array.isArray(parsed) ? parsed : Object.keys(asRecord(parsed)).length ? [parsed] : []
  const subjectDimensionIds: string[] = []
  const subjectDimensionNameMap: Record<string, string> = {}

  sources.forEach(item => {
    const source = asRecord(item)
    const dimensionId = String(source.dim_id || '').trim()
    if (!dimensionId || subjectDimensionIds.includes(dimensionId)) return
    const dimensionName = String(source.dim_name || '').trim()
    subjectDimensionIds.push(dimensionId)
    if (dimensionName) subjectDimensionNameMap[dimensionId] = dimensionName
  })

  const firstSubjectDimensionId = subjectDimensionIds[0]
  if (!firstSubjectDimensionId) return {}
  const firstSubjectDimensionName = subjectDimensionNameMap[firstSubjectDimensionId]

  return {
    subjectDimensionId: firstSubjectDimensionId,
    subjectDimensionIds,
    ...(firstSubjectDimensionName ? { subjectDimensionName: firstSubjectDimensionName } : {}),
    ...(Object.keys(subjectDimensionNameMap).length ? { subjectDimensionNameMap } : {})
  }
}

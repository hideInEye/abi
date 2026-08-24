import type { PrecomputeConfig, PrecomputeFrequency, StatisticalCaliber } from '../types/metricModeling.types'

export const DEFAULT_PRECOMPUTE_CONFIG: PrecomputeConfig = { frequency: 'hourly', minute: 0 }

export const DEFAULT_STATISTICAL_CALIBER: StatisticalCaliber = {
  dateRangeUnit: 'hour',
  dateRangeValue: 7,
  timeRangeType: 'allDay'
}

const PRECOMPUTE_FREQUENCIES = new Set<PrecomputeFrequency>(['hourly', 'daily', 'weekly', 'monthly'])

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function normalizeFrequency(value: unknown): PrecomputeFrequency {
  const frequency = String(value || 'hourly') as PrecomputeFrequency
  return PRECOMPUTE_FREQUENCIES.has(frequency) ? frequency : 'hourly'
}

function normalizeRangedInteger(value: unknown, range: { fallback: number; maximum: number; minimum: number }): number {
  const { fallback, maximum, minimum } = range
  const number = Number(value ?? fallback)
  if (!Number.isInteger(number)) return fallback
  if (number < minimum || number > maximum) return fallback
  return number
}

export function createDefaultPrecomputeConfig(frequency: PrecomputeFrequency): PrecomputeConfig {
  if (frequency === 'daily') return { frequency, time: '00:00' }
  if (frequency === 'weekly') return { frequency, time: '00:00', weekday: 1 }
  if (frequency === 'monthly') return { frequency, monthDay: 1, time: '00:00' }
  return { frequency: 'hourly', minute: 0 }
}

export function normalizePrecomputeConfig(value: unknown, legacyFrequency?: unknown): PrecomputeConfig {
  const source = asRecord(value)
  const frequency = normalizeFrequency(source.frequency || legacyFrequency)

  if (frequency === 'hourly') {
    return { frequency, minute: normalizeRangedInteger(source.minute, { fallback: 0, maximum: 59, minimum: 0 }) }
  }
  if (frequency === 'weekly') {
    return {
      frequency,
      time: String(source.time || '00:00'),
      weekday: normalizeRangedInteger(source.weekday, { fallback: 1, maximum: 7, minimum: 1 })
    }
  }
  if (frequency === 'monthly') {
    return {
      frequency,
      monthDay: normalizeRangedInteger(source.monthDay, { fallback: 1, maximum: 31, minimum: 1 }),
      time: String(source.time || '00:00')
    }
  }
  return { frequency, time: String(source.time || '00:00') }
}

export function normalizeStatisticalCaliber(value: unknown): StatisticalCaliber {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  const dateRangeValue = Number(source.dateRangeValue ?? 7)
  const dateRangeUnit = ['hour', 'day', 'week', 'month'].includes(String(source.dateRangeUnit))
    ? (source.dateRangeUnit as StatisticalCaliber['dateRangeUnit'])
    : 'hour'
  const timeRangeType = source.timeRangeType === 'specified' ? 'specified' : 'allDay'
  return {
    dateRangeUnit,
    dateRangeValue: Number.isInteger(dateRangeValue) && dateRangeValue > 0 ? dateRangeValue : 7,
    ...(timeRangeType === 'specified'
      ? { endTime: String(source.endTime || '23:59'), startTime: String(source.startTime || '00:00') }
      : {}),
    ...(source.subjectDimensionId ? { subjectDimensionId: String(source.subjectDimensionId) } : {}),
    timeRangeType
  }
}

export function getPrecomputeSummary(configValue: unknown): string {
  const config = normalizePrecomputeConfig(configValue)
  if (config.frequency === 'hourly')
    return `预计每小时第 ${String(config.minute).padStart(2, '0')} 分钟执行一次指标预计算`
  if (config.frequency === 'daily') return `预计每日 ${config.time} 执行一次指标预计算`
  if (config.frequency === 'weekly')
    return `预计每周周${'一二三四五六日'[config.weekday - 1]} ${config.time} 执行一次指标预计算`
  return `预计每月 ${config.monthDay} 日 ${config.time} 执行一次指标预计算`
}

import {
  STATISTICAL_DATE_RANGE_MODE_OPTIONS,
  STATISTICAL_DATE_UNIT_OPTIONS
} from '../constants/metricModeling.constants'
import type {
  PrecomputeConfig,
  PrecomputeFrequency,
  StatisticalCaliber,
  StatisticalDateRangeMode,
  StatisticalDateRangeUnit
} from '../types/metricModeling.types'

export const DEFAULT_PRECOMPUTE_CONFIG: PrecomputeConfig = { frequency: 'hourly', minute: 0 }

export const DEFAULT_STATISTICAL_CALIBER: StatisticalCaliber = {
  dateRangeMode: 'recent',
  dateRangeUnit: 'day',
  dateRangeValue: 7,
  isCrossDim: false,
  timeRangeType: 'allDay'
}

const PRECOMPUTE_FREQUENCIES = new Set<PrecomputeFrequency>(['hourly', 'daily', 'weekly', 'monthly'])
const STATISTICAL_DATE_RANGE_MODES = new Set<StatisticalDateRangeMode>(
  STATISTICAL_DATE_RANGE_MODE_OPTIONS.map(item => item.value as StatisticalDateRangeMode)
)
const STATISTICAL_DATE_RANGE_UNITS = new Set<StatisticalDateRangeUnit>(
  STATISTICAL_DATE_UNIT_OPTIONS.map(item => item.value as StatisticalDateRangeUnit)
)
const PREVIOUS_FULL_DATE_RANGE_UNITS = new Set<StatisticalDateRangeUnit>(['day', 'week', 'month', 'quarter', 'year'])
const PREVIOUS_FULL_CURRENT_UNIT_LABELS: Record<Exclude<StatisticalDateRangeUnit, 'day' | 'hour'>, string> = {
  month: '本月',
  quarter: '本季度',
  week: '本周',
  year: '本年'
}

const STATISTICAL_DATE_RANGE_HINTS: Record<Exclude<StatisticalDateRangeMode, 'previous_full' | 'recent'>, string> = {
  last_month: '每次预计算时，统计上月完整自然月的数据。',
  last_quarter: '每次预计算时，统计上季度完整自然季度的数据。',
  last_week: '每次预计算时，统计上周完整自然周的数据。',
  last_year: '每次预计算时，统计上年完整自然年的数据。',
  this_month: '每次预计算时，统计本月截至当前执行时点的数据。',
  this_quarter: '每次预计算时，统计本季度截至当前执行时点的数据。',
  this_week: '每次预计算时，统计本周截至当前执行时点的数据。',
  this_year: '每次预计算时，统计本年截至当前执行时点的数据。',
  today: '每次预计算时，统计今天截至当前执行时点的数据。',
  yesterday: '每次预计算时，统计昨日全天数据。'
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.map(item => String(item ?? '').trim()).filter(Boolean)))
}

function normalizeFrequency(value: unknown): PrecomputeFrequency {
  const frequency = String(value || 'hourly') as PrecomputeFrequency
  return PRECOMPUTE_FREQUENCIES.has(frequency) ? frequency : 'hourly'
}

export function normalizeStatisticalDateRangeMode(value: unknown): StatisticalDateRangeMode {
  const mode = String(value || 'recent') as StatisticalDateRangeMode
  return STATISTICAL_DATE_RANGE_MODES.has(mode) ? mode : 'recent'
}

export function isDynamicStatisticalDateRangeMode(value: unknown): boolean {
  const mode = normalizeStatisticalDateRangeMode(value)
  return mode === 'recent' || mode === 'previous_full'
}

export function normalizeStatisticalDateRangeUnit(modeValue: unknown, unitValue: unknown): StatisticalDateRangeUnit {
  const mode = normalizeStatisticalDateRangeMode(modeValue)
  const unit = String(unitValue || 'day') as StatisticalDateRangeUnit
  if (!STATISTICAL_DATE_RANGE_UNITS.has(unit)) return 'day'
  if (mode === 'previous_full' && !PREVIOUS_FULL_DATE_RANGE_UNITS.has(unit)) return 'day'
  return unit
}

export function getStatisticalDateRangeUnitOptions(modeValue: unknown) {
  const mode = normalizeStatisticalDateRangeMode(modeValue)
  if (mode !== 'previous_full') return STATISTICAL_DATE_UNIT_OPTIONS
  return STATISTICAL_DATE_UNIT_OPTIONS.filter(item =>
    PREVIOUS_FULL_DATE_RANGE_UNITS.has(item.value as StatisticalDateRangeUnit)
  )
}

export function isValidStatisticalDateRangeValue(value: unknown): boolean {
  const amount = Number(value)
  return (
    value !== null && value !== undefined && value !== '' && Number.isInteger(amount) && amount >= 1 && amount <= 999
  )
}

function getStatisticalDateRangeParts(value: unknown) {
  const source = asRecord(value)
  const mode = normalizeStatisticalDateRangeMode(source.dateRangeMode)
  const unit = normalizeStatisticalDateRangeUnit(mode, source.dateRangeUnit)
  const amount = Number(source.dateRangeValue)
  return {
    amount,
    mode,
    unit,
    validAmount: isValidStatisticalDateRangeValue(source.dateRangeValue)
  }
}

function getStatisticalDateUnitLabel(unit: StatisticalDateRangeUnit): string {
  return STATISTICAL_DATE_UNIT_OPTIONS.find(item => item.value === unit)?.label || '日'
}

export function getStatisticalDateRangeHint(value: unknown): string {
  const { amount, mode, unit, validAmount } = getStatisticalDateRangeParts(value)
  if (isDynamicStatisticalDateRangeMode(mode) && !validAmount) return '请输入统计窗口数量。'
  if (mode === 'recent') {
    return `每次预计算时，动态统计最近 ${amount} ${getStatisticalDateUnitLabel(unit)}的数据。`
  }
  if (mode === 'previous_full') {
    if (unit === 'day') return `每次预计算时，统计前 ${amount} 天的数据，不包含今天。`
    const unitLabel = getStatisticalDateUnitLabel(unit)
    const currentUnitLabel = PREVIOUS_FULL_CURRENT_UNIT_LABELS[unit as keyof typeof PREVIOUS_FULL_CURRENT_UNIT_LABELS]
    return `每次预计算时，统计前 ${amount} 个完整${unitLabel}的数据，不包含${currentUnitLabel}。`
  }
  return STATISTICAL_DATE_RANGE_HINTS[mode]
}

export function getStatisticalDateRangeSummary(value: unknown): string {
  const { amount, mode, unit, validAmount } = getStatisticalDateRangeParts(value)
  if (isDynamicStatisticalDateRangeMode(mode) && !validAmount) return '未设置统计窗口数量'
  if (mode === 'recent') return `最近 ${amount} ${getStatisticalDateUnitLabel(unit)}`
  if (mode === 'previous_full') {
    return unit === 'day' ? `前 ${amount} 天` : `前 ${amount} 个完整${getStatisticalDateUnitLabel(unit)}`
  }
  return STATISTICAL_DATE_RANGE_MODE_OPTIONS.find(item => item.value === mode)?.label || '最近'
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
  const source = asRecord(value)
  const dateRangeMode = normalizeStatisticalDateRangeMode(source.dateRangeMode)
  const dateRangeValue = Number(source.dateRangeValue ?? 7)
  const dateRangeUnit = normalizeStatisticalDateRangeUnit(dateRangeMode, source.dateRangeUnit)
  const timeRangeType = source.timeRangeType === 'specified' ? 'specified' : 'allDay'
  const legacySubjectDimensionId = String(source.subjectDimensionId ?? '').trim()
  const subjectDimensionIds = normalizeStringList(source.subjectDimensionIds)
  if (!subjectDimensionIds.length && legacySubjectDimensionId) subjectDimensionIds.push(legacySubjectDimensionId)

  const sourceNameMap = asRecord(source.subjectDimensionNameMap)
  const legacySubjectDimensionName = String(source.subjectDimensionName ?? '').trim()
  const subjectDimensionNameMap = subjectDimensionIds.reduce<Record<string, string>>((result, dimensionId) => {
    const name = String(
      sourceNameMap[dimensionId] ??
        (dimensionId === legacySubjectDimensionId ? legacySubjectDimensionName : '')
    ).trim()
    if (name) result[dimensionId] = name
    return result
  }, {})
  const firstSubjectDimensionId = subjectDimensionIds[0]
  const firstSubjectDimensionName = firstSubjectDimensionId
    ? subjectDimensionNameMap[firstSubjectDimensionId]
    : undefined

  return {
    dateRangeMode,
    dateRangeUnit,
    dateRangeValue: isValidStatisticalDateRangeValue(dateRangeValue) ? dateRangeValue : 7,
    ...(source.isCrossDim !== undefined ? { isCrossDim: source.isCrossDim === true || source.isCrossDim === '是' } : {}),
    ...(timeRangeType === 'specified'
      ? { endTime: String(source.endTime || '23:59'), startTime: String(source.startTime || '00:00') }
      : {}),
    ...(subjectDimensionIds.length ? { subjectDimensionIds } : {}),
    ...(Object.keys(subjectDimensionNameMap).length ? { subjectDimensionNameMap } : {}),
    ...(firstSubjectDimensionId ? { subjectDimensionId: firstSubjectDimensionId } : {}),
    ...(firstSubjectDimensionName ? { subjectDimensionName: firstSubjectDimensionName } : {}),
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

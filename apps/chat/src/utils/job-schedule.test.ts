import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'

import {
  buildCronPreview,
  buildScheduleConf,
  describeScheduleForm,
  formatJobScheduleText,
  parseCronToScheduleValues,
  parseScheduleConf,
  summarizeScheduleConf,
  toShareEmailScheduleParams,
} from './job-schedule'

describe('buildCronPreview', () => {
  it('单次任务：日期+时刻转年域 cron', () => {
    const cron = buildCronPreview('ONCE', { execDate: dayjs('2026-09-30'), execTime: dayjs(new Date(2000, 0, 1, 10, 5)) })
    expect(cron).toBe('0 05 10 30 9 ? 2026')
  })

  it('连续任务每天多时刻：分同枚举时', () => {
    const cron = buildCronPreview('CONTINUOUS', { interval: 1, points: [{ time: '08:00' }, { time: '18:00' }], unit: 'DAY' })
    expect(cron).toBe('0 00 08,18 */1 * ? *')
  })

  it('连续任务小时：第几分 + 间隔', () => {
    const cron = buildCronPreview('CONTINUOUS', { interval: 2, minutes: [30], unit: 'HOUR' })
    expect(cron).toBe('0 30 */2 * * ? *')
  })

  it('连续任务每周：星期域用 quartz 名', () => {
    const cron = buildCronPreview('CONTINUOUS', { interval: 1, points: [{ time: '09:00' }], unit: 'WEEK', weekDay: 'MON' })
    expect(cron).toBe('0 00 09 ? * MON *')
  })

  it('定期任务每月多日共享时刻', () => {
    const cron = buildCronPreview('PERIODIC', { interval: 2, points: [{ day: 1, time: '09:00' }, { day: 15, time: '09:00' }], unit: 'MONTH' })
    expect(cron).toBe('0 00 09 1,15 */2 ? *')
  })

  it('周间隔大于 1 表达不了返回空串', () => {
    expect(buildCronPreview('CONTINUOUS', { interval: 2, points: [{ time: '09:00' }], unit: 'WEEK', weekDay: 'MON' })).toBe('')
  })
})

describe('parseCronToScheduleValues', () => {
  it('与 buildCronPreview 往返：单次', () => {
    const values = { execDate: dayjs('2026-12-01'), execTime: dayjs(new Date(2000, 0, 1, 8, 30)) }
    const parsed = parseCronToScheduleValues(buildCronPreview('ONCE', values))
    expect(parsed?.scheduleType).toBe('ONCE')
    expect(parsed?.execDate.format('YYYY-MM-DD')).toBe('2026-12-01')
    expect(parsed?.execTime.format('HH:mm')).toBe('08:30')
  })

  it('与 buildCronPreview 往返：每天多时刻', () => {
    const values = { interval: 1, points: [{ time: '08:00' }, { time: '18:00' }], unit: 'DAY' }
    const parsed = parseCronToScheduleValues(buildCronPreview('CONTINUOUS', values))
    expect(parsed).toMatchObject({ interval: 1, scheduleType: 'CONTINUOUS', unit: 'DAY' })
    expect(parsed?.points).toEqual([{ time: '08:00' }, { time: '18:00' }])
  })

  it('与 buildCronPreview 往返：小时', () => {
    const parsed = parseCronToScheduleValues(buildCronPreview('CONTINUOUS', { interval: 3, minutes: [15], unit: 'HOUR' }))
    expect(parsed).toMatchObject({ interval: 3, minutes: [15], scheduleType: 'CONTINUOUS', unit: 'HOUR' })
  })

  it('与 buildCronPreview 往返：每周', () => {
    const parsed = parseCronToScheduleValues(buildCronPreview('CONTINUOUS', { interval: 1, points: [{ time: '09:00' }], unit: 'WEEK', weekDay: 'FRI' }))
    expect(parsed).toMatchObject({ scheduleType: 'CONTINUOUS', unit: 'WEEK', weekDay: 'FRI' })
    expect(parsed?.points).toEqual([{ time: '09:00' }])
  })

  it('每月间隔大于 1 识别为定期任务', () => {
    const parsed = parseCronToScheduleValues('0 00 09 1,15 */2 ? *')
    expect(parsed).toMatchObject({ interval: 2, scheduleType: 'PERIODIC', unit: 'MONTH' })
    expect(parsed?.points).toEqual([
      { day: 1, time: '09:00' },
      { day: 15, time: '09:00' },
    ])
  })

  it('与 buildCronPreview 往返：每年单月多时刻', () => {
    const values = { interval: 1, points: [{ date: '3-5', time: '10:00' }, { date: '3-5', time: '16:00' }], unit: 'YEAR' }
    const parsed = parseCronToScheduleValues(buildCronPreview('CONTINUOUS', values))
    expect(parsed).toMatchObject({ scheduleType: 'CONTINUOUS', unit: 'YEAR' })
    expect(parsed?.points).toEqual([
      { date: '3-5', time: '10:00' },
      { date: '3-5', time: '16:00' },
    ])
  })

  it('手写复杂 cron 解析失败返回 null', () => {
    expect(parseCronToScheduleValues('0 0/5 8-10 * * ? *')).toBeNull()
    expect(parseCronToScheduleValues('')).toBeNull()
  })
})

describe('摘要与列表文本', () => {
  it('describeScheduleForm 输出人读摘要', () => {
    expect(describeScheduleForm('CONTINUOUS', { interval: 1, points: [{ time: '08:00' }], unit: 'DAY' })).toBe('每天 08:00 执行')
    expect(describeScheduleForm('ONCE', { execDate: '2026-09-30', execTime: '10:00' })).toBe('2026-09-30 10:00 执行一次')
  })

  it('formatJobScheduleText：结构化记录给摘要，CRON 记录给原文', () => {
    const structured = { scheduleConf: buildScheduleConf('CONTINUOUS', { interval: 1, points: [{ time: '09:00' }], unit: 'DAY' }), scheduleType: 'CONTINUOUS' }
    expect(formatJobScheduleText(structured)).toBe('每天 09:00 执行')
    expect(formatJobScheduleText({ scheduleConf: '0 0 9 * * ?', scheduleType: 'CRON' })).toBe('0 0 9 * * ?')
  })

  it('parseScheduleConf 兼容旧 times 结构', () => {
    const { conf, mode } = parseScheduleConf({ scheduleConf: JSON.stringify({ times: ['09:00'], unit: 'DAY' }), scheduleType: 'CONTINUOUS' })
    expect(mode).toBe('CONTINUOUS')
    expect(summarizeScheduleConf(mode, conf)).toBe('每天 09:00 执行')
  })
})

describe('toShareEmailScheduleParams', () => {
  it('单次：定时 + 每天占位 + 日期扩展字段', () => {
    const params = toShareEmailScheduleParams({ execDate: dayjs('2026-09-30'), execTime: dayjs(new Date(2000, 0, 1, 10, 0)), scheduleMode: 'ONCE' })
    expect(params).toEqual({ executeDate: '2026-09-30', executeFrequency: 1, executeTime: '10:00', type: 2 })
  })

  it('每周：weekendTargetDay 周一=1', () => {
    const params = toShareEmailScheduleParams({ points: [{ time: '09:00' }], scheduleMode: 'CONTINUOUS', unit: 'WEEK', weekDay: 'MON' })
    expect(params).toEqual({ executeFrequency: 2, executeTime: '09:00', type: 2, weekendTargetDay: 1 })
  })

  it('每月：monthlyTargetDay 取首日号', () => {
    const params = toShareEmailScheduleParams({ points: [{ day: 15, time: '18:30' }], scheduleMode: 'PERIODIC', unit: 'MONTH' })
    expect(params).toEqual({ executeFrequency: 3, executeTime: '18:30', monthlyTargetDay: 15, type: 2 })
  })

  it('小时级降为每天该分钟', () => {
    const params = toShareEmailScheduleParams({ minutes: [5], scheduleMode: 'CONTINUOUS', unit: 'HOUR' })
    expect(params).toEqual({ executeFrequency: 1, executeTime: '00:05', type: 2 })
  })

  it('年级降为每月该日', () => {
    const params = toShareEmailScheduleParams({ points: [{ date: '6-18', time: '08:00' }], scheduleMode: 'CONTINUOUS', unit: 'YEAR' })
    expect(params).toEqual({ executeFrequency: 3, executeTime: '08:00', monthlyTargetDay: 18, type: 2 })
  })
})

import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'

import {
  buildCronPreview,
  buildScheduleConf,
  describeScheduleForm,
  formatGlueMode,
  formatLogFilterTime,
  formatNextTriggerTime,
  formatScheduleConf,
  isJobRequestSuccess,
  parseTriggerMsg,
  resolveJobLogStatus,
  resolveJobPageResult,
  resolveHandleResult,
  resolveTriggerResult,
  toOffsetPageParams,
} from './utils'

describe('toOffsetPageParams', () => {
  it('maps pageNum/pageSize to 0-based offset and pagesize', () => {
    expect(toOffsetPageParams({ pageNum: 1, pageSize: 12 })).toEqual({ offset: 0, pagesize: 12 })
    expect(toOffsetPageParams({ pageNum: 3, pageSize: 10, name: 'report' })).toEqual({ name: 'report', offset: 20, pagesize: 10 })
  })

  it('falls back to defaults for missing or invalid paging values', () => {
    expect(toOffsetPageParams(undefined)).toEqual({ offset: 0, pagesize: 12 })
    expect(toOffsetPageParams({ pageNum: 0, pageSize: -1 })).toEqual({ offset: 0, pagesize: 12 })
    expect(toOffsetPageParams({ pageNum: 2 }, 100)).toEqual({ offset: 100, pagesize: 100 })
  })
})

describe('formatLogFilterTime', () => {
  it('formats dayjs range and string range to the filterTime pattern', () => {
    const start = dayjs('2026-09-01 00:00:00')
    const end = dayjs('2026-09-15 23:59:59')
    expect(formatLogFilterTime([start, end])).toBe('2026-09-01 00:00:00 - 2026-09-15 23:59:59')
    expect(formatLogFilterTime(['2026-09-01 08:00:00', '2026-09-02 08:00:00'])).toBe('2026-09-01 08:00:00 - 2026-09-02 08:00:00')
  })

  it('returns undefined for empty or incomplete range', () => {
    expect(formatLogFilterTime(undefined)).toBeUndefined()
    expect(formatLogFilterTime([])).toBeUndefined()
    expect(formatLogFilterTime([dayjs('2026-09-01 00:00:00'), null])).toBeUndefined()
  })
})

describe('resolveJobLogStatus', () => {
  it('prefers backend logStatus when present', () => {
    expect(resolveJobLogStatus({ handleCode: 500, logStatus: 1 })).toBe('success')
    expect(resolveJobLogStatus({ logStatus: '2' })).toBe('fail')
    expect(resolveJobLogStatus({ logStatus: 3 })).toBe('running')
  })

  it('derives status from trigger and handle codes when logStatus absent', () => {
    expect(resolveJobLogStatus({ handleCode: 200, triggerCode: 200 })).toBe('success')
    expect(resolveJobLogStatus({ handleCode: 500, triggerCode: 200 })).toBe('fail')
    expect(resolveJobLogStatus({ handleCode: 0, triggerCode: 200 })).toBe('running')
    expect(resolveJobLogStatus({ handleCode: 0, triggerCode: 500 })).toBe('fail')
    expect(resolveJobLogStatus({})).toBe('unknown')
    expect(resolveJobLogStatus(undefined)).toBe('unknown')
  })
})

describe('trigger and handle result helpers', () => {
  it('resolves trigger result from triggerCode only', () => {
    expect(resolveTriggerResult({ triggerCode: 200 })).toBe('success')
    expect(resolveTriggerResult({ triggerCode: 500 })).toBe('fail')
    expect(resolveTriggerResult({})).toBe('unknown')
  })

  it('resolves handle result with running fallback', () => {
    expect(resolveHandleResult({ handleCode: 200 })).toBe('success')
    expect(resolveHandleResult({ handleCode: 500 })).toBe('fail')
    expect(resolveHandleResult({ handleCode: 0, triggerCode: 200 })).toBe('running')
    expect(resolveHandleResult({ handleCode: 0, triggerCode: 500 })).toBe('unknown')
    expect(resolveHandleResult({})).toBe('unknown')
  })
})

describe('column display helpers', () => {
  it('formats schedule type text', () => {
    expect(formatScheduleConf({ scheduleConf: '0 0 9 * * ?', scheduleType: 'CRON' })).toBe('CRON: 0 0 9 * * ?')
    expect(formatScheduleConf({ scheduleConf: '1200', scheduleType: 'FIX_RATE' })).toBe('FIX_RATE: 1200')
    expect(formatScheduleConf({ scheduleType: 'NONE' })).toBe('NONE')
    expect(formatScheduleConf({})).toBe('-')
  })

  it('summarizes structured schedule modes', () => {
    expect(formatScheduleConf({ scheduleConf: JSON.stringify({ date: '2026-09-20', time: '10:00' }), scheduleType: 'ONCE' })).toBe('单次: 2026-09-20 10:00 执行一次')
    expect(formatScheduleConf({ scheduleConf: JSON.stringify({ time: '08:30', unit: 'DAY' }), scheduleType: 'CONTINUOUS' })).toBe('连续: 每天 08:30 执行')
    expect(formatScheduleConf({ scheduleConf: JSON.stringify({ minute: 30, unit: 'HOUR' }), scheduleType: 'CONTINUOUS' })).toBe('连续: 每小时 第 30 分 执行')
    expect(formatScheduleConf({ scheduleConf: JSON.stringify({ times: ['09:00'], unit: 'WEEK', weekDay: 'MON' }), scheduleType: 'CONTINUOUS' })).toBe('连续: 每周 周一 09:00 执行')
    expect(formatScheduleConf({ scheduleConf: JSON.stringify({ times: ['10:00', '18:00'], unit: 'DAY' }), scheduleType: 'CONTINUOUS' })).toBe('连续: 每天 10:00, 18:00 执行')
    expect(formatScheduleConf({ scheduleConf: JSON.stringify({ deadline: '2026-12-31', interval: 2, times: ['02:00'], unit: 'DAY' }), scheduleType: 'PERIODIC' })).toBe(
      '定期: 每 2 天 02:00 执行，截止 2026-12-31',
    )
    expect(formatScheduleConf({ scheduleConf: JSON.stringify({ points: [{ day: 1, time: '01:00' }], unit: 'MONTH' }), scheduleType: 'CONTINUOUS' })).toBe('连续: 每月 1 日 01:00 执行')
    expect(formatScheduleConf({ scheduleConf: JSON.stringify({ points: [{ date: '3-5', time: '09:00' }], unit: 'YEAR' }), scheduleType: 'CONTINUOUS' })).toBe('连续: 每年 3 月 5 日 09:00 执行')
    expect(formatScheduleConf({ scheduleConf: '0 0 3 ? * SUN', scheduleType: 'CUSTOM' })).toBe('CRON: 0 0 3 ? * SUN')
  })

  it('serializes form values to scheduleConf and previews quartz cron', () => {
    expect(buildScheduleConf('ONCE', { execDate: '2026-09-20', execTime: '10:00' })).toBe(JSON.stringify({ date: '2026-09-20', time: '10:00' }))
    expect(buildScheduleConf('CONTINUOUS', { points: [{ time: '08:30' }], unit: 'DAY' })).toBe(JSON.stringify({ unit: 'DAY', points: [{ time: '08:30' }] }))
    expect(buildScheduleConf('PERIODIC', { deadline: '2026-12-31', interval: 2, points: [{ time: '02:00' }], unit: 'DAY' })).toBe(
      JSON.stringify({ unit: 'DAY', points: [{ time: '02:00' }], deadline: '2026-12-31', interval: 2 }),
    )
    expect(buildScheduleConf('CUSTOM', { scheduleConf: '0 0 3 ? * SUN' })).toBe('0 0 3 ? * SUN')
    expect(buildCronPreview('ONCE', { execDate: '2026-09-20', execTime: '10:00' })).toBe('0 00 10 20 9 ? 2026')
    expect(buildCronPreview('CONTINUOUS', { points: [{ time: '08:30' }], unit: 'DAY' })).toBe('0 30 08 */1 * ? *')
    expect(buildCronPreview('PERIODIC', { interval: 2, points: [{ time: '02:00' }], unit: 'DAY' })).toBe('0 00 02 */2 * ? *')
    expect(buildCronPreview('PERIODIC', { interval: 2, points: [{ time: '09:00' }], unit: 'WEEK', weekDay: 'MON' })).toBe('')
    expect(buildCronPreview('CONTINUOUS', { points: [{ time: '10:00' }, { time: '18:00' }], unit: 'DAY' })).toBe('0 00 10,18 */1 * ? *')
    expect(buildCronPreview('CONTINUOUS', { points: [{ time: '10:30' }, { time: '18:00' }], unit: 'DAY' })).toBe('')
    expect(buildCronPreview('CONTINUOUS', { points: [{ time: '09:15' }, { time: '09:45' }], unit: 'DAY' })).toBe('0 15,45 09 */1 * ? *')
    expect(buildCronPreview('CONTINUOUS', { points: [{ day: 1, time: '01:00' }, { day: 15, time: '01:00' }], unit: 'MONTH' })).toBe('0 00 01 1,15 */1 ? *')
    expect(buildCronPreview('CONTINUOUS', { points: [{ day: 1, time: '01:00' }, { day: 15, time: '05:00' }], unit: 'MONTH' })).toBe('')
    expect(buildCronPreview('CONTINUOUS', { points: [{ date: '3-5', time: '09:00' }, { date: '6-5', time: '09:00' }], unit: 'YEAR' })).toBe('0 00 09 5 3,6 ? *')
    expect(buildCronPreview('CUSTOM', { scheduleConf: '0 0 3 ? * SUN' })).toBe('0 0 3 ? * SUN')
    expect(describeScheduleForm('CONTINUOUS', { points: [{ time: '08:30' }], unit: 'DAY' })).toBe('每天 08:30 执行')
    expect(describeScheduleForm('ONCE', { execDate: '2026-09-20', execTime: '10:00' })).toBe('2026-09-20 10:00 执行一次')
    expect(describeScheduleForm('CUSTOM', { scheduleConf: '0 0 3 ? * SUN' })).toBe('')
  })

  it('formats glue mode text with BEAN handler', () => {
    expect(formatGlueMode({ executorHandler: 'reportEmailTask', glueType: 'BEAN' })).toBe('BEAN: reportEmailTask')
    expect(formatGlueMode({ executorHandler: 'reportGenerate', glueType: 'BEAN' })).toBe('BEAN: 报告生成')
    expect(formatGlueMode({ glueType: 'GLUE(Shell)' })).toBe('GLUE(Shell)')
    expect(formatGlueMode({})).toBe('-')
  })

  it('formats next trigger time values from timestamps and strings', () => {
    expect(formatNextTriggerTime(dayjs('2026-09-18 08:30:00').valueOf())).toBe('2026-09-18 08:30:00')
    expect(formatNextTriggerTime(String(dayjs('2026-09-18 08:30:00').valueOf()))).toBe('2026-09-18 08:30:00')
    expect(formatNextTriggerTime('2026-09-18 08:30:00')).toBe('2026-09-18 08:30:00')
    expect(formatNextTriggerTime(null)).toBe('-')
  })
})

describe('response helpers', () => {
  it('gates write requests on code 200 or success true', () => {
    expect(isJobRequestSuccess({ response: { data: { code: 200 } } })).toBe(true)
    expect(isJobRequestSuccess({ response: { data: { code: 500, success: true } } })).toBe(true)
    expect(isJobRequestSuccess({ response: { data: { code: 500 } } })).toBe(false)
    expect(isJobRequestSuccess(undefined)).toBe(false)
  })

  it('reads records and total from the list envelope', () => {
    const records = [{ id: 1 }]
    expect(resolveJobPageResult({ data: { data: records, offset: 0, pagesize: 12, total: 5 } })).toEqual({ records, total: 5 })
    expect(resolveJobPageResult({ data: null })).toEqual({ records: [], total: 0 })
    expect(resolveJobPageResult(undefined)).toEqual({ records: [], total: 0 })
  })
})

describe('parseTriggerMsg', () => {
  it('strips html tags and splits into label/value lines', () => {
    const raw = '任务触发类型： 手动触发<br>调度机器： 172.18.0.5<br><br><span style="color:#00c0ef;" > >>>>>>>>>>触发调度<<<<<<<<<< </span><br>JobHandler： aiAnalysis<br>任务参数： <br>msg： job handler [aiAnalysis] not found.'
    expect(parseTriggerMsg(raw)).toEqual([
      { label: '任务触发类型：', value: '手动触发' },
      { label: '调度机器：', value: '172.18.0.5' },
      { label: '', value: '>>>>>>>>>>触发调度<<<<<<<<<<' },
      { label: 'JobHandler：', value: 'aiAnalysis' },
      { label: '任务参数：', value: '' },
      { label: 'msg：', value: 'job handler [aiAnalysis] not found.' },
    ])
  })

  it('decodes entities and keeps colon inside value', () => {
    expect(parseTriggerMsg('address： http://a/b?c=1&amp;d=2')).toEqual([{ label: 'address：', value: 'http://a/b?c=1&d=2' }])
    expect(parseTriggerMsg('执行器-地址列表： [http://172.18.0.19:9999/]')).toEqual([{ label: '执行器-地址列表：', value: '[http://172.18.0.19:9999/]' }])
  })

  it('returns empty list for blank input', () => {
    expect(parseTriggerMsg(undefined)).toEqual([])
    expect(parseTriggerMsg('  ')).toEqual([])
  })
})

import dayjs from 'dayjs'

// 对话端调度模式：仅保留三种结构化模式，不提供自定义 Cron（对齐产品标注稿）
export const CHAT_SCHEDULE_MODE_OPTIONS = [
  { label: '单次任务', value: 'ONCE' },
  { label: '连续任务', value: 'CONTINUOUS' },
  { label: '定期任务', value: 'PERIODIC' },
]

// 重复周期单位（连续/定期任务），与管理端 REPEAT_UNIT_OPTIONS 一致
export const REPEAT_UNIT_OPTIONS = [
  { label: '小时', value: 'HOUR' },
  { label: '天', value: 'DAY' },
  { label: '周', value: 'WEEK' },
  { label: '月', value: 'MONTH' },
  { label: '年', value: 'YEAR' },
]

// 星期（quartz 周字段名）
export const WEEK_DAY_OPTIONS = [
  { label: '周一', value: 'MON' },
  { label: '周二', value: 'TUE' },
  { label: '周三', value: 'WED' },
  { label: '周四', value: 'THU' },
  { label: '周五', value: 'FRI' },
  { label: '周六', value: 'SAT' },
  { label: '周日', value: 'SUN' },
]

// 旧分享邮件接口周末/月内序号：周一=1 … 周日=7
export const WEEK_DAY_TO_NUM: Record<string, number> = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 7 }

// 作业场景（JobHandler），与管理端 JOB_SCENE_OPTIONS 一致
export const JOB_SCENE_OPTIONS = [
  { label: '智能分析', value: 'aiAnalysis' },
  { label: '报告生成', value: 'reportGenerate' },
  { label: '数据大屏', value: 'dataScreen' },
  { label: '渠道推送', value: 'channelPush' },
  { label: '数据同步-实时', value: 'syncRealtime' },
  { label: '数据同步-批量', value: 'syncBatch' },
  { label: '指标预计算', value: 'metricPrecompute' },
  { label: '监控告警', value: 'monitorAlarm' },
]

// 渠道推送的推送渠道
export const PUSH_CHANNEL_OPTIONS = [
  { label: '飞书', value: 'feishu' },
  { label: '钉钉', value: 'dingtalk' },
  { label: '企业微信', value: 'wecom' },
  { label: '邮件', value: 'email' },
  { label: 'Webhook', value: 'webhook' },
]

const STRUCTURED_SCHEDULE_MODES = ['ONCE', 'CONTINUOUS', 'PERIODIC']

/** 前端 pageNum/pageSize 转调度中心列表参数 offset/pagesize（offset 为 0 基记录起始偏移） */
export function toOffsetPageParams(params?: Record<string, any>, defaultPageSize = 12): Record<string, any> {
  const { pageNum, pageSize, ...rest } = params || {}
  const size = Number(pageSize) > 0 ? Number(pageSize) : defaultPageSize
  const page = Number(pageNum) > 0 ? Number(pageNum) : 1
  return { ...rest, offset: (page - 1) * size, pagesize: size }
}

/** 解析新调度模式的结构化 scheduleConf（前三种模式为 JSON 字符串）；legacy CRON/FIX_RATE/NONE 返回空 conf */
export function parseScheduleConf(record?: any): { conf: Record<string, any>; mode: string } {
  const mode = String(record?.scheduleType ?? '')
  if (!STRUCTURED_SCHEDULE_MODES.includes(mode)) return { conf: {}, mode }
  try {
    const parsed = JSON.parse(record?.scheduleConf || '{}')
    return { conf: parsed && typeof parsed === 'object' ? parsed : {}, mode }
  } catch {
    return { conf: {}, mode }
  }
}

/** 兼容新旧 conf：执行时刻数组 times / 旧单值 time */
const confTimes = (conf: Record<string, any>): string[] => (Array.isArray(conf.times) ? conf.times.map(String) : conf.time ? [String(conf.time)] : [])
const confMinutes = (conf: Record<string, any>): any[] => (Array.isArray(conf.minutes) ? conf.minutes : conf.minute !== undefined && conf.minute !== null && conf.minute !== '' ? [conf.minute] : [])

/** 执行条目归一：新 points 数组优先，旧 times/time/day/month 结构映射为 [{day?,date?,time?}] */
export function normalizeSchedulePoints(conf: Record<string, any>): { date?: string; day?: number; time?: string }[] {
  if (Array.isArray(conf.points)) return conf.points
  const times = confTimes(conf)
  if (times.length) {
    if (conf.month && conf.day) return times.map(time => ({ date: `${conf.month}-${conf.day}`, time }))
    if (conf.day) return times.map(time => ({ day: conf.day, time }))
    return times.map(time => ({ time }))
  }
  return []
}

const REPEAT_UNIT_FREQ: Record<string, string> = { DAY: '每天', HOUR: '每小时', MONTH: '每月', WEEK: '每周', YEAR: '每年' }
const REPEAT_UNIT_NOUN: Record<string, string> = { DAY: '天', HOUR: '小时', MONTH: '月', WEEK: '周', YEAR: '年' }
const WEEK_DAY_LABEL: Record<string, string> = { FRI: '周五', MON: '周一', SAT: '周六', SUN: '周日', THU: '周四', TUE: '周二', WED: '周三' }

/** 周期内执行时刻描述：小时→第几分（可多个），其余→条目列表（周带星期前缀，月/年日期在条目内） */
function schedulePointText(conf: Record<string, any>): string {
  const minutes = confMinutes(conf).join(', ')
  const points = normalizeSchedulePoints(conf)
  switch (conf.unit) {
    case 'HOUR':
      return minutes ? `第 ${minutes} 分` : ''
    case 'WEEK':
      return `${WEEK_DAY_LABEL[conf.weekDay] || conf.weekDay || ''} ${points.map(point => point.time).filter(Boolean).join(', ')}`.trim()
    case 'MONTH':
      return points.map(point => `${point.day ? `${point.day} 日` : ''} ${point.time || ''}`.trim()).join(', ')
    case 'YEAR':
      return points
        .map(point => {
          const [month, day] = String(point.date || '').split('-')
          return `${month ? `${month} 月` : ''}${day ? ` ${day} 日` : ''} ${point.time || ''}`.trim()
        })
        .join(', ')
    default:
      return points.map(point => point.time).filter(Boolean).join(', ')
  }
}

/** 调度配置人读摘要（不含模式前缀）：每天 08:30 执行 / 2026-09-20 10:00 执行一次 */
export function summarizeScheduleConf(mode: string, conf: Record<string, any>): string {
  if (mode === 'ONCE') return `${conf.date || ''}${conf.time ? ` ${conf.time}` : ''} 执行一次`.trim()
  if (mode === 'CONTINUOUS' || mode === 'PERIODIC') {
    const interval = Number(conf.interval ?? 1) || 1
    const freq = mode === 'PERIODIC' && interval > 1 ? `每 ${interval} ${REPEAT_UNIT_NOUN[conf.unit] || ''}` : REPEAT_UNIT_FREQ[conf.unit] || ''
    const deadline = conf.deadline ? `，截止 ${conf.deadline}` : ''
    return `${freq} ${schedulePointText(conf)} 执行${deadline}`.replace(/\s+/g, ' ').trim()
  }
  return ''
}

const toText = (value: any, format = 'YYYY-MM-DD'): string => {
  if (value === null || value === undefined || value === '') return ''
  return typeof value?.format === 'function' ? value.format(format) : String(value)
}

/** 表单值序列化为 scheduleConf：前三种模式存结构化 JSON（执行条目为 points/minutes 数组），CUSTOM 存裸 cron */
export function buildScheduleConf(mode: string, values: Record<string, any>): string {
  if (mode === 'ONCE') return JSON.stringify({ date: toText(values.execDate), time: toText(values.execTime, 'HH:mm') })
  if (mode === 'CONTINUOUS' || mode === 'PERIODIC') {
    const conf: Record<string, any> = { unit: values.unit }
    if (values.unit === 'HOUR') {
      conf.minutes = values.minutes
    } else {
      if (values.unit === 'WEEK') conf.weekDay = values.weekDay
      conf.points = values.points
    }
    const deadline = toText(values.deadline)
    if (deadline) conf.deadline = deadline
    if (mode === 'PERIODIC') conf.interval = Number(values.interval ?? 1) || 1
    return JSON.stringify(conf)
  }
  return String(values.scheduleConf ?? '')
}

const singleValue = (list: any): any => (Array.isArray(list) && list.length === 1 ? list[0] : undefined)

/** 结构化调度配置→quartz cron（提交落库与预览共用）；后端仅认 CRON，表达不了的组合（时刻不齐、周间隔>1等）返回空串由提交层拦截 */
export function buildCronPreview(mode: string, values: Record<string, any>): string {
  if (mode === 'CUSTOM') return String(values.scheduleConf ?? '')
  if (mode === 'ONCE') {
    const date = toText(values.execDate)
    const time = toText(values.execTime, 'HH:mm')
    if (!date || !time) return ''
    const [year, month, day] = date.split('-')
    const [hour, minute] = time.split(':')
    return `0 ${minute} ${hour} ${Number(day)} ${Number(month)} ? ${year}`
  }
  if (mode !== 'CONTINUOUS' && mode !== 'PERIODIC') return ''
  const minute = singleValue(values.minutes)
  const interval = Number(values.interval ?? 1) || 1
  const points = (Array.isArray(values.points) ? values.points : []).filter(Boolean)
  // 多时刻只能扁平化枚举：要求分全同（小时列表）或时全同（分钟列表），否则无法用一条 cron 表达配对
  const timeField = (list: any[]) => {
    const times = list.map(point => String(point.time || ''))
    if (!times.length || times.some(time => !/^\d{1,2}:\d{2}$/.test(time))) return null
    const minuteSet = [...new Set(times.map(time => time.split(':')[1]))]
    const hourSet = [...new Set(times.map(time => time.split(':')[0]))]
    if (minuteSet.length === 1) return { hourField: hourSet.join(','), minuteField: minuteSet[0] }
    if (hourSet.length === 1) return { hourField: hourSet[0], minuteField: minuteSet.sort().join(',') }
    return null
  }
  const singleTime = (list: any[]) => (list.length && list.every(point => point.time && point.time === list[0].time) ? String(list[0].time).split(':').reverse() : null)
  switch (values.unit) {
    case 'HOUR':
      return minute === undefined ? '' : `0 ${minute} */${interval} * * ? *`
    case 'DAY': {
      const field = timeField(points)
      return field ? `0 ${field.minuteField} ${field.hourField} */${interval} * ? *` : ''
    }
    case 'WEEK': {
      // quartz 星期域不支持步进，按周间隔>1 表达不了
      if (interval !== 1 || !values.weekDay) return ''
      const field = timeField(points)
      return field ? `0 ${field.minuteField} ${field.hourField} ? * ${values.weekDay} *` : ''
    }
    case 'MONTH': {
      const days = [...new Set(points.map(point => point.day))]
      if (!days.length || days.some(day => !day)) return ''
      const sharedTime = singleTime(points)
      if (sharedTime) return `0 ${sharedTime[0]} ${sharedTime[1]} ${days.join(',')} */${interval} ? *`
      if (days.length === 1) {
        const field = timeField(points)
        return field ? `0 ${field.minuteField} ${field.hourField} ${days[0]} */${interval} ? *` : ''
      }
      return ''
    }
    case 'YEAR': {
      if (interval !== 1) return ''
      const dates = points.map(point => String(point.date || '').split('-'))
      if (!dates.length || dates.some(([month, day]) => !month || !day)) return ''
      // 单一日期 + 多时刻：固定月日，时刻按分/时扁平枚举（与 DAY 同款）
      const distinctDates = [...new Set(points.map(point => String(point.date || '')))]
      if (distinctDates.length === 1) {
        const field = timeField(points)
        const [month, day] = dates[0]
        return field ? `0 ${field.minuteField} ${field.hourField} ${Number(day)} ${Number(month)} ? *` : ''
      }
      // 多日期（同日跨月）+ 共享同一时刻：月份枚举（兼容旧数据）
      const sharedTime = singleTime(points)
      const sameDay = dates.every(([, day]) => day === dates[0][1])
      if (sharedTime && sameDay) return `0 ${sharedTime[0]} ${sharedTime[1]} ${Number(dates[0][1])} ${dates.map(([month]) => Number(month)).join(',')} ? *`
      return ''
    }
    default:
      return ''
  }
}

/** 表单值→人读摘要（表单任务内容实时预览用）；CUSTOM 或字段不全返回空串 */
export function describeScheduleForm(mode: string, values: Record<string, any>): string {
  if (!STRUCTURED_SCHEDULE_MODES.includes(mode)) return ''
  try {
    return summarizeScheduleConf(mode, JSON.parse(buildScheduleConf(mode, values)))
  } catch {
    return ''
  }
}

/** 列表调度类型文本：结构化模式给人读摘要，legacy CRON 反解析成结构化后再转人读，实在解析不了才展示 cron 原文 */
export function formatJobScheduleText(record?: any): string {
  const { conf, mode } = parseScheduleConf(record)
  const summary = summarizeScheduleConf(mode, conf)
  if (summary) return summary
  const cron = record?.scheduleConf ? String(record.scheduleConf) : ''
  if (cron) {
    const values = parseCronToScheduleValues(cron)
    if (values) {
      const text = describeScheduleForm(values.scheduleType, values)
      if (text) return text
    }
    return cron
  }
  return '-'
}

const pad2 = (value: number | string) => String(value).padStart(2, '0')
const toTime = (hour: string, minute: string) => `${pad2(hour)}:${pad2(minute)}`
const isNum = (value: string) => /^\d+$/.test(value)
const isNumList = (value: string) => /^\d+(,\d+)*$/.test(value)

// 'HH:mm' 转 dayjs：不依赖 customParseFormat 插件（该插件仅 antd 选择器引入时的副作用），保证纯逻辑单测可用
export function parseTimeDayjs(time?: string) {
  const [hour, minute] = String(time || '').split(':')
  if (!isNum(hour || '') || !isNum(minute || '')) return null
  return dayjs(new Date(2000, 0, 1, Number(hour), Number(minute)))
}

// cron 时/分域反配对：与 buildCronPreview 的 timeField 互逆（分同→时枚举，时同→分枚举）
const timesFromFields = (hourField: string, minuteField: string): { time: string }[] | null => {
  if (!isNumList(hourField) || !isNumList(minuteField)) return null
  const hours = hourField.split(',')
  const minutes = minuteField.split(',')
  if (minutes.length === 1) return hours.map(hour => ({ time: toTime(hour, minutes[0]) }))
  if (hours.length === 1) return minutes.map(minute => ({ time: toTime(hours[0], minute) }))
  return null
}

/**
 * 调度中心仅存 CRON，对话端无自定义 tab：编辑回显把 cron 反解析回三 tab 结构化字段。
 * 仅覆盖 buildCronPreview 产出的形状；间隔>1 识别为定期任务（截止日期 cron 无语义不回填）。
 * 解析不了（管理端手写 cron 等）返回 null，由调用方回落默认调度。
 */
export function parseCronToScheduleValues(cron?: string): Record<string, any> | null {
  const parts = String(cron || '').trim().split(/\s+/)
  if (parts.length !== 7 || parts[0] !== '0') return null
  const [, min, hour, day, month, weekDay, year] = parts
  // 单次：日/月/年全数字
  if (isNum(day) && isNum(month) && isNum(year) && weekDay === '?' && isNum(min) && isNum(hour)) {
    return { execDate: dayjs(`${year}-${pad2(month)}-${pad2(day)}`), execTime: parseTimeDayjs(toTime(hour, min)), scheduleType: 'ONCE' }
  }
  if (weekDay !== '?' && !(day === '?' && month === '*' && year === '*' && WEEK_DAY_TO_NUM[weekDay])) return null
  // 周：0 m h ? * DOW *（星期域非 ? 仅此一种形状，先于其余分支判定）
  if (day === '?' && month === '*' && WEEK_DAY_TO_NUM[weekDay]) {
    const points = timesFromFields(hour, min)
    if (!points) return null
    return { interval: 1, points, scheduleType: 'CONTINUOUS', unit: 'WEEK', weekDay }
  }
  if (year !== '*') return null
  // 小时：0 m */i * * ? *
  if (hour.startsWith('*/') && isNum(min)) {
    return { interval: Number(hour.slice(2)) || 1, minutes: [Number(min)], scheduleType: 'CONTINUOUS', unit: 'HOUR' }
  }
  // 天：0 m h */i * ? *
  if (day.startsWith('*/')) {
    const points = timesFromFields(hour, min)
    if (!points) return null
    return { interval: Number(day.slice(2)) || 1, points, scheduleType: 'CONTINUOUS', unit: 'DAY' }
  }
  // 月：0 m h d */i ? *
  if (month.startsWith('*/') && isNumList(day)) {
    const days = day.split(',')
    const interval = Number(month.slice(2)) || 1
    if (days.length === 1) {
      const times = timesFromFields(hour, min)
      if (!times) return null
      return { interval, points: times.map(point => ({ day: Number(days[0]), time: point.time })), scheduleType: interval > 1 ? 'PERIODIC' : 'CONTINUOUS', unit: 'MONTH' }
    }
    if (!isNum(hour) || !isNum(min)) return null
    return { interval, points: days.map(item => ({ day: Number(item), time: toTime(hour, min) })), scheduleType: interval > 1 ? 'PERIODIC' : 'CONTINUOUS', unit: 'MONTH' }
  }
  // 年：0 m h d M ? *（单月多时刻 / 多月同时刻）
  if (isNum(day) && isNumList(month)) {
    const months = month.split(',')
    if (months.length === 1) {
      const times = timesFromFields(hour, min)
      if (!times) return null
      return { interval: 1, points: times.map(point => ({ date: `${Number(months[0])}-${Number(day)}`, time: point.time })), scheduleType: 'CONTINUOUS', unit: 'YEAR' }
    }
    if (!isNum(hour) || !isNum(min)) return null
    return { interval: 1, points: months.map(item => ({ date: `${Number(item)}-${Number(day)}`, time: toTime(hour, min) })), scheduleType: 'CONTINUOUS', unit: 'YEAR' }
  }
  return null
}

/**
 * 邮件发送弹窗三 tab 调度值→旧分享邮件接口参数（最佳努力映射）：
 * 旧接口仅支持 定时+每天/每周/每月，小时级降为每天第几分、年级降为每月该日、单次的日期走 executeDate 扩展字段；
 * 完整语义另附 scheduleMode + 结构化 scheduleConf 供后端后续升级。
 */
export function toShareEmailScheduleParams(values: Record<string, any>): Record<string, any> {
  const mode = values.scheduleMode || values.scheduleType
  const firstPoint = Array.isArray(values.points) && values.points.length ? values.points[0] : undefined
  const params: Record<string, any> = { type: 2 }
  if (mode === 'ONCE') {
    params.executeFrequency = 1
    params.executeTime = toText(values.execTime, 'HH:mm')
    params.executeDate = toText(values.execDate)
    return params
  }
  switch (values.unit) {
    case 'HOUR': {
      const minute = Array.isArray(values.minutes) ? values.minutes[0] : undefined
      params.executeFrequency = 1
      params.executeTime = minute === undefined || minute === null || minute === '' ? '' : `00:${pad2(minute)}`
      return params
    }
    case 'WEEK':
      params.executeFrequency = 2
      params.weekendTargetDay = WEEK_DAY_TO_NUM[values.weekDay]
      params.executeTime = firstPoint?.time || ''
      return params
    case 'MONTH':
      params.executeFrequency = 3
      params.monthlyTargetDay = firstPoint?.day ? Number(firstPoint.day) : undefined
      params.executeTime = firstPoint?.time || ''
      return params
    case 'YEAR': {
      const dayPart = String(firstPoint?.date || '').split('-')[1]
      params.executeFrequency = 3
      params.monthlyTargetDay = dayPart ? Number(dayPart) : undefined
      params.executeTime = firstPoint?.time || ''
      return params
    }
    default:
      params.executeFrequency = 1
      params.executeTime = firstPoint?.time || ''
      return params
  }
}

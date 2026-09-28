import dayjs from 'dayjs';

// 相对路径引入：utils 被 vitest 直接加载，测试环境不解析 @/ 别名
import { JOB_SCENE_OPTIONS } from '../../../constants/job';

/** 前端 pageNum/pageSize 转调度中心列表参数 offset/pagesize（offset 为 0 基记录起始偏移） */
export function toOffsetPageParams(params?: Record<string, any>, defaultPageSize = 12): Record<string, any> {
  const { pageNum, pageSize, ...rest } = params || {};
  const size = Number(pageSize) > 0 ? Number(pageSize) : defaultPageSize;
  const page = Number(pageNum) > 0 ? Number(pageNum) : 1;
  return { ...rest, offset: (page - 1) * size, pagesize: size };
}

/** 时间范围转调度日志 filterTime 参数：'YYYY-MM-DD HH:mm:ss - YYYY-MM-DD HH:mm:ss' */
export function formatLogFilterTime(range?: any): string | undefined {
  if (!Array.isArray(range) || !range[0] || !range[1]) return undefined;
  const format = (value: any) => (typeof value?.format === 'function' ? value.format('YYYY-MM-DD HH:mm:ss') : dayjs(value).format('YYYY-MM-DD HH:mm:ss'));
  return `${format(range[0])} - ${format(range[1])}`;
}

export type JobLogStatus = 'fail' | 'running' | 'success' | 'unknown';

/** 调度日志状态推导：优先后端 logStatus，否则按触发/处理结果码推断 */
export function resolveJobLogStatus(record?: any): JobLogStatus {
  if (!record) return 'unknown';
  const logStatus = record.logStatus;
  if (logStatus === 1 || logStatus === '1') return 'success';
  if (logStatus === 2 || logStatus === '2') return 'fail';
  if (logStatus === 3 || logStatus === '3') return 'running';
  const triggerCode = record.triggerCode === null || record.triggerCode === undefined ? undefined : Number(record.triggerCode);
  const handleCode = record.handleCode === null || record.handleCode === undefined ? undefined : Number(record.handleCode);
  if (triggerCode !== undefined && triggerCode !== 200) return 'fail';
  if (handleCode !== undefined && handleCode !== 0) return handleCode === 200 ? 'success' : 'fail';
  if (triggerCode === 200) return 'running';
  return 'unknown';
}

const REPEAT_UNIT_FREQ: Record<string, string> = { DAY: '每天', HOUR: '每小时', MONTH: '每月', WEEK: '每周', YEAR: '每年' };
const REPEAT_UNIT_NOUN: Record<string, string> = { DAY: '天', HOUR: '小时', MONTH: '月', WEEK: '周', YEAR: '年' };
const WEEK_DAY_LABEL: Record<string, string> = { FRI: '周五', MON: '周一', SAT: '周六', SUN: '周日', THU: '周四', TUE: '周二', WED: '周三' };
const STRUCTURED_SCHEDULE_MODES = ['ONCE', 'CONTINUOUS', 'PERIODIC'];

/** 解析新调度模式的结构化 scheduleConf（前三种模式为 JSON 字符串）；legacy CRON/FIX_RATE/NONE 返回空 conf */
export function parseScheduleConf(record?: any): { conf: Record<string, any>; mode: string } {
  const mode = String(record?.scheduleType ?? '');
  if (!STRUCTURED_SCHEDULE_MODES.includes(mode)) return { conf: {}, mode };
  try {
    const parsed = JSON.parse(record?.scheduleConf || '{}');
    return { conf: parsed && typeof parsed === 'object' ? parsed : {}, mode };
  } catch {
    return { conf: {}, mode };
  }
}

/** 兼容新旧 conf：执行时刻数组 times / 旧单值 time */
const confTimes = (conf: Record<string, any>): string[] => (Array.isArray(conf.times) ? conf.times.map(String) : conf.time ? [String(conf.time)] : []);
const confMinutes = (conf: Record<string, any>): any[] => (Array.isArray(conf.minutes) ? conf.minutes : conf.minute !== undefined && conf.minute !== null && conf.minute !== '' ? [conf.minute] : []);

/** 执行条目归一：新 points 数组优先，旧 times/time/day/month 结构映射为 [{day?,date?,time?}] */
export function normalizeSchedulePoints(conf: Record<string, any>): { date?: string; day?: number; time?: string }[] {
  if (Array.isArray(conf.points)) return conf.points;
  const times = confTimes(conf);
  if (times.length) {
    if (conf.month && conf.day) return times.map(time => ({ date: `${conf.month}-${conf.day}`, time }));
    if (conf.day) return times.map(time => ({ day: conf.day, time }));
    return times.map(time => ({ time }));
  }
  return [];
}

/** 周期内执行时刻描述：小时→第几分（可多个），其余→条目列表（周带星期前缀，月/年日期在条目内） */
function schedulePointText(conf: Record<string, any>): string {
  const minutes = confMinutes(conf).join(', ');
  const points = normalizeSchedulePoints(conf);
  switch (conf.unit) {
    case 'HOUR':
      return minutes ? `第 ${minutes} 分` : '';
    case 'WEEK':
      return `${WEEK_DAY_LABEL[conf.weekDay] || conf.weekDay || ''} ${points.map(point => point.time).filter(Boolean).join(', ')}`.trim();
    case 'MONTH':
      return points.map(point => `${point.day ? `${point.day} 日` : ''} ${point.time || ''}`.trim()).join(', ');
    case 'YEAR':
      return points
        .map(point => {
          const [month, day] = String(point.date || '').split('-');
          return `${month ? `${month} 月` : ''}${day ? ` ${day} 日` : ''} ${point.time || ''}`.trim();
        })
        .join(', ');
    default:
      return points.map(point => point.time).filter(Boolean).join(', ');
  }
}

/** 调度配置人读摘要（不含模式前缀）：每天 08:30 执行 / 2026-09-20 10:00 执行一次 */
export function summarizeScheduleConf(mode: string, conf: Record<string, any>): string {
  if (mode === 'ONCE') return `${conf.date || ''}${conf.time ? ` ${conf.time}` : ''} 执行一次`.trim();
  if (mode === 'CONTINUOUS' || mode === 'PERIODIC') {
    const interval = Number(conf.interval ?? 1) || 1;
    const freq = mode === 'PERIODIC' && interval > 1 ? `每 ${interval} ${REPEAT_UNIT_NOUN[conf.unit] || ''}` : REPEAT_UNIT_FREQ[conf.unit] || '';
    const deadline = conf.deadline ? `，截止 ${conf.deadline}` : '';
    return `${freq} ${schedulePointText(conf)} 执行${deadline}`.replace(/\s+/g, ' ').trim();
  }
  return '';
}

/** 调度类型列文本：新模式展示人读摘要（单次: … / 连续: … / 定期: … / CRON: …），兼容 legacy CRON/FIX_RATE/NONE */
export function formatScheduleConf(record?: any): string {
  const { conf, mode } = parseScheduleConf(record);
  const MODE_LABEL: Record<string, string> = { CONTINUOUS: '连续', ONCE: '单次', PERIODIC: '定期' };
  if (MODE_LABEL[mode]) return `${MODE_LABEL[mode]}: ${summarizeScheduleConf(mode, conf)}`;
  if (mode === 'CUSTOM') return `CRON: ${record?.scheduleConf ?? ''}`;
  if (!mode) return '-';
  if (mode === 'NONE') return 'NONE';
  return `${mode}: ${record?.scheduleConf ?? ''}`;
}

const toText = (value: any, format = 'YYYY-MM-DD'): string => {
  if (value === null || value === undefined || value === '') return '';
  return typeof value?.format === 'function' ? value.format(format) : String(value);
};

/** 表单值序列化为 scheduleConf：前三种模式存结构化 JSON（执行条目为 points/minutes 数组），CUSTOM 存裸 cron */
export function buildScheduleConf(mode: string, values: Record<string, any>): string {
  if (mode === 'ONCE') return JSON.stringify({ date: toText(values.execDate), time: toText(values.execTime, 'HH:mm') });
  if (mode === 'CONTINUOUS' || mode === 'PERIODIC') {
    const conf: Record<string, any> = { unit: values.unit };
    if (values.unit === 'HOUR') {
      conf.minutes = values.minutes;
    } else {
      if (values.unit === 'WEEK') conf.weekDay = values.weekDay;
      conf.points = values.points;
    }
    const deadline = toText(values.deadline);
    if (deadline) conf.deadline = deadline;
    if (mode === 'PERIODIC') conf.interval = Number(values.interval ?? 1) || 1;
    return JSON.stringify(conf);
  }
  return String(values.scheduleConf ?? '');
}

const singleValue = (list: any): any => (Array.isArray(list) && list.length === 1 ? list[0] : undefined);

/** 结构化调度配置→quartz cron（提交落库与预览共用）；后端仅认 CRON，表达不了的组合（时刻不齐、周间隔>1等）返回空串由提交层拦截 */
export function buildCronPreview(mode: string, values: Record<string, any>): string {
  if (mode === 'CUSTOM') return String(values.scheduleConf ?? '');
  if (mode === 'ONCE') {
    const date = toText(values.execDate);
    const time = toText(values.execTime, 'HH:mm');
    if (!date || !time) return '';
    const [year, month, day] = date.split('-');
    const [hour, minute] = time.split(':');
    return `0 ${minute} ${hour} ${Number(day)} ${Number(month)} ? ${year}`;
  }
  if (mode !== 'CONTINUOUS' && mode !== 'PERIODIC') return '';
  const minute = singleValue(values.minutes);
  const interval = Number(values.interval ?? 1) || 1;
  const points = (Array.isArray(values.points) ? values.points : []).filter(Boolean);
  // 多时刻只能扁平化枚举：要求分全同（小时列表）或时全同（分钟列表），否则无法用一条 cron 表达配对
  const timeField = (list: any[]) => {
    const times = list.map(point => String(point.time || ''));
    if (!times.length || times.some(time => !/^\d{1,2}:\d{2}$/.test(time))) return null;
    const minuteSet = [...new Set(times.map(time => time.split(':')[1]))];
    const hourSet = [...new Set(times.map(time => time.split(':')[0]))];
    if (minuteSet.length === 1) return { hourField: hourSet.join(','), minuteField: minuteSet[0] };
    if (hourSet.length === 1) return { hourField: hourSet[0], minuteField: minuteSet.sort().join(',') };
    return null;
  };
  const singleTime = (list: any[]) => (list.length && list.every(point => point.time && point.time === list[0].time) ? String(list[0].time).split(':').reverse() : null);
  switch (values.unit) {
    case 'HOUR':
      return minute === undefined ? '' : `0 ${minute} */${interval} * * ? *`;
    case 'DAY': {
      const field = timeField(points);
      return field ? `0 ${field.minuteField} ${field.hourField} */${interval} * ? *` : '';
    }
    case 'WEEK': {
      // quartz 星期域不支持步进，按周间隔>1 表达不了
      if (interval !== 1 || !values.weekDay) return '';
      const field = timeField(points);
      return field ? `0 ${field.minuteField} ${field.hourField} ? * ${values.weekDay} *` : '';
    }
    case 'MONTH': {
      const days = [...new Set(points.map(point => point.day))];
      if (!days.length || days.some(day => !day)) return '';
      const sharedTime = singleTime(points);
      if (sharedTime) return `0 ${sharedTime[0]} ${sharedTime[1]} ${days.join(',')} */${interval} ? *`;
      if (days.length === 1) {
        const field = timeField(points);
        return field ? `0 ${field.minuteField} ${field.hourField} ${days[0]} */${interval} ? *` : '';
      }
      return '';
    }
    case 'YEAR': {
      if (interval !== 1) return '';
      const dates = points.map(point => String(point.date || '').split('-'));
      if (!dates.length || dates.some(([month, day]) => !month || !day)) return '';
      // 单一日期 + 多时刻：固定月日，时刻按分/时扁平枚举（与 DAY 同款）
      const distinctDates = [...new Set(points.map(point => String(point.date || '')))];
      if (distinctDates.length === 1) {
        const field = timeField(points);
        const [month, day] = dates[0];
        return field ? `0 ${field.minuteField} ${field.hourField} ${Number(day)} ${Number(month)} ? *` : '';
      }
      // 多日期（同日跨月）+ 共享同一时刻：月份枚举（兼容旧数据）
      const sharedTime = singleTime(points);
      const sameDay = dates.every(([, day]) => day === dates[0][1]);
      if (sharedTime && sameDay) return `0 ${sharedTime[0]} ${sharedTime[1]} ${Number(dates[0][1])} ${dates.map(([month]) => Number(month)).join(',')} ? *`;
      return '';
    }
    default:
      return '';
  }
}

/** 表单值→人读摘要（弹层任务内容实时预览用）；CUSTOM 或字段不全返回空串 */
export function describeScheduleForm(mode: string, values: Record<string, any>): string {
  if (!STRUCTURED_SCHEDULE_MODES.includes(mode)) return '';
  try {
    return summarizeScheduleConf(mode, JSON.parse(buildScheduleConf(mode, values)));
  } catch {
    return '';
  }
}

/** 运行模式列文本：BEAN 展示作业场景中文名（非场景码则原样展示 handler），GLUE 系仅展示模式（不提供 GLUE IDE） */
export function formatGlueMode(record?: any): string {
  if (!record?.glueType) return '-';
  if (record.glueType === 'BEAN') {
    const scene = JOB_SCENE_OPTIONS.find(item => item.value === record.executorHandler);
    return `BEAN: ${scene?.label || record.executorHandler || ''}`;
  }
  return String(record.glueType);
}

/** 下次触发时间预览值格式化：兼容毫秒/秒时间戳与字符串 */
export function formatNextTriggerTime(value: any): string {
  if (value === null || value === undefined || value === '') return '-';
  const text = String(value).trim();
  if (typeof value === 'number' || /^\d{10,13}$/.test(text)) {
    const num = Number(text);
    return dayjs(text.length === 10 ? num * 1000 : num).format('YYYY-MM-DD HH:mm:ss');
  }
  return String(value);
}

/** 调度结果列推导：仅看触发码，200 成功，其余失败 */
export function resolveTriggerResult(record?: any): JobLogStatus {
  const raw = record?.triggerCode;
  if (raw === null || raw === undefined || raw === '') return 'unknown';
  return Number(raw) === 200 ? 'success' : 'fail';
}

/** 执行结果列推导：处理码 200 成功、非 0 失败；处理码 0 且触发成功表示仍在运行 */
export function resolveHandleResult(record?: any): JobLogStatus {
  const rawHandle = record?.handleCode;
  if (rawHandle === null || rawHandle === undefined || rawHandle === '') return 'unknown';
  const handleCode = Number(rawHandle);
  if (handleCode === 200) return 'success';
  if (handleCode === 0) return Number(record?.triggerCode) === 200 ? 'running' : 'unknown';
  return 'fail';
}

/** 调度中心写请求统一成功门禁：code 200 或 success true */
export function isJobRequestSuccess(res: any): boolean {
  const body = res?.response?.data;
  return body?.code === 200 || body?.success === true;
}

/** 调度中心列表响应信封 {code,msg,data:{offset,pagesize,data,total},success} 取记录与总数（入参为 flat request 结果） */
export function resolveJobPageResult(res: any): { records: any[]; total: number } {
  const pageData = res?.data || {};
  return {
    records: Array.isArray(pageData.data) ? pageData.data : [],
    total: Number(pageData.total) || 0,
  };
}

const HTML_ENTITY_MAP: Record<string, string> = { '&#39;': '\'', '&amp;': '&', '&gt;': '>', '&lt;': '<', '&nbsp;': ' ', '&quot;': '"' };

/** 调度备注（triggerMsg）为 HTML 片段：<br> 换行、<span> 着色；去标签解实体后拆成「标签: 值」行，无冒号的行（分隔标题）label 为空 */
export function parseTriggerMsg(raw?: string): { label: string; value: string }[] {
  const text = String(raw ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    // 标签名须以字母开头：避免值里的连续 < 被误判为标签起点（如 <<<<<<<<<< </span>）
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    .replace(/&(?:amp|lt|gt|quot|nbsp|#39);/gi, match => HTML_ENTITY_MAP[match.toLowerCase()] ?? match);
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const matched = line.match(/^([^：:]+：)\s*(.*)$/);
      return matched ? { label: matched[1], value: matched[2] } : { label: '', value: line };
    });
}

import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

type DateRange = [Dayjs | null, Dayjs | null] | null | undefined;

/**
 * 按创建时间前端过滤列表数据。
 * - dateRange 为空或行缺少时间字段时放行
 * - 命中区间 [start.startOf('day'), end.endOf('day')] 保留
 */
export function filterByCreateTime<T = any>(
  rows: T[],
  dateRange: DateRange,
  field = 'createTime'
): T[] {
  if (!Array.isArray(rows)) return rows;
  const start = dateRange?.[0];
  const end = dateRange?.[1];
  if (!start || !end) return rows;
  const startMs = start.startOf('day').valueOf();
  const endMs = end.endOf('day').valueOf();
  return rows.filter((row: any) => {
    const raw = row?.[field];
    if (!raw) return true;
    const ts = dayjs(raw).valueOf();
    if (Number.isNaN(ts)) return true;
    return ts >= startMs && ts <= endMs;
  });
}

/**
 * 树表按创建时间递归过滤：节点自身或任一子孙命中即保留，保持父子层级。
 */
export function filterTreeByCreateTime<T = any>(
  rows: T[],
  dateRange: DateRange,
  field = 'createTime',
  childrenKey = 'children'
): T[] {
  if (!Array.isArray(rows)) return rows;
  const start = dateRange?.[0];
  const end = dateRange?.[1];
  if (!start || !end) return rows;
  const startMs = start.startOf('day').valueOf();
  const endMs = end.endOf('day').valueOf();

  const hit = (raw: any) => {
    if (!raw) return false;
    const ts = dayjs(raw).valueOf();
    if (Number.isNaN(ts)) return false;
    return ts >= startMs && ts <= endMs;
  };

  const walk = (list: any[]): any[] => {
    const result: any[] = [];
    for (const node of list) {
      const children = Array.isArray(node?.[childrenKey]) ? node[childrenKey] : [];
      const filteredChildren = children.length ? walk(children) : [];
      if (hit(node?.[field]) || filteredChildren.length > 0) {
        result.push(
          children.length ? { ...node, [childrenKey]: filteredChildren } : node
        );
      }
    }
    return result;
  };

  return walk(rows) as T[];
}

export function formattedDate() {
  const currentTime = new Date();
  const year = currentTime.getFullYear();
  const month = String(currentTime.getMonth() + 1).padStart(2, '0'); // 月份从0开始，所以需要加1，并且用padStart来确保两位数字
  const day = String(currentTime.getDate()).padStart(2, '0'); // 用padStart来确保两位数字
  const hours = String(currentTime.getHours()).padStart(2, '0');
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');
  const seconds = String(currentTime.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


// 一个相对宽松但够用的邮箱正则
const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 校验多个邮箱（用逗号分隔）
 * @param {string} value - 输入的字符串，例如 "a@x.com, b@y.com"
 * @returns {{ valid: boolean, invalidEmails: string[] }}
 */
export function validateMultiEmails(value: string) {
  if (!value) {
    return { valid: true, invalidEmails: [] }; // 看业务是否允许为空
  }

  // 按中英文逗号拆分
  const parts = value
    .split(/[,，]/)
    .map(v => v.trim())
    .filter(v => v.length > 0); // 去掉空串

  if (parts.length === 0) {
    return { valid: true, invalidEmails: [] };
  }

  const invalid = parts.filter((email: string) => !emailReg.test(email));
  return {
    valid: invalid.length === 0,
    invalidEmails: invalid
  };
}

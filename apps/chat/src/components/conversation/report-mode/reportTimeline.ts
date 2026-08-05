import type { ReportItem } from './types'

function getGroupOrder(group: any[][], fallback: number): number {
  const item = group.flat()[0]
  if (item?.role === 'first') return Number.MIN_SAFE_INTEGER

  const value = Number(item?.roundIndex ?? item?.order)
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER + fallback
}

/** 报告只作为展示组插入时间线，不写入普通 convContent。 */
export function mergeConversationAndReportGroups(baseGroups: any[][][], reportItems: ReportItem[]): any[][][] {
  const reportGroups = reportItems.map((report) => [[{
    role: 'report',
    report,
    order: report.sortOrder,
    roundIndex: report.sortOrder,
  }]])

  return [...baseGroups, ...reportGroups]
    .map((group, index) => ({ group, index }))
    .sort((left, right) => getGroupOrder(left.group, left.index) - getGroupOrder(right.group, right.index) || left.index - right.index)
    .map(({ group }) => group)
}

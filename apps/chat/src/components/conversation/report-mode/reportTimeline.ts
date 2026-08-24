import type { ReportItem } from './types'

function getGroupOrder(group: any[][], fallback: number): number {
  const item = group.flat()[0]
  if (item?.role === 'first') return Number.MIN_SAFE_INTEGER

  const value = Number(item?.roundIndex ?? item?.order)
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER + fallback
}

/** 历史/恢复的报告使用 stream 序号（roundIndex）排序，实时任务（新提交）用 createdAt 显示在最后。 */
const getReportDisplayOrder = (report: ReportItem): number => {
  if (report.source === 'task') {
    // 实时报告：按创建时间排到历史之后（与 explore 的 Date.now() 同量级，保持正确时序）
    return report.createdAt
  }
  // 历史/已持久化的报告：按 stream 序号排序
  return report.sortOrder
}

/** 报告只作为展示组插入时间线，不写入普通 convContent。 */
export function mergeConversationAndReportGroups(baseGroups: any[][][], reportItems: ReportItem[]): any[][][] {
  const reportGroups = reportItems.map((report) => {
    const order = getReportDisplayOrder(report)
    return [[{
      role: 'report',
      report,
      order,
      roundIndex: report.source === 'task' ? order : report.sortOrder,
    }]]
  })

  return [...baseGroups, ...reportGroups]
    .map((group, index) => ({ group, index }))
    .sort((left, right) => getGroupOrder(left.group, left.index) - getGroupOrder(right.group, right.index) || left.index - right.index)
    .map(({ group }) => group)
}

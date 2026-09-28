import type { ReportItem } from './types'

type TimelineGroup = Array<Array<Record<string, unknown>>>

function getGroupOrder(group: TimelineGroup, fallback: number): number {
  const item = group.flat()[0]
  if (item?.role === 'first') return Number.MIN_SAFE_INTEGER

  const value = Number(item?.roundIndex ?? item?.order)
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER + fallback
}

function getGroupHistorySequence(group: TimelineGroup): number | undefined {
  const value = group.flat()[0]?.historySequence
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : undefined
}

function isOpeningGroup(group: TimelineGroup): boolean {
  return group.flat()[0]?.role === 'first'
}

/** 未携带接口位置时沿用原有顺序：历史报告使用 roundIndex，实时报告使用 createdAt。 */
const getReportDisplayOrder = (report: ReportItem): number => {
  if (report.source === 'task') {
    // 实时报告：按创建时间与其他实时项保持相对时序。
    return report.createdAt
  }
  // 兼容没有 historySequence 的历史数据。
  return report.sortOrder
}

/** 报告只作为展示组插入时间线，不写入普通 convContent。 */
export function mergeConversationAndReportGroups(baseGroups: TimelineGroup[], reportItems: ReportItem[]): TimelineGroup[] {
  const reportGroups = reportItems.map((report) => {
    const order = getReportDisplayOrder(report)
    return [[{
      role: 'report',
      report,
      order,
      roundIndex: report.source === 'task' ? order : report.sortOrder,
      historySequence: report.historySequence,
    }]]
  })

  return [...baseGroups, ...reportGroups]
    .map((group, index) => ({ group, index }))
    .sort((left, right) => {
      if (isOpeningGroup(left.group)) return isOpeningGroup(right.group) ? left.index - right.index : -1
      if (isOpeningGroup(right.group)) return 1

      const leftSequence = getGroupHistorySequence(left.group)
      const rightSequence = getGroupHistorySequence(right.group)
      if (leftSequence !== undefined && rightSequence !== undefined) {
        return leftSequence - rightSequence || left.index - right.index
      }
      if (leftSequence !== undefined) return -1
      if (rightSequence !== undefined) return 1

      return getGroupOrder(left.group, left.index) - getGroupOrder(right.group, right.index) || left.index - right.index
    })
    .map(({ group }) => group)
}

import type { ReportTaskStatus } from '@/service/api/report'

import type { ReportItem, ReportTaskRecord } from './types'

export type ReportRecoveryAction = 'use_history' | 'connect_stream' | 'show_failure'

/** task 状态只决定恢复来源；具体 Redis 事件仍由报告 reducer 处理。 */
export function getReportRecoveryAction(task: ReportTaskStatus): ReportRecoveryAction {
  if (task.status === 'success' || (task.completed && task.successful)) return 'use_history'
  if (['failure', 'revoked'].includes(task.status) || (task.completed && !task.successful)) return 'show_failure'
  return 'connect_stream'
}

/** query 已覆盖的记录只需清理缓存；只有 unresolved 记录才允许继续请求 task 状态。 */
export function splitReportTaskRecordsByHistory(records: ReportTaskRecord[], historySortOrders: Iterable<number>) {
  const completedSortOrders = new Set(historySortOrders)

  return records.reduce<{
    completedRecords: ReportTaskRecord[]
    unresolvedRecords: ReportTaskRecord[]
  }>((result, record) => {
    if (completedSortOrders.has(record.sortOrder)) result.completedRecords.push(record)
    else result.unresolvedRecords.push(record)
    return result
  }, {
    completedRecords: [],
    unresolvedRecords: [],
  })
}

/** 只在首次收到整体 done 时返回需要删除的复合缓存键，避免重复删除同一任务。 */
export function getNewlyCompletedReportTaskKey(previousDoneEntryId: string | undefined, report: Pick<ReportItem, 'conversationId' | 'taskId' | 'doneEntryId'>) {
  if (!report.doneEntryId || report.doneEntryId === previousDoneEntryId || !report.conversationId || !report.taskId) return undefined

  return {
    conversationId: report.conversationId,
    taskId: report.taskId,
  }
}

/** 只通知实时任务首次成功完成，避免历史 query 和重复 done 产生重复弹窗。 */
export function shouldNotifyReportCompleted(previousDoneEntryId: string | undefined, report: Pick<ReportItem, 'doneEntryId' | 'source' | 'status'>) {
  return report.source === 'task'
    && report.status === 'completed'
    && Boolean(report.doneEntryId)
    && report.doneEntryId !== previousDoneEntryId
}

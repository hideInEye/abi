import { describe, expect, it } from 'vitest'

import { getNewlyCompletedReportTaskKey, getReportRecoveryAction, splitReportTaskRecordsByHistory } from './reportRecovery'
import type { ReportTaskRecord } from './types'

function task(taskId: string, sortOrder: number): ReportTaskRecord {
  return {
    conversationId: 'conv-1',
    sessionId: 'session-1',
    taskId,
    question: `问题 ${sortOrder}`,
    streamKey: `report:conv-1:${sortOrder}`,
    sortOrder,
    createdAt: sortOrder,
  }
}

describe('report task recovery', () => {
  it.each(['pending', 'started', 'retry'])("%s 状态继续连接 Redis Stream", (status) => {
    expect(getReportRecoveryAction({ taskId: 'task-1', status, completed: false, successful: false })).toBe('connect_stream')
  })

  it('success 使用 query 历史，不重复读流', () => {
    expect(getReportRecoveryAction({ taskId: 'task-1', status: 'success', completed: true, successful: true })).toBe('use_history')
  })

  it.each(['failure', 'revoked'])("%s 状态直接展示失败", (status) => {
    expect(getReportRecoveryAction({ taskId: 'task-1', status, completed: true, successful: false })).toBe('show_failure')
  })

  it('query 已覆盖的缓存进入清理队列，且不会再次查询对应 taskId', () => {
    const result = splitReportTaskRecordsByHistory([
      task('task-completed', 1),
      task('task-running', 2),
    ], [1])

    expect(result.completedRecords.map((record) => record.taskId)).toEqual(['task-completed'])
    expect(result.unresolvedRecords.map((record) => record.taskId)).toEqual(['task-running'])
  })

  it('仅在整体 done 首次出现时生成 IndexedDB 删除键', () => {
    const completedReport = {
      conversationId: 'conv-1',
      taskId: 'task-1',
      doneEntryId: '100-0',
    }

    expect(getNewlyCompletedReportTaskKey(undefined, completedReport)).toEqual({
      conversationId: 'conv-1',
      taskId: 'task-1',
    })
    expect(getNewlyCompletedReportTaskKey('100-0', completedReport)).toBeUndefined()
    expect(getNewlyCompletedReportTaskKey(undefined, { ...completedReport, taskId: undefined })).toBeUndefined()
  })
})

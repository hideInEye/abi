import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { connectReportEvents, submitReportTask } from '@/service/api/report'
import type { RawReportStreamEntry, SubmitReportRequest } from '@/service/api/report'

import { createInitialReportStreamState, parseReportStreamEvent, reduceReportStreamEntry } from './reportStreamReducer'
import { getReportTaskSortOrder, reportTaskStorage } from './reportTaskStorage'
import type { ReportItem, ReportTaskRecord } from './types'

interface UseReportConversationOptions {
  conv?: Record<string, unknown>
  spaceId?: number
  currentModelId?: string | number
  embedModelId?: string | number
  sessionGroupId?: string
}

const MAX_STREAM_RETRY_COUNT = 3
const STREAM_RETRY_DELAY_MS = [600, 1200, 2400]

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function createLocalId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : fallback
}

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : undefined
}

function getCurrentUserId() {
  try {
    const userInfo = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}') as { userId?: string | number }
    if (userInfo.userId !== undefined) return toFiniteNumber(userInfo.userId)

    return toFiniteNumber(localStorage.getItem('userId'))
  } catch {
    return 0
  }
}

function createReportItem(record: ReportTaskRecord, status: ReportItem['status'] = 'waiting_stream'): ReportItem {
  return {
    ...createInitialReportStreamState(),
    id: record.taskId,
    taskId: record.taskId,
    conversationId: record.conversationId,
    sessionId: record.sessionId,
    streamKey: record.streamKey,
    question: record.question,
    createdAt: record.createdAt,
    status,
  }
}

function createPendingReportItem(question: string, conversationId: string, sessionId: string): ReportItem {
  const createdAt = Date.now()

  return {
    ...createInitialReportStreamState(),
    id: createLocalId('report-pending'),
    conversationId,
    sessionId,
    question,
    createdAt,
    status: 'submitting',
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * 报告模式会话控制器。
 *
 * 业务边界：
 * - 报告服务只负责返回 taskId/streamKey。
 * - Node 只透传 Redis entry id/data。
 * - 本 Hook 负责 IndexedDB 恢复、连接生命周期和把纯 reducer 状态交给 UI。
 */
export function useReportConversation({ conv, spaceId, currentModelId, embedModelId, sessionGroupId }: UseReportConversationOptions) {
  const [reports, setReports] = useState<ReportItem[]>([])
  const [activeReportId, setActiveReportId] = useState<string>()
  const [mobileView, setMobileView] = useState<'conversation' | 'report'>('conversation')
  const [loadError, setLoadError] = useState<string>()
  const submitControllersRef = useRef<Map<string, AbortController>>(new Map())
  const streamControllersRef = useRef<Map<string, AbortController>>(new Map())
  const reportsRef = useRef<ReportItem[]>(reports)
  const loadGenerationRef = useRef(0)
  const autoOpenedReportIdsRef = useRef<Set<string>>(new Set())

  const conversationId = String(conv?.conv_uid || conv?.convUid || '').trim()
  const sessionId = String(conv?.chat_id || conv?.sessionId || '').trim()

  const commitReports = useCallback((updater: (reports: ReportItem[]) => ReportItem[]) => {
    const nextReports = updater(reportsRef.current)
    reportsRef.current = nextReports
    setReports(nextReports)
  }, [])

  const updateReport = useCallback((reportId: string, updater: (report: ReportItem) => ReportItem) => {
    commitReports((currentReports) => currentReports.map((report) => (report.id === reportId ? updater(report) : report)))
  }, [commitReports])

  const abortAllConnections = useCallback(() => {
    submitControllersRef.current.forEach((controller) => controller.abort())
    streamControllersRef.current.forEach((controller) => controller.abort())
    submitControllersRef.current.clear()
    streamControllersRef.current.clear()
  }, [])

  const applyRawEntry = useCallback((reportId: string, entry: RawReportStreamEntry) => {
    const current = reportsRef.current.find((report) => report.id === reportId)
    if (!current) return

    const event = parseReportStreamEvent(entry.data)
    let nextRuntime = reduceReportStreamEntry(current, entry)

    // 一旦 Redis 返回有效数据，等待状态进入顶部思考；第一条 plan 会由 reducer 切到 running。
    if (event && current.status === 'waiting_stream' && nextRuntime.status === 'waiting_stream' && nextRuntime.lastEntryId) {
      nextRuntime = {
        ...nextRuntime,
        status: 'thinking',
      }
    }

    if (event?.type === 'question' && event.content !== current.question) {
      nextRuntime = {
        ...nextRuntime,
        warnings: [...nextRuntime.warnings, 'Redis 中的问题与本地提交问题不一致，页面继续显示本地问题。'],
      }
    }

    const nextReport: ReportItem = {
      ...current,
      ...nextRuntime,
      // 本地提交问题是 UI 主记录，Redis question 只保存在 streamQuestion 中用于诊断。
      question: current.question,
    }

    commitReports((currentReports) => currentReports.map((report) => (report.id === reportId ? nextReport : report)))

    // 每个 task 的首个候选自动开栏一次；用户主动关闭后，后续候选只更新状态，不抢回右栏。
    if (nextReport.reportCandidate && !autoOpenedReportIdsRef.current.has(reportId)) {
      autoOpenedReportIdsRef.current.add(reportId)
      setActiveReportId(reportId)
      setMobileView('report')
    }

    if (nextReport.doneEntryId && nextReport.doneEntryId !== current.doneEntryId) {
      streamControllersRef.current.get(reportId)?.abort()
      streamControllersRef.current.delete(reportId)
    }
  }, [commitReports])

  const connectStream = useCallback(async (reportId: string, streamKey: string) => {
    let retryCount = 0

    while (retryCount <= MAX_STREAM_RETRY_COUNT) {
      const current = reportsRef.current.find((report) => report.id === reportId)
      if (!current || current.doneEntryId || current.status === 'completed') return

      updateReport(reportId, (report) => ({
        ...report,
        status: report.lastEntryId ? report.status : 'waiting_stream',
      }))

      const controller = new AbortController()
      streamControllersRef.current.get(reportId)?.abort()
      streamControllersRef.current.set(reportId, controller)

      try {
        await connectReportEvents({
          query: {
            stream_key: streamKey,
            last_id: reportsRef.current.find((report) => report.id === reportId)?.lastEntryId,
          },
          signal: controller.signal,
          onEntry(entry) {
            applyRawEntry(reportId, entry)
          },
          onError(error) {
            updateReport(reportId, (report) => ({
              ...report,
              warnings: [...report.warnings, `Redis Stream 传输异常：${toErrorMessage(error)}`],
            }))
          },
        })

        const latest = reportsRef.current.find((report) => report.id === reportId)
        if (!latest || latest.doneEntryId || latest.status === 'completed' || controller.signal.aborted) return

        throw new Error('Redis Stream 连接意外结束')
      } catch (error) {
        if (controller.signal.aborted || (error as Error)?.name === 'AbortError') return

        retryCount += 1
        if (retryCount > MAX_STREAM_RETRY_COUNT) {
          updateReport(reportId, (report) => ({
            ...report,
            status: 'failed',
            error: {
              code: 'report_stream_failed',
              message: `报告事件读取失败：${toErrorMessage(error)}`,
            },
          }))
          return
        }

        updateReport(reportId, (report) => ({
          ...report,
          warnings: [...report.warnings, `连接中断，正在从 ${report.lastEntryId || '0-0'} 继续读取（${retryCount}/${MAX_STREAM_RETRY_COUNT}）`],
        }))
        await wait(STREAM_RETRY_DELAY_MS[retryCount - 1] || STREAM_RETRY_DELAY_MS[STREAM_RETRY_DELAY_MS.length - 1])
      } finally {
        if (streamControllersRef.current.get(reportId) === controller) {
          streamControllersRef.current.delete(reportId)
        }
      }
    }
  }, [applyRawEntry, updateReport])

  const handleSend = useCallback((rawQuestion: string) => {
    const question = rawQuestion.trim()
    if (!question) return

    const pendingReport = createPendingReportItem(question, conversationId, sessionId)
    commitReports((currentReports) => [...currentReports, pendingReport])

    if (!conversationId || !sessionId) {
      updateReport(pendingReport.id, (report) => ({
        ...report,
        status: 'failed',
        error: {
          code: 'missing_conversation_identity',
          message: '当前会话缺少 convUid 或 sessionId，无法提交报告任务',
        },
      }))
      return
    }

    const chatModelId = toFiniteNumber(currentModelId ?? conv?.chat_model_id ?? conv?.chatModelId)
    if (chatModelId <= 0) {
      updateReport(pendingReport.id, (report) => ({
        ...report,
        status: 'failed',
        error: {
          code: 'missing_chat_model',
          message: '请选择有效的对话模型后再生成报告',
        },
      }))
      return
    }

    const controller = new AbortController()
    submitControllersRef.current.set(pendingReport.id, controller)

    const embedId = toOptionalNumber(embedModelId)
    const appType = conv?.app_type ?? conv?.appType
    const requestData: SubmitReportRequest = {
      messages: question,
      app_id: toFiniteNumber(conv?.appId ?? conv?.app_id),
      space_id: toFiniteNumber(conv?.space_id ?? conv?.spaceId ?? spaceId),
      // 会话分组接口返回的 groupId 是字符串，报告接口按原类型接收；无分组时也显式传空字符串。
      group_id: sessionGroupId ?? '',
      conv_id: conversationId,
      session_id: sessionId,
      user_id: getCurrentUserId(),
      chat_model_id: chatModelId,
      ...(embedId !== undefined ? { embed_model_id: embedId } : {}),
      ...(appType !== undefined && appType !== null && appType !== '' ? { app_type: String(appType) } : {}),
    }

    void submitReportTask(requestData, controller.signal)
      .then(async (submitted) => {
        const record: ReportTaskRecord = {
          conversationId: submitted.conversationId,
          sessionId,
          taskId: submitted.taskId,
          question,
          streamKey: submitted.streamKey,
          // 后端保证每个任务使用独立 Stream，末尾数字段就是会话内问题顺序。
          sortOrder: getReportTaskSortOrder(submitted.streamKey, pendingReport.createdAt),
          createdAt: pendingReport.createdAt,
        }

        let storageWarning: string | undefined
        try {
          await reportTaskStorage.put(record)
        } catch (error) {
          storageWarning = `任务已提交，但本地保存失败，刷新后可能无法恢复：${toErrorMessage(error)}`
        }

        const submittedReport: ReportItem = {
          ...createReportItem(record),
          storageWarning,
        }

        commitReports((currentReports) => currentReports.map((report) => (report.id === pendingReport.id ? submittedReport : report)))
        submitControllersRef.current.delete(pendingReport.id)
        void connectStream(submittedReport.id, record.streamKey)
      })
      .catch((error) => {
        if (controller.signal.aborted || (error as Error)?.name === 'AbortError') return

        updateReport(pendingReport.id, (report) => ({
          ...report,
          status: 'failed',
          error: {
            code: 'report_submit_failed',
            message: toErrorMessage(error),
          },
        }))
      })
      .finally(() => {
        submitControllersRef.current.delete(pendingReport.id)
      })
  }, [commitReports, conv, conversationId, currentModelId, embedModelId, sessionGroupId, sessionId, spaceId, updateReport, connectStream])

  const stopReport = useCallback((reportId: string) => {
    submitControllersRef.current.get(reportId)?.abort()
    streamControllersRef.current.get(reportId)?.abort()
    submitControllersRef.current.delete(reportId)
    streamControllersRef.current.delete(reportId)

    updateReport(reportId, (report) => ({
      ...report,
      status: 'failed',
      error: {
        code: 'user_aborted',
        message: '已停止当前页面的报告生成监听；重新进入会话后会从 Redis 恢复真实状态。',
      },
    }))
  }, [updateReport])

  const stopGenerating = useCallback(() => {
    const active = [...reportsRef.current].reverse().find((report) => ['submitting', 'waiting_stream', 'thinking', 'running'].includes(report.status))
    if (active) stopReport(active.id)
  }, [stopReport])

  const toggleThinking = useCallback((reportId: string) => {
    updateReport(reportId, (report) => ({
      ...report,
      thinkingOpen: !report.thinkingOpen,
    }))
  }, [updateReport])

  const toggleTodo = useCallback((reportId: string) => {
    updateReport(reportId, (report) => ({
      ...report,
      todoOpen: !report.todoOpen,
    }))
  }, [updateReport])

  const toggleTaskExecution = useCallback((reportId: string, taskKey: string) => {
    updateReport(reportId, (report) => ({
      ...report,
      expandedTaskKeys: report.expandedTaskKeys.includes(taskKey)
        ? report.expandedTaskKeys.filter((key) => key !== taskKey)
        : [...report.expandedTaskKeys, taskKey],
    }))
  }, [updateReport])

  const openReport = useCallback((reportId: string) => {
    const report = reportsRef.current.find((item) => item.id === reportId)
    if (!report?.reportCandidate) return

    setActiveReportId(reportId)
    setMobileView('report')
  }, [])

  const closeReport = useCallback(() => {
    setActiveReportId(undefined)
    setMobileView('conversation')
  }, [])

  // 会话切换、刷新和报告模式重新挂载时，只从 IndexedDB 取定位信息，再从 Redis 0-0 完整回放。
  useEffect(() => {
    const generation = loadGenerationRef.current + 1
    loadGenerationRef.current = generation
    abortAllConnections()
    reportsRef.current = []
    autoOpenedReportIdsRef.current.clear()
    setReports([])
    setActiveReportId(undefined)
    setMobileView('conversation')
    setLoadError(undefined)

    if (!conversationId) return undefined

    void reportTaskStorage.list(conversationId)
      .then((records) => {
        if (loadGenerationRef.current !== generation) return

        const restoredReports = records.map((record) => createReportItem(record))
        reportsRef.current = restoredReports
        setReports(restoredReports)
        records.forEach((record) => {
          void connectStream(record.taskId, record.streamKey)
        })
      })
      .catch((error) => {
        if (loadGenerationRef.current === generation) {
          setLoadError(`报告历史定位信息读取失败：${toErrorMessage(error)}`)
        }
      })

    return () => {
      loadGenerationRef.current += 1
      abortAllConnections()
    }
  }, [abortAllConnections, connectStream, conversationId])

  useEffect(() => () => reportTaskStorage.close(), [])

  const activeReport = useMemo(() => reports.find((report) => report.id === activeReportId), [activeReportId, reports])
  const loading = useMemo(() => reports.some((report) => ['submitting', 'waiting_stream', 'thinking', 'running'].includes(report.status)), [reports])

  return {
    reports,
    activeReport,
    activeReportId,
    mobileView,
    loading,
    loadError,
    handleSend,
    stopGenerating,
    toggleThinking,
    toggleTodo,
    toggleTaskExecution,
    openReport,
    closeReport,
    setMobileView,
  }
}

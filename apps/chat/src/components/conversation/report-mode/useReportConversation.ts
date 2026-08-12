import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { connectReportEvents, fetchReportTaskStatus, submitReportTask } from '@/service/api/report'
import type { RawReportStreamEntry, SubmitReportRequest } from '@/service/api/report'

import { createReportItemFromHistory, mergeReportTimelineItems } from './reportHistoryAdapter'
import { canRevealReport, shouldAnimateReportPreview, toggleReportTaskKey } from './helpers'
import { getNewlyCompletedReportTaskKey, getReportRecoveryAction, shouldNotifyReportCompleted, splitReportTaskRecordsByHistory } from './reportRecovery'
import { createInitialReportStreamState, parseReportStreamEvent, reduceReportStreamEntry } from './reportStreamReducer'
import { getReportTaskSortOrder, reportTaskStorage } from './reportTaskStorage'
import type { ReportHistoryRoundGroup, ReportItem, ReportTaskRecord } from './types'

interface UseReportConversationOptions {
  conv?: Record<string, unknown>
  spaceId?: number
  schemaId?: number | string
  currentModelId?: string | number
  embedModelId?: string | number
  historyRounds?: ReportHistoryRoundGroup[]
  historyLoaded?: boolean
  onRefreshHistory?: () => Promise<void>
  onReportCompleted?: (report: ReportItem) => void
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
    sortOrder: record.sortOrder,
    createdAt: record.createdAt,
    source: 'task',
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
    // 提交响应返回真实 Stream 序号前，临时问题固定排在当前时间线末尾。
    sortOrder: Number.MAX_SAFE_INTEGER,
    createdAt,
    source: 'task',
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
 * - Java 只透传 Redis entry id/data。
 * - 本 Hook 负责 query 历史、IndexedDB、task 状态、连接生命周期和 UI 聚合。
 */
export function useReportConversation({ conv, spaceId, schemaId, currentModelId, embedModelId, historyRounds = [], historyLoaded = false, onRefreshHistory, onReportCompleted }: UseReportConversationOptions) {
  const [reports, setReports] = useState<ReportItem[]>([])
  const [activeReportId, setActiveReportId] = useState<string>()
  const [animateReportPreview, setAnimateReportPreview] = useState(false)
  const [mobileView, setMobileView] = useState<'conversation' | 'report'>('conversation')
  const [loadError, setLoadError] = useState<string>()
  const submitControllersRef = useRef<Map<string, AbortController>>(new Map())
  const streamControllersRef = useRef<Map<string, AbortController>>(new Map())
  const reportsRef = useRef<ReportItem[]>(reports)
  const loadGenerationRef = useRef(0)
  const autoOpenedReportIdsRef = useRef<Set<string>>(new Set())
  const historyRefreshTaskIdsRef = useRef<Set<string>>(new Set())
  const recoveryConversationIdRef = useRef('')
  const refreshHistoryRef = useRef(onRefreshHistory)
  refreshHistoryRef.current = onRefreshHistory
  const reportCompletedRef = useRef(onReportCompleted)
  reportCompletedRef.current = onReportCompleted

  const conversationId = String(conv?.conv_uid || conv?.convUid || '').trim()
  const sessionId = String(conv?.chat_id || conv?.sessionId || '').trim()

  const commitReports = useCallback((updater: (reports: ReportItem[]) => ReportItem[]) => {
    const nextReports = updater(reportsRef.current)
    reportsRef.current = nextReports
    setReports(nextReports)
  }, [])

  const updateReport = useCallback(
    (reportId: string, updater: (report: ReportItem) => ReportItem) => {
      commitReports((currentReports) => currentReports.map((report) => (report.id === reportId ? updater(report) : report)))
    },
    [commitReports],
  )

  /** 删除完成任务的定位缓存；清理失败不改变真实报告状态，只追加可诊断警告。 */
  const deleteStoredTask = useCallback(
    async (reportId: string, storedConversationId: string, taskId: string) => {
      try {
        await reportTaskStorage.delete(storedConversationId, taskId)
      } catch {
        updateReport(reportId, (report) => ({
          ...report,
          warnings: [...report.warnings, '报告已生成，但恢复记录暂时未能自动清理。'],
        }))
      }
    },
    [updateReport],
  )

  const abortAllConnections = useCallback(() => {
    submitControllersRef.current.forEach((controller) => controller.abort())
    streamControllersRef.current.forEach((controller) => controller.abort())
    submitControllersRef.current.clear()
    streamControllersRef.current.clear()
  }, [])

  const applyRawEntry = useCallback(
    (reportId: string, entry: RawReportStreamEntry) => {
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
          warnings: [...nextRuntime.warnings, '生成任务中的问题与当前问题不一致，页面将继续显示当前问题。'],
        }
      }

      const nextReport: ReportItem = {
        ...current,
        ...nextRuntime,
        // 本地提交问题是 UI 主记录，Redis question 只保存在 streamQuestion 中用于诊断。
        question: current.question,
      }

      commitReports((currentReports) => currentReports.map((report) => (report.id === reportId ? nextReport : report)))

      // 候选正文可以提前到达，但必须等整体完成且所有任务结束后才首次自动开栏。
      if (nextReport.reportCandidate && canRevealReport(nextReport) && !autoOpenedReportIdsRef.current.has(reportId)) {
        autoOpenedReportIdsRef.current.add(reportId)
        setAnimateReportPreview(shouldAnimateReportPreview(nextReport, 'auto'))
        setActiveReportId(reportId)
        setMobileView('report')
      }

      if (nextReport.doneEntryId && nextReport.doneEntryId !== current.doneEntryId) {
        if (shouldNotifyReportCompleted(current.doneEntryId, nextReport)) {
          reportCompletedRef.current?.(nextReport)
        }

        streamControllersRef.current.get(reportId)?.abort()
        streamControllersRef.current.delete(reportId)

        const completedTaskKey = getNewlyCompletedReportTaskKey(current.doneEntryId, nextReport)
        if (completedTaskKey) {
          void deleteStoredTask(reportId, completedTaskKey.conversationId, completedTaskKey.taskId)
        }
      }
    },
    [commitReports, deleteStoredTask],
  )

  const connectStream = useCallback(
    async (reportId: string, streamKey: string) => {
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
            onError() {
              updateReport(reportId, (report) => ({
                ...report,
                warnings: [...report.warnings, '生成进度暂时中断，正在自动恢复。'],
              }))
            },
          })

          const latest = reportsRef.current.find((report) => report.id === reportId)
          if (!latest || latest.doneEntryId || latest.status === 'completed' || controller.signal.aborted) return

          throw new Error('报告生成进度连接意外结束')
        } catch (error) {
          if (controller.signal.aborted || (error as Error)?.name === 'AbortError') return

          retryCount += 1
          if (retryCount > MAX_STREAM_RETRY_COUNT) {
            updateReport(reportId, (report) => ({
              ...report,
              status: 'failed',
              error: {
                code: 'report_stream_failed',
                message: '暂时无法继续获取报告生成进度，请稍后重试。',
              },
            }))
            return
          }

          updateReport(reportId, (report) => ({
            ...report,
            warnings: [...report.warnings, `连接短暂中断，正在自动恢复（${retryCount}/${MAX_STREAM_RETRY_COUNT}）`],
          }))
          await wait(STREAM_RETRY_DELAY_MS[retryCount - 1] || STREAM_RETRY_DELAY_MS[STREAM_RETRY_DELAY_MS.length - 1])
        } finally {
          if (streamControllersRef.current.get(reportId) === controller) {
            streamControllersRef.current.delete(reportId)
          }
        }
      }
    },
    [applyRawEntry, updateReport],
  )

  const handleSend = useCallback(
    (rawQuestion: string) => {
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
            message: '当前会话信息不完整，暂时无法生成报告。',
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
        // ChatInput 只允许选中数据语义叶子节点，这里直接透传该节点的 schemaId。
        schema_id: schemaId ?? '',
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
              message: '报告任务提交失败，请稍后重试。',
            },
          }))
        })
        .finally(() => {
          submitControllersRef.current.delete(pendingReport.id)
        })
    },
    [commitReports, conv, conversationId, currentModelId, embedModelId, schemaId, sessionId, spaceId, updateReport, connectStream],
  )

  const stopReport = useCallback(
    (reportId: string) => {
      submitControllersRef.current.get(reportId)?.abort()
      streamControllersRef.current.get(reportId)?.abort()
      submitControllersRef.current.delete(reportId)
      streamControllersRef.current.delete(reportId)

      updateReport(reportId, (report) => ({
        ...report,
        status: 'failed',
        error: {
          code: 'user_aborted',
          message: '已停止当前页面的生成进度更新；重新进入会话后可继续查看。',
        },
      }))
    },
    [updateReport],
  )

  const stopGenerating = useCallback(() => {
    const active = [...reportsRef.current].reverse().find((report) => ['submitting', 'waiting_stream', 'thinking', 'running'].includes(report.status))
    if (active) stopReport(active.id)
  }, [stopReport])

  const toggleThinking = useCallback(
    (reportId: string) => {
      updateReport(reportId, (report) => ({
        ...report,
        thinkingOpen: !report.thinkingOpen,
      }))
    },
    [updateReport],
  )

  const toggleTodo = useCallback(
    (reportId: string) => {
      updateReport(reportId, (report) => ({
        ...report,
        todoOpen: !report.todoOpen,
      }))
    },
    [updateReport],
  )

  const toggleTaskExecution = useCallback(
    (reportId: string, taskKey: string) => {
      updateReport(reportId, (report) => ({
        ...report,
        expandedTaskKeys: toggleReportTaskKey(report.expandedTaskKeys, taskKey),
      }))
    },
    [updateReport],
  )

  const openReport = useCallback((reportId: string) => {
    const report = reportsRef.current.find((item) => item.id === reportId)
    if (!report?.reportCandidate || !canRevealReport(report)) return

    // 文件卡属于用户主动查看：关闭后重开直接呈现完整正文，不重复播放生成动画。
    setAnimateReportPreview(false)
    setActiveReportId(reportId)
    setMobileView('report')
  }, [])

  const closeReport = useCallback(() => {
    setAnimateReportPreview(false)
    setActiveReportId(undefined)
    setMobileView('conversation')
  }, [])

  // query 与 IndexedDB 并行启动：缓存问题可以先占位；task 状态判断仍等 query 完成，避免与权威历史竞态。
  useEffect(() => {
    const generation = loadGenerationRef.current + 1
    loadGenerationRef.current = generation
    abortAllConnections()
    reportsRef.current = []
    autoOpenedReportIdsRef.current.clear()
    setReports([])
    setAnimateReportPreview(false)
    setActiveReportId(undefined)
    setMobileView('conversation')
    setLoadError(undefined)

    if (!conversationId) return undefined

    if (recoveryConversationIdRef.current !== conversationId) {
      recoveryConversationIdRef.current = conversationId
      historyRefreshTaskIdsRef.current.clear()
    }

    const historyItems = historyLoaded ? historyRounds.map((round) => createReportItemFromHistory(round, conversationId, sessionId)) : []
    const historyOrders = new Set(historyItems.map((item) => item.sortOrder))
    reportsRef.current = historyItems
    setReports(historyItems)
    const recoveryController = new AbortController()
    let historyRefreshRequested = false

    void reportTaskStorage
      .list(conversationId)
      .then((records) => {
        if (loadGenerationRef.current !== generation) return

        const restoredReports = mergeReportTimelineItems(
          historyItems,
          records.map((record) => createReportItem(record)),
        )
        reportsRef.current = restoredReports
        setReports(restoredReports)

        const { completedRecords, unresolvedRecords } = splitReportTaskRecordsByHistory(records, historyOrders)
        // query 已经提供完整报告时直接清理旧 task 缓存，绝不再请求这些已完成 taskId。
        completedRecords.forEach((record) => {
          void deleteStoredTask(record.taskId, record.conversationId, record.taskId)
        })

        // 首次 query 尚在请求时只展示缓存占位；query 完成后本 effect 会重新合并并进入状态恢复。
        if (!historyLoaded) return

        unresolvedRecords.forEach((record) => {
          void fetchReportTaskStatus(record.taskId, recoveryController.signal)
            .then((taskStatus) => {
              if (loadGenerationRef.current !== generation || recoveryController.signal.aborted) return

              // query 的完成历史是展示权威来源；即使 task 状态短暂不一致也不重复建立连接。
              if (historyOrders.has(record.sortOrder)) return

              const recoveryAction = getReportRecoveryAction(taskStatus)

              if (recoveryAction === 'use_history') {
                updateReport(record.taskId, (report) => ({
                  ...report,
                  status: 'syncing_history',
                  warnings: [...report.warnings, '报告任务已完成，正在同步会话历史。'],
                }))
                // task 已确认成功，定位缓存不再承担断线恢复职责；当前占位继续保留在内存等待 query。
                void deleteStoredTask(record.taskId, record.conversationId, record.taskId)
                if (!historyRefreshRequested && !historyRefreshTaskIdsRef.current.has(record.taskId)) {
                  historyRefreshRequested = true
                  historyRefreshTaskIdsRef.current.add(record.taskId)
                  void refreshHistoryRef.current?.()
                }
                return
              }

              if (recoveryAction === 'show_failure') {
                updateReport(record.taskId, (report) => ({
                  ...report,
                  status: 'failed',
                  error: {
                    code: taskStatus.status || 'report_task_failed',
                    message: '报告生成失败，请稍后重试。',
                  },
                }))
                return
              }

              void connectStream(record.taskId, record.streamKey)
            })
            .catch(() => {
              if (recoveryController.signal.aborted || loadGenerationRef.current !== generation) return

              // 状态接口不可用时仍允许 Redis 原始事件恢复，避免单个辅助接口阻断报告。
              updateReport(record.taskId, (report) => ({
                ...report,
                warnings: [...report.warnings, '暂时无法确认任务状态，正在尝试恢复生成进度。'],
              }))
              void connectStream(record.taskId, record.streamKey)
            })
        })
      })
      .catch(() => {
        if (loadGenerationRef.current === generation) {
          setLoadError('暂时无法恢复未完成的报告，请稍后重新进入当前会话。')
        }
      })

    return () => {
      loadGenerationRef.current += 1
      recoveryController.abort()
      abortAllConnections()
    }
  }, [abortAllConnections, connectStream, conversationId, deleteStoredTask, historyLoaded, historyRounds, sessionId, updateReport])

  useEffect(() => () => reportTaskStorage.close(), [])

  const activeReport = useMemo(() => reports.find((report) => report.id === activeReportId), [activeReportId, reports])
  const loading = useMemo(() => reports.some((report) => ['submitting', 'waiting_stream', 'thinking', 'running'].includes(report.status)), [reports])

  return {
    reports,
    activeReport,
    activeReportId,
    animateReportPreview,
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

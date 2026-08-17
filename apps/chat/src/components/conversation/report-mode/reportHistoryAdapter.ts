import { createInitialReportStreamState } from './reportStreamReducer'
import type {
  ReportAttachment,
  ReportCandidate,
  ReportHistoryMessage,
  ReportHistoryPayload,
  ReportHistoryRoundGroup,
  ReportItem,
  ReportPlanTask,
  ReportPublicChunk,
  ReportPublicStep,
  ReportStepStatus,
  ReportTaskExecutionGroup,
} from './types'

const REPORT_CHAT_MODE = 'chat_report'
const TODO_MARKER_TITLE = /^TODO::/i

function getMessageChatMode(message: ReportHistoryMessage): string {
  return String(message.chatMode ?? message.messageDetail?.chat_mode ?? '').trim()
}

export function isReportHistoryRound(round: ReportHistoryRoundGroup): boolean {
  return Array.isArray(round.messages) && round.messages.some((message) => getMessageChatMode(message) === REPORT_CHAT_MODE)
}

/** query 仍只请求一次；普通和报告 round 在进入各自 mapper 前完成分流。 */
export function splitConversationHistoryRounds(rounds: ReportHistoryRoundGroup[]) {
  const interactionRounds: ReportHistoryRoundGroup[] = []
  const reportRounds: ReportHistoryRoundGroup[] = []

  rounds.forEach((round) => {
    if (isReportHistoryRound(round)) reportRounds.push(round)
    else interactionRounds.push(round)
  })

  return { interactionRounds, reportRounds }
}

function getRoundIndex(round: ReportHistoryRoundGroup): number {
  const candidate = round.roundIndex ?? round.messages?.find((message) => Number.isFinite(message.roundIndex))?.roundIndex ?? 0
  return Number.isSafeInteger(candidate) && Number(candidate) >= 0 ? Number(candidate) : 0
}

/** 相同 query 结果保持 state 引用稳定，避免报告恢复 effect 重查全部 task。 */
export function areReportHistoryRoundsEqual(left: ReportHistoryRoundGroup[], right: ReportHistoryRoundGroup[]) {
  if (left === right) return true
  if (left.length !== right.length) return false

  return left.every((leftRound, roundIndex) => {
    const rightRound = right[roundIndex]
    if (!rightRound || getRoundIndex(leftRound) !== getRoundIndex(rightRound)) return false

    const leftMessages = leftRound.messages || []
    const rightMessages = rightRound.messages || []
    if (leftMessages.length !== rightMessages.length) return false

    return leftMessages.every((leftMessage, messageIndex) => {
      const rightMessage = rightMessages[messageIndex]
      return Boolean(rightMessage)
        && leftMessage.messageId === rightMessage.messageId
        && leftMessage.index === rightMessage.index
        && leftMessage.roleType === rightMessage.roleType
        && getMessageChatMode(leftMessage) === getMessageChatMode(rightMessage)
        && leftMessage.messageDetail?.type === rightMessage.messageDetail?.type
        && leftMessage.messageDetail?.data?.content === rightMessage.messageDetail?.data?.content
    })
  })
}

function getMessageRole(message: ReportHistoryMessage): string {
  return String(message.roleType ?? message.messageDetail?.type ?? '').trim()
}

function getMessageContent(message: ReportHistoryMessage): string {
  const content = message.messageDetail?.data?.content
  return typeof content === 'string' ? content : ''
}

function getCreatedAt(round: ReportHistoryRoundGroup, fallback: number): number {
  for (const message of round.messages || []) {
    const parsedDate = message.createTime ? Date.parse(message.createTime) : Number.NaN
    if (Number.isFinite(parsedDate)) return parsedDate

    const messageId = Number(message.messageId)
    if (Number.isFinite(messageId) && messageId >= 0) return messageId
  }

  return fallback
}

function parseHistoryPayload(round: ReportHistoryRoundGroup): ReportHistoryPayload | undefined {
  const viewMessage = round.messages?.find((message) => getMessageRole(message) === 'view')
  const content = viewMessage ? getMessageContent(viewMessage) : ''
  if (!content) return undefined

  try {
    const payload = JSON.parse(content) as ReportHistoryPayload
    return payload && typeof payload === 'object' && payload.type === 'react-agent' ? payload : undefined
  } catch {
    return undefined
  }
}

function normalizeTaskStatus(status: unknown): ReportPlanTask['status'] {
  switch (status) {
    case 'in_progress':
    case 'completed':
    case 'cancelled':
      return status
    default:
      return 'pending'
  }
}

function normalizeTasks(tasks: ReportHistoryPayload['task_plan']): ReportPlanTask[] {
  if (!Array.isArray(tasks)) return []

  return tasks
    .filter((task) => task && typeof task.content === 'string' && task.content.trim())
    .map((task) => ({
      content: task.content,
      status: normalizeTaskStatus(task.status),
      priority: task.priority,
    }))
}

function normalizeStepStatus(status: unknown): ReportStepStatus {
  switch (status) {
    case 'failed':
    case 'skipped':
    case 'cancelled':
      return status
    case 'done':
      return 'done'
    default:
      return 'in_progress'
  }
}

function isTodoMarker(step: NonNullable<ReportHistoryPayload['steps']>[number]): boolean {
  return Boolean(step.todo_meta || step.action === 'todowrite' || (step.title && TODO_MARKER_TITLE.test(step.title)))
}

function toPublicChunks(outputs: NonNullable<ReportHistoryPayload['steps']>[number]['outputs'], stepKey: string): ReportPublicChunk[] {
  if (!Array.isArray(outputs)) return []

  return outputs.flatMap((output, index) => {
    if (typeof output?.content !== 'string' || !output.content.trim()) return []

    return [{
      entryId: `${stepKey}:output:${index}`,
      outputType: output.output_type || 'text',
      content: output.content,
    }]
  })
}

function getLastCandidate(stepId: string, chunks: ReportPublicChunk[], current?: ReportCandidate): ReportCandidate | undefined {
  return chunks.reduce<ReportCandidate | undefined>((candidate, chunk) => {
    const format = String(chunk.outputType).toLowerCase()
    if (format !== 'html' && format !== 'markdown') return candidate

    return {
      entryId: chunk.entryId,
      stepId,
      format,
      content: chunk.content,
    }
  }, current)
}

function getHistoryAttachments(stepId: string, chunks: ReportPublicChunk[]): ReportAttachment[] {
  return chunks.flatMap((chunk) => {
    const format = String(chunk.outputType).toLowerCase()
    const url = chunk.content.trim()
    if ((format !== 'pdf' && format !== 'word') || !url) return []

    return [{ entryId: chunk.entryId, stepId, format, url }]
  })
}

/**
 * 将完成报告的 react-agent 摘要转换为报告视图模型。
 * thought/action_input/final_content 不会复制到公开模型；action_reason 作为公开执行说明保留。
 */
export function createReportItemFromHistory(round: ReportHistoryRoundGroup, conversationId: string, sessionId: string): ReportItem {
  const sortOrder = getRoundIndex(round)
  const messages = round.messages || []
  const question = getMessageContent(messages.find((message) => getMessageRole(message) === 'human') || {}) || '历史报告问题'
  const createdAt = getCreatedAt(round, sortOrder)
  const payload = parseHistoryPayload(round)
  const baseState = createInitialReportStreamState()

  if (!payload) {
    return {
      ...baseState,
      id: `history-report-${conversationId}-${sortOrder}`,
      conversationId,
      sessionId,
      question,
      sortOrder,
      createdAt,
      source: 'history',
      status: 'failed',
      thinkingOpen: false,
      error: {
        code: 'report_history_parse_failed',
        message: '报告历史解析失败',
      },
    }
  }

  const tasks = normalizeTasks(payload.task_plan)
  const planEntryId = `history:${sortOrder}:plan`
  const stepsById: Record<string, ReportPublicStep> = {}
  const stepOrder: string[] = []
  const thinkingStepIds: string[] = []
  const executionGroups: ReportTaskExecutionGroup[] = []
  const unassignedStepIds: string[] = []
  let planStarted = false
  let currentTaskIndex = 0
  let reportCandidate: ReportCandidate | undefined
  const reportAttachments: ReportAttachment[] = []

  ;(payload.steps || []).forEach((step, index) => {
    const marker = isTodoMarker(step)
    if (marker) {
      planStarted = true
      if (Number.isSafeInteger(step.todo_meta?.done) && Number(step.todo_meta?.done) >= 0) {
        currentTaskIndex = Number(step.todo_meta?.done)
      }
      // todowrite 只负责恢复阶段边界，不作为可公开工具步骤重复展示。
      return
    }

    const stepId = String(step.id || `history-step-${sortOrder}-${index}`)
    const stepKey = `history:${sortOrder}:step:${index}`
    const chunks = toPublicChunks(step.outputs, stepKey)
    const hasTask = planStarted && currentTaskIndex >= 0 && currentTaskIndex < tasks.length
    const scope: ReportPublicStep['scope'] = !planStarted ? 'thinking' : hasTask ? 'todo' : 'unassigned'
    const groupKey = hasTask ? `${planEntryId}:${currentTaskIndex}` : undefined

    stepsById[stepId] = {
      id: stepId,
      ordinal: typeof step.step === 'number' && step.step > 0 ? step.step : undefined,
      title: step.title,
      detail: step.detail,
      action: step.action || undefined,
      actionIntention: step.action_intention || undefined,
      actionReason: typeof step.action_reason === 'string' ? step.action_reason : undefined,
      todoMeta: step.todo_meta || undefined,
      status: normalizeStepStatus(step.status),
      chunks,
      firstEntryId: stepKey,
      lastEntryId: chunks[chunks.length - 1]?.entryId || stepKey,
      entryIds: [stepKey, ...chunks.map((chunk) => chunk.entryId)],
      scope,
      executionGroupKey: groupKey,
    }
    stepOrder.push(stepId)

    if (scope === 'thinking') {
      thinkingStepIds.push(stepId)
    } else if (scope === 'unassigned') {
      unassignedStepIds.push(stepId)
    } else if (groupKey) {
      const existing = executionGroups.find((group) => group.key === groupKey)
      if (existing) existing.stepIds.push(stepId)
      else {
        executionGroups.push({
          key: groupKey,
          planEntryId,
          taskIndex: currentTaskIndex,
          taskContent: tasks[currentTaskIndex].content,
          stepIds: [stepId],
        })
      }
    }

    reportCandidate = getLastCandidate(stepId, chunks, reportCandidate)
    reportAttachments.push(...getHistoryAttachments(stepId, chunks))
  })

  const completed = Boolean(reportCandidate || reportAttachments.length > 0)
  return {
    ...baseState,
    id: `history-report-${conversationId}-${sortOrder}`,
    conversationId,
    sessionId,
    question,
    sortOrder,
    createdAt,
    source: 'history',
    generatedImages: Array.isArray(payload.generated_images) ? [...payload.generated_images] : [],
    status: completed ? 'completed' : 'failed',
    thinkingOpen: false,
    // 历史报告恢复时与实时报告保持一致，待办事项默认收起。
    todoOpen: false,
    tasks,
    currentPlan: {
      entryId: planEntryId,
      tasks,
      source: 'history',
      version: payload.version,
    },
    stepsById,
    stepOrder,
    thinkingStepIds,
    executionGroups,
    unassignedStepIds,
    reportCandidate,
    reportAttachments,
    durationSeconds: typeof payload.time === 'number' && Number.isFinite(payload.time) && payload.time >= 0 ? payload.time : undefined,
    doneEntryId: `history:${sortOrder}:done`,
    error: completed
      ? undefined
      : {
          code: 'report_content_missing',
          message: '未收到报告文件',
        },
  }
}

/** query 完成历史覆盖同序号缓存任务，同时保留 taskId 作为稳定 UI key。 */
export function mergeReportTimelineItems(historyItems: ReportItem[], taskItems: ReportItem[]): ReportItem[] {
  const historyOrders = new Set(historyItems.map((item) => item.sortOrder))
  const mergedHistory = historyItems.map((history) => {
    const task = taskItems.find((item) => item.sortOrder === history.sortOrder)
    if (!task) return history

    return {
      ...history,
      id: task.id,
      taskId: task.taskId,
      streamKey: task.streamKey,
      storageWarning: task.storageWarning,
    }
  })
  const pendingTasks = taskItems.filter((item) => !historyOrders.has(item.sortOrder))

  return [...mergedHistory, ...pendingTasks].sort((left, right) => (
    left.sortOrder - right.sortOrder
    || left.createdAt - right.createdAt
    || left.id.localeCompare(right.id)
  ))
}

import { compareRedisEntryIds, parseRedisEntryId, sortAndDedupeRedisEntries } from './redisEntryId'
import { getEmbeddedPayloadChunks, getStoredChunkOutputType } from './embeddedChunkPayload'
import { getTaskKey, isReportGenerationTask } from './helpers'
import type {
  RawReportStreamEntry,
  ReportAttachment,
  ReportCandidate,
  ReportPlanTask,
  ReportPublicChunk,
  ReportPublicStep,
  ReportStepDoneEvent,
  ReportStepMetaEvent,
  ReportStepStartEvent,
  ReportStreamEvent,
  ReportStreamRuntimeState,
  ReportTaskExecutionGroup,
  ReportTodoSummary,
  ReportTodoMeta,
} from './types'

const REPORT_EVENT_TYPES = new Set<ReportStreamEvent['type']>(['question', 'step.plan', 'step.start', 'step.meta', 'step.chunk', 'step.done', 'plan.update', 'final', 'done'])

const PLACEHOLDER_STEP_TITLES = new Set(['思考中', 'thinking'])
const REPORT_GENERATION_FAILED_CODE = 'report_generation_failed'
const REPORT_FINAL_ERROR_PATTERN = /^大模型对话生成错误(?:[!！]|$)/i

export function createInitialReportStreamState(): ReportStreamRuntimeState {
  return {
    status: 'thinking',
    thinkingOpen: true,
    thinkingCompleted: false,
    todoOpen: false,
    expandedTaskKeys: [],
    warnings: [],
    tasks: [],
    stepsById: {},
    stepOrder: [],
    thinkingStepIds: [],
    todoSummaries: [],
    executionGroups: [],
    unassignedStepIds: [],
    reportAttachments: [],
    processedEntryIds: {},
  }
}

export function parseReportStreamEvent(data: string): ReportStreamEvent | undefined {
  try {
    const parsed: unknown = JSON.parse(data)

    if (!parsed || typeof parsed !== 'object') return undefined

    // Java 接口通常直接透传事件；同时兼容调试接口返回的 { data: event } 包裹格式。
    const wrappedData = (parsed as { data?: unknown }).data
    const payload = typeof (parsed as { type?: unknown }).type === 'string'
      ? parsed
      : wrappedData && typeof wrappedData === 'object'
        ? wrappedData
        : parsed
    const type = (payload as { type?: unknown }).type
    if (typeof type !== 'string' || !REPORT_EVENT_TYPES.has(type as ReportStreamEvent['type'])) return undefined

    return payload as ReportStreamEvent
  } catch {
    return undefined
  }
}

function appendUnique(values: string[], value: string): string[] {
  return values.includes(value) ? values : [...values, value]
}

function appendWarning(state: ReportStreamRuntimeState, message: string): ReportStreamRuntimeState {
  return {
    ...state,
    warnings: [...state.warnings, message],
  }
}

function isPlaceholderTitle(title?: string): boolean {
  return Boolean(title && PLACEHOLDER_STEP_TITLES.has(title.trim().toLowerCase()))
}

function selectStepTitle(previousTitle?: string, nextTitle?: string): string | undefined {
  if (!nextTitle) return previousTitle
  if (!previousTitle || isPlaceholderTitle(previousTitle) || !isPlaceholderTitle(nextTitle)) return nextTitle
  return previousTitle
}

function normalizeTodoMeta(todoMeta?: ReportTodoMeta | null): ReportTodoMeta | undefined {
  if (!todoMeta) return undefined

  return {
    state: todoMeta.state,
    done: todoMeta.done,
    started: todoMeta.started,
    total: todoMeta.total,
  }
}

function normalizeStepDoneStatus(status?: string): ReportPublicStep['status'] {
  switch (status) {
    case 'failed':
    case 'skipped':
    case 'cancelled':
      return status
    default:
      return 'done'
  }
}

function getUniqueRunningTask(tasks: ReportPlanTask[]): { index: number; task: ReportPlanTask } | undefined {
  const running = tasks.map((task, index) => ({ task, index })).filter(({ task }) => task.status === 'in_progress')
  return running.length === 1 ? running[0] : undefined
}

/**
 * plan.update 已经把下一个 Todo 标为执行中，因此后续 step.plan 只能总结前一个已完成项。
 * done 使用完成数量，转换为 0-based 下标后是 done - 1；done=0 没有前置任务，不能归到当前项。
 */
function createTodoSummary(state: ReportStreamRuntimeState, eventId: string | undefined, content: string, entryId: string): ReportTodoSummary | undefined {
  const stepId = eventId?.trim()
  const todoMeta = stepId ? state.stepsById[stepId]?.todoMeta : undefined
  const done = todoMeta?.done
  if (!stepId || !Number.isSafeInteger(done) || Number(done) <= 0) return undefined

  const taskIndex = Number(done) - 1
  const task = state.tasks[taskIndex]
  if (!task || (task.status !== 'completed' && task.status !== 'cancelled')) return undefined

  return {
    entryId,
    stepId,
    taskIndex,
    taskContent: task.content,
    content,
  }
}

/** 同一 Todo 重复返回总结时保留 Redis 顺序中最后一条，不影响其他任务。 */
function upsertTodoSummary(summaries: ReportTodoSummary[], incoming: ReportTodoSummary): ReportTodoSummary[] {
  const existingIndex = summaries.findIndex((summary) => summary.taskIndex === incoming.taskIndex && summary.taskContent === incoming.taskContent)
  if (existingIndex < 0) return [...summaries, incoming]

  const next = [...summaries]
  next[existingIndex] = incoming
  return next
}

function createExecutionGroupKey(planEntryId: string, taskIndex: number): string {
  return `${planEntryId}:${taskIndex}`
}

interface ReconciledStepAssignment {
  stepsById: ReportStreamRuntimeState['stepsById']
  executionGroups: ReportTaskExecutionGroup[]
  unassignedStepIds: string[]
}

/**
 * 某些真实任务先执行工具，随后才由 framework 计划把对应任务标记为 in_progress。
 * 这里只回填“上一计划无执行中任务、同位置同标题从 pending 变为唯一 in_progress”的时间片，
 * 其余情况继续保留未归属，避免用标题相似度或步骤序号进行猜测。
 */
function reconcileUnassignedStepsForNextPlan(state: ReportStreamRuntimeState, nextPlanEntryId: string, nextTasks: ReportPlanTask[]): ReconciledStepAssignment {
  const previousPlan = state.currentPlan
  const nextRunningTask = getUniqueRunningTask(nextTasks)
  if (!previousPlan || !nextRunningTask || state.unassignedStepIds.length === 0) {
    return {
      stepsById: state.stepsById,
      executionGroups: state.executionGroups,
      unassignedStepIds: state.unassignedStepIds,
    }
  }

  const previousRunningTaskCount = previousPlan.tasks.filter((task) => task.status === 'in_progress').length
  const previousTargetTask = previousPlan.tasks[nextRunningTask.index]
  if (previousRunningTaskCount !== 0 || previousTargetTask?.status !== 'pending' || previousTargetTask.content !== nextRunningTask.task.content) {
    return {
      stepsById: state.stepsById,
      executionGroups: state.executionGroups,
      unassignedStepIds: state.unassignedStepIds,
    }
  }

  const reassignedStepIds = state.unassignedStepIds.filter((stepId) => {
    const step = state.stepsById[stepId]
    return Boolean(
      step
      && compareRedisEntryIds(step.firstEntryId, previousPlan.entryId) > 0
      && compareRedisEntryIds(step.firstEntryId, nextPlanEntryId) < 0,
    )
  })
  if (reassignedStepIds.length === 0) {
    return {
      stepsById: state.stepsById,
      executionGroups: state.executionGroups,
      unassignedStepIds: state.unassignedStepIds,
    }
  }

  const groupKey = createExecutionGroupKey(nextPlanEntryId, nextRunningTask.index)
  const stepsById = { ...state.stepsById }
  reassignedStepIds.forEach((stepId) => {
    stepsById[stepId] = {
      ...stepsById[stepId],
      scope: 'todo',
      executionGroupKey: groupKey,
    }
  })

  return {
    stepsById,
    executionGroups: [
      ...state.executionGroups,
      {
        key: groupKey,
        planEntryId: nextPlanEntryId,
        taskIndex: nextRunningTask.index,
        taskContent: nextRunningTask.task.content,
        stepIds: reassignedStepIds,
      },
    ],
    unassignedStepIds: state.unassignedStepIds.filter((stepId) => !reassignedStepIds.includes(stepId)),
  }
}

interface StepAssignment {
  scope: ReportPublicStep['scope']
  executionGroupKey?: string
  thinkingStepIds: string[]
  executionGroups: ReportTaskExecutionGroup[]
  unassignedStepIds: string[]
}

/** 步骤第一次出现时锁定归属；后续同 id 事件只合并内容，不因新 plan 倒序重分配。 */
function assignNewStep(state: ReportStreamRuntimeState, stepId: string): StepAssignment {
  if (!state.currentPlan) {
    return {
      scope: 'thinking',
      thinkingStepIds: appendUnique(state.thinkingStepIds, stepId),
      executionGroups: state.executionGroups,
      unassignedStepIds: state.unassignedStepIds,
    }
  }

  const runningTask = getUniqueRunningTask(state.currentPlan.tasks)
  if (!runningTask) {
    return {
      scope: 'unassigned',
      thinkingStepIds: state.thinkingStepIds,
      executionGroups: state.executionGroups,
      unassignedStepIds: appendUnique(state.unassignedStepIds, stepId),
    }
  }

  const groupKey = createExecutionGroupKey(state.currentPlan.entryId, runningTask.index)
  const existingGroupIndex = state.executionGroups.findIndex((group) => group.key === groupKey)
  const executionGroups = [...state.executionGroups]

  if (existingGroupIndex >= 0) {
    const existingGroup = executionGroups[existingGroupIndex]
    executionGroups[existingGroupIndex] = {
      ...existingGroup,
      stepIds: appendUnique(existingGroup.stepIds, stepId),
    }
  } else {
    executionGroups.push({
      key: groupKey,
      planEntryId: state.currentPlan.entryId,
      taskIndex: runningTask.index,
      taskContent: runningTask.task.content,
      stepIds: [stepId],
    })
  }

  return {
    scope: 'todo',
    executionGroupKey: groupKey,
    thinkingStepIds: state.thinkingStepIds,
    executionGroups,
    unassignedStepIds: state.unassignedStepIds,
  }
}

function createPublicStep(state: ReportStreamRuntimeState, stepId: string, entryId: string): { step: ReportPublicStep; assignment: StepAssignment } {
  const assignment = assignNewStep(state, stepId)

  return {
    assignment,
    step: {
      id: stepId,
      status: 'in_progress',
      chunks: [],
      firstEntryId: entryId,
      lastEntryId: entryId,
      entryIds: [entryId],
      scope: assignment.scope,
      executionGroupKey: assignment.executionGroupKey,
    },
  }
}

function upsertPublicStep(state: ReportStreamRuntimeState, stepId: string, entryId: string, update: (step: ReportPublicStep) => ReportPublicStep): ReportStreamRuntimeState {
  const existing = state.stepsById[stepId]
  const created = existing ? undefined : createPublicStep(state, stepId, entryId)
  const baseStep = existing ?? created!.step
  const updatedStep = update({
    ...baseStep,
    lastEntryId: entryId,
    entryIds: appendUnique(baseStep.entryIds, entryId),
  })

  return {
    ...state,
    stepsById: {
      ...state.stepsById,
      [stepId]: updatedStep,
    },
    stepOrder: existing ? state.stepOrder : [...state.stepOrder, stepId],
    thinkingStepIds: created?.assignment.thinkingStepIds ?? state.thinkingStepIds,
    executionGroups: created?.assignment.executionGroups ?? state.executionGroups,
    unassignedStepIds: created?.assignment.unassignedStepIds ?? state.unassignedStepIds,
  }
}

function mergeStepStart(state: ReportStreamRuntimeState, event: ReportStepStartEvent, entryId: string): ReportStreamRuntimeState {
  if (!event.id) return appendWarning(state, `entry ${entryId} 的 step.start 缺少 id，已跳过`)

  return upsertPublicStep(state, event.id, entryId, (step) => ({
    ...step,
    ordinal: typeof event.step === 'number' && event.step > 0 ? event.step : step.ordinal,
    title: selectStepTitle(step.title, event.title),
    detail: event.detail || step.detail,
    todoMeta: normalizeTodoMeta(event.todo_meta) || step.todoMeta,
    status: ['done', 'failed', 'skipped', 'cancelled'].includes(step.status) ? step.status : 'in_progress',
  }))
}

function mergeStepMeta(state: ReportStreamRuntimeState, event: ReportStepMetaEvent, entryId: string): ReportStreamRuntimeState {
  if (!event.id) return appendWarning(state, `entry ${entryId} 的 step.meta 缺少 id，已跳过`)

  return upsertPublicStep(state, event.id, entryId, (step) => ({
    ...step,
    title: selectStepTitle(step.title, event.title),
    detail: event.detail || step.detail,
    action: event.action || step.action,
    actionIntention: event.action_intention || step.actionIntention,
    actionReason: event.action_reason || step.actionReason,
    todoMeta: normalizeTodoMeta(event.todo_meta) || step.todoMeta,
  }))
}

function mergeStepDone(state: ReportStreamRuntimeState, event: ReportStepDoneEvent, entryId: string): ReportStreamRuntimeState {
  if (!event.id) return appendWarning(state, `entry ${entryId} 的 step.done 缺少 id，已跳过`)

  return upsertPublicStep(state, event.id, entryId, (step) => ({
    ...step,
    status: normalizeStepDoneStatus(event.status),
  }))
}

function toReportCandidate(entryId: string, stepId: string, outputType: string | undefined, content: string): ReportCandidate | undefined {
  const format = outputType?.toLowerCase()
  if (format !== 'html' && format !== 'markdown') return undefined

  return {
    entryId,
    stepId,
    format,
    content,
  }
}

/** 报告产物必须属于计划中负责生成报告的 Todo，不能使用技能说明等其他 Markdown 兜底。 */
function isStepAssignedToReportTask(state: ReportStreamRuntimeState, stepId: string): boolean {
  const executionGroupKey = state.stepsById[stepId]?.executionGroupKey
  if (!executionGroupKey) return false

  const executionGroup = state.executionGroups.find((group) => group.key === executionGroupKey)
  return Boolean(executionGroup && isReportGenerationTask({ content: executionGroup.taskContent }))
}

function toReportAttachment(entryId: string, stepId: string, outputType: string | undefined, content: string): ReportAttachment | undefined {
  const format = outputType?.toLowerCase()
  const url = content.trim()
  if ((format !== 'pdf' && format !== 'word') || !url) return undefined

  return {
    entryId,
    stepId,
    format,
    url,
  }
}

/** 同一 Redis entry 只保留一份附件；不同格式或后续 entry 可以并存。 */
export function mergeReportAttachments(current: ReportAttachment[], incoming: ReportAttachment[]): ReportAttachment[] {
  if (incoming.length === 0) return current

  const next = [...current]
  incoming.forEach((attachment) => {
    const existingIndex = next.findIndex((item) => item.entryId === attachment.entryId && item.format === attachment.format)
    if (existingIndex >= 0) next[existingIndex] = attachment
    else next.push(attachment)
  })
  return next
}

interface EmbeddedReportArtifacts {
  candidate?: ReportCandidate
  attachments: ReportAttachment[]
}

/** 识别报告工具 text payload 内嵌的最后一个 HTML/Markdown 预览和所有 PDF/Word 附件。 */
function toEmbeddedReportArtifacts(entryId: string, stepId: string, chunks: ReportPublicChunk[]): EmbeddedReportArtifacts {
  return getEmbeddedPayloadChunks(chunks).reduce<EmbeddedReportArtifacts>((artifacts, chunk) => {
    const candidate = toReportCandidate(entryId, stepId, chunk.outputType, chunk.content)
    const attachment = toReportAttachment(chunk.entryId, stepId, chunk.outputType, chunk.content)

    return {
      candidate: candidate || artifacts.candidate,
      attachments: attachment ? [...artifacts.attachments, attachment] : artifacts.attachments,
    }
  }, { attachments: [] })
}

/** 整体 done 是权威终态；即使最后一个占位 step 没有 step.done，也不能继续显示加载中。 */
function settleInProgressSteps(state: ReportStreamRuntimeState): ReportStreamRuntimeState {
  const entries = Object.entries(state.stepsById)
  if (!entries.some(([, step]) => step.status === 'in_progress')) return state

  return {
    ...state,
    stepsById: Object.fromEntries(entries.map(([stepId, step]) => [stepId, step.status === 'in_progress' ? { ...step, status: 'done' as const } : step])),
  }
}

export function isReportFinalError(content: string): boolean {
  return REPORT_FINAL_ERROR_PATTERN.test(content.trim())
}

/** 错误 final 是失败终态：执行中步骤标记失败，未结束 ToDo 统一收敛为取消。 */
function settleReportFailure(state: ReportStreamRuntimeState): ReportStreamRuntimeState {
  const tasks = state.tasks.map((task) => (task.status === 'completed' || task.status === 'cancelled' ? task : { ...task, status: 'cancelled' as const }))
  const stepsById = Object.fromEntries(
    Object.entries(state.stepsById).map(([stepId, step]) => [stepId, step.status === 'in_progress' ? { ...step, status: 'failed' as const } : step]),
  )

  return {
    ...state,
    tasks,
    stepsById,
    currentPlan: state.currentPlan
      ? {
          ...state.currentPlan,
          tasks,
        }
      : undefined,
  }
}

function markEntryProcessed(state: ReportStreamRuntimeState, entryId: string): ReportStreamRuntimeState {
  return {
    ...state,
    lastEntryId: entryId,
    processedEntryIds: {
      ...state.processedEntryIds,
      [entryId]: true,
    },
  }
}

export function reduceReportStreamEvent(state: ReportStreamRuntimeState, event: ReportStreamEvent, entryId: string): ReportStreamRuntimeState {
  // 错误 final 之后只允许整体 done 补充结束位置/耗时，其他晚到业务事件全部忽略。
  if (state.status === 'failed' && state.error?.code === REPORT_GENERATION_FAILED_CODE && event.type !== 'done') {
    return markEntryProcessed(state, entryId)
  }

  let nextState = state

  switch (event.type) {
    case 'question':
      // Redis question 只用于回放校验；UI 主问题始终来自 IndexedDB ReportTaskRecord.question。
      nextState = typeof event.content === 'string' ? { ...state, streamQuestion: event.content } : appendWarning(state, `entry ${entryId} 的 question 内容无效`)
      break
    case 'step.plan': {
      const content = typeof event.content === 'string' ? event.content.trim() : ''
      if (!content) {
        nextState = appendWarning(state, `entry ${entryId} 的 step.plan.content 无效，已跳过`)
        break
      }

      const eventId = typeof event.id === 'string' && event.id.trim() ? event.id.trim() : undefined
      if (!state.thinkingPlan) {
        // 第一条有效 step.plan 固定为顶部思考总结，后续 Todo 总结不得覆盖它。
        nextState = {
          ...state,
          thinkingPlan: {
            entryId,
            id: eventId,
            content,
          },
        }
        if (!eventId) nextState = appendWarning(nextState, `entry ${entryId} 的首条 step.plan 缺少 id，无法判断思考完成时机`)
        break
      }

      const todoSummary = createTodoSummary(state, eventId, content, entryId)
      nextState = todoSummary
        ? {
            ...state,
            todoSummaries: upsertTodoSummary(state.todoSummaries, todoSummary),
          }
        : appendWarning(state, `entry ${entryId} 的 Todo 阶段总结无法可靠归属，已跳过`)
      break
    }
    case 'step.start':
      nextState = mergeStepStart(state, event, entryId)
      break
    case 'step.meta':
      nextState = mergeStepMeta(state, event, entryId)
      break
    case 'step.chunk': {
      if (!event.id || typeof event.content !== 'string') {
        nextState = appendWarning(state, `entry ${entryId} 的 step.chunk 字段无效，已跳过`)
        break
      }

      nextState = upsertPublicStep(state, event.id, entryId, (step) => {
        const chunks: ReportPublicChunk[] = [
          ...step.chunks,
          {
            entryId,
            outputType: getStoredChunkOutputType(step.chunks, event),
            content: event.content,
          },
        ]

        return {
          ...step,
          chunks,
        }
      })

      // 所有 chunk 都保留在所属公开步骤中；只有报告 Todo 的步骤可以进入最终报告候选/附件集合。
      if (!isStepAssignedToReportTask(nextState, event.id)) break

      const directCandidate = toReportCandidate(entryId, event.id, event.output_type, event.content)
      const directAttachment = toReportAttachment(entryId, event.id, event.output_type, event.content)
      const embeddedArtifacts = toEmbeddedReportArtifacts(entryId, event.id, nextState.stepsById[event.id]?.chunks || [])
      const candidate = directCandidate || embeddedArtifacts.candidate
      const reportAttachments = mergeReportAttachments(nextState.reportAttachments, [
        ...(directAttachment ? [directAttachment] : []),
        ...embeddedArtifacts.attachments,
      ])
      if (candidate || reportAttachments !== nextState.reportAttachments) {
        nextState = {
          ...nextState,
          reportCandidate: candidate || nextState.reportCandidate,
          reportAttachments,
        }
      }
      break
    }
    case 'step.done': {
      const mergedState = mergeStepDone(state, event, entryId)
      const completesThinking = !state.thinkingCompleted && Boolean(state.thinkingPlan?.id) && event.id === state.thinkingPlan?.id
      const waitsForThinkingAnimation = state.thinkingAnimationCompleted === false
      const usesThinkingAnimationGate = state.thinkingAnimationCompleted !== undefined
      nextState = completesThinking
        ? {
            ...mergedState,
            status: mergedState.currentPlan ? 'running' : mergedState.status,
            // 新提交任务必须让首次思考正文播放完，再收起思考并展开 Todo。
            thinkingOpen: waitsForThinkingAnimation,
            thinkingCompleted: true,
            todoOpen: usesThinkingAnimationGate && !waitsForThinkingAnimation ? true : mergedState.todoOpen,
          }
        : mergedState
      break
    }
    case 'plan.update': {
      if (!Array.isArray(event.tasks)) {
        nextState = appendWarning(state, `entry ${entryId} 的 plan.update.tasks 无效，已跳过`)
        break
      }

      // plan.update 是完整快照：只覆盖当前任务，不删除此前时间片已经产生的 executionGroups。
      // ToDo 是否展开是页面 UI 状态，仅在初次创建/恢复时默认为 false；接口更新不得覆盖用户选择。
      const tasks = event.tasks.map((task) => ({ ...task }))
      const reconciledAssignment = reconcileUnassignedStepsForNextPlan(state, entryId, tasks)
      const runningTaskIndex = tasks.findIndex((task) => task.status === 'in_progress')
      nextState = {
        ...state,
        ...reconciledAssignment,
        // 首份计划先用于准备 Todo；只有首条 step.plan 对应的 step.done 才结束思考阶段。
        status: state.thinkingCompleted ? 'running' : state.status,
        currentPlan: {
          entryId,
          tasks,
          source: event.source,
          version: event.version,
        },
        tasks,
        // 当前执行任务首次默认展开；后续 step 事件只继承该数组，用户收起后不会被强制打开。
        expandedTaskKeys: runningTaskIndex >= 0 ? [getTaskKey(entryId, runningTaskIndex)] : [],
      }
      break
    }
    case 'final': {
      if (typeof event.content !== 'string') {
        nextState = appendWarning(state, `entry ${entryId} 的 final 内容无效`)
        break
      }

      const final = { content: event.content, entryId }
      nextState = isReportFinalError(event.content)
        ? {
            ...settleReportFailure(state),
            status: 'failed',
            final,
            error: {
              code: REPORT_GENERATION_FAILED_CODE,
              message: '报告生成失败，请稍后重试。',
            },
          }
        : {
            ...state,
            final,
          }
      break
    }
    case 'done':
      {
        if (state.status === 'failed' && state.error?.code === REPORT_GENERATION_FAILED_CODE) {
          nextState = {
            ...state,
            doneEntryId: entryId,
            durationSeconds: typeof event.time === 'number' && Number.isFinite(event.time) && event.time >= 0 ? event.time : state.durationSeconds,
          }
          break
        }

        const settledState = settleInProgressSteps(state)
        const durationSeconds = typeof event.time === 'number' && Number.isFinite(event.time) && event.time >= 0 ? event.time : settledState.durationSeconds
        const reportTaskCompleted = settledState.tasks.some((task) => task.status === 'completed' && isReportGenerationTask(task))
        const hasReportArtifact = Boolean(settledState.reportCandidate || settledState.reportAttachments.length > 0)
        nextState = reportTaskCompleted && hasReportArtifact
          ? {
              ...settledState,
              status: 'completed',
              doneEntryId: entryId,
              durationSeconds,
              error: undefined,
            }
          : {
              ...settledState,
              status: 'failed',
              doneEntryId: entryId,
              durationSeconds,
              // 过程阶段的 Markdown/HTML 不能在失败终态继续作为报告卡片或预览候选。
              reportCandidate: undefined,
              reportAttachments: [],
              error: {
                code: 'report_content_missing',
                message: '未收到报告文件',
              },
            }
      }
      break
  }

  return markEntryProcessed(nextState, entryId)
}

/**
 * 实时入口：校验 ID、拒绝重复/旧 entry、解析原始 JSON 后再进入业务 reducer。
 * 返回值始终保留成功处理的 entryId，供 Hook 断线后通过 last_id 续读。
 */
export function reduceReportStreamEntry(state: ReportStreamRuntimeState, entry: RawReportStreamEntry): ReportStreamRuntimeState {
  if (!parseRedisEntryId(entry.id)) {
    return appendWarning(state, `收到非法 Redis Stream entry ID：${entry.id}`)
  }

  if (state.processedEntryIds[entry.id]) return state

  if (state.lastEntryId && compareRedisEntryIds(entry.id, state.lastEntryId) <= 0) {
    return state
  }

  const event = parseReportStreamEvent(entry.data)
  if (!event) {
    return markEntryProcessed(appendWarning(state, `entry ${entry.id} 不是可识别的报告事件，已跳过`), entry.id)
  }

  return reduceReportStreamEvent(state, event, entry.id)
}

/** 页面恢复入口：完整历史可以无序传入，核心层会先数值排序并去重。 */
export function reduceReportStreamEntries(entries: RawReportStreamEntry[], initialState: ReportStreamRuntimeState = createInitialReportStreamState()): ReportStreamRuntimeState {
  return sortAndDedupeRedisEntries(entries).reduce(reduceReportStreamEntry, initialState)
}

export function getOrderedReportSteps(state: Pick<ReportStreamRuntimeState, 'stepOrder' | 'stepsById'>): ReportPublicStep[] {
  return state.stepOrder.map((stepId) => state.stepsById[stepId]).filter((step): step is ReportPublicStep => Boolean(step))
}

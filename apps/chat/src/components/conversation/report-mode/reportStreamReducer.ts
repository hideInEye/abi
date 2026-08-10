import { compareRedisEntryIds, parseRedisEntryId, sortAndDedupeRedisEntries } from './redisEntryId'
import { getTaskKey } from './helpers'
import type {
  RawReportStreamEntry,
  ReportCandidate,
  ReportPlanTask,
  ReportPublicChunk,
  ReportPublicStep,
  ReportStepChunkEvent,
  ReportStepDoneEvent,
  ReportStepMetaEvent,
  ReportStepStartEvent,
  ReportStreamEvent,
  ReportStreamRuntimeState,
  ReportTaskExecutionGroup,
  ReportTodoMeta,
} from './types'

const REPORT_EVENT_TYPES = new Set<ReportStreamEvent['type']>(['question', 'step.start', 'step.meta', 'step.chunk', 'step.done', 'plan.update', 'final', 'done'])

const PLACEHOLDER_STEP_TITLES = new Set(['思考中', 'thinking'])
const EMBEDDED_REPORT_PAYLOAD_OUTPUT_TYPE = 'report_payload'

export function createInitialReportStreamState(): ReportStreamRuntimeState {
  return {
    status: 'thinking',
    thinkingOpen: true,
    todoOpen: false,
    expandedTaskKeys: [],
    warnings: [],
    tasks: [],
    stepsById: {},
    stepOrder: [],
    thinkingStepIds: [],
    executionGroups: [],
    unassignedStepIds: [],
    processedEntryIds: {},
  }
}

export function parseReportStreamEvent(data: string): ReportStreamEvent | undefined {
  try {
    const parsed: unknown = JSON.parse(data)

    if (!parsed || typeof parsed !== 'object') return undefined

    const type = (parsed as { type?: unknown }).type
    if (typeof type !== 'string' || !REPORT_EVENT_TYPES.has(type as ReportStreamEvent['type'])) return undefined

    return parsed as ReportStreamEvent
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

function createExecutionGroupKey(planEntryId: string, taskIndex: number): string {
  return `${planEntryId}:${taskIndex}`
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

/**
 * 部分工具会把完整 `{ chunks: [...] }` 结果按字符切成多条 text 事件。
 * 这些片段属于报告传输载荷，不应作为普通文本逐段展示。
 */
function getStoredChunkOutputType(step: ReportPublicStep, event: ReportStepChunkEvent): string {
  const outputType = event.output_type || 'text'
  if (outputType.toLowerCase() !== 'text') return outputType

  const continuesReportPayload = step.chunks.some((chunk) => chunk.outputType === EMBEDDED_REPORT_PAYLOAD_OUTPUT_TYPE)
  const startsReportPayload = /^\s*\{\s*"chunks"\s*:/.test(event.content)
  return continuesReportPayload || startsReportPayload ? EMBEDDED_REPORT_PAYLOAD_OUTPUT_TYPE : outputType
}

/** 从可能带前后说明文字的字符串中提取第一个语法完整的 JSON 对象。 */
function parseFirstJsonObject(source: string): unknown {
  for (let start = source.indexOf('{'); start >= 0; start = source.indexOf('{', start + 1)) {
    let depth = 0
    let inString = false
    let escaped = false

    for (let index = start; index < source.length; index += 1) {
      const character = source[index]

      if (inString) {
        if (escaped) escaped = false
        else if (character === '\\') escaped = true
        else if (character === '"') inString = false
        continue
      }

      if (character === '"') {
        inString = true
        continue
      }

      if (character === '{') depth += 1
      else if (character === '}') depth -= 1

      if (depth !== 0) continue

      try {
        return JSON.parse(source.slice(start, index + 1)) as unknown
      } catch {
        break
      }
    }
  }

  return undefined
}

/** 识别工具 text payload 内嵌的最后一个 HTML/Markdown 产物。 */
function toEmbeddedReportCandidate(entryId: string, stepId: string, chunks: ReportPublicChunk[]): ReportCandidate | undefined {
  const payloadSource = chunks
    .filter((chunk) => chunk.outputType === EMBEDDED_REPORT_PAYLOAD_OUTPUT_TYPE)
    .map((chunk) => chunk.content)
    .join('')
  if (!payloadSource) return undefined

  const parsed = parseFirstJsonObject(payloadSource)
  if (!parsed || typeof parsed !== 'object') return undefined

  const embeddedChunks = (parsed as { chunks?: unknown }).chunks
  if (!Array.isArray(embeddedChunks)) return undefined

  return embeddedChunks.reduce<ReportCandidate | undefined>((candidate, chunk) => {
    if (!chunk || typeof chunk !== 'object') return candidate

    const outputType = (chunk as { output_type?: unknown }).output_type
    const content = (chunk as { content?: unknown }).content
    if (typeof outputType !== 'string' || typeof content !== 'string') return candidate

    return toReportCandidate(entryId, stepId, outputType, content) || candidate
  }, undefined)
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
  let nextState = state

  switch (event.type) {
    case 'question':
      // Redis question 只用于回放校验；UI 主问题始终来自 IndexedDB ReportTaskRecord.question。
      nextState = typeof event.content === 'string' ? { ...state, streamQuestion: event.content } : appendWarning(state, `entry ${entryId} 的 question 内容无效`)
      break
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

      const directCandidate = toReportCandidate(entryId, event.id, event.output_type, event.content)
      let embeddedCandidate: ReportCandidate | undefined
      nextState = upsertPublicStep(state, event.id, entryId, (step) => {
        const chunks: ReportPublicChunk[] = [
          ...step.chunks,
          {
            entryId,
            outputType: getStoredChunkOutputType(step, event),
            content: event.content,
          },
        ]
        embeddedCandidate = toEmbeddedReportCandidate(entryId, event.id, chunks)

        return {
          ...step,
          chunks,
        }
      })

      const candidate = directCandidate || embeddedCandidate
      if (candidate) {
        nextState = {
          ...nextState,
          reportCandidate: candidate,
        }
      }
      break
    }
    case 'step.done':
      nextState = mergeStepDone(state, event, entryId)
      break
    case 'plan.update': {
      if (!Array.isArray(event.tasks)) {
        nextState = appendWarning(state, `entry ${entryId} 的 plan.update.tasks 无效，已跳过`)
        break
      }

      // plan.update 是完整快照：只覆盖当前任务，不删除此前时间片已经产生的 executionGroups。
      const tasks = event.tasks.map((task) => ({ ...task }))
      const runningTaskIndex = tasks.findIndex((task) => task.status === 'in_progress')
      nextState = {
        ...state,
        status: 'running',
        thinkingOpen: false,
        todoOpen: true,
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
    case 'final':
      nextState = typeof event.content === 'string' ? { ...state, final: { content: event.content, entryId } } : appendWarning(state, `entry ${entryId} 的 final 内容无效`)
      break
    case 'done':
      {
        const settledState = settleInProgressSteps(state)
        nextState = settledState.reportCandidate
          ? {
              ...settledState,
              status: 'completed',
              doneEntryId: entryId,
              error: undefined,
            }
          : {
              ...settledState,
              status: 'failed',
              doneEntryId: entryId,
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

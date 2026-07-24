export type ReportConversationStatus = 'idle' | 'submitting' | 'thinking' | 'waiting_stream' | 'running' | 'completed' | 'failed'

export type ReportPlanTaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export type ReportStepStatus = 'in_progress' | 'done' | 'failed' | 'skipped' | 'cancelled'

export type ReportChunkOutputType = 'text' | 'markdown' | 'code' | 'image' | 'html' | string

export interface ReportTaskRecord {
  conversationId: string
  sessionId: string
  taskId: string
  question: string
  streamKey: string
  /**
   * 当前会话内的问题顺序，取自 streamKey 最后一个数字段（例如 report:<conversation-uuid>:2）。
   * 不能只依赖 createdAt，因为并发提交的响应返回顺序可能与用户提问顺序不同。
   */
  sortOrder: number
  createdAt: number
}

export interface ReportTodoMeta {
  state?: string
  done?: number
  total?: number
}

export interface ReportPlanTask {
  content: string
  status: ReportPlanTaskStatus
  priority?: 'high' | 'low' | string
}

export interface ReportQuestionEvent {
  type: 'question'
  content: string
}

export interface ReportStepStartEvent {
  type: 'step.start'
  step?: number
  id: string
  title?: string
  detail?: string
  todo_meta?: ReportTodoMeta | null
}

/**
 * Redis 中的 meta 会带上完整工具输入及模型过程字段。
 * 它们只属于传输层类型，聚合后的公开步骤类型不会保留这些字段。
 */
export interface ReportStepMetaEvent {
  type: 'step.meta'
  id: string
  title?: string
  detail?: string
  thought?: string | null
  action_intention?: string | null
  action_reason?: string | null
  action?: string | null
  action_input?: string | null
  todo_meta?: ReportTodoMeta | null
}

export interface ReportStepChunkEvent {
  type: 'step.chunk'
  id: string
  output_type?: ReportChunkOutputType
  content: string
}

export interface ReportStepDoneEvent {
  type: 'step.done'
  id: string
  status?: string
}

export interface ReportPlanUpdateEvent {
  type: 'plan.update'
  tasks: ReportPlanTask[]
  source?: string
  version?: number
}

export interface ReportFinalEvent {
  type: 'final'
  content: string
}

export interface ReportDoneEvent {
  type: 'done'
}

export type ReportStreamEvent =
  | ReportQuestionEvent
  | ReportStepStartEvent
  | ReportStepMetaEvent
  | ReportStepChunkEvent
  | ReportStepDoneEvent
  | ReportPlanUpdateEvent
  | ReportFinalEvent
  | ReportDoneEvent

/** Node SSE 交给前端的最小原始 entry；data 必须保持 Redis 中的 JSON 字符串。 */
export interface RawReportStreamEntry {
  id: string
  data: string
}

export interface ReportPublicChunk {
  entryId: string
  outputType: ReportChunkOutputType
  content: string
}

/**
 * UI 可公开展示的步骤。
 * 注意：这里刻意没有 thought、action_reason、action_input，避免组件误展示模型内部过程或完整工具参数。
 */
export interface ReportPublicStep {
  id: string
  ordinal?: number
  title?: string
  detail?: string
  action?: string
  actionIntention?: string
  todoMeta?: ReportTodoMeta
  status: ReportStepStatus
  chunks: ReportPublicChunk[]
  firstEntryId: string
  lastEntryId: string
  entryIds: string[]
  scope: 'thinking' | 'todo' | 'unassigned'
  executionGroupKey?: string
}

export interface ReportPlanSnapshot {
  entryId: string
  tasks: ReportPlanTask[]
  source?: string
  version?: number
}

/** 某个 plan 时间片内唯一执行中任务所产生的步骤集合。 */
export interface ReportTaskExecutionGroup {
  key: string
  planEntryId: string
  taskIndex: number
  taskContent: string
  stepIds: string[]
}

export interface ReportCandidate {
  entryId: string
  stepId: string
  format: 'html' | 'markdown'
  content: string
}

export interface ReportRuntimeError {
  code: string
  message: string
}

export interface ReportStreamRuntimeState {
  status: 'submitting' | 'thinking' | 'waiting_stream' | 'running' | 'completed' | 'failed'
  streamQuestion?: string
  thinkingOpen: boolean
  todoOpen: boolean
  expandedTaskKeys: string[]
  storageWarning?: string
  error?: ReportRuntimeError
  warnings: string[]
  currentPlan?: ReportPlanSnapshot
  tasks: ReportPlanTask[]
  stepsById: Record<string, ReportPublicStep>
  stepOrder: string[]
  thinkingStepIds: string[]
  executionGroups: ReportTaskExecutionGroup[]
  unassignedStepIds: string[]
  reportCandidate?: ReportCandidate
  final?: {
    content: string
    entryId: string
  }
  doneEntryId?: string
  lastEntryId?: string
  processedEntryIds: Record<string, true>
}

/**
 * 报告消息的会话元数据与 Redis runtime 合并在同一对象上。
 * Hook 可以通过对象展开安全更新 thinkingOpen/todoOpen/expandedTaskKeys 等纯 UI 字段。
 */
export interface ReportItem extends ReportStreamRuntimeState {
  id: string
  question: string
  taskId?: string
  conversationId?: string
  sessionId?: string
  streamKey?: string
  createdAt: number
}

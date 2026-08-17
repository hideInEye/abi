export type ReportConversationStatus = 'idle' | 'submitting' | 'thinking' | 'waiting_stream' | 'syncing_history' | 'running' | 'completed' | 'failed'

export type ReportPlanTaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export type ReportStepStatus = 'in_progress' | 'done' | 'failed' | 'skipped' | 'cancelled'

export type ReportChunkOutputType = 'text' | 'markdown' | 'code' | 'image' | 'html' | string

export type ReportAttachmentFormat = 'pdf' | 'word'

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
 * 传输层保留完整协议字段，但公开模型只挑选允许展示的摘要。
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
  /** 后端返回的报告总耗时，单位为秒。 */
  time?: number
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

/** Java SSE 交给前端的最小原始 entry；data 必须保持 Redis 中的 JSON 字符串。 */
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
 * 注意：这里刻意没有 thought、action_input；actionReason 是后端明确允许展示的公开执行说明。
 */
export interface ReportPublicStep {
  id: string
  ordinal?: number
  title?: string
  detail?: string
  action?: string
  actionIntention?: string
  actionReason?: string
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

/** PDF/Word 不参与右侧预览，只保留后端实际返回的下载地址。 */
export interface ReportAttachment {
  entryId: string
  stepId: string
  format: ReportAttachmentFormat
  url: string
}

export interface ReportRuntimeError {
  code: string
  message: string
}

export interface ReportStreamRuntimeState {
  status: Exclude<ReportConversationStatus, 'idle'>
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
  reportAttachments: ReportAttachment[]
  /** 整体 done 返回的总耗时，单位为秒。 */
  durationSeconds?: number
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
  /** 与 query.roundIndex、Stream key 尾部序号共用的会话内稳定顺序。 */
  sortOrder: number
  createdAt: number
  source: 'history' | 'task'
  generatedImages?: string[]
}

export interface ReportHistoryMessage {
  messageId?: string | number
  roundIndex?: number
  index?: number
  chatMode?: string | null
  roleType?: string
  createTime?: string
  messageDetail?: {
    type?: string
    chat_mode?: string | null
    data?: {
      content?: unknown
    }
  }
}

export interface ReportHistoryRoundGroup {
  roundIndex?: number
  messages?: ReportHistoryMessage[]
}

export interface ReportHistoryOutput {
  output_type?: ReportChunkOutputType
  content?: unknown
}

export interface ReportHistoryStep {
  id?: string
  step?: number
  title?: string
  detail?: string
  thought?: unknown
  action_intention?: string | null
  action_reason?: unknown
  action?: string | null
  action_input?: unknown
  outputs?: ReportHistoryOutput[]
  status?: string
  todo_meta?: ReportTodoMeta | null
}

export interface ReportHistoryPayload {
  version?: number
  type?: string
  final_content?: unknown
  task_plan?: ReportPlanTask[]
  steps?: ReportHistoryStep[]
  generated_images?: string[]
  time?: number
}

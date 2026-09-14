export type ExploreStatus = 'running' | 'completed' | 'failed' | 'cancelled'

export type ExploreTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | string

export type ExploreChunkOutputType = 'text' | 'markdown' | 'code' | 'json' | 'html' | 'image' | 'pdf' | 'word' | string

export interface ExploreTask {
  todo_id?: string
  content: string
  status: ExploreTaskStatus
  priority?: 'high' | 'medium' | 'low' | string
}

export interface ExploreStepOutput {
  outputType: ExploreChunkOutputType
  content: unknown
}

export interface ExploreStep {
  id: string
  step?: number
  todoId?: string
  title?: string
  detail?: string
  thought?: string | null
  actionIntention?: string | null
  actionReason?: string | null
  action?: string | null
  actionInput?: string | null
  status: 'running' | 'done' | 'failed' | 'cancelled'
  outputs: ExploreStepOutput[]
}

export interface ExploreItem {
  id: string
  question: string
  sortOrder: number
  status: ExploreStatus
  planThought?: {
    thought?: string
    reasoning?: string
    actionIntention?: string
    actionReason?: string
  }
  /** 当前思考轮次（plan.thought.chunk 的 round），轮次切换时重置打字机流。 */
  thoughtRound?: number
  /** 打字机流：当前轮 delta 增量累积的简洁思考（最终固化为 plan.thought/step.meta 的 thought）。 */
  thoughtStream?: string
  /** 打字机流：当前轮 thinking_delta 增量累积的深度思考内容。 */
  reasoningStream?: string
  tasks: ExploreTask[]
  planVersion?: number
  planSource?: string
  steps: ExploreStep[]
  finalContent?: string
  summary?: string
  finishReason?: string
  error?: {
    code?: string
    message: string
  }
  createdAt: number
}

export type ExploreStreamEvent =
  | { type: 'plan.thought'; thought?: string; reasoning?: string; action_intention?: string; action_reason?: string }
  | { type: 'plan.thought.chunk'; round?: number; delta?: string; thinking_delta?: string }
  | { type: 'plan.update'; tasks?: ExploreTask[]; source?: string; version?: number }
  | { type: 'step.start'; id: string; step?: number; todo_id?: string; title?: string; detail?: string }
  | { type: 'step.meta'; id: string; todo_id?: string; thought?: string | null; action_intention?: string | null; action_reason?: string | null; action?: string | null; action_input?: string | null; title?: string }
  | { type: 'step.chunk'; id: string; todo_id?: string; output_type?: ExploreChunkOutputType; content?: unknown }
  | { type: 'step.done'; id: string; todo_id?: string; status?: 'done' | 'failed' | 'cancelled' | string }
  | { type: 'final'; content?: string; finish_reason?: string }
  | { type: 'summary'; content?: string }
  | { type: 'done'; finish_reason?: string }
  | { type: 'failed'; code?: string; message?: string; finish_reason?: string }

/** MCP 源选中项：id 为源版本 id；protocol 决定 sse/streamable 归属；namespaceId 为所属分组 namespaceId（s_<groupId>） */
export interface ExploreMcpSource {
  id: string | number
  protocol?: string
  namespaceId?: string
}

export interface ExploreSendOptions {
  groupId?: string | number
  skillSourceVersionIds?: Array<string | number>
  mcpSourceVersionIds?: ExploreMcpSource[]
}

export interface UseAssistantDebugChatOptions extends Omit<ExploreSendOptions, 'mcpSourceVersionIds'> {
  /** 应用 id */
  appId?: string | number
  /** 空间 id */
  spaceId?: string | number
  /** 语义 id (传第一个已选) */
  schemaId?: string | number
  /** 对话模型 id */
  chatModelId?: string | number
  /** 嵌入模型 id (默认 6) */
  embedModelId?: string | number
  /** 是否调试模式 */
  isDebug?: boolean
  /** 会话 ID: conv_id (由助手数据提供，不在这里创建) */
  convUid?: string
  /** 会话 ID: session_id (由助手数据提供，不在这里创建) */
  sessionId?: string
}

export interface UseAssistantDebugChatOptions extends Omit<ExploreSendOptions, 'mcpSourceVersionIds'> {
  /** 应用 id */
  appId?: string | number
  /** 空间 id */
  spaceId?: string | number
  /** 语义 id (传第一个已选) */
  schemaId?: string | number
  /** 对话模型 id */
  chatModelId?: string | number
  /** 嵌入模型 id (默认 6) */
  embedModelId?: string | number
  /** 是否调试模式 */
  isDebug?: boolean
  /** 会话 ID: conv_id (由助手数据提供，不在这里创建) */
  convUid?: string
  /** 会话 ID: session_id (由助手数据提供，不在这里创建) */
  sessionId?: string
}

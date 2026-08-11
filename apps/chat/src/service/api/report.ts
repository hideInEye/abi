import { fetchEventSource } from '@microsoft/fetch-event-source'
import type { EventSourceMessage } from '@microsoft/fetch-event-source'

import { getAuthorization, handleLoginExpired } from '../../utils/auth'

/** 报告任务提交参数。该接口是普通 HTTP 请求，不是对话 SSE。 */
export interface SubmitReportRequest {
  messages: string
  app_id: number
  space_id: number
  schema_id: number | string
  /** 选中数据语义分组时的真实分组 id（长号）；与 schema_id 互斥，二选一 */
  group_id?: number | string
  conv_id: string
  session_id: string
  user_id: number
  embed_model_id?: number
  chat_model_id: number
  app_type?: string
}

export interface SubmitReportResponse {
  message?: string
  data?: {
    conv_id?: string
    task_id?: string
    status?: string
    stream_key?: string | null
    code?: number
    message?: string
  }
}

/** 前端内部只使用经过校验和驼峰化的任务定位信息。 */
export interface SubmittedReportTask {
  conversationId: string
  taskId: string
  streamKey: string
  status: string
}

export type ReportTaskStatusValue = 'pending' | 'started' | 'retry' | 'success' | 'failure' | 'revoked' | string

/** Celery 报告任务状态。页面恢复时先用它判断是否还需要连接 Redis Stream。 */
export interface ReportTaskStatus {
  taskId: string
  status: ReportTaskStatusValue
  completed: boolean
  successful: boolean
  message?: string
  result?: unknown
  error?: unknown
}

interface ReportTaskStatusResponse {
  code?: number
  message?: string
  data?: {
    task_id?: string
    status?: ReportTaskStatusValue
    completed?: boolean
    successful?: boolean
    message?: string
    result?: unknown
    error?: unknown
  }
}

export interface ReportStreamQuery {
  stream_key: string
  last_id?: string
}

export interface RawReportStreamEntry {
  id: string
  data: string
}

interface ConnectReportEventsOptions {
  query: ReportStreamQuery
  signal: AbortSignal
  onEntry: (entry: RawReportStreamEntry, raw: EventSourceMessage) => void
  onError?: (error: Error) => void
  onClose?: () => void
}

/** 报告任务在业务 baseApi 下通过 chat-proxy 网关转发。 */
const REPORT_SUBMIT_PATH = '/chat-proxy/api/v1/chat/report'
const REPORT_TASK_PATH = '/chat-proxy/api/v1/chat/report/task'
const REPORT_EVENTS_PATH = '/abi-debug/v1/report-stream/events'

function getRuntimeConfigValue(key: string) {
  return String(window.APP_CONFIG?.[key] ?? '').trim()
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, '')
}

/** 报告生成服务可覆盖完整地址；未配置时按 baseApi + chat-proxy 路径拼接。 */
function getReportSubmitApi() {
  const configured = getRuntimeConfigValue('VITE_REPORT_SUBMIT_API')

  if (configured) return configured

  const baseApi = trimTrailingSlash(getRuntimeConfigValue('VITE_BASE_API'))
  return `${baseApi}${REPORT_SUBMIT_PATH}`
}

function getAuthorizationHeaders(): Record<string, string> {
  const authorization = getAuthorization()
  return authorization ? { Authorization: authorization } : {}
}

function getBusinessApi(path: string) {
  return `${trimTrailingSlash(getRuntimeConfigValue('VITE_BASE_API'))}${path}`
}

/** Java 接口只透传 Redis entry；前端始终显式传 last_id，首次从 0-0 回放。 */
export function buildReportEventsUrl(query: ReportStreamQuery) {
  const searchParams = new URLSearchParams({
    stream_key: query.stream_key,
    last_id: query.last_id || '0-0',
  })

  return `${getBusinessApi(REPORT_EVENTS_PATH)}?${searchParams.toString()}`
}

async function readResponseBody(response: Response): Promise<SubmitReportResponse | undefined> {
  try {
    return await response.json() as SubmitReportResponse
  } catch {
    return undefined
  }
}

function getResponseError(body: SubmitReportResponse | undefined, fallback: string) {
  return body?.data?.message || body?.message || fallback
}

/**
 * 提交异步报告任务并返回 Redis Stream 定位信息。
 * HTTP 202 只代表任务已入队，真正的执行状态由后续 Redis 原始事件决定。
 */
export async function submitReportTask(data: SubmitReportRequest, signal?: AbortSignal): Promise<SubmittedReportTask> {
  const response = await fetch(getReportSubmitApi(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthorizationHeaders(),
    },
    body: JSON.stringify(data),
    signal,
  })

  if (response.status === 401) {
    await handleLoginExpired()
    throw new Error('登录已过期')
  }

  const body = await readResponseBody(response)

  if (response.status !== 202 || !response.ok) {
    throw new Error(getResponseError(body, `报告任务提交失败（${response.status}）`))
  }

  const conversationId = String(body?.data?.conv_id || '').trim()
  const taskId = String(body?.data?.task_id || '').trim()
  const streamKey = String(body?.data?.stream_key || '').trim()

  if (!conversationId || !taskId || !streamKey) {
    throw new Error('报告任务提交成功，但返回的 conv_id、task_id 或 stream_key 不完整')
  }

  return {
    conversationId,
    taskId,
    streamKey,
    status: String(body?.data?.status || 'queued'),
  }
}

/**
 * 查询已持久化 taskId 的真实状态。
 * 成功状态由 query 历史恢复；未完成状态才继续建立 Java Redis Stream SSE。
 */
export async function fetchReportTaskStatus(taskId: string, signal?: AbortSignal): Promise<ReportTaskStatus> {
  const normalizedTaskId = taskId.trim()
  if (!normalizedTaskId) throw new Error('报告 task_id 不能为空')

  const searchParams = new URLSearchParams({ task_id: normalizedTaskId })
  const response = await fetch(`${getBusinessApi(REPORT_TASK_PATH)}?${searchParams.toString()}`, {
    method: 'GET',
    headers: getAuthorizationHeaders(),
    signal,
  })

  if (response.status === 401) {
    await handleLoginExpired()
    throw new Error('登录已过期')
  }

  let body: ReportTaskStatusResponse | undefined
  try {
    body = await response.json() as ReportTaskStatusResponse
  } catch {
    body = undefined
  }

  if (!response.ok || (body?.code !== undefined && ![0, 200].includes(Number(body.code)))) {
    throw new Error(body?.data?.message || body?.message || `报告任务状态查询失败（${response.status}）`)
  }

  const data = body?.data
  if (!data?.task_id || !data.status) {
    throw new Error('报告任务状态响应缺少 task_id 或 status')
  }

  return {
    taskId: String(data.task_id),
    status: String(data.status),
    completed: data.completed === true,
    successful: data.successful === true,
    message: data.message,
    result: data.result,
    error: data.error,
  }
}

/**
 * 连接 Java 后端的原始 Redis Stream SSE。
 * service 层不解析 data JSON，业务事件的校验、排序和聚合全部交给报告模式 reducer。
 */
export function connectReportEvents(options: ConnectReportEventsOptions) {
  return fetchEventSource(buildReportEventsUrl(options.query), {
    method: 'GET',
    headers: getAuthorizationHeaders(),
    signal: options.signal,
    openWhenHidden: true,
    async onopen(response) {
      if (response.status === 401) {
        await handleLoginExpired()
        throw new Error('登录已过期')
      }

      if (!response.ok) {
        throw new Error(`Java Redis Stream 连接失败（${response.status}）`)
      }
    },
    onmessage(event) {
      if (event.event === 'stream.error') {
        try {
          const payload = JSON.parse(event.data) as { message?: string }
          options.onError?.(new Error(payload.message || 'Redis Stream 传输异常'))
        } catch {
          options.onError?.(new Error(event.data || 'Redis Stream 传输异常'))
        }
        return
      }

      if (!event.id || !event.data) return

      options.onEntry({
        id: event.id,
        data: event.data,
      }, event)
    },
    onclose() {
      options.onClose?.()
    },
    onerror(error) {
      const normalized = error instanceof Error ? error : new Error(String(error))
      options.onError?.(normalized)
      throw normalized
    },
  })
}

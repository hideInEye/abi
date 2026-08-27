import { fetchEventSource } from '@microsoft/fetch-event-source'
import type { EventSourceMessage } from '@microsoft/fetch-event-source'

import { mapShareHistory, type WidgetMessage } from './history'

/** Widget 配置：shareCode 为免登录凭证，apiBase 为网关前缀（空串表示同源） */
export interface WidgetConfig {
  shareCode: string
  apiBase: string
}

export interface ShareCheckResult {
  passwordFlag: boolean
  result: boolean
  appId: string
}

export interface WidgetSession {
  sessionId: string
  convUid: string
}

export interface WidgetAssistantInfo {
  appId: string
  name: string
  description: string
  prologue: string
  recQuestions: string[]
}

/**
 * 接口路径（后端已就绪部分按实际协议，其余假设联调时仅改此处）。
 * 分享校验与大屏共用统一接口（网关路径 = apiBase + /dashboard/api/v1/project/...，同大屏）；
 * 会话三件套仍按 abi-chat 约定假设。
 */
const API = {
  checkShare: '/dashboard/api/v1/project/checkSharePassword',
  appGet: '/abi-chat/v1/app/get',
  sessionAdd: '/abi-chat/v1/app/session/add',
  messageQuery: '/abi-chat/v1/app/message/query',
  completions: '/chat-proxy/api/v2/workflow/chat/completions',
}

/** 裸 fetch + 附 shareCode；不读 token/localStorage，供分享/嵌入免登录场景 */
async function postJson(cfg: WidgetConfig, path: string, body: Record<string, unknown> = {}) {
  const base = String(cfg.apiBase || '').replace(/\/+$/, '')
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
    body: JSON.stringify({ ...body, shareCode: cfg.shareCode }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function isOk(json: any): boolean {
  return Number(json?.code) === 200
}

/** 校验分享密码 / 获取分享信息（与大屏同接口、同字段名；密码传空串即探测是否需要密码） */
export async function checkSharePassword(cfg: WidgetConfig, password: string): Promise<ShareCheckResult | null> {
  const json = await postJson(cfg, API.checkShare, { sharePassword: password })
  if (!isOk(json)) return null
  const d = json?.data ?? {}
  return {
    passwordFlag: !!d.passwordFlag,
    result: d.result !== false,
    // 统一分享接口返回 projectId（=助手 appId），兼容后端直接返回 appId 的情况
    appId: String(d.appId ?? d.projectId ?? ''),
  }
}

/** 拉取助手信息（名称/开场白/推荐问题），失败返回 null 由调用方兜底 */
export async function fetchAssistantInfo(cfg: WidgetConfig, appId: string): Promise<WidgetAssistantInfo | null> {
  try {
    const json = await postJson(cfg, API.appGet, { appId })
    if (!isOk(json)) return null
    const d = json?.data?.data ?? json?.data ?? {}
    return {
      appId: String(d.appId ?? appId),
      name: d.appName || d.name || '',
      description: d.description || '',
      prologue: d.prologue || '',
      recQuestions: parseRecQuery(d.recQuery),
    }
  } catch {
    return null
  }
}

/** recQuery 为 JSON 数组字符串，兼容直接数组；解析失败返回空数组 */
export function parseRecQuery(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((q) => String(q)).filter(Boolean)
  if (typeof raw !== 'string' || !raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((q) => String(q)).filter(Boolean) : []
  } catch {
    return []
  }
}

/** 新建分享会话，返回 sessionId/convUid；失败返回 null */
export async function ensureSession(cfg: WidgetConfig, appId: string): Promise<WidgetSession | null> {
  try {
    const json = await postJson(cfg, API.sessionAdd, {
      appId,
      title: '助手分享对话',
      groupId: '0',
    })
    if (!isOk(json)) return null
    const d = json?.data?.data ?? json?.data ?? {}
    const sessionId = d.session_id ?? d.sessionId
    const convUid = d.conv_uid ?? d.convUid
    return sessionId && convUid ? { sessionId: String(sessionId), convUid: String(convUid) } : null
  } catch {
    return null
  }
}

/** 拉取会话历史并映射为 widget 消息 */
export async function fetchHistory(cfg: WidgetConfig, convUid: string): Promise<WidgetMessage[]> {
  if (!convUid) return []
  try {
    const json = await postJson(cfg, API.messageQuery, { convUid })
    if (!isOk(json)) return []
    const roundGroups: any[] = Array.isArray(json?.data?.data) ? json.data.data : []
    const flat = roundGroups.flatMap((g: any) => (Array.isArray(g?.messages) ? g.messages : []))
    return mapShareHistory(flat)
  } catch {
    return []
  }
}

export interface StreamChatCallbacks {
  /** 每次增量到达：参数为清理后的累计全文 */
  onDelta: (fullText: string) => void
  /** 流正常结束（[DONE]）：参数为最终清理后的全文 */
  onDone: (fullText: string) => void
  /** 异常（含业务错误体/网络异常），不会自动重试 */
  onError: (err: unknown) => void
}

/** 对话模型：跟随宿主 APP_CONFIG（分享页同源），第三方嵌入无 APP_CONFIG 时用默认值 */
function getChatModel(): string {
  try {
    return (window as any)?.APP_CONFIG?.VITE_CHAT_MODEL || 'qwen3:30b-a3b-fp16'
  } catch {
    return 'qwen3:30b-a3b-fp16'
  }
}

/**
 * 发送对话（SSE 流式，与助手对话链路一致）：
 * 同 useConversationController 走 /chat-proxy/api/v2/workflow/chat/completions，
 * stream/incremental 参数对齐，context 绑定会话与助手 app_id；shareCode 随 body 下发供后端免登录鉴权。
 * chat_mode 初版假设 'chat_with_assistant_share'，后端联调时按实际约定调整（集中此处）。
 */
export function sendChatStream(
  cfg: WidgetConfig,
  session: WidgetSession,
  question: string,
  appId: string,
  signal: AbortSignal,
  { onDelta, onDone, onError }: StreamChatCallbacks,
): void {
  const base = String(cfg.apiBase || '').replace(/\/+$/, '')
  let buf = ''

  const finalize = () => {
    const text = finalizeStreamText(buf)
    onDone(text)
  }

  fetchEventSource(`${base}${API.completions}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: question,
      model: getChatModel(),
      stream: true,
      temperature: 0,
      max_new_tokens: 4096,
      incremental: true,
      enable_vis: false,
      shareCode: cfg.shareCode,
      context: {
        session_id: session.sessionId,
        conv_uid: session.convUid,
        app_id: appId,
        user_id: 0,
        chat_mode: 'chat_with_assistant_share',
        extra: {
          if_debug: false,
          extra_body: { enable_thinking: false },
          share_code: cfg.shareCode,
        },
      },
    }),
    signal,
    openWhenHidden: true,
    async onopen(response) {
      const contentType = response.headers.get('content-type') || ''
      if (response.ok && contentType.includes('text/event-stream')) return
      // 非事件流（HTTP 200 业务错误体或 4xx/5xx）：解析后端 msg 后抛出终止流，避免 fetchEventSource 默认重试
      let backendMsg = ''
      try {
        const errData: any = await response.clone().json()
        if (errData && Number(errData.code) >= 400) backendMsg = errData.msg || errData.message || ''
      } catch {}
      throw new Error(backendMsg || `HTTP ${response.status}`)
    },
    onmessage(event: EventSourceMessage) {
      if (!event.data) return
      if (event.data === '[DONE]') {
        finalize()
        return
      }
      try {
        const parsed = JSON.parse(event.data)
        // 流内业务错误体：转为异常终止（抛错后由 onerror 统一回调）
        if (parsed && typeof parsed === 'object' && Number(parsed.code) >= 400) {
          throw new Error(parsed.msg || '请求失败')
        }
        const content = parsed?.choices?.[0]?.delta?.content
        if (typeof content === 'string' && content) {
          buf += content
          onDelta(finalizeStreamText(buf))
        }
      } catch (err) {
        // JSON.parse 失败的普通增量忽略；Error（业务错误）向上抛终止
        if (err instanceof Error) throw err
      }
    },
    onclose() {
      // 服务端提前关闭连接（未收到 [DONE]）：按已有内容收尾，避免停留在 loading 态
      finalize()
    },
    onerror(err) {
      onError(err)
      throw err // 抛出以终止 fetchEventSource 内置重试
    },
  }).catch((err) => {
    if ((err as any)?.name === 'AbortError') return
    onError(err)
  })
}

/**
 * 清理流式累计文本：剥离 <think>…</think> 思考段；
 * 尾部若为含 task_type 的结构化 JSON（同主对话），提取其中回复文本替换该 JSON 段。
 */
export function finalizeStreamText(raw: string): string {
  let text = raw.replace(/<think>[\s\S]*?<\/think>/g, '')
  const m = text.match(/\{[\s\S]*\}\s*$/)
  if (m) {
    try {
      const parsed = JSON.parse(m[0])
      if (parsed && typeof parsed === 'object' && parsed.task_type != null) {
        const extracted = answerFromParsed(parsed)
        if (extracted) text = text.slice(0, m.index).concat(extracted)
      }
    } catch {
      // 非合法 JSON 保持原文（可能仍在流式到达中）
    }
  }
  return text
}

function answerFromParsed(parsed: any): string {
  if (!parsed || typeof parsed !== 'object') return ''
  const taskType = parsed.task_type ?? 'development'
  const seg = parsed[taskType] ?? {}
  return seg.text || seg.content || parsed.text || parsed.content || ''
}

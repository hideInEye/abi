import { fetchEventSource } from '@microsoft/fetch-event-source'
import type { EventSourceMessage } from '@microsoft/fetch-event-source'

import { mapShareHistory, type WidgetMessage } from './history'

/** Widget 配置：shareCode 为免登录凭证，apiBase 为网关前缀（空串表示同源） */
export interface WidgetConfig {
  shareCode: string
  apiBase: string
  /** 分享校验通过后后端下发的临时 token，后续接口随 Authorization 携带 */
  token?: string
}

export interface ShareCheckResult {
  passwordFlag: boolean
  result: boolean
  appId: string
  /** 项目类型（后端分享校验已区分：自主助手=react，工作流助手=workflow，大屏=dashboard） */
  type: ProjectType
  /** 校验通过后后端下发的临时 token（无密码分享探测通过时同样返回） */
  token?: string
}

/** 统一 project 接口的类型段：大屏=dashboard，自主助手=react，工作流助手=workflow */
export type ProjectType = 'dashboard' | 'react' | 'workflow'

/** 后端分享校验返回的 type 归一化：后端已确认响应携带 type（自主助手=react / 工作流助手=workflow / 大屏=dashboard）；异常值抛错便于联调时暴露字段问题 */
function normalizeProjectType(raw: unknown): ProjectType {
  if (raw === 'react' || raw === 'workflow' || raw === 'dashboard') return raw
  throw new Error(`checkSharePassword 响应缺少有效 type：${String(raw)}`)
}

export interface WidgetSession {
  sessionId: string
  convUid: string
  /** 会话绑定的数据源（图表数据 SQL 查询依赖；后端未下发时为空） */
  dbName?: string
}

export interface WidgetAssistantInfo {
  appId: string
  name: string
  description: string
  prologue: string
  recQuestions: string[]
  /** 助手绑定的数据语义（随助手详情一并下发，扁平叶子列表） */
  semantics: WidgetSemanticNode[]
  /** 助手所属空间（建会话时随 spaceId 下发，同主对话） */
  spaceId?: number | string
}

/** 数据语义节点（助手详情下发绑定语义：仅 schema 叶子，无分组节点） */
export interface WidgetSemanticNode {
  id: string | number
  type?: 'group' | 'schema'
  name: string
  techName?: string
  schemaId?: number | string
  groupName?: string
  count?: number
  children?: WidgetSemanticNode[]
}

/** 选中的数据语义（与大屏 AiChatPanel 对齐：仅叶子可选） */
export interface WidgetSemanticSelection {
  name: string
  schemaId?: number | string
  /** 数据语义所属分组名 */
  groupName?: string
}

/**
 * 接口路径（后端已就绪部分按实际协议，其余假设联调时仅改此处）。
 * 分享校验与大屏共用统一接口（网关路径 = apiBase + /dashboard/api/v1/project/...，同大屏）；
 * 会话三件套仍按 abi-chat 约定假设。
 */
const API = {
  checkShare: '/dashboard/api/v1/project/checkSharePassword',
  getProjectInfo: '/dashboard/api/v1/project/getProjectInfo',
  sessionAdd: '/abi-chat/v1/app/session/add',
  messageQuery: '/abi-chat/v1/app/message/query',
  completions: '/chat-proxy/api/v2/workflow/chat/completions',
  // 以下三个与主对话同接口（网关路径一致），供图表数据/轮次/点赞点踩使用
  dbQuery: '/chat-proxy/api/v1/chat/db/query',
  maxRound: '/chat-proxy/api/v1/chat/conv/messages/round_index/max',
  feedback: '/abi-chat/v1/app/message/feedback/add',
}

/** 请求头：分享校验通过后的临时 token 以 Authorization: Bearer 携带（与主应用鉴权头同格式） */
function buildHeaders(cfg: WidgetConfig, contentType?: string): Record<string, string> {
  const headers: Record<string, string> = {}
  if (contentType) headers['Content-Type'] = contentType
  if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`
  return headers
}

/** 裸 fetch + 附 shareCode；不读 localStorage，供分享/嵌入免登录场景 */
async function postJson(cfg: WidgetConfig, path: string, body: Record<string, unknown> = {}) {
  const base = String(cfg.apiBase || '').replace(/\/+$/, '')
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: buildHeaders(cfg, 'application/json;charset=utf-8'),
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
    type: normalizeProjectType(d.type),
    token: typeof d.token === 'string' && d.token ? d.token : undefined,
  }
}

/** 裸 fetch GET + shareCode 随 query 下发（免登录），供分享/嵌入场景 */
async function getJson(cfg: WidgetConfig, path: string, params: Record<string, string | number> = {}) {
  const base = String(cfg.apiBase || '').replace(/\/+$/, '')
  const query = new URLSearchParams({ shareCode: cfg.shareCode })
  Object.entries(params).forEach(([k, v]) => query.set(k, String(v)))
  const res = await fetch(`${base}${path}?${query.toString()}`, { headers: buildHeaders(cfg) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * 拉取助手信息（名称/开场白/推荐问题/绑定数据语义），失败返回 null 由调用方兜底。
 * 进入分享页改走统一接口 GET /api/v1/project/getProjectInfo/{type}/{id}，
 * type 由分享校验响应携带（后端已确认：自主助手=react / 工作流助手=workflow）；响应字段与 app/get 一致。
 * 数据语义随助手详情一并下发（不再单独调 /copilot/v1/schema/tree），后端未加字段时降级为空列表。
 */
export async function fetchAssistantInfo(cfg: WidgetConfig, appId: string, type: ProjectType = 'react'): Promise<WidgetAssistantInfo | null> {
  try {
    const json = await getJson(cfg, `${API.getProjectInfo}/${type}/${appId}`)
    if (!isOk(json)) return null
    const d = json?.data?.data ?? json?.data ?? {}
    return {
      appId: String(d.appId ?? appId),
      name: d.appName || d.name || '',
      description: d.description || '',
      prologue: d.prologue || '',
      recQuestions: parseRecQuery(d.recQuery),
      semantics: mapProjectSemantics(d),
      spaceId: d.spaceId ?? d.space_id,
    }
  } catch {
    return null
  }
}

/**
 * 从助手详情（getProjectInfo 响应）提取绑定数据语义。
 * 分享查询实际把 schemaSemantics 挂在详情顶层（版本化场景挂在 version 下），优先取非空顶层；
 * 每项 schemaConfig 为 JSON 字符串（兼容数组），内含 id/name/groupPath，映射为扁平 schema 叶子。
 */
export function mapProjectSemantics(detail: any): WidgetSemanticNode[] {
  const safe: any = detail && typeof detail === 'object' ? detail : {}
  const versions: any[] = Array.isArray(safe.versions) ? safe.versions : []
  const version: any =
    versions.find((v: any) => v?.versionId != null && String(v.versionId) === String(safe.latestVersionId)) ||
    versions[0] ||
    safe
  const schemaSemantics: any[] =
    Array.isArray(safe.schemaSemantics) && safe.schemaSemantics.length > 0
      ? safe.schemaSemantics
      : Array.isArray(version?.schemaSemantics) ? version.schemaSemantics : []
  const nodes: WidgetSemanticNode[] = []
  schemaSemantics.forEach((s: any) => {
    toSchemaConfigList(s?.schemaConfig).forEach((c: any) => {
      if (c?.id == null) return
      nodes.push({
        id: `schema_${c.id}`,
        type: 'schema',
        schemaId: c.id,
        name: c.name || '',
        groupName: c.groupPath || '',
      })
    })
  })
  return nodes
}

/** schemaConfig 两种形态：数组或 JSON 字符串（分享查询实际下发字符串）；解析失败返回空数组 */
function toSchemaConfigList(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
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
export async function ensureSession(cfg: WidgetConfig, appId: string, spaceId?: number | string): Promise<WidgetSession | null> {
  try {
    const json = await postJson(cfg, API.sessionAdd, {
      appId,
      title: '助手分享对话',
      groupId: '0',
      // 后端必填：同主对话/大屏取 localStorage 用户 id，分享免登录缺失时落 0（与 sendChatStream 的 user_id 一致）
      userId: getCurrentUserId(),
      // 同主对话建会话：助手详情下发空间 id 时携带，后端未下发则不传
      ...(spaceId != null ? { spaceId } : {}),
    })
    if (!isOk(json)) return null
    const d = json?.data?.data ?? json?.data ?? {}
    const sessionId = d.session_id ?? d.sessionId
    const convUid = d.conv_uid ?? d.convUid
    const dbName = d.db_name ?? d.dbName ?? ''
    return sessionId && convUid
      ? { sessionId: String(sessionId), convUid: String(convUid), dbName: dbName ? String(dbName) : undefined }
      : null
  } catch {
    return null
  }
}

/** 读取当前用户 ID（同主对话/大屏：SOY-REACT_userInfo.userId；分享免登录缺失时落 0） */
function getCurrentUserId(): number {
  try {
    const userInfoStr = localStorage.getItem('SOY-REACT_userInfo')
    const uid = userInfoStr ? JSON.parse(userInfoStr)?.userId : null
    const n = uid != null ? Number(uid) : Number(localStorage.getItem('userId'))
    if (Number.isFinite(n)) return n
  } catch {
    // ignore
  }
  return 0
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
  /** 每次增量到达：参数为累计的原始全文（含 think 段与尾部 JSON，由调用方结构化解析） */
  onDelta: (raw: string) => void
  /** 流正常结束（[DONE]）：参数为最终累计的原始全文 */
  onDone: (raw: string) => void
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
  semantic?: WidgetSemanticSelection | null,
  spaceId?: number | string,
): void {
  const base = String(cfg.apiBase || '').replace(/\/+$/, '')
  const spaceIdNum = Number(spaceId)
  let buf = ''

  const finalize = () => {
    onDone(buf)
  }

  fetchEventSource(`${base}${API.completions}`, {
    method: 'POST',
    headers: buildHeaders(cfg, 'application/json'),
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
        // 后端必填三字段：模型 id 同大屏默认（大模型 12 / 嵌入模型 6），空间 id 随助手详情、缺失落 0
        chat_model_id: 12,
        embed_model_id: 6,
        space_id: Number.isFinite(spaceIdNum) ? spaceIdNum : 0,
        app_id: appId,
        user_id: 0,
        chat_mode: 'chat_with_assistant_share',
        extra: {
          if_debug: false,
          // 数据语义（与大屏/对话一致）：未选中时不下发语义字段，避免污染后端默认行为。
          ...(semantic?.schemaId != null
            ? {
                semantic_id: semantic.schemaId,
                semantic_group_name: semantic.groupName || '',
                semantic_name: semantic.name || '',
              }
            : {}),
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
          onDelta(buf)
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
 * 从“伪 JSON”文本宽容提取字符串字段值：
 * 模型可能在字符串值内直接输出字面换行（非法 JSON，JSON.parse 必失败），字符类正则可容纳值内换行，仅反转义常见转义符。
 */
const extractJsonStringField = (src: string, field: string): string | null => {
  const re = new RegExp('"' + field + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"')
  const m = src.match(re)
  if (!m) return null
  return m[1]
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

/** 严格解析失败时宽容提取结构化字段（thought/回复文本/sql/type/title/data），保证思考卡与图表不因非法 JSON 降级 */
const lenientParseTail = (src: string): any | null => {
  if (!/^\s*\{/.test(src)) return null
  const out: any = {}
  for (const field of ['thought', 'task_type', 'sql', 'type', 'title']) {
    const v = extractJsonStringField(src, field)
    if (v != null) out[field] = v
  }
  for (const field of ['answer', 'response', 'result', 'text', 'content']) {
    const v = extractJsonStringField(src, field)
    if (v != null) {
      out[field] = v
      break
    }
  }
  const dm = src.match(/"data"\s*:\s*(\[[\s\S]*\])\s*[,}]?\s*$/)
  if (dm) {
    try {
      out.data = JSON.parse(dm[1])
    } catch {
      // 数组本身非法（流式到达中）跳过，图表回退 sql 查询路径
    }
  }
  return Object.keys(out).length > 0 ? out : null
}

/** 是否为结构化响应对象（决定是否把裸 JSON 文本从展示正文剥离） */
const isStructuredPayload = (parsed: any): boolean =>
  !!parsed &&
  (parsed.task_type != null ||
    typeof parsed.thought === 'string' ||
    typeof parsed.sql === 'string' ||
    typeof parsed.answer === 'string' ||
    typeof parsed.response === 'string' ||
    typeof parsed.result === 'string')

/**
 * 结构化解析 AI 原始回复（与主对话管线对齐）：
 * - thinking：全部 <think>…</think> 段拼接（深度思考展示）
 * - text：剥离思考段后的展示文本；尾部结构化 JSON（task_type / thought / sql 等）提取其中回复文本替换，裸 JSON 不进入正文
 * - json：尾部结构化 JSON 对象（含 sql/data/type 等，用于图表渲染）；无则 null
 */
export function parseAiRaw(raw: string): { thinking: string; text: string; json: any | null } {
  const thinks: string[] = []
  const withoutThink = raw.replace(/<think>([\s\S]*?)<\/think>/g, (_m, inner: string) => {
    const t = String(inner).trim()
    if (t) thinks.push(t)
    return ''
  })
  let text = withoutThink
  let json: any | null = null
  // 尾部完整 JSON 块；流式未闭合时整段以 { 开头的文本也按未完成块处理（避免裸 JSON 闪现在正文）
  const tail = text.match(/\{[\s\S]*\}\s*$/)
  const block = tail ? tail[0] : /^\s*\{/.test(text) ? text : null
  const blockIndex = tail ? (tail.index ?? 0) : 0
  if (block) {
    let parsed: any = null
    if (tail) {
      try {
        const p = JSON.parse(block)
        if (p && typeof p === 'object') parsed = p
      } catch {
        parsed = lenientParseTail(block)
      }
    } else {
      parsed = lenientParseTail(block)
    }
    if (parsed && isStructuredPayload(parsed)) {
      json = parsed
      if (typeof parsed.thought === 'string' && parsed.thought.trim()) thinks.push(parsed.thought.trim())
      text = text.slice(0, blockIndex).concat(answerFromParsed(parsed))
    } else if (!parsed) {
      // 流式未闭合/无法识别的 JSON 块：正文不展示裸 JSON 片段
      text = text.slice(0, blockIndex)
    }
  }
  return { thinking: thinks.join('\n\n'), text, json }
}

/** 通过深度思考产出的 SQL 查询图表数据（同主对话 fetchDataBySql），shareCode 随 body 下发；失败返回 null */
export async function fetchChartDataBySql(cfg: WidgetConfig, dbName: string, sql: string): Promise<any[] | null> {
  try {
    const json = await postJson(cfg, API.dbQuery, { db_name: dbName, query_sql: sql })
    if (!isOk(json)) return null
    const data = json?.data?.data ?? json?.data
    return Array.isArray(data) ? data : null
  } catch {
    return null
  }
}

/** 获取会话最大轮次（同主对话 fetchConvMaxRound），用于流结束后定位本轮 roundIndex；失败返回 null */
export async function fetchMaxRound(cfg: WidgetConfig, convUid: string): Promise<number | null> {
  try {
    const json = await postJson(cfg, API.maxRound, { conv_uid: convUid })
    if (!isOk(json)) return null
    const n = Number(json?.data?.data ?? json?.data)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

/** 点赞点踩（同主对话 setExperteval：status 0=无评价 1=点赞 -1=点踩），shareCode 随 body 下发 */
export async function submitFeedback(
  cfg: WidgetConfig,
  payload: { convUid: string; roundIndex?: number; status: number; semanticId?: number | string | null; appId?: string | number },
): Promise<boolean> {
  try {
    const json = await postJson(cfg, API.feedback, {
      convUid: payload.convUid,
      roundIndex: payload.roundIndex,
      status: payload.status,
      semanticId: payload.semanticId ?? null,
      appId: payload.appId ?? 0,
    })
    return json?.success === true || Number(json?.code) === 200
  } catch {
    return false
  }
}

/**
 * 清理流式累计文本：剥离 <think>…</think> 思考段；
 * 尾部若为含 task_type 的结构化 JSON（同主对话），提取其中回复文本替换该 JSON 段。
 */
export function finalizeStreamText(raw: string): string {
  return parseAiRaw(raw).text
}

function answerFromParsed(parsed: any): string {
  if (!parsed || typeof parsed !== 'object') return ''
  const taskType = parsed.task_type ?? 'development'
  const seg = parsed[taskType] && typeof parsed[taskType] === 'object' ? parsed[taskType] : {}
  return seg.text || seg.content || parsed.text || parsed.content || parsed.answer || parsed.response || parsed.result || ''
}

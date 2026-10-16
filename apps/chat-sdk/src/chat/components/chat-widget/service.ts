import { fetchEventSource } from '@microsoft/fetch-event-source'
import type { EventSourceMessage } from '@microsoft/fetch-event-source'

import { mapShareHistory, type WidgetMessage } from './history'
import type { AssistantBoundMcp, AssistantBoundSkill } from '../../pages/chat/workshop/assistantResources'
import { shareApiKeyHeaders } from '../../service/request/share-api-key'
import { inferThemeIdFromConfig, normalizeThemeConfig, normalizeThemeId, type DeepPartial, type ThemeConfig, type ThemeId } from '../../../theme'

/** Widget 配置：shareCode 为免登录凭证，apiBase 为网关前缀（空串表示同源） */
export interface WidgetConfig {
  shareCode: string
  apiBase: string
  /** 分享校验通过后后端下发的临时 token，后续接口随 Authorization 携带 */
  token?: string
}

/** 统一 project 接口的类型段：大屏=dashboard，自主助手=react，工作流助手=workflow */
export type ProjectType = 'dashboard' | 'react' | 'workflow'

/** 分享页入口 type 段：助手分享页固定为自主助手(react)，单类型直连不再探测；
 * 若后续工作流助手(workflow)也开放分享页，再在此追加并恢复顺序探测 */
export const SHARE_PROBE_TYPES: ProjectType[] = ['react']

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
  /** 助手绑定的技能（工具菜单候选，选中后随发送透传） */
  skills: AssistantBoundSkill[]
  /** 助手绑定的 MCP 服务（工具菜单候选，选中后随发送透传） */
  mcps: AssistantBoundMcp[]
  /** 助手所属空间（建会话时随 spaceId 下发，同主对话） */
  spaceId?: number | string
}

/** 分享页入口响应：助手详情 + 后端按 shareCode 换出的 appId + 临时 token + 主题配置 */
export interface ShareProjectInfo extends WidgetAssistantInfo {
  /** 后端下发的临时 token，后续接口随 Authorization 携带 */
  token?: string
  /** 分享记录存储的主题风格；后端未下发时为 undefined，消费方回退接入属性/默认值 */
  theme?: ThemeId
  /** 分享记录存储的自定义主题配置（背景/标题栏/字体/图表）；后端未下发时为 undefined */
  themeConfig?: DeepPartial<ThemeConfig>
}

/** 历史会话列表项（历史对话抽屉：标题 + 会话标识；dbName 后端未下发时为空） */
export interface WidgetSessionItem {
  sessionId: string
  convUid: string
  title: string
  dbName?: string
  /** 更新时间（ms）：抽屉按今天/昨天/7天内/更早分组；缺失归“更早” */
  updatedAt?: number
  /** 置顶排序值（>0 表示置顶，值越大越靠前；同主对话侧栏口径） */
  sortOrder?: number
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
 * 分享页入口与主题保存走统一 project 接口（网关路径 = apiBase + /dashboard/api/v1/project/...，同大屏）；
 * 会话三件套仍按 abi-chat 约定假设。
 */
const API = {
  getProjectInfo: '/dashboard/api/v1/project/getProjectInfo',
  // 自定义主题配置保存：uiConfig 为前端主题 UI 配置 JSON 字符串，整串覆盖更新
  saveShareTheme: '/dashboard/api/v1/project/saveShareTheme',
  sessionAdd: '/abi-chat/v1/app/session/add',
  // 历史会话列表（同主对话侧栏 session/list；分享场景靠 token 识别用户，appId 隔离助手会话）
  sessionList: '/abi-chat/v1/app/session/list',
  // 会话更新（重命名/置顶 sortOrder）与会话删除（后端会话+消息一次删）
  sessionUpdate: '/abi-chat/v1/app/session/update',
  sessionDelete: '/abi-chat/v1/app/session/delete',
  messageQuery: '/abi-chat/v1/app/message/query',
  completions: '/chat-proxy/api/v2/workflow/chat/completions',
  // 以下三个与主对话同接口（网关路径一致），供图表数据/轮次/点赞点踩使用
  dbQuery: '/chat-proxy/api/v1/chat/db/query',
  maxRound: '/chat-proxy/api/v1/chat/conv/messages/round_index/max',
  // 搜本轮 view 消息（同主对话 ViewEle fetchData）：query 固定 key=view/page=1/page_size=1/message_role=view，round 随 body
  viewSearch: '/chat-proxy/api/v1/chat/conv/messages/search?key=view&page=1&page_size=1&message_role=view',
  feedback: '/abi-chat/v1/app/message/feedback/add',
  // 数据语义详情（同主对话 GET /api/copilot/v1/schema/{id}；/api 前缀由 apiBase 提供，避免双重拼接）
  semanticDetail: '/copilot/v1/schema',
  // 按 API-Key 查绑定分享列表（密钥随 x-api-key/secrectKey 头；type 可选过滤，不传返回全部）
  shareListByApiKey: '/dashboard/api/v1/project/shareListByApiKey',
}

/** 请求头：分享校验通过后的临时 token 以 Authorization: Bearer 携带（与主应用鉴权头同格式）；
 * 另附加第三方注入的分享页 API-Key 头（x-api-key / secrectKey），未配置时为空 */
function buildHeaders(cfg: WidgetConfig, contentType?: string): Record<string, string> {
  const headers: Record<string, string> = {}
  if (contentType) headers['Content-Type'] = contentType
  if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`
  return { ...headers, ...shareApiKeyHeaders() }
}

/** 裸 fetch；不读 localStorage，供分享/嵌入免登录场景（shareCode 仅校验接口需要，其余接口靠 token） */
async function postJson(cfg: WidgetConfig, path: string, body: Record<string, unknown> = {}) {
  const base = String(cfg.apiBase || '').replace(/\/+$/, '')
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: buildHeaders(cfg, 'application/json;charset=utf-8'),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// 兼容两种响应信封（同主对话 ViewEle / useConversationController 口径）：chat-proxy 系（max/db/query/search）返回 { success, err_code, err_msg, data }（无 code），其余返回 { code: 200, ... }
function isOk(json: any): boolean {
  return json?.success === true || Number(json?.code) === 200
}

/**
 * 保存访客自定义主题配置（回传后端，与分享 Token 映射持久化）。
 * uiConfig 为前端主题 UI 配置 JSON 字符串，整串覆盖更新；
 * 仅当接口明确成功返回 true；后端未就绪/网络异常/失败码一律 false，由调用方进入失败分支（保留可重试）。
 */
export async function saveShareTheme(cfg: WidgetConfig, themeConfig: DeepPartial<ThemeConfig>, themeId?: ThemeId): Promise<boolean> {
  try {
    // 预设风格随 theme 字段一并写入（读链路自 uiConfig.theme 取预设）：缺失则刷新后回退蓝色系，输入区等未建模变量残留浅色
    const uiConfig = JSON.stringify(themeId ? { ...themeConfig, theme: themeId } : themeConfig)
    const json = await postJson(cfg, API.saveShareTheme, { shareCode: cfg.shareCode, uiConfig })
    return isOk(json)
  } catch {
    return false
  }
}

/** 裸 fetch GET（免登录）；shareCode 仅 getProjectInfo 需要，由调用方随 params 显式传入 */
async function getJson(cfg: WidgetConfig, path: string, params: Record<string, string | number> = {}) {
  const base = String(cfg.apiBase || '').replace(/\/+$/, '')
  const query = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => query.set(k, String(v)))
  const qs = query.toString()
  const res = await fetch(`${base}${path}${qs ? `?${qs}` : ''}`, { headers: buildHeaders(cfg) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** 查询数据语义详情（含 modelDetail 字段列表）；网关路径 = apiBase + /copilot/v1/schema/{schemaId} */
export async function fetchSemanticDetail(cfg: WidgetConfig, schemaId: number | string): Promise<any> {
  const json = await getJson(cfg, `${API.semanticDetail}/${schemaId}`)
  if (!isOk(json)) throw new Error(json?.msg || json?.err_msg || '语义详情查询失败')
  return json
}

/** uiConfig 为前端主题 UI 配置 JSON 字符串（与 saveShareTheme 上送同构）；兼容后端直接下发对象，解析失败返回 null */
function toUiConfigObject(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  if (!raw.trim()) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * 分享页唯一入口 GET /api/v1/project/getProjectInfo/{type}?shareCode=（后端按 shareCode 换出项目/app id，路径无 id 段）。
 * 响应字段与 app/get 一致，另携带 token 与主题配置；失败或缺 appId 返回 null，由调用方探测下一个 type。
 */
export async function fetchShareProjectInfo(cfg: WidgetConfig, type: ProjectType): Promise<ShareProjectInfo | null> {
  try {
    const json = await getJson(cfg, `${API.getProjectInfo}/${type}`, { shareCode: cfg.shareCode })
    if (!isOk(json)) return null
    const d = json?.data?.data ?? json?.data ?? {}
    const appId = String(d.appId ?? d.projectId ?? '')
    if (!appId) return null
    const uiObj = toUiConfigObject(d.uiConfig ?? d.themeConfig) as Record<string, any> | null
    // 预设主题三选一：ABI 分享时选择的风格存在 uiConfig JSON 的 theme 字段（如 {"theme":"dark"}），
    // 兼容后端直接下发顶层 theme；两者皆无时 undefined（回退接入属性/默认蓝色系）
    const presetTheme =
      typeof d.theme === 'string' && d.theme ? d.theme : typeof uiObj?.theme === 'string' && uiObj.theme ? uiObj.theme : undefined
    return {
      appId,
      name: d.appName || d.name || '',
      description: d.description || '',
      prologue: d.prologue || '',
      recQuestions: parseRecQuery(d.recQuery),
      semantics: mapProjectSemantics(d),
      ...mapAssistantBoundToolResources(d),
      spaceId: d.spaceId ?? d.space_id,
      token: typeof d.token === 'string' && d.token ? d.token : undefined,
      // 非法/缺省不下发，避免未就绪环境被回退值强制刷成 blue；无 theme 字段的历史记录按背景色明暗兜底推断黑色系
      theme: presetTheme ? normalizeThemeId(presetTheme) : inferThemeIdFromConfig(uiObj),
      // 自定义主题配置（背景/标题栏/字体/图表）；normalizeThemeConfig 校验剔除非法字段，无有效字段则 undefined
      themeConfig: normalizeThemeConfig(uiObj),
    }
  } catch {
    return null
  }
}

/** 分享列表项（头部助手切换用）：shareCode 为切换凭证，name 为展示名 */
export interface WidgetShareItem {
  shareCode: string
  name: string
}

/** 从分享链接提取 shareCode（兼容 assistant_share_page / assistant-share-page / share_url / dashboard_share_page 几种路径） */
function shareCodeFromShareUrl(url: unknown): string {
  if (typeof url !== 'string' || !url) return ''
  const m = url.match(/#\/(?:assistant_share_page|assistant-share-page|share_url|dashboard_share_page)\/([^/?#]+)/)
  return m?.[1] || ''
}

/**
 * 按 API-Key 查绑定分享列表 GET /api/v1/project/shareListByApiKey（密钥随 x-api-key/secrectKey 头）。
 * 信封为 `{ total, shares: [{ shareCode, type, name }] }`，按 shareCode 去重供头部切换列表使用。
 * 不传 type 过滤：实测同一 shareCode 在列表里标 workflow，而入口按 react 才返回数据，列表 type 不可信，过滤会误伤。
 */
export async function fetchShareListByApiKey(cfg: WidgetConfig): Promise<WidgetShareItem[]> {
  try {
    const json = await getJson(cfg, API.shareListByApiKey)
    if (!isOk(json)) return []
    const d = json?.data?.data ?? json?.data ?? {}
    const records: any[] = Array.isArray(d) ? d : (d?.shares ?? d?.records ?? d?.rows ?? d?.list ?? [])
    const seen = new Set<string>()
    const out: WidgetShareItem[] = []
    for (const r of records) {
      const code = String(r?.shareCode || shareCodeFromShareUrl(r?.shareUrl) || '')
      if (!code || seen.has(code)) continue
      seen.add(code)
      out.push({ shareCode: code, name: String(r?.appName || r?.name || '') })
    }
    return out
  } catch {
    return []
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

/**
 * 从助手详情提取绑定技能/MCP（工具菜单候选，不新增接口调用）。
 * 规则同主对话 mapAssistantBoundResources；分享查询的 config 可能为 JSON 字符串，复用 toSchemaConfigList 兼容。
 */
export function mapAssistantBoundToolResources(detail: any): { skills: AssistantBoundSkill[]; mcps: AssistantBoundMcp[] } {
  const safe: any = detail && typeof detail === 'object' ? detail : {}
  const versions: any[] = Array.isArray(safe.versions) ? safe.versions : []
  const version: any =
    versions.find((v: any) => v?.versionId != null && String(v.versionId) === String(safe.latestVersionId)) ||
    versions[0] ||
    safe

  const skills: AssistantBoundSkill[] = []
  const skillGroups: any[] = Array.isArray(version?.skills) ? version.skills : []
  skillGroups.forEach((s: any) => {
    toSchemaConfigList(s?.skillConfig).forEach((c: any) => {
      if (c?.id == null) return
      skills.push({ id: String(c.id), bizName: c.name || '', latestVersionId: String(c.id), skillType: '1' })
    })
  })

  const mcps: AssistantBoundMcp[] = []
  const tools: any[] = Array.isArray(version?.tools) ? version.tools : []
  tools.forEach((t: any) => {
    // toolType：'1' 内置工具 / '2' MCP，仅 MCP 进入工具候选
    if (String(t?.toolType) !== '2') return
    toSchemaConfigList(t?.toolConfig).forEach((c: any) => {
      if (c?.id == null) return
      const sse: any[] = Array.isArray(c.mcp_sse) ? c.mcp_sse : []
      const streamable: any[] = Array.isArray(c.mcp_streamable) ? c.mcp_streamable : []
      mcps.push({
        id: String(c.id),
        name: c.name || '',
        protocol: sse.length > 0 ? 'sse' : 'streamable',
        sseGroupIds: normalizeBoundMcpGroupIds(sse),
        namespaceId: toNamespaceId(sse[0] ?? streamable[0])
      })
    })
  })

  return { skills, mcps }
}

function normalizeBoundMcpGroupIds(raw: unknown): Array<string | number> {
  if (!Array.isArray(raw)) return []
  return [...new Map(raw
    .filter((id): id is string | number =>
      (typeof id === 'string' && id.trim() !== '') || (typeof id === 'number' && Number.isFinite(id)))
    .map((id) => [String(id), id])).values()]
}
/** namespaceId 统一形态为 s_<groupId>；兼容详情历史数据存裸 groupId 的情况 */
function toNamespaceId(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  return raw.startsWith('s_') ? raw : `s_${raw}`
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

/** 查询当前助手的历史会话列表（倒序由后端保证）；失败返回空列表不阻断抽屉展示 */
export async function fetchSessionList(cfg: WidgetConfig, appId: string, spaceId?: number | string): Promise<WidgetSessionItem[]> {
  try {
    const json = await postJson(cfg, API.sessionList, {
      appId: Number(appId) || 0,
      spaceId: spaceId ?? undefined,
    })
    if (!isOk(json)) return []
    const list = json?.data?.data ?? json?.data ?? []
    if (!Array.isArray(list)) return []
    return list
      .map((it: any) => {
        const sessionId = it?.sessionId ?? it?.session_id ?? it?.chat_id ?? it?.chatId
        const convUid = it?.convUid ?? it?.conv_uid
        const dbName = it?.dbName ?? it?.db_name
        const rawTime = it?.update_time ?? it?.updateTime ?? it?.create_time ?? it?.createTime
        const parsedTime = typeof rawTime === 'number' ? rawTime : rawTime ? Date.parse(String(rawTime)) : NaN
        return {
          sessionId: sessionId ? String(sessionId) : '',
          convUid: convUid ? String(convUid) : '',
          title: String(it?.title ?? it?.biz_name ?? '新建对话'),
          dbName: dbName ? String(dbName) : undefined,
          updatedAt: Number.isFinite(parsedTime) ? parsedTime : undefined,
          sortOrder: Number(it?.sortOrder ?? it?.sort_order) || 0,
        }
      })
      .filter((it: WidgetSessionItem) => it.sessionId && it.convUid)
  } catch {
    return []
  }
}

/** 更新会话（重命名 title / 置顶 sortOrder）；title 后端必填，调用方不改名时也需回传原标题；返回是否成功 */
export async function updateSession(
  cfg: WidgetConfig,
  params: { sessionId: string; title: string; sortOrder?: number; spaceId?: number | string },
): Promise<boolean> {
  try {
    const body: Record<string, unknown> = {
      sessionId: params.sessionId,
      title: params.title,
      spaceId: params.spaceId ?? undefined,
      // 后端必填：同 ensureSession/sendChatStream 口径，免登录缺失时落 0
      userId: getCurrentUserId(),
    }
    if (params.sortOrder !== undefined) body.sortOrder = params.sortOrder
    const json = await postJson(cfg, API.sessionUpdate, body)
    return isOk(json)
  } catch {
    return false
  }
}

/** 删除会话（后端会话与消息一次删）；返回是否成功 */
export async function deleteSession(cfg: WidgetConfig, params: { sessionId: string; convUid: string }): Promise<boolean> {
  try {
    const json = await postJson(cfg, API.sessionDelete, { sessionId: params.sessionId, convUid: params.convUid })
    return isOk(json)
  } catch {
    return false
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
  /** 闲聊/超范围屏蔽（illegal_query）：后端把提示语放在 <think>"illegal_query": "..."</think>，
   *  且含真实换行会被 SSE 截断，这里解析前拦截并直接以完整提示语收尾（同主对话），参数为最终展示文案 */
  onIllegalQuery?: (text: string) => void
}

/** illegal_query 兜底提示语：闭合标签随换行被 SSE 丢弃、尾部不可恢复时用此文案补全（同主对话） */
const ILLEGAL_QUERY_FALLBACK_TIP =
  '温馨提示：您的问题有点超出我当前的理解范围了。\n～可能是我掌握的“词汇量”还不够，暂时无法与我数据库语义信息匹配😊'

/** 对话模型：跟随宿主 APP_CONFIG（分享页同源），第三方嵌入无 APP_CONFIG 时用默认值 */
function getChatModel(): string {
  try {
    return (window as any)?.APP_CONFIG?.VITE_CHAT_MODEL || 'qwen3:30b-a3b-fp16'
  } catch {
    return 'qwen3:30b-a3b-fp16'
  }
}

/** 发送透传项（输入工具栏）：思考开关与选中技能/MCP 源版本 id；字段名同主对话探索模式协议 */
export interface WidgetSendExtras {
  /** 深度思考开关（缺省 true，与现状一致） */
  enableThinking?: boolean
  /** 选中技能源版本 id */
  skillSourceVersionIds?: Array<string | number>
  /** 选中 MCP 源版本 id（sse 协议） */
  sseMcpSourceVersionIds?: Array<string | number>
  /** 选中 MCP 源版本 id（streamable 协议） */
  streamableMcpSourceVersionIds?: Array<string | number>
}

/** 去重 + 过滤空值（同主对话 normalizeIdList） */
function normalizeIdList(ids?: Array<string | number>): Array<string | number> {
  return Array.from(new Set((ids || []).filter((id) => id !== '' && id !== null && id !== undefined)))
}

/**
 * 发送对话（SSE 流式，与助手对话链路一致）：
 * 同 useConversationController 走 /chat-proxy/api/v2/workflow/chat/completions，
 * stream/incremental 参数对齐，context 绑定会话与助手 app_id；鉴权靠 Authorization token，不再随 body 附 shareCode。
 * chat_mode 初版假设 'chat_with_assistant_share'，后端联调时按实际约定调整（集中此处）。
 */
export function sendChatStream(
  cfg: WidgetConfig,
  session: WidgetSession,
  question: string,
  appId: string,
  signal: AbortSignal,
  { onDelta, onDone, onError, onIllegalQuery }: StreamChatCallbacks,
  semantic?: WidgetSemanticSelection | null,
  spaceId?: number | string,
  extras?: WidgetSendExtras,
): void {
  const base = String(cfg.apiBase || '').replace(/\/+$/, '')
  const spaceIdNum = Number(spaceId)
  const skillIds = normalizeIdList(extras?.skillSourceVersionIds)
  const sseMcpIds = normalizeIdList(extras?.sseMcpSourceVersionIds)
  const streamableMcpIds = normalizeIdList(extras?.streamableMcpSourceVersionIds)
  // 未选中任何技能/MCP 时不下发字段，避免污染后端默认行为（同语义字段口径）
  const hasToolSelection = skillIds.length > 0 || sseMcpIds.length > 0 || streamableMcpIds.length > 0
  let buf = ''
  // 同主对话流式管线：reasoning_content 单独到达时需包装 <think>；[DONE]/提前断流时闭合
  let isReasoning = false
  // 收尾重入守卫（[DONE] 与 onclose 二选一生效）
  let done = false
  // 后端可能重发全量前缀：记录上一次 content，仅追加新增部分（同主对话）
  let lastContent = ''

  const finalize = () => {
    // [DONE] 后服务端关流还会触发 onclose：收尾仅一次，避免 onDone 双发（重复查轮次/回补）
    if (done) return
    done = true
    if (isReasoning) {
      buf += '</think>'
      isReasoning = false
    }
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
        // 选中技能/MCP 时随 context 顶层下发（字段名同主对话探索模式协议）
        ...(hasToolSelection
          ? {
              skills_source_version_ids: skillIds,
              sse_mcp_source_version_ids: sseMcpIds,
              mcp_streamable_source_version_ids: streamableMcpIds,
            }
          : {}),
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
          // 与主对话深度思考开启态一致：缺省开启（保持现状），工具栏关闭后下发 false
          extra_body: { enable_thinking: extras?.enableThinking !== false },
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
      if (!event.data || done) return
      if (event.data === '[DONE]') {
        finalize()
        return
      }
      // illegal_query（闲聊/超范围屏蔽）：必须在 JSON.parse 之前拦截。
      // 提示语含真实换行 → 该 chunk 为非法 JSON（字符串内裸换行），parse 会抛错；
      // 且闭合
      // 标签随换行被 SSE 丢弃、尾部不可恢复，故解析前直接以完整提示语收尾（同主对话）。
      if (event.data.includes('illegal_query') || buf.includes('illegal_query')) {
        const combined = buf + event.data
        const closed = combined.match(/"illegal_query":\s*"([\s\S]*?)"\s*<\/think>/)
        const tip = closed ? (closed[1] || '').replace(/\\n/g, '\n') : ILLEGAL_QUERY_FALLBACK_TIP
        done = true
        isReasoning = false
        if (onIllegalQuery) onIllegalQuery(tip)
        else onDone(tip)
        return
      }
      try {
        const parsed = JSON.parse(event.data)
        // 流内业务错误体：转为异常终止（抛错后由 onerror 统一回调）
        if (parsed && typeof parsed === 'object' && Number(parsed.code) >= 400) {
          throw new Error(parsed.msg || '请求失败')
        }
        const delta = parsed?.choices?.[0]?.delta
        const reasoning = delta?.reasoning_content
        if (typeof reasoning === 'string' && reasoning.length > 0) {
          // 思考内容单独放在 reasoning_content 逐字输出：包装 <think> 复用思考卡链路（同主对话）
          if (!isReasoning) {
            buf += '<think>'
            isReasoning = true
          }
          buf += reasoning
          // 记录占位串，避免 reasoning 结束后占位串被当作新正文重复处理
          if (typeof delta?.content === 'string') lastContent = delta.content
          onDelta(buf)
          return
        }
        if (reasoning === null && isReasoning) {
          // reasoning 切换为 null 代表思考结束：闭合 <think>（同主对话）
          buf += '</think>'
          isReasoning = false
          lastContent = ''
        }
        const content = delta?.content
        if (typeof content === 'string' && content) {
          const append = lastContent && content.startsWith(lastContent) ? content.slice(lastContent.length) : content
          lastContent = content
          if (append) {
            buf += append
            onDelta(buf)
          }
        }
      } catch (err) {
        // JSON.parse 失败的普通增量忽略（SyntaxError）；仅业务错误体（手动 throw 的 Error）向上抛终止
        if (err instanceof Error && err.name !== 'SyntaxError') throw err
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
  // 不要求闭合引号：流式中值未到达完整时可增量提取已到达部分（同主对话思考逐字展示效果）
  const re = new RegExp('"' + field + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)')
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
  for (const field of ['thought', 'thoughts', 'task_type', 'sql', 'type', 'title']) {
    const v = extractJsonStringField(src, field)
    if (v != null) out[field] = v
  }
  for (const field of ['answer', 'response', 'result', 'text', 'content', 'desc', 'data_knowledge']) {
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
    typeof parsed.thoughts === 'string' ||
    typeof parsed.sql === 'string' ||
    typeof parsed.desc === 'string' ||
    typeof parsed.answer === 'string' ||
    typeof parsed.response === 'string' ||
    typeof parsed.result === 'string')

/** 深度思考内联边界（同主对话）：开始“## 1. 🧠 思考过程”、结束“## 3. 🔧 查询模式”；分享流模型变体“## 1. 💡 分析思路”/“## 2. 🔧 查询模式”一并识别 */
const THINK_START_REGEX = /##\s*1\.\s*(?:🧠\s*思考过程|💡\s*分析思路)/
const THINK_END_REGEX = /##\s*[23]\.\s*🔧\s*查询模式/

/**
 * 把全文中的内联思考段包装为 <think>…</think>（同主对话深度思考开启态）。
 * 流式增量与历史全文共用：未闭合段（流式进行中）整体包装，下次到达结束标记后自动收口。
 */
function wrapInlineThinking(src: string): string {
  let out = ''
  let rest = src
  for (;;) {
    const startM = rest.match(THINK_START_REGEX)
    if (!startM) break
    const before = rest.slice(0, startM.index!)
    const after = rest.slice(startM.index! + startM[0].length)
    const endM = after.match(THINK_END_REGEX)
    // 模型可能在思考标记前泄漏未闭合 JSON 头（如 `{\n  "thought`）：括号不平衡即整段丢弃，避免污染正文
    const head = /^\s*\{/.test(before) && before.split('{').length !== before.split('}').length ? '' : before
    if (endM) {
      out += head + '<think>' + after.slice(0, endM.index!) + '</think>'
      rest = after.slice(endM.index! + endM[0].length)
    } else {
      out += head + '<think>' + after
      rest = ''
      break
    }
  }
  return out + rest
}

/**
 * 从后往前找尾部平衡的顶层 JSON 块并严格解析验证（同主对话 extractTrailingJson 策略）：
 * 正文可能含 {（如 markdown 代码块），贪婪正则会连正文一起吞掉，此处只认 JSON.parse 通过的块。
 */
function findTrailingJsonBlock(src: string): { parsed: any; block: string; index: number } | null {
  const trimmed = src.trimEnd()
  if (!trimmed.endsWith('}')) return null
  let depth = 0
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const ch = trimmed[i]
    if (ch === '}') depth++
    else if (ch === '{') {
      depth--
      if (depth === 0) {
        // 确保前面不是 JSON 的一部分（前一个非空字符不能是 , : { [ 等）；位于文首的块交由 ^{ 整段分支处理
        const before = trimmed.slice(0, i).trimEnd()
        const lastChar = before[before.length - 1]
        if (lastChar && lastChar !== ',' && lastChar !== ':' && lastChar !== '{' && lastChar !== '[') {
          const block = trimmed.slice(i)
          try {
            const p = JSON.parse(block)
            if (p && typeof p === 'object') return { parsed: p, block, index: i }
          } catch {
            // 非法 JSON 交由贪婪匹配 + 宽容提取回退
          }
        }
        return null
      }
    }
  }
  return null
}

/** 流内占位标记（同主对话 displayMessage/normalizeStepContent）：round_index 由调用方提前提取，展示层统一剥离避免泄漏进思考卡/正文 */
const stripStreamMarkers = (s: string): string =>
  s.replace(/round_index:\d+,?\s*/g, '').replace(/sub_chat_mode:\w+,?\s*/g, '')

/**
 * 结构化解析 AI 原始回复（与主对话管线对齐）：
 * - thinking：<think>…</think> 段（含内联 “## 1. 🧠 思考过程” 标记与未闭合流式段）+ 结构化 thought/thoughts 字段拼接
 * - text：剥离思考段后的展示文本；尾部结构化 JSON（task_type / thought / sql / desc 等）提取其中回复文本替换，裸 JSON 不进入正文
 * - json：尾部结构化 JSON 对象（含 sql/data/type 等，用于图表渲染）；无则 null
 */
export function parseAiRaw(raw: string): { thinking: string; text: string; json: any | null } {
  const thinks: string[] = []
  const closed = wrapInlineThinking(raw).replace(/<think>([\s\S]*?)<\/think>/g, (_m, inner: string) => {
    const t = String(inner).trim()
    if (t) thinks.push(t)
    return ''
  })
  // 流式进行中未闭合的 <think> 段：归入思考内容，正文不闪现（同主对话流式思考展示）
  let withoutThink = closed
  const openIdx = closed.lastIndexOf('<think>')
  if (openIdx >= 0) {
    const t = closed.slice(openIdx + 7).trim()
    if (t) thinks.push(t)
    withoutThink = closed.slice(0, openIdx)
  }
  // chat_with_knowledge：content 为 ```json 围栏包裹、以 thoughts 为首字段的 JSON，剥离围栏后走统一 JSON 解析（同主对话）
  let text = withoutThink.replace(/^\s*```(?:json)?\s*(?=\{)/i, '').replace(/```\s*$/, '')
  let json: any | null = null
  // 优先尾部平衡且可严格解析的 JSON 块；非法 JSON（字符串值内字面换行等）回退贪婪匹配；流式未闭合整段以 { 开头时按未完成块处理
  const balanced = findTrailingJsonBlock(text)
  const greedy = balanced ? null : text.match(/\{[\s\S]*\}\s*$/)
  const block = balanced ? balanced.block : greedy ? greedy[0] : /^\s*\{/.test(text) ? text : null
  const blockIndex = balanced ? balanced.index : greedy ? (greedy.index ?? 0) : 0
  if (block) {
    let parsed: any = balanced ? balanced.parsed : null
    if (!parsed) {
      if (greedy) {
        try {
          const p = JSON.parse(block)
          if (p && typeof p === 'object') parsed = p
        } catch {
          parsed = lenientParseTail(block)
        }
      } else {
        parsed = lenientParseTail(block)
      }
    }
    if (parsed && isStructuredPayload(parsed)) {
      json = parsed
      const thoughtStr = typeof parsed.thought === 'string' ? parsed.thought : typeof parsed.thoughts === 'string' ? parsed.thoughts : ''
      if (thoughtStr.trim()) thinks.push(thoughtStr.trim())
      text = text.slice(0, blockIndex).concat(answerFromParsed(parsed))
    } else if (!parsed && blockIndex > 0) {
      // 尾部块无法识别仅截断尾部；整段以 { 开头且提取不到字段时保留原文（避免正文被清空降级）
      text = text.slice(0, blockIndex)
    }
  }
  return { thinking: stripStreamMarkers(thinks.join('\n\n')), text: stripStreamMarkers(text), json }
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

/** 按轮次搜本轮 view 消息（同主对话 ViewEle fetchData 的 messages/search）；返回其 context（desc/data/sql 等 view 原文），未落库或失败返回 null */
export async function fetchViewContextByRound(cfg: WidgetConfig, convUid: string, roundIndex: number): Promise<unknown> {
  try {
    const json = await postJson(cfg, API.viewSearch, { conv_uid: convUid, round_index: roundIndex })
    if (!isOk(json)) return null
    const items = json?.data?.items
    return Array.isArray(items) && items.length > 0 ? (items[0]?.context ?? null) : null
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
  return (
    seg.text || seg.content || parsed.text || parsed.content || parsed.answer || parsed.response || parsed.result ||
    // ViewEle 正文取 desc（非知识场景）/ data_knowledge（知识场景），同主对话口径
    parsed.desc || parsed.data_knowledge || ''
  )
}

import request from "../request/index";
// 获取基础API地址
import { getChatbiBaseApi } from "../../utils/index";

function getCurrentUserId(): number | undefined {
  try {
    const userInfoStr = localStorage.getItem('SOY-REACT_userInfo')
    if (userInfoStr) {
      const userInfo = JSON.parse(userInfoStr)
      if (userInfo.userId != null) return Number(userInfo.userId)
    }
    const uid = localStorage.getItem('userId')
    if (uid != null) return Number(uid)
  } catch {
    // ignore
  }
  return undefined
}

function mapAppListParams(params: any) {
  return {
    // 对话页会话列表固定查询 appId=0；大屏（dashboard）使用 appId=1，以此隔离两端会话
    appId: 0,
    spaceId: params.space_id ?? params.spaceId,
    userId: params.userId ?? getCurrentUserId(),
  }
}

function mapAppCreateParams(data: any) {
  return {
    appId: 0,
    spaceId: data.space_id ?? data.spaceId,
    title: data.title ?? '新建对话',
    userId: data.userId ?? getCurrentUserId(),
    groupId: data.groupId ?? '0',
    remark: data.remark,
  }
}

function mapAppItemToLegacy(item: any) {
  if (!item || typeof item !== 'object') return item

  // 优先使用 sessionId 作为唯一标识（后端返回的就是 string）
  const chatId = item.sessionId ?? item.session_id ?? item.chat_id ?? item.chatId

  return {
    ...item,
    chat_id: chatId,
    biz_name: item.biz_name ?? item.title,
    title: item.title ?? item.biz_name,
    space_id: item.space_id ?? item.spaceId,
    app_code: item.app_code ?? item.appCode,
    agent_id: item.agent_id ?? item.agentId,
    conv_uid: item.conv_uid ?? item.convUid,
    create_time: item.create_time ?? item.createTime,
    update_time: item.update_time ?? item.updateTime,
  }
}

function mapAppListResponse(res: any) {
  if (Array.isArray(res)) {
    return { data: res.map(mapAppItemToLegacy) }
  }
  if (res && Array.isArray(res.data)) {
    return { ...res, data: res.data.map(mapAppItemToLegacy) }
  }
  if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
    const items = res.data.items || res.data.list || res.data.records
    if (Array.isArray(items)) {
      return { ...res, data: items.map(mapAppItemToLegacy) }
    }
  }
  return res
}

function mapAppCreateResponse(res: any) {
  if (!res || !res.data) return res
  return {
    ...res,
    data: mapAppItemToLegacy(res.data),
  }
}

// 获取助手列表
export function fetchAgentList(params: any) {
  return request({
    url: "/copilot/v1/agentConfig/dataset",
    method: "get",
    params,
    baseURL: getChatbiBaseApi()
  });
}

// 获取助手配置信息
export function fetchAgentInfoById(agentId: number) {
  return request({
    url: `/copilot/v1/agentConfig/${agentId}`,
    method: "get",
    baseURL: getChatbiBaseApi()
  });
}

// 根据agentId获取表语义列表
export function fetchSchemaById(agentId: number) {
  return request({
    url: `/copilot/v1/agentConfig/schema/${agentId}`,
    method: "get",
    baseURL: getChatbiBaseApi()
  });
}

// 根据agentId获取数据源
export function fetchDatasourceById(agentId: number) {
  return request({
    url: `/copilot/v1/agentConfig/ds/${agentId}`,
    method: "get",
    baseURL: getChatbiBaseApi()
  });
}

//新建app
export function createApp(data: any) {
  return request({
    url: "/abi-chat/v1/app/session/add",
    method: "post",
    data: mapAppCreateParams(data),
    baseURL: window.APP_CONFIG?.VITE_BASE_API, // 设置基础 URL，根据实际情况修改 '/接口前缀', //import.meta.env.VITE_BASE_URL
  }).then(mapAppCreateResponse);
}

// 查询name是否存在
export function checkAppNameExists(data:{ biz_name: string,space_id: number}) {
  return request({
    url: "/chat-proxy/api/v1/chat/app/validate_name",
    method: "post",
    data,
    baseURL: window.APP_CONFIG?.VITE_BASE_API, // 设置基础 URL，根据实际情况修改 '/接口前缀', //import.meta.env.VITE_BASE_URL
  });
}

// 请求去重：同一时刻只允许一个 fetchAppList 在飞行中，后续调用复用同一 promise
let _appListInflight: Promise<any> | null = null

// 获取app列表
export function fetchAppList(params: any) {
  if (_appListInflight) return _appListInflight
  _appListInflight = request({
    url: "/abi-chat/v1/app/session/list",
    method: "post",
    data: mapAppListParams(params),
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  }).then(mapAppListResponse).finally(() => { _appListInflight = null })
  return _appListInflight
}


// 删除app
export function deleteApp(data: any) {
  return request({
    url: "/chat-proxy/api/v1/chat/app/delete",
    method: "post",
    data,
    baseURL: window.APP_CONFIG?.VITE_BASE_API, // 设置基础 URL，根据实际情况修改 '/接口前缀', //import.meta.env.VITE_BASE_URL
  });
}

// 删除会话（后端已将会话与对话消息删除合并，一次调用传 sessionId + convUid）
export function deleteSession(params: { sessionId: string; convUid?: string }) {
  return request({
    url: "/abi-chat/v1/app/session/delete",
    method: "post",
    data: { sessionId: params.sessionId, convUid: params.convUid },
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  })
}

// 批量删除会话（按对话ID convUid 批量删除）
export function deleteBatchSession(params: { convUids: string[] }) {
  return request({
    url: "/abi-chat/v1/app/session/deleteBatch",
    method: "post",
    data: { convUids: params.convUids },
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  })
}

// 删除对话消息
export function deleteMessage(params: { convUid: string }) {
  return request({
    url: "/abi-chat/v1/app/message/delete",
    method: "post",
    data: { convUid: params.convUid },
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  })
}

// 按轮次批量删除对话消息
export function deleteMessageByRound(params: { convUid: string; roundIndex: number[] }) {
  return request({
    url: "/abi-chat/v1/app/message/deleteByRound",
    method: "post",
    data: { convUid: params.convUid, roundIndex: params.roundIndex },
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  })
}

// 保存为app
export function saveAsApp(data: any) {
  return request({
    url: "/chat-proxy/api/v1/chat/app/save_as",
    method: "post",
    data,
    baseURL: window.APP_CONFIG?.VITE_BASE_API, // 设置基础 URL，根据实际情况修改 '/接口前缀', //import.meta.env.VITE_BASE_URL
  });
}

export interface FetchSessionMessagesParams {
  convUid: string | number
  pageNum?: number
  pageSize?: number
}

// React StrictMode 会在开发环境重挂载组件；相同会话的并发历史请求复用同一个 Promise，避免重复访问 query。
const sessionMessagesInflight = new Map<string, Promise<any>>()

function getSessionMessagesRequestKey(params: FetchSessionMessagesParams) {
  return JSON.stringify([
    String(params.convUid),
    params.pageNum ?? null,
    params.pageSize ?? null,
  ])
}

// 获取会话消息列表
export function fetchSessionMessages(params: FetchSessionMessagesParams) {
  const requestKey = getSessionMessagesRequestKey(params)
  const inflightRequest = sessionMessagesInflight.get(requestKey)
  if (inflightRequest) return inflightRequest

  const requestPromise = request({
    url: "/abi-chat/v1/app/message/query",
    method: "post",
    data: params,
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  }).finally(() => {
    // 只清理当前 Promise，防止极端竞态误删同 key 的下一次请求。
    if (sessionMessagesInflight.get(requestKey) === requestPromise) {
      sessionMessagesInflight.delete(requestKey)
    }
  })

  sessionMessagesInflight.set(requestKey, requestPromise)
  return requestPromise
}

// 获取会话详情
export function fetchSessionDetail(params: { sessionId: string | number }) {
  return request({
    url: "/abi-chat/v1/app/session/get",
    method: "post",
    data: params,
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  })
}

// 更新会话（支持 title / sortOrder 置顶排序等字段）
export function updateApp(data: any): Promise<any> {
  const sessionId = data.sessionId ?? data.chat_id ?? data.session_id
  const payload: Record<string, any> = {
    sessionId,
    title: data.title ?? data.biz_name,
    spaceId: data.spaceId ?? data.space_id ?? getSpaceId(),
    userId: data.userId ?? getCurrentUserId(),
  }
  // sortOrder 用于置顶排序（与分组一致），仅在传入时携带，避免覆盖成默认值
  if (data.sortOrder !== undefined) payload.sortOrder = data.sortOrder
  return request({
    url: "/abi-chat/v1/app/session/update",
    method: "post",
    data: payload,
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  })
}

function getSpaceId() {
  try {
    const raw = localStorage.getItem('SOY-REACT_spaceId') || localStorage.getItem('spaceId')
    return raw ? Number(raw) : undefined
  } catch { return undefined }
}

// ============ 会话分组管理接口 ============

export interface SessionGroup {
  groupId: string
  groupName: string
  spaceId: number
  status?: string // '0'-禁用 '1'-启用
  parentId?: string
  level?: number
  sortOrder?: number
  remark?: string
}

export interface AddGroupParams {
  groupName: string
  spaceId: number
  status?: string
  parentId?: number
  level?: number
  sortOrder?: number
  remark?: string
}

export interface UpdateGroupParams {
  groupId: string
  groupName?: string
  spaceId?: number
  status?: string
  parentId?: string
  level?: number
  sortOrder?: number
  remark?: string
}

export interface ListGroupParams {
  spaceId?: number
  groupName?: string
  status?: string
  parentId?: number
}

// 新增分组
export function addSessionGroup(data: AddGroupParams) {
  return request({
    url: "/abi-chat/v1/app/session/group/add",
    method: "post",
    data,
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  })
}

// 更新分组
export function updateSessionGroup(data: UpdateGroupParams) {
  return request({
    url: "/abi-chat/v1/app/session/group/update",
    method: "post",
    data,
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  })
}

// 请求去重：同一时刻只允许一个 fetchSessionGroupList 在飞行中
let _groupListInflight: Promise<any> | null = null

// 查询分组列表
export function fetchSessionGroupList(data: ListGroupParams) {
  if (_groupListInflight) return _groupListInflight
  _groupListInflight = request({
    url: "/abi-chat/v1/app/session/group/list",
    method: "post",
    data,
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  }).finally(() => { _groupListInflight = null })
  return _groupListInflight
}

// 删除分组
export function deleteSessionGroup(data: { groupId: string }) {
  return request({
    url: "/abi-chat/v1/app/session/group/delete",
    method: "post",
    data,
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  })
}

// 移动会话到分组
export function moveSessionToGroup(data: { sessionId: string; groupId: string; title: string }) {
  return request({
    url: "/abi-chat/v1/app/session/update",
    method: "post",
    data: {
      sessionId: data.sessionId,
      groupId: data.groupId,
      title: data.title,
      userId: getCurrentUserId(),
      spaceId: getSpaceId(),
    },
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  })
}

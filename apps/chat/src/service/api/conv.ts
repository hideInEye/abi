import { fetchEventSource } from '@microsoft/fetch-event-source'
import type { EventSourceMessage } from '@microsoft/fetch-event-source'
import { isBackendCodeIn } from "@sa/axios";
import request from "../request/index";
import { getChatbiBaseApi } from "../../utils/index";
import { getAuthorization, handleLoginExpired } from "../../utils/auth";

// 与 axios 响应拦截器保持一致：后端可能以 HTTP 401，或 200 + { code: 401 } 业务码返回鉴权失效
const TOKEN_EXPIRED_CODES = ['401'];

// 鉴权失效专用错误，用于在 onerror 中识别并终止重试（避免被通用重试逻辑吞掉、延迟跳转登录）
class UnauthorizedStreamError extends Error {
  constructor() {
    super('Token expired')
    this.name = 'UnauthorizedStreamError'
  }
}

// 流式接口的鉴权失效判定：优先 HTTP 401；否则在非事件流响应体中读取业务码 401
async function isUnauthorizedResponse(response: Response) {
  if (response.status === 401) {
    return true
  }

  const contentType = response.headers.get('content-type') || ''
  // 正常事件流不读取 body，避免消费流内容
  if (contentType.includes('text/event-stream')) {
    return false
  }

  try {
    const errData = await response.clone().json()
    return isBackendCodeIn(errData, TOKEN_EXPIRED_CODES)
  } catch {
    return false
  }
}

type StreamConvAnswerOptions = {
  data: any
  signal: AbortSignal
  onopen?: (response: Response) => Promise<void>
  onmessage?: (event: EventSourceMessage) => void | Promise<void>
  onclose?: () => void
  onerror?: (err: any) => number | null | undefined | void
}

export function streamConvAnswer({ data, signal, onopen, onmessage, onclose, onerror }: StreamConvAnswerOptions) {
  const authorization = getAuthorization()

  return fetchEventSource(`${window.APP_CONFIG.VITE_BASE_API}/chat-proxy/api/v2/workflow/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {})
    },
    body: JSON.stringify(data),
    signal,
    openWhenHidden: true,
    async onopen(response) {
      // 兼容 HTTP 401 与业务码 401 两种鉴权失效返回，触发跳转登录
      if (await isUnauthorizedResponse(response)) {
        await handleLoginExpired()
        throw new UnauthorizedStreamError()
      }

      await onopen?.(response)
    },
    onmessage,
    onclose,
    onerror(err) {
      // 鉴权失效不重试，直接终止（跳转登录已触发），避免重试掩盖或延迟跳转
      if (err instanceof UnauthorizedStreamError) {
        throw err
      }

      return onerror?.(err)
    }
  })
}

type StreamExplorePlanOptions = {
  data: any
  signal: AbortSignal
  onopen?: (response: Response) => Promise<void>
  onmessage?: (event: EventSourceMessage) => void | Promise<void>
  onclose?: () => void
  onerror?: (err: any) => number | null | undefined | void
}

export function streamExplorePlan({ data, signal, onopen, onmessage, onclose, onerror }: StreamExplorePlanOptions) {
  const authorization = getAuthorization()

  return fetchEventSource(`${window.APP_CONFIG.VITE_BASE_API}/chat-proxy/api/v2/chat/plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {})
    },
    body: JSON.stringify(data),
    signal,
    openWhenHidden: true,
    async onopen(response) {
      if (await isUnauthorizedResponse(response)) {
        await handleLoginExpired()
        throw new UnauthorizedStreamError()
      }

      await onopen?.(response)
    },
    onmessage,
    onclose,
    onerror(err) {
      if (err instanceof UnauthorizedStreamError) {
        throw err
      }

      return onerror?.(err)
    }
  })
}

//列出全部对话
export function fetchConvList(data: any) {
  return request({
    url: "/chat-proxy/api/v1/chat/conv/list",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 分页查询对话列表
export function fetchConvListPages(data: {spaceId: number; page: number; pageSize: number }) {
  return request({
    url: `/chat-proxy/api/v1/chat/conv/query_page?page=${data.page}&page_size=${data.pageSize}`,
    method: "post",
    data: { space_id: data.spaceId },
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

//新建会话
export function newConv(data: any) {
  return request({
    url: "/chat-proxy/api/v1/chat/conv/new",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 查询聊天内容
export function fetchConvHistory(data: any) {
  return request({
    url: "/chat-proxy/api/v1/chat/conv/messages/history",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 接口已废弃，保留逻辑不请求
export function fetchConvHistoryRound(data: any) {
  // TODO: 接口已停用，恢复时取消注释
  // return request({
  //   url: "/chat-proxy/api/v1/chat/conv/messages/history_round",
  //   method: "post",
  //   data,
  //   baseURL: window.APP_CONFIG.VITE_BASE_API
  // });
  return Promise.resolve({ data: [] })
}

export const groupMessagesByOrder = (messages: any[]) => {
  const groups: any[][] = []
  const orderIndexMap = new Map<string, number>()

  messages.forEach((item: any) => {
    const orderKey = item?.order ?? item?.roundIndex
    if (orderKey === undefined || orderKey === null) {
      groups.push([item])
      return
    }

    const mapKey = String(orderKey)
    const existingIndex = orderIndexMap.get(mapKey)
    if (existingIndex === undefined) {
      orderIndexMap.set(mapKey, groups.length)
      groups.push([item])
      return
    }

    groups[existingIndex].push(item)
  })

  return groups
}

export async function fetchConvHistoryRoundGrouped(data: any) {
  const res: any = await fetchConvHistoryRound(data)
  return {
    ...res,
    data: groupMessagesByOrder(res?.data || [])
  }
}

// 获取最大对话轮次
export function fetchConvMaxRound(data: any) {
  return request({
    url: "/chat-proxy/api/v1/chat/conv/messages/round_index/max",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 获取对话增量数据
export function fetchConvIncrement(data: any) {
  return request({
    url: "/chat-proxy/api/v1/chat/conv/messages/increment_history",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 删除聊天
export function deleteConv(data: any) {
  return request({
    url: "/chat-proxy/api/v1/chat/conv/delete",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 清空聊天记录
export function clearConvHistory(data: any) {
  return request({
    url: "/chat-proxy/api/v1/chat/conv/clear",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 聊天：输入内容，请求回答内容
export function fetchConvAnswer(data: any) {
  return request({
    url: "/chat-proxy/api/v1/chat/completions",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 通过深度思考的sql语句查询图表数据
export function fetchDataBySql(data: any) {
  return request({
    url: "/chat-proxy/api/v1/chat/db/query",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 获取推荐问题
export function fetchRecommendQuestions(data: any) {
  return request({
    url: "/chat-proxy/prompt/list?map_required=true",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 修改推荐问题
export function fetchChatPromptsConfig(data: any) {
  return request({
    url: "/chat-proxy/api/v1/chat/app/query",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 保存为对话
export function saveAsConv(data: any) {
  return request({
    url: "/chat-proxy/api/v1/chat/conv/save_as",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 清空对话
export function clearConv(data: any) {
  return request({
    url: "/chat-proxy/api/v1/chat/conv/clear",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 历史对话
export function historyConv(data: { conv_uid: string; query?: { time_mode: 'today' | 'month' } }) {
  const { conv_uid, query } = data;
  return request({
    url: "/chat-proxy/api/v1/chat/conv/messages/human_history_list",
    method: "post",
    data: { conv_uid },
    params: query,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 历史对话分页
export function historyConvPages(data: { conv_uid: string; page: number; pageSize: number }) {
  return request({
    url: `/chat-proxy/api/v1/chat/conv/messages/human_history_page?time_mode=more&page=${data.page}&page_size=${data.pageSize}`,
    method: "post",
    data: { conv_uid: data.conv_uid },
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}
// 搜索对话
export function searchConv(data: { conv_uid: string; round_index: number; key: string; page: number; pageSize: number; role: string }) {
  return request({
    url: `/chat-proxy/api/v1/chat/conv/messages/search?key=${data.key}&page=${data.page}&page_size=${data.pageSize}&message_role=${data.role}`,
    method: "post",
    data: { conv_uid: data.conv_uid, round_index: data.round_index },
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 更新对话
export function updateConv(data: any) {
  return request({
    url: "/chat-proxy/api/v1/chat/conv/update",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 归因分析
export function fetchDataAnalysis(data: any) {
  return request({
    url: "/chat-proxy/api/v2/workflow/chat/data_analysis",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 预测分析
export function fetchPredictAnalysis(data: any) {
  return request({
    url: "/chat-proxy/api/v2/workflow/chat/predict_analysis",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// excel分析
export function fetchExcelAnalysis(data: any) {
  return request({
    url: "/chat-proxy/api/v2/workflow/chat_excel/completions",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 获取二次引导组件信息
export function fetchConvGuide(data: any) {
  return request({
    url: "/chat/v1/chat/queryIntroductoryMessage",
    method: "post",
    data,
    baseURL: getChatbiBaseApi()
  });
}

// 根据过滤条件组装SQL接口
export function fetchAssembleSql(data: any) {
  return request({
    url: "/chat/v1/chat/assembleSql",
    method: "post",
    data,
    baseURL: getChatbiBaseApi()
  });
}

// 根据SQL查询数据接口
export function fetchSelectDataBySql(data: any) {
  return request({
    url: "/chat/v1/chat/selectDataBySql",
    method: "post",
    data,
    baseURL: getChatbiBaseApi()
  });
}

// 数据导出接口
export function dataExport(data: any) {
  return request({
    url: "/chat/v1/chat/dataExport",
    method: "post",
    data,
    responseType: 'blob',
    baseURL: getChatbiBaseApi()
  });
}

// excel结果导出接口（chat_excel模式）
export function excelFileExport(params: { file_id: string; python: string; format: 'excel' | 'csv' }) {
  return request({
    url: "/abi-chat/v1/file/export",
    method: "post",
    params,  // Query参数
    responseType: 'blob',
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 根据查询过滤条件值
export function fetchSelectFilterValue(data: any) {
  return request({
    url: "/chat/v1/chat/selectFilterValue",
    method: "post",
    data,
    baseURL: getChatbiBaseApi()
  });
}

// excel文件列表
export function fetchFilesList(data: { bucket: string; conv_uid: string; }) {
  return request({
    url: `/chat-proxy/api/v2/serve/file/files/list/${data.bucket}/${data.conv_uid}`,
    method: "get",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// excel文件删除
export function deleteFile(data: { bucket: string; file_id: string; query: {conv_uid: string; sys_code: string}}) {
  return request({
    url: `/chat-proxy/api/v2/serve/file/files/${data.bucket}/${data.file_id}`,
    method: "delete",
    params: data.query,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// excel文件下载
export function uploadExcelFile(data: { bucket: string; file_id: string;}) {
  return request({
    url: `/chat-proxy/api/v2/serve/file/files/${data.bucket}/${data.file_id}`,
    method: "get",
    responseType: 'blob',
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 推荐维度
// {
//   "model": "deepseek-r1:70b-llama-distill-fp16",
//   "stream": false,
//   "messages": [
//     "按国家和品牌统计高税收的配件类型及其占比"
//   ],
//   "temperature": 0.5,
//   "max_new_tokens": 512,
//   "context": {
//     "conv_uid": "7c43d5e8-fb17-11ef-9bdc-0242ac110003",
//     "chat_id": "100001",
//     "app_code": "test-app",
//     "chat_mode": "chat_with_db_execut",
//     "agent_id": "100",
//     "space_id": "1",
//     "extra": {
//       "if_debug": false,
//       "db_name": "case_2_ecom",
//       "semantic": false
//     }
//   }
// }
export function fetchRecommendDimensions(data: any) {
  return request({
    url: "/v2/workflow/chat/recommend_dimension",
    method: "post",
    data,
    baseURL: getChatbiBaseApi()
  });
}

// 推荐指标
// {
//   "model": "deepseek-r1:70b-llama-distill-fp16",
//   "stream": false,
//   "messages": [
//     "按国家和品牌统计高税收的配件类型及其占比"
//   ],
//   "temperature": 0.5,
//   "max_new_tokens": 512,
//   "context": {
//     "conv_uid": "7c43d5e8-fb17-11ef-9bdc-0242ac110003",
//     "chat_id": "100001",
//     "app_code": "test-app",
//     "chat_mode": "chat_with_db_execut",
//     "agent_id": "100",
//     "space_id": "1",
//     "extra": {
//       "if_debug": false,
//       "db_name": "case_2_ecom",
//       "semantic": false
//     }
//   }
// }
export function fetchRecommendIndicators(data: any) {
  return request({
    url: "/v2/workflow/chat/recommend_indicator",
    method: "post",
    data,
    baseURL: getChatbiBaseApi()
  });
}

// 获取提示引导
export function fetchExceptionGuidance(data: any) {
  return request({
    url: "/chat-proxy/api/v2/workflow/chat/exception_guidance",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 点赞点踩
export function setExperteval(data: any) {
  return request({
    url: "/abi-chat/v1/app/message/feedback/add",
    method: "post",
    data,
    baseURL: window.APP_CONFIG?.VITE_BASE_API
  });
}

// 获取推荐问题（问数/归因/预测）
export function fetchRecommendQuestion(data: any) {
  return request({
    url: "/chat-proxy/api/v2/workflow/chat/query_recommend",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API,
    timeout: 120 * 1000
  });
}

// 获取推荐维度
export function fetchDimension(data: any) {
  return request({
    url: "/chat-proxy/api/v2/workflow/chat/recommend_dimension",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API,
    timeout: 120 * 1000
  });
}

// 归因分析/预测分析/推荐维度/指标 问了之后获取回答接口
export function fetchQueryRewrite(data: any) {
  return request({
    url: "/chat-proxy/api/v2/workflow/chat/queryRewrite",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API,
    timeout: 120 * 1000
  });
}

// 下钻
export function fetchDrillDown(data: any) {
  return request({
    url: "/chat/v1/chat/drillDown",
    method: "post",
    data,
    baseURL: getChatbiBaseApi()
  });
}

// 推荐问题-开场白
export function fetchRecommendedQuestionOpenings(params: any) {
  return request({
    url: "/chat-proxy/api/v1/copilot/rec_question",
    method: "post",
    params,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

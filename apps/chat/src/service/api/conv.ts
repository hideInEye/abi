import request from "../request/index";
import { getChatbiBaseApi } from "../../utils/index";

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

export function fetchConvHistoryRound(data: any) {
  return request({
    url: "/chat-proxy/api/v1/chat/conv/messages/history_round",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
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
    url: "/chat-proxy/api/v1/feedback/experteval",
    method: "post",
    data,
    baseURL: window.APP_CONFIG.VITE_BASE_API
  });
}

// 获取推荐问题
export function fetchRecommendQuestion(data: any) {
  return request({
    url: "/chat-proxy/api/v2/workflow/chat/recommend_question",
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

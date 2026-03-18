import { apiRequest } from '../request';

// 列出全部对话
export function fetchConvList(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/chat-proxy/api/v1/chat/conv/list'
  });
}

// 新建会话
export function newConv(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/chat-proxy/api/v1/chat/conv/new'
  });
}

// 查询聊天内容
export function fetchConvHistory(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/chat-proxy/api/v1/chat/conv/messages/history'
  });
}

// 删除聊天
export function deleteConv(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/chat-proxy/api/v1/chat/conv/delete'
  });
}

// 清空聊天记录
export function clearConvHistory(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/chat-proxy/api/v1/chat/conv/clear'
  });
}

// 聊天：输入内容，请求回答内容
export function fetchConvAnswer(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/chat-proxy/api/v1/chat/completions'
  });
}

// 通过深度思考的sql语句查询图表数据
export function fetchDataBySql(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/chat-proxy/api/v1/chat/db/query'
  });
}

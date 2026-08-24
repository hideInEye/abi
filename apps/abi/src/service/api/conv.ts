import { fetchEventSource } from '@microsoft/fetch-event-source';
import type { EventSourceMessage } from '@microsoft/fetch-event-source';
import { isBackendCodeIn } from '@sa/axios';

import { handleLoginExpired } from '@/utils/auth';

import { apiRequest } from '../request';
import { getAuthorization, getUserId } from '../request/shared';

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

// ── 探索模式（与 chat 应用探索模式同源接口 /chat-proxy/api/v2/chat/plan，SSE 流式）──

// 与 axios 响应拦截器保持一致：后端可能以 HTTP 401，或 200 + { code: 401 } 业务码返回鉴权失效
const TOKEN_EXPIRED_CODES = ['401'];

// 鉴权失效专用错误，用于在 onerror 中识别并终止重试（避免被通用重试逻辑吞掉、延迟跳转登录）
class UnauthorizedStreamError extends Error {
  constructor() {
    super('Token expired');
    this.name = 'UnauthorizedStreamError';
  }
}

// 流式接口的鉴权失效判定：优先 HTTP 401；否则在非事件流响应体中读取业务码 401
async function isUnauthorizedResponse(response: Response) {
  if (response.status === 401) {
    return true;
  }

  const contentType = response.headers.get('content-type') || '';
  // 正常事件流不读取 body，避免消费流内容
  if (contentType.includes('text/event-stream')) {
    return false;
  }

  try {
    const errData = await response.clone().json();
    return isBackendCodeIn(errData, TOKEN_EXPIRED_CODES);
  } catch {
    return false;
  }
}

type StreamExplorePlanOptions = {
  data: any;
  signal: AbortSignal;
  onopen?: (response: Response) => Promise<void>;
  onmessage?: (event: EventSourceMessage) => void | Promise<void>;
  onclose?: () => void;
  onerror?: (err: any) => number | null | undefined | void;
};

// 探索模式流式对话：POST /chat-proxy/api/v2/chat/plan，与 chat 应用探索模式完全一致
export function streamExplorePlan({ data, signal, onopen, onmessage, onclose, onerror }: StreamExplorePlanOptions) {
  const authorization = getAuthorization();
  const userId = getUserId();

  return fetchEventSource('/api/chat-proxy/api/v2/chat/plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
      ...(userId ? { userId: String(userId) } : {})
    },
    body: JSON.stringify(data),
    signal,
    openWhenHidden: true,
    async onopen(response) {
      // 兼容 HTTP 401 与业务码 401 两种鉴权失效返回，触发跳转登录
      if (await isUnauthorizedResponse(response)) {
        await handleLoginExpired();
        throw new UnauthorizedStreamError();
      }

      await onopen?.(response);
    },
    onmessage,
    onclose,
    onerror(err) {
      // 鉴权失效不重试，直接终止（跳转登录已触发），避免重试掩盖或延迟跳转
      if (err instanceof UnauthorizedStreamError) {
        throw err;
      }

      return onerror?.(err);
    }
  });
}

import axios from "axios";
import { isBackendCodeIn, resolveBackendErrorMessage } from "@sa/axios";

import { getAuthorization, handleLoginExpired } from "@/utils/auth";

import { shouldHandleLoginExpiredForRequest } from "./auth-policy";

const service = axios.create({
  baseURL: '/',  // 使用相对路径，让请求通过代理转发
  headers: { "Content-Type": "application/json;charset=utf-8" },
  timeout: 30 * 1000, // 设置请求超时时间
});
// 环境判断
const isDevelopment = import.meta.env.DEV;
const TOKEN_EXPIRED_CODES = ['401'];

async function handleTokenExpired() {
  await handleLoginExpired();
}

// 业务错误提示去重：短时间内相同文案只提示一次，避免并发请求刷屏
let lastErrorMsg = '';
let lastErrorTime = 0;
function showBackendError(msg?: string) {
  const text = msg || '请求失败，请稍后重试';
  const now = Date.now();
  if (text === lastErrorMsg && now - lastErrorTime < 2000) return;
  lastErrorMsg = text;
  lastErrorTime = now;
  void import('antd/es/message').then(({ default: message }) => {
    message.error(text);
  });
}

// 判断是否为后端业务错误码（成功码约定为 200；401 由 token 过期逻辑单独处理）
function isBackendBizError(data: any): boolean {
  const code = Number(data?.code);
  return !Number.isNaN(code) && code >= 400 && code !== 401;
}

function ensureRequestBaseUrl(config: any) {
  // 开发环境：如果业务代码传入了绝对 baseURL（如 https://192.168.x.x/api/），
  // 浏览器会直接跨域请求，绕过 Vite proxy；这里把 baseURL 降级为同源路径（如 /api），让请求走代理。
  if (isDevelopment && config.baseURL && /^https?:\/\//i.test(String(config.baseURL))) {
    try {
      const parsed = new URL(String(config.baseURL));
      const pathname = parsed.pathname.replace(/\/$/, '');
      config.baseURL = pathname || '/';
    } catch {
      config.baseURL = '/';
    }
  }

  // 只在没有指定 baseURL 或 baseURL 为默认值 '/' 时才设置为 '/'
  if (isDevelopment && (!config.baseURL || config.baseURL === '/')) {
    config.baseURL = '/';
  }
}

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    ensureRequestBaseUrl(config);

    const authorization = getAuthorization();
    if (config.headers) {
      if (authorization) {
        config.headers['Authorization'] = authorization;
      } else {
        delete config.headers['Authorization'];
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    if (response.config.responseType === 'blob') {
      return response;
    }

    // 业务错误码触发 token 过期处理
    if (isBackendCodeIn(response.data, TOKEN_EXPIRED_CODES)) {
      if (shouldHandleLoginExpiredForRequest(response.config.url)) {
        void handleTokenExpired();
      } else {
        showBackendError(resolveBackendErrorMessage(response.data));
      }
      return Promise.reject(new Error((response.data as any)?.msg || 'Token expired'));
    }

    // 后端业务失败（如 {"code":500,"msg":"内部服务器错误"}）：统一弹出归纳文案，不透传后端原始异常
    if (isBackendBizError(response.data)) {
      showBackendError(resolveBackendErrorMessage(response.data));
    }

    return response.data;
  },
  (error) => {
    // 兼容两种鉴权失效返回：HTTP 401，或非 2xx（如 500）+ 响应体业务码 401
    const isUnauthorized =
      error?.response?.status === 401 || isBackendCodeIn(error?.response?.data, TOKEN_EXPIRED_CODES);
    if (isUnauthorized && shouldHandleLoginExpiredForRequest(error.config?.url)) {
      void handleTokenExpired();
    } else if (error.response) {
      // HTTP 非 2xx（含 500 内部服务器错误）：响应体无业务码时按 HTTP 状态码枚举归纳描述
      const data: any = error.response.data;
      showBackendError(resolveBackendErrorMessage({ code: data?.code ?? error.response.status, msg: data?.msg, message: data?.message }));
    } else if (error.request) {
      showBackendError('网络异常，请检查网络连接');
    }

    if (error.response) {
      console.error('Response error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Request error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default service;

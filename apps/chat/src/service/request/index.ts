import axios from "axios";
import {
  createAuthorizationHeader,
  isBackendCodeIn,
  readTokenFromLocalStorage,
  triggerTokenExpired,
} from "@sa/axios";

const service = axios.create({
  baseURL: '/',  // 使用相对路径，让请求通过代理转发
  headers: { "Content-Type": "application/json;charset=utf-8" },
  timeout: 30 * 1000, // 设置请求超时时间
});
// 环境判断
const isDevelopment = import.meta.env.DEV;
const AUTH_TOKEN_STORAGE_KEYS = ['SOY-REACT_token', 'token'];
const TOKEN_EXPIRED_CODES = ['401'];
const LOGIN_ROUTE_PATH = '/login/pwd-login';
let isHandlingTokenExpired = false;

function resolveAuthorization() {
  const token = readTokenFromLocalStorage(AUTH_TOKEN_STORAGE_KEYS);
  return createAuthorizationHeader(token);
}

function getCurrentFullPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function redirectToLogin() {
  if (window.location.pathname.startsWith(LOGIN_ROUTE_PATH)) {
    return;
  }

  const redirect = encodeURIComponent(getCurrentFullPath());
  window.location.href = `${LOGIN_ROUTE_PATH}?redirect=${redirect}`;
}

async function handleTokenExpired() {
  if (isHandlingTokenExpired) {
    return;
  }

  isHandlingTokenExpired = true;

  try {
    if (window.onTokenExpired) {
      await triggerTokenExpired(window.onTokenExpired);
      return;
    }

    redirectToLogin();
  } finally {
    window.setTimeout(() => {
      isHandlingTokenExpired = false;
    }, 1000);
  }
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

    const authorization = resolveAuthorization();
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
      void handleTokenExpired();
      return Promise.reject(new Error('Token expired'));
    }

    return response.data;
  },
  (error) => {
    if (error?.response?.status === 401) {
      void handleTokenExpired();
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

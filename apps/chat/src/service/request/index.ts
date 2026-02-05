import axios from "axios";

const service = axios.create({
  baseURL: '/',  // 使用相对路径，让请求通过代理转发
  headers: { "Content-Type": "application/json;charset=utf-8" },
  timeout: 30 * 1000, // 设置请求超时时间
});
// 环境判断
const isDevelopment = import.meta.env.DEV;

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    let token = "";
    try {
      const storedToken = localStorage.getItem('SOY-REACT_token');
      if (storedToken && storedToken !== 'undefined' && storedToken !== 'null') {
        token = JSON.parse(storedToken);
      }
    } catch (error) {
      console.error('Token processing error:', error);
    }

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

    if (config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
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
    // 处理 token 过期：业务错误码 401
    if (response.data?.code === 401) {
      // 调用主应用传递的 token 过期处理函数
      if (window.onTokenExpired) {
        window.onTokenExpired();
      }
      return Promise.reject(new Error('Token expired'));
    }
    return response.data;
  },
  (error) => {
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

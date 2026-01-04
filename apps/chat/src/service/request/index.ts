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
    // 默认 token
    // const defaultToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjpbeyJ1c2VyTmFtZSI6IlNveWJlYW4ifV0sImlhdCI6MTY5ODQ4NDg2MywiZXhwIjoxNzMwMDQ0Nzk5LCJhdWQiOiJzb3liZWFuLWFkbWluIiwiaXNzIjoiU295YmVhbiIsInN1YiI6IlNveWJlYW4ifQ._w5wmPm6HVJc5fzkSrd_j-92d5PBRzWUfnrTF1bAmfk';

    const defaultToken = 'eyJhbGciOiJIUzUxMiJ9.eyJ1c2VyX2lkIjoxMTAsInVzZXJfa2V5IjoiZjFjMjQ2ZWYtMDdmZS00M2YxLTkyZDktNTQ1ZmRmOGZjZTM5IiwidXNlcm5hbWUiOiJ5YW5neXVodWFuIn0.YNJ5nABncTx-10bfUv02tFABYCz_wJYlxp_1fpFYK0y3_dHoRktYY-qJD1F7Xpeucoq4IDwocClvuJ_xHeDcIw'

    // 获取存储的 toke
    let token = defaultToken;
    try {
      const storedToken = localStorage.getItem('SOY-REACT_token');
      if (storedToken && storedToken !== 'undefined' && storedToken !== 'null') {
        token = JSON.parse(storedToken);
      }
    } catch (error) {
      console.error('Token processing error:', error);
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
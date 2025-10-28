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

    const defaultToken = 'eyJhbGciOiJIUzUxMiJ9.eyJ1c2VyX2lkIjoyLCJ1c2VyX2tleSI6IjIyMmJlYWUxLTU3MWEtNDUyYi05MTYyLTBjOTM0ZGNjY2E3YiIsInVzZXJuYW1lIjoidHJ1c3QifQ.8ZCyz5WnKnqI8xYEt2T_T5UA8bfvmsHPN831N0qrBqCFWGyxcirwGkECNCYEbEAApT7PNVrI317i33dNv4JsLA'

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

    if (isDevelopment) {
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
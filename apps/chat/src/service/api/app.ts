import request from "../request/index";
// 获取基础API地址
import { getChatbiBaseApi } from "../../utils/index";

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
    url: "/chat-proxy/api/v1/chat/app/add",
    method: "post",
    data,
    baseURL: window.APP_CONFIG?.VITE_BASE_API, // 设置基础 URL，根据实际情况修改 '/接口前缀', //import.meta.env.VITE_BASE_URL
  });
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

// 获取app列表
export function fetchAppList(params: any) {
  console.log('fetchAppList', params)
  return request({
    url: "/chat-proxy/api/v1/chat/app/list",
    method: "get",
    params,
    baseURL: window.APP_CONFIG?.VITE_BASE_API, // 设置基础 URL，根据实际情况修改 '/接口前缀', //import.meta.env.VITE_BASE_URL
  });
}

// 获取app列表分页
export function fetchAppListPages(data: {page: number; pageSize: number; spaceId: number; create_by: string; biz_name?: string}) {
  return request({
    url: "/chat-proxy/api/v1/chat/app/query_page?page=" + data.page + "&page_size=" + data.pageSize,
    method: "post",
    data: {space_id: data.spaceId, create_by: data.create_by, biz_name: data.biz_name},
    baseURL: window.APP_CONFIG?.VITE_BASE_API, // 设置基础 URL，根据实际情况修改 '/接口前缀', //import.meta.env.VITE_BASE_URL
  });
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

// 保存为app
export function saveAsApp(data: any) {
  return request({
    url: "/chat-proxy/api/v1/chat/app/save_as",
    method: "post",
    data,
    baseURL: window.APP_CONFIG?.VITE_BASE_API, // 设置基础 URL，根据实际情况修改 '/接口前缀', //import.meta.env.VITE_BASE_URL
  });
}

// 更新app
export function updateApp(data: any) :Promise<any> {
  return request({
    url: "/chat-proxy/api/v1/chat/app/update",
    method: "post",
    data,
    baseURL: window.APP_CONFIG?.VITE_BASE_API, // 设置基础 URL，根据实际情况修改 '/接口前缀', //import.meta.env.VITE_BASE_URL
  });
}
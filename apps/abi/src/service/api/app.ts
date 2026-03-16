import { apiRequest } from '../request';

// 获取助手列表
export function fetchAgentList(params: any) {
  return apiRequest({
    // baseURL: import.meta.env.VITE_AGENT_BASE_API,
    method: 'get',
    params,
    url: '/api/copilot/v1/agentConfig/list'
  });
}

// 获取助手配置信息
export function fetchAgentInfoById(agentId: number) {
  return apiRequest({
    // baseURL: import.meta.env.VITE_AGENT_BASE_API,
    method: 'get',
    url: `/api/copilot/v1/agentConfig/${agentId}`
  });
}

// 根据agentId获取表语义列表
export function fetchSchemaById(agentId: number) {
  return apiRequest({
    // baseURL: import.meta.env.VITE_AGENT_BASE_API,
    method: 'get',
    url: `/api/copilot/v1/agentConfig/schema/${agentId}`
  });
}

// 根据agentId获取数据源
export function fetchDatasourceById(agentId: number) {
  return apiRequest({
    // baseURL: import.meta.env.VITE_AGENT_BASE_API,
    method: 'get',
    url: `/api/copilot/v1/agentConfig/ds/${agentId}`
  });
}

// 新建app
export function createApp(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/chat-proxy/api/v1/chat/app/add'
  });
}

// 获取app列表
export function fetchAppList(params: any) {
  return apiRequest({
    method: 'get',
    params,
    url: '/api/chat-proxy/api/v1/chat/app/list'
  });
}

// 删除app
export function deleteApp(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/chat-proxy/api/v1/chat/app/delete'
  });
}

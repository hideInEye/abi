import type { PlugEdit, PluginDel } from '../../types/plug';
import { apiRequest } from '../request';

export function addPlugin(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/chat-proxy/api/v2/plugin/plugin_add'
  });
}

export function updatePlugin(data: PlugEdit) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/chat-proxy/api/v2/plugin/plugin_modify'
  });
}

export function deletePlugin(data: PluginDel) {
  return apiRequest({
    data,
    method: 'post',
    url: `/api/chat-proxy/api/v2/plugin/plugin_del`
  });
}

export function queryPluginList(params: { pageNum: number; pageSize: number; pluginName: string; spaceId: number; groupId: number }) {
  return apiRequest({
    params,
    method: 'get',
    url: `/api/abi-system/v1/plugin/list`
  });
}

export function queryMcpList(data: { pageNo: number; pageSize: number; mcpName?: string; search?: 'blur' | 'accurate'; namespaceId?: string }) {
  return apiRequest({
    data,
    method: 'post',
    url: `/api/abi-mcp/v1/register/list`
  });
}

// 创建 MCP Server
export function registerMcp(data: {
  namespaceId?: string;
  serverSpecification: Record<string, any>;
  toolSpecification?: Record<string, any>;
  endpointSpecification?: Record<string, any>;
}) {
  return apiRequest({
    data,
    method: 'post',
    url: `/api/abi-mcp/v1/register`
  });
}

// 更新 MCP Server
export function updateMcp(data: {
  namespaceId?: string;
  serverSpecification: Record<string, any>;
  toolSpecification?: Record<string, any>;
  endpointSpecification?: Record<string, any>;
}) {
  return apiRequest({
    data,
    method: 'put',
    url: `/api/abi-mcp/v1/register`
  });
}

// 删除 MCP Server
export function deleteMcp(params: {
  mcpId: string;
  mcpName: string;
  version?: string;
  namespaceId?: string;
}) {
  return apiRequest({
    params,
    method: 'delete',
    url: `/api/abi-mcp/v1/register`
  });
}

// MCP 详情
export function getMcpDetail(params: {
  mcpId: string;
  mcpName: string;
  version?: string;
  namespaceId?: string;
}) {
  return apiRequest({
    params,
    method: 'get',
    url: `/api/abi-mcp/v1/register/detail`
  });
}

import type { PlugEdit, PluginDel } from '../../types/plug';
import { apiRequest } from '../request';

export function addPlugin(data: any) {
  return apiRequest({
    baseURL: import.meta.env.VITE_CHAT_SERVICE_BASE_URL,
    data,
    method: 'post',
    url: '/chat-proxy/api/v2/plugin/plugin_add'
  });
}

export function updatePlugin(data: PlugEdit) {
  return apiRequest({
    baseURL: import.meta.env.VITE_CHAT_SERVICE_BASE_URL,
    data,
    method: 'post',
    url: '/chat-proxy/api/v2/plugin/plugin_modify'
  });
}

export function deletePlugin(data: PluginDel) {
  return apiRequest({
    baseURL: import.meta.env.VITE_CHAT_SERVICE_BASE_URL,
    data,
    method: 'post',
    url: `/chat-proxy/api/v2/plugin/plugin_del`
  });
}

export function queryPluginList(params: { pageNum: number; pageSize: number; pluginName: string; spaceId: number; groupId: number }) {
  return apiRequest({
    params,
    method: 'get',
    url: `/abi-system/v1/plugin/list`
  });
}

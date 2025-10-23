import type { PlugEdit, PluginDel } from '../../types/plug';
import { apiRequest } from '../request';

export function addPlugin(data: any) {
  return apiRequest({
    baseURL: import.meta.env.VITE_CHAT_SERVICE_BASE_URL,
    data,
    method: 'post',
    url: '/api/v2/plugin/plugin_add'
  });
}

export function updatePlugin(data: PlugEdit) {
  return apiRequest({
    baseURL: import.meta.env.VITE_CHAT_SERVICE_BASE_URL,
    data,
    method: 'post',
    url: '/api/v2/plugin/plugin_modify'
  });
}

export function deletePlugin(data: PluginDel) {
  return apiRequest({
    baseURL: import.meta.env.VITE_CHAT_SERVICE_BASE_URL,
    data,
    method: 'post',
    url: `/api/v2/plugin/plugin_del`
  });
}

export function queryPluginList(params: { pageNum: number; pageSize: number; pluginName: string; spaceId: number }) {
  return apiRequest({
    data: params,
    method: 'get',
    url: `/abi-system/v1/plugin/list?pageNum=${params.pageNum}&pageSize=${params.pageSize}&pluginName=${params.pluginName}&spaceId=${params.spaceId}`
  });
}

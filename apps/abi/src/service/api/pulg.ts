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

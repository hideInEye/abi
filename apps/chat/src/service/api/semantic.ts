import request from '../request/index'

// 获取数据语义分组列表
export function fetchSemanticGroups(params: { groupType?: string; pageNum?: number; pageSize?: number; spaceId?: number; groupName?: string }) {
  return request({
    url: '/api/copilot/v1/group/list',
    method: 'get',
    params,
  })
}

// 获取数据语义列表（表列表）
export function fetchSemanticSchemas(params: { bizName?: string; groupId?: number | string; pageNum?: number; pageSize?: number }) {
  return request({
    url: '/api/copilot/v1/schema/list',
    method: 'get',
    params,
  })
}

// 获取数据语义分组树（分组 + 数据语义统一节点树，一次性返回）
export function fetchSemanticTree(params: { spaceId?: number }, signal?: AbortSignal) {
  return request({
    url: '/api/copilot/v1/schema/tree',
    method: 'get',
    params,
    signal,
  })
}

// 查询数据语义详情（含字段列表）
export function fetchSemanticDetail(schemaId: number | string) {
  return request({
    url: `/api/copilot/v1/schema/${schemaId}`,
    method: 'get',
  })
}

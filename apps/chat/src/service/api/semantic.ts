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
export function fetchSemanticSchemas(params: { bizName?: string; groupId?: number; pageNum?: number; pageSize?: number }) {
  return request({
    url: '/api/copilot/v1/schema/list',
    method: 'get',
    params,
  })
}

// 查询数据语义详情（含字段列表）
export function fetchSemanticDetail(schemaId: number | string) {
  return request({
    url: `/api/copilot/v1/schema/${schemaId}`,
    method: 'get',
  })
}

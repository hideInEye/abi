import request from '../request/index'

// 查询 MCP 列表
export function queryMcpList(data: { pageNo?: number; pageSize?: number; mcpName?: string; search?: 'blur' | 'accurate'; namespaceId?: string } = {}) {
  return request({
    url: '/api/abi-mcp/v1/mcp/register/list',
    method: 'post',
    data,
  })
}

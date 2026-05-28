import request from '../request'

type FetchSpaceListParams = {
  isAsc: 'asc' | 'desc'
  orderByColumn: string
  pageNum: number
  pageSize: number
  spaceName?: string
}

export function fetchSpaceList(params: FetchSpaceListParams) {
  return request({
    url: '/api/system/v1/sinfo/list',
    method: 'get',
    params,
  })
}

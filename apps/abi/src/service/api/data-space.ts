import { apiRequest } from '../request';
/**
 * 获取空间列表
 *
 * @param params
 * @returns
 */
export function spaceList(params: {
  isAsc: 'asc' | 'desc';
  orderByColumn: string;
  pageNum: number;
  pageSize: number;
  spaceName?: string;
}, signal?: AbortSignal) {
  return apiRequest({
    method: 'get',
    params: {
      ...params
    },
    signal,
    url: '/api/system/v1/sinfo/list'
  });
}

/**
 * 修改空间信息
 *
 * @param data
 * @returns
 */
export function updateSpaceInfo(data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: '/api/system/v1/sinfo'
  });
}

/**
 * 新增空间
 *
 * @param data
 * @returns
 */
export function createSpace(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/abi-system/v1/sinfo'
  });
}

/**
 * 删除空间
 *
 * @param spaceId
 * @returns
 */
export function deleteSpace(spaceIds: number[]) {
  return apiRequest({
    method: 'delete',
    url: `/api/system/v1/sinfo/${spaceIds}`
  });
}

/**
 * 获取空间详细信息
 *
 * @param spaceId
 * @returns
 */
export function getSpaceInfo(spaceId: number) {
  return apiRequest({
    method: 'get',
    url: `/api/system/v1/sinfo/${spaceId}`
  });
}

import { apiRequest } from '../request';

export async function queryOperateRecordList(params: any) {
  const res: any = await apiRequest({
    method: 'get',
    params,
    url: '/abi-system/record/list'
  });
  return res;
}

/**
 * 
 * @param type 1 最近使用 2 我的收藏 3 我的分享
 * @returns 
 */

export const getOperateRecordList = (type: string, pagination?: {pageNumber: number, pageSize: number}) => {
  return apiRequest({
    method: 'get',
    url: '/abi-system/record/recentlyUseList',
    params: { type, ...pagination }
  });
}

// 新版收藏
export function fetchOperateNew(data: any) {
  return apiRequest({
    url: "/abi-system/favorite/addOrRemove",
    method: "post",
    data,
  });
}

// 收藏列表接口
export function fetchOperateNewList(data?: any) {
  return apiRequest({
    url: "/abi-system/favorite/list",
    method: "get",
    params: data,
  });
}

export async function deleteOperateRecord(ids: string) {
  const res: any = await apiRequest({
    method: 'delete',
    url: `/system/record/delete/${ids}`
  });
  return res;
}

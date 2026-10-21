import { apiRequest } from '../request';
import { readPersistedSpaceId } from '../../utils/spaceStorage';

export async function queryOperateRecordList(params: any) {
  const res: any = await apiRequest({
    method: 'get',
    params,
    url: '/api/abi-system/record/list'
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
    url: '/api/abi-system/record/recentlyUseList',
    params: { type, ...pagination }
  });
}

// 收藏接口按空间隔离：spaceId 优先调用方传入，否则取当前空间；用户由后端从 token 解析，不再传参
function resolveFavoriteSpaceId(spaceId?: string | number) {
  return (spaceId ?? readPersistedSpaceId()) || undefined;
}

// 新版收藏（收藏/取消收藏，状态由后端切换）
export function fetchOperateNew(data: any = {}) {
  return apiRequest({
    url: "/api/abi-system/favorite/addOrRemove",
    method: "post",
    params: {
      favorType: data.favorType ?? 'chat',
      favorId: data.favorId ?? data.sessionId ?? data.chatId,
      spaceId: resolveFavoriteSpaceId(data.spaceId),
    },
  });
}

// 收藏列表接口，按当前空间查询
export function fetchOperateNewList(data: any = {}) {
  return apiRequest({
    url: "/api/abi-system/favorite/list",
    method: "get",
    params: {
      favorType: data.favorType ?? 'chat',
      spaceId: resolveFavoriteSpaceId(data.spaceId),
      pageNum: data.pageNum ?? 1,
      pageSize: data.pageSize ?? 999,
    },
  });
}

export async function deleteOperateRecord(ids: string) {
  const res: any = await apiRequest({
    method: 'delete',
    url: `/api/system/record/delete/${ids}`
  });
  return res;
}

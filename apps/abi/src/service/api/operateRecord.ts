import { apiRequest } from '../request';

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

// 从本地登录信息中获取当前用户 ID
function getCurrentUserId(): number | undefined {
  try {
    const userInfoStr = localStorage.getItem('SOY-REACT_userInfo');
    if (userInfoStr) {
      const userInfo = JSON.parse(userInfoStr);
      if (userInfo.userId != null) return Number(userInfo.userId);
    }
    const uid = localStorage.getItem('userId');
    if (uid != null) return Number(uid);
  } catch {
    // ignore
  }
  return undefined;
}

// 新版收藏（收藏/取消收藏，状态由后端切换）
export function fetchOperateNew(data: any = {}) {
  return apiRequest({
    url: "/api/abi-system/favorite/addOrRemove",
    method: "post",
    params: {
      userId: data.userId ?? getCurrentUserId(),
      favorType: data.favorType ?? 'chat',
      favorId: data.favorId ?? data.sessionId ?? data.chatId,
    },
  });
}

// 收藏列表接口
export function fetchOperateNewList(data: any = {}) {
  return apiRequest({
    url: "/api/abi-system/favorite/list",
    method: "get",
    params: {
      userId: data.userId ?? getCurrentUserId(),
      favorType: data.favorType ?? 'chat',
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

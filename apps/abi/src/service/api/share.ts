import { apiRequest } from '../request';

/** 获取分享列表 */
export function fetchShareList() {
  return apiRequest({
    method: 'get',
    url: '/api/abi-system/share/list'
  });
}

/** 删除分享 */
export function deleteShare(shareIds: string) {
  return apiRequest({
    method: 'delete',
    url: `/api/abi-system/share/${shareIds}`
  });
}

/**
 * 统一分享接口（助手与大屏共用，type 区分：react=chat端助手分享 / workflow=abi助手 / dashboard=数据大屏）。
 * 网关路径与大屏一致：/api + /dashboard/api/v1/project/share。
 */
export function shareProjectApi(data: {
  /** 助手 appId 作为 projectId 下发 */
  projectId: number | string;
  spaceId: number | string;
  type: 'react' | 'workflow' | 'dashboard';
  sharePasswordFlag?: boolean;
  /** 过期天数（1/7/30） */
  expirationDays?: number;
  /** 自定义过期时间，格式 "YYYY-MM-DD HH:mm:ss" */
  expirationDate?: string;
}) {
  return apiRequest({
    method: 'post',
    url: '/api/dashboard/api/v1/project/share',
    data
  });
}

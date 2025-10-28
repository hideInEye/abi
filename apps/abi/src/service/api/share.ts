import { apiRequest } from '../request';

/** 获取分享列表 */
export function fetchShareList() {
  return apiRequest({
    method: 'get',
    url: '/abi-system/share/list'
  });
}

/** 删除分享 */
export function deleteShare(shareIds: string) {
  return apiRequest({
    method: 'delete',
    url: `/abi-system/share/${shareIds}`
  });
}

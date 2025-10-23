import { apiRequest } from '../request';

/** 获取首页数据 */
export function fetchHomeData() {
  return apiRequest({
    method: 'get',
    url: '/system/v1/sinfo/home'
  });
}

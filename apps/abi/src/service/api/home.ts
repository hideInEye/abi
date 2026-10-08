import { apiRequest } from '../request';

/** 获取首页数据 */
export function fetchHomeData(signal?: AbortSignal) {
  return apiRequest({
    method: 'get',
    signal,
    url: '/api/system/v1/sinfo/home'
  });
}

import { apiRequest } from '../request';

/** 获取操作日志（操作记录）列表 */
export async function getOperLogListApi(params: any) {
  const res: any = await apiRequest({
    method: 'get',
    params,
    url: '/api/abi-system/operlog/list'
  });
  return { data: { data: res?.response?.data?.rows || [], total: res?.response?.data?.total } };
}

/** 获取登录日志（访问记录）列表 */
export async function getLoginInforListApi(params: any) {
  const res: any = await apiRequest({
    method: 'get',
    params,
    url: '/api/abi-system/logininfor/list'
  });
  return { data: { data: res?.response?.data?.rows || [], total: res?.response?.data?.total } };
}

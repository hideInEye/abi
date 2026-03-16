import { apiRequest } from '../request';
/**
 * 获取部门列表
 *
 * @param params
 * @returns
 */
export function getDeptListApi(params: any) {
  return apiRequest({
    method: 'get',
    params,
    url: '/api/system/dept/list'
  });
}

/**
 * 获取部门树
 *
 * @param params
 * @returns
 */
export function getDeptTreeApi() {
  return apiRequest({
    method: 'get',
    url: '/api/system/user/deptTree'
  });
}

/**
 * 获取部门信息
 *
 * @param deptId
 * @returns
 */
export function getDeptInfoApi(deptId: number) {
  return apiRequest({
    method: 'get',
    url: `/api/system/dept/${deptId}`
  });
}

/**
 * 新增部门
 *
 * @param deptId
 * @param data
 * @returns
 */
export function addDeptApi(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: `/api/system/dept`
  });
}

/**
 * 修改部门
 *
 * @param deptId
 * @param data
 * @returns
 */
export function updateDeptApi(data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: `/api/system/dept`
  });
}

/**
 * 删除部门
 *
 * @param deptId(多个menuId之间用小写的逗号分隔)
 * @returns
 */
export function deleteDeptApi(deptId: number) {
  return apiRequest({
    method: 'delete',
    url: `/api/system/dept/${deptId}`
  });
}

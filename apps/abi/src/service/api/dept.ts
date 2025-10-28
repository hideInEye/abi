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
    url: '/system/dept/list'
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
    url: '/system/user/deptTree'
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
    url: `/system/dept/${deptId}`
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
    url: `/system/dept`
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
    url: `/system/dept`
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
    url: `/system/dept/${deptId}`
  });
}

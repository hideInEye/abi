import { apiRequest, request } from '../request';
/**
 * 获取用户列表
 *
 * @param params
 * @returns
 */
export function getUserListApi(params: any) {
  return apiRequest({
    method: 'get',
    params,
    url: '/system/user/list'
  });
}

/**
 * 根据用户编号获取角色列表
 *
 * @param userId
 * @returns
 */
export function getRoleListByUseIdApi(userId: number | string) {
  return apiRequest({
    method: 'get',
    url: `/system/user/authRole/${userId}`
  });
}

/**
 * 用户授权角色
 *
 * @param duserId
 * @param data
 * @returns
 */
export function authRoleByUserIdApi(params: any) {
  return apiRequest({
    method: 'put',
    params,
    url: `/system/user/authRole`
  });
}

/**
 * 获取用户相关岗位角色列表
 *
 * @param params
 * @returns
 */
export function getUserInfoListApi() {
  return apiRequest({
    method: 'get',
    url: '/system/user'
  });
}

/**
 * 获取用户信息
 *
 * @param userId
 * @returns
 */
export async function getUserInfoApi(userId: number) {
  const res = await apiRequest({
    method: 'get',
    url: `/system/user/${userId}`
  });
  return { data: res?.response?.data };
}

/**
 * 新增用户
 *
 * @param userId
 * @param data
 * @returns
 */
export function addUserApi(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: `/system/user`
  });
}

/**
 * 修改用户
 *
 * @param duserId
 * @param data
 * @returns
 */
export function updateUserApi(data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: `/system/user`
  });
}

/**
 * 修改用户状态
 *
 * @param userId
 * @param data
 * @returns
 */
export function updateUserStatusAPi(data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: `/system/user/changeStatus`
  });
}

/**
 * 导出用户
 *
 * @param data
 * @returns
 */
export function exportUserApi(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: `/system/user/export`
  });
}

/**
 * 导入用户
 *
 * @param updateSupport
 * @param data
 * @returns
 */
export function importUserApi(data: any) {
  return apiRequest({
    data,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    method: 'post',
    url: `/system/user/importData`
  });
}

/**
 * 删除部门
 *
 * @param userId(多个userId之间用小写的逗号分隔)
 * @returns
 */
export function deleteUserApi(userId: number) {
  return apiRequest({
    method: 'delete',
    url: `/system/dept/${userId}`
  });
}

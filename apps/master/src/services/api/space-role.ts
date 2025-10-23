import { apiRequest } from '../request';

/**
 * 获取空间角色角色列表
 *
 * @param params
 * @returns
 */
export async function getSpaceRoleListApi(params: any) {
  const res: any = await apiRequest({
    method: 'get',
    params,
    url: '/system/v1/space/role/list'
  });
  return { data: { data: res?.response?.data?.rows || [], total: res?.response?.data?.total } };
}

/**
 * 新增角色-提交
 *
 * @param data
 * @returns
 */
export function addSpaceRoleApi(data: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: `/system/v1/space/role`
  });
}

/**
 * 修改角色状态
 *
 * @param roleId
 * @param data
 * @returns
 */
export function updateSpaceRoleStatusAPi(data: any) {
  return apiRequest<any>({
    data,
    method: 'put',
    url: `/system/v1/space/role/changeStatus`
  });
}

/**
 * 删除空间角色
 *
 * @param roleId(多个roleId之间用小写的逗号分隔)
 * @returns
 */
export function deleteSpaceRoleApi(roleId: number | string) {
  return apiRequest({
    method: 'delete',
    url: `/system/v1/space/role/${roleId}`
  });
}

/**
 * 获取角色信息
 *
 * @param roleId
 * @returns
 */
export function getSpaceRoleInfoApi(roleId: number) {
  return apiRequest({
    method: 'get',
    url: `/system/v1/space/role/${roleId}`
  });
}

/**
 * 获取角色权限菜单树
 *
 * @param roleId
 * @returns
 */
export function getSpaceRoleMenuByRoleIdApi(roleId: number) {
  return apiRequest({
    method: 'get',
    url: `/system/v1/space/menu/roleMenuTreeselect/${roleId}`
  });
}

/**
 * 获取控件菜单下拉树列表
 *
 * @param
 * @returns
 */
export function getSpaceMenuTreeApi() {
  return apiRequest({
    method: 'get',
    url: '/system/v1/space/menu/treeselect'
  });
}

/**
 * 获取角色id对应权限菜单树
 *
 * @param roleId
 * @returns
 */
export function roleIdMenuTree(roleId: number) {
  return apiRequest({
    method: 'get',
    url: `/system/role/deptTree/${roleId}`
  });
}

/**
 * 修改空间角色
 *
 * @param roleId
 * @param data
 * @returns
 */
export function updateSpaceRoleApi(data?: any) {
  return apiRequest<any>({
    data,
    method: 'put',
    url: '/system/v1/space/role'
  });
}

/**
 * 分配数据权限,获取组织树
 *
 * @param roleId
 * @param data
 * @returns
 */
export function assignDataPermission(roleId: number, data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: `/system/role/deptTree/${roleId}`
  });
}

/**
 * 分配数据权限-获取角色信息
 *
 * @param roleId
 * @returns
 */
export function assignDataPermissionInfo(roleId: number) {
  return apiRequest({
    method: 'get',
    url: `/system/role/${roleId}`
  });
}

/**
 * 分配数据权限-提交
 *
 * @param data
 * @returns
 */
export function assignDataPermissionForSpaceRoleApi(data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: `/system/v1/space/role/dataScope`
  });
}

/**
 * 分配用户-取消授权
 *
 * @param data
 * @returns
 */
export function cancelSpaceAuthorizationApi(data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: `/system/v1/space/role/authUser/cancel`
  });
}

/**
 * 分配用户-批量取消授权
 *
 * @param data
 * @returns
 */
export function batchCancelSpaceAuthorizationApi(params: any) {
  return apiRequest({
    method: 'put',
    params,
    url: `/system/v1/space/role/authUser/cancelAll`
  });
}

/**
 * 分配用户-提交
 *
 * @param data
 * @returns
 */
export function assignUserForSPaceRoleSubmit(params: any) {
  return apiRequest({
    method: 'put',
    params,
    url: `/system/v1/space/role/authUser/selectAll`
  });
}

/**
 * 获取角色选择框列表
 *
 * @param params
 * @returns
 */
export function getSpaceRoleSelectListApi() {
  return apiRequest({
    method: 'get',
    url: '/system/v1/space/role/optionselect'
  });
}

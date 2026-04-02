import { apiRequest } from '../request';
/**
 * 获取角色列表
 *
 * @param params
 * @returns
 */
export async function roleList(params: any) {
  const res: any = await apiRequest({
    method: 'get',
    params,
    url: '/api/system/role/list'
  });
  return { data: { data: res?.response?.data?.rows || [], total: res?.response?.data?.total } };
}

/**
 * 获取空间角色角色列表
 *
 * @param params
 * @returns
 */
export async function spaceRoleList(params: any) {
  const res: any = await apiRequest({
    method: 'get',
    params,
    url: '/api/system/v1/space/role/list'
  });
  return { data: { data: res?.response?.data?.rows || [], total: res?.response?.data?.total } };
}

/**
 * 修改角色
 *
 * @param roleId
 * @param data
 * @returns
 */
export function updateRoleStatusAPi(data: any) {
  return apiRequest<any>({
    data,
    method: 'put',
    url: `/api/system/role/changeStatus`
  });
}

/**
 * 获取角色信息
 *
 * @param roleId
 * @returns
 */
export function roleInfo(roleId: number) {
  return apiRequest({
    method: 'get',
    url: `/api/system/role/${roleId}`
  });
}

/**
 * 获取角色权限菜单树
 *
 * @param roleId
 * @returns
 */
export function roleMenuTree(roleId: number) {
  return apiRequest({
    method: 'get',
    url: `/api/system/menu/roleMenuTreeselect/${roleId}`
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
    url: `/api/system/role/deptTree/${roleId}`
  });
}

/**
 * 修改角色
 *
 * @param roleId
 * @param data
 * @returns
 */
export function updateRole(data?: any) {
  return apiRequest<any>({
    data,
    method: 'put',
    url: '/api/system/role'
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
    url: `/api/system/role/deptTree/${roleId}`
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
    url: `/api/system/role/${roleId}`
  });
}

/**
 * 分配数据权限-提交
 *
 * @param data
 * @returns
 */
export function assignDataPermissionSubmit(data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: `/api/system/role/dataScope`
  });
}

/**
 * 分配用户-取消授权
 *
 * @param data
 * @returns
 */
export function cancelAuthorizationApi(data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: `/api/system/role/authUser/cancel`
  });
}

/**
 * 分配用户-批量取消授权
 *
 * @param data
 * @returns
 */
export function batchCancelAuthorizationApi(params: any) {
  return apiRequest({
    method: 'put',
    params,
    url: `/api/system/role/authUser/cancelAll`
  });
}

/**
 * 分配用户-获取当前角色的用户列表
 *
 * @returns
 */
export async function assignUserList(params: any) {
  const res: any = await apiRequest({
    method: 'get',
    params,
    url: `/api/system/role/authUser/allocatedList`
  });
  return { data: { data: res?.response?.data?.rows || [], total: res?.response?.data?.total } };
}

/**
 * 分配用户-获取未分配当前角色的用户列表
 *
 * @returns
 */
export function assignUserUnallocatedList(params: any) {
  return apiRequest({
    method: 'get',
    params,
    url: `/api/system/role/authUser/unallocatedList`
  });
}

/**
 * 分配用户-获取未分配当前角色的用户列表
 *
 * @returns
 */
export function getMenuTreeApi() {
  return apiRequest({
    method: 'get',
    url: '/api/system/menu/treeselect'
  });
}

/**
 * 分配用户-提交
 *
 * @param data
 * @returns
 */
export function assignUserSubmit(params: any) {
  return apiRequest({
    method: 'put',
    params,
    url: `/api/system/role/authUser/selectAll`
  });
}

/**
 * 获取角色选择框列表
 *
 * @param params
 * @returns
 */
export function getRoleSelectListApi() {
  return apiRequest({
    method: 'get',
    url: '/api/system/role/optionselect'
  });
}

/**
 * 新增角色-获取菜单树
 *
 * @returns
 */
export function createRoleMenuTree() {
  return apiRequest({
    method: 'get',
    url: `/api/system/menu/treeselect`
  });
}

/**
 * 新增角色-提交
 *
 * @param data
 * @returns
 */
export function createRoleSubmit(data: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: `/api/system/role`
  });
}

/**
 * 删除角色
 *
 * @param roleId(多个roleId之间用小写的逗号分隔)
 * @returns
 */
export function deleteRole(roleId: number) {
  return apiRequest({
    method: 'delete',
    url: `/api/system/role/${roleId}`
  });
}

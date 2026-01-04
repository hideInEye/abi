import { handleTree } from '@/utils/manage';

import { apiRequest, chatRequest, request } from '../request';

/** get role list */
export async function fetchGetRoleList(params?: any) {
  const res: any = await apiRequest<Api.SystemManage.RoleList>({
    method: 'get',
    params,
    url: '/system/role/list'
  });
  return { data: { data: res?.response?.data?.rows || [] } };
}

/**
 * get all roles
 *
 * these roles are all enabled
 */
export function fetchGetAllRoles() {
  return request<Api.SystemManage.AllRole[]>({
    method: 'get',
    url: '/systemManage/getAllRoles'
  });
}

/** get user list */
export async function fetchGetUserList(params?: Api.SystemManage.UserSearchParams) {
  const res: any = await apiRequest<Api.SystemManage.UserList>({
    method: 'get',
    params,
    url: '/system/user/list'
  });
  return { data: { data: res?.response?.data?.rows || [], total: res?.response?.data?.total } };
}

// 重置密码
export function fetchResetPassword(data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: '/system/user/resetPwd'
  });
}

/** 获取部门树 */
export function fetchGetDeptTree() {
  return apiRequest<Api.SystemManage.MenuList>({
    method: 'get',
    url: '/system/user/deptTree'
  });
}

/** 获取角色列表 */
export function fetchGetRoleOption() {
  return apiRequest({
    method: 'get',
    url: '/system/role/optionselect'
  });
}

/** 新增用户 */
export function fetchAddUser(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: '/system/user'
  });
}

/** 新增用户 */
export function fetchDelUser(userId: number | string) {
  return apiRequest({
    method: 'delete',
    url: `/system/user/${userId}`
  });
}

/** 更新用户 */
export function fetchUpdateUser(data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: '/system/user'
  });
}

/** get menu list */
export function fetchGetMenuList() {
  return request<Api.SystemManage.MenuList>({
    method: 'get',
    url: '/systemManage/getMenuList/v2'
  });
}

/** get all pages */
export function fetchGetAllPages() {
  return request<string[]>({
    method: 'get',
    url: '/systemManage/getAllPages'
  });
}

/** get menu tree */
export function fetchGetMenuTree() {
  return apiRequest<Api.SystemManage.MenuTree[]>({
    method: 'get',
    url: '/system/menu/treeselect'
  });
}

// 添加角色
export function fetchAddRole(data: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: '/system/role'
  });
}

// 更新角色
export function fetchUpdateRole(data: any) {
  return apiRequest<any>({
    data,
    method: 'put',
    url: '/system/role'
  });
}

// 更新角色
export function fetchDelRole(roleId: any) {
  return apiRequest<any>({
    method: 'delete',
    url: `/system/role/${roleId}`
  });
}

// 通过roleId获取角色信息
export function fetchRoleInfoById(roleId: any) {
  return apiRequest<any>({
    method: 'get',
    url: `/system/role/${roleId}`
  });
}

// 通过roleId获取角色菜单权限信息
export function fetchRoleMenuById(roleId: any) {
  return apiRequest<any>({
    method: 'get',
    url: `/system/menu/roleMenuTreeselect/${roleId}`
  });
}

/** 获取角色列表 */
export async function fetchGetGroupList(params?: any) {
  const res = await apiRequest({
    method: 'get',
    params,
    url: '/system/dept/list'
  });
  const resData = handleTree(res.data, 'deptId');
  return { data: { data: resData || [] } };
}

// 获取模型列表
export async function fetchModelList(params: any) {
  const res = await apiRequest({
    method: 'get',
    params,
    url: `/system/v1/model/list`
  });
  return { data: res || [] };
}

// 新增模型
export function fetchAddModel(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: `/system/v1/model`
  });
}

// 编辑模型
export function fetchEditModel(data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: `/system/v1/model`
  });
}

// 删除模型
export function deleteModel (id:number) {
  return apiRequest({
    method:'delete',
    url:`/system/v1/model/${id}`
  })
}

// 大模型测试连接
export function fetchTestModel(data: any) {
  return chatRequest({
    baseURL: import.meta.env.VITE_CHAT_SERVICE_BASE_URL,
    data,
    method: 'post',
    url: `/chat-proxy/api/v1/model/test/connect`
  });
}

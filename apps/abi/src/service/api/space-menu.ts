import { apiRequest } from '../request';
/**
 * 获取菜单列表
 *
 * @param params
 * @returns
 */
export function getSpaceMenuListApi(params: any) {
  return apiRequest({
    method: 'get',
    params,
    url: '/system/v1/space/menu/list'
  });
}

/**
 * 新增菜单
 *
 * @param menuId
 * @param data
 * @returns
 */
export function addSpaceMenuApi(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: `/system/v1/space/menu`
  });
}

/**
 * 修改菜单
 *
 * @param menuId
 * @param data
 * @returns
 */
export function updateSpaceMenuApi(data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: `/system/v1/space/menu`
  });
}

/**
 * 删除菜单
 *
 * @param menuId(多个menuId之间用小写的逗号分隔)
 * @returns
 */
export function deleteSpaceMenuApi(menuId: number) {
  return apiRequest({
    method: 'delete',
    url: `/system/v1/space/menu/${menuId}`
  });
}

/**
 * 获取菜单信息
 *
 * @param menuId
 * @returns
 */
export function getSpaceMenuInfoApi(menuId: number) {
  return apiRequest({
    method: 'get',
    url: `/system/v1/space/menu/${menuId}`
  });
}

/**
 * 获取菜单信息
 *
 * @param menuId
 * @returns
 */
export function getSpaceMenuTreeByRoleIdApi(roleId: number) {
  return apiRequest({
    method: 'get',
    url: `/system/v1/space/menu//roleMenuTreeselect/${roleId}`
  });
}

// 根据空间id获取路由信息：
export function getSpaceMenuBySpaceIdApi(spaceId: number) {
  return apiRequest({
    method: 'get',
    url: `/system/v1/space/menu/getRouters/${spaceId}`
  });
}

/**
 * 获取菜单下拉树列表
 *
 * @param params
 * @returns
 */
export function getSpaceMenuTreeListApi() {
  return apiRequest({
    method: 'get',
    url: '/system/v1/space/menu/treeselect'
  });
}

// export function getUserSystemMenuApi() {
//   return apiRequest({
//     method: 'get',
//     url: `/system/menu/getRouters`
//   });
// }

import { apiRequest } from '../request';
/**
 * 获取菜单列表
 *
 * @param params
 * @returns
 */
export function getMenuListApi(params: any) {
  return apiRequest({
    method: 'get',
    params,
    url: '/api/system/menu/list'
  });
}

/**
 * 获取菜单下拉树列表
 *
 * @param params
 * @returns
 */
export function getMenuTreeListApi() {
  return apiRequest({
    method: 'get',
    url: '/api/system/menu/treeselect'
  });
}

/**
 * 获取菜单信息
 *
 * @param menuId
 * @returns
 */
export function getMenuInfoApi(menuId: number) {
  return apiRequest({
    method: 'get',
    url: `/api/system/menu/${menuId}`
  });
}

export function getUserSystemMenuApi() {
  return apiRequest({
    method: 'get',
    url: `/api/system/menu/getRouters`
  });
}

// 获取全部空间菜单路由信息：
export function getAllSpaceMenuApi() {
  return apiRequest({
    method: 'get',
    url: `/api/system/v1/space/menu/getAllRouters`
  });
}

// 获取用户菜单路由信息：
export function getUserSpaceMenuApi() {
  return apiRequest({
    method: 'get',
    url: `/api/system/v1/space/menu/getRouters`
  });
}

export function getUserSpaceListApi() {
  return apiRequest({
    method: 'get',
    url: `/api/system/v1/sinfo/list`
  });
}

/**
 * 新增菜单
 *
 * @param menuId
 * @param data
 * @returns
 */
export function addMenuApi(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: `/api/system/menu`
  });
}

/**
 * 修改菜单
 *
 * @param menuId
 * @param data
 * @returns
 */
export function updateMenuApi(data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: `/api/system/menu`
  });
}

/**
 * 删除菜单
 *
 * @param menuId(多个menuId之间用小写的逗号分隔)
 * @returns
 */
export function deleteMenuApi(menuId: number) {
  return apiRequest({
    method: 'delete',
    url: `/api/system/menu/${menuId}`
  });
}

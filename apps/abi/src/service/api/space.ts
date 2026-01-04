import { apiRequest } from '../request';

/** 获取空间角色选择框列表 */
export function querySpaceRoleOptionSelect(params = {}) {
  return apiRequest({
    data: params,
    method: 'get',
    url: '/abi-system/v1/space/role/optionselect'
  });
}

/**
 * 获取部门列表
 *
 * @param params - 请求参数
 * @param params.dataSource - 数据源 0:独立 3: 嵌入
 * @param params.onenetToken - token 嵌入时传参
 * @returns
 */
export function queryDeptList({ dataSource, onenetToken }: { dataSource: 0 | 3; onenetToken: string }) {
  return apiRequest({
    data: { dataSource, onenetToken },
    method: 'post',
    url: '/abi-system/dept/allList'
  });
}

/** 获取空间角色列表 */
export function querySpaceRoleList() {
  return apiRequest({
    data: {},
    method: 'get',
    url: '/abi-system/v1/space/role/list'
  });
}

/** 获取用户列表 */
export function queryUserList(
  params = {
    deptId: 0
  }
) {
  return apiRequest({
    data: params,
    method: 'get',
    url: `/abi-system/user/list?deptId=${params.deptId}`
  });
}


/**
 * 搜索用户
 */
export const queryUser = (name:string) =>{
return apiRequest({
    method: 'get',
    url: `/abi-system/user/search?searchName=${name}`
  });
}
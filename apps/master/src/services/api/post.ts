import { apiRequest } from '../request';
/**
 * 获取岗位列表
 *
 * @param params
 * @returns
 */
export async function getPostListApi(params: any) {
  const res: any = await apiRequest({
    method: 'get',
    params,
    url: '/system/post/list'
  });
  return { data: { data: res?.response?.data?.rows || [], total: res?.response?.data?.total } };
}

/**
 * 获取岗位选择框列表
 *
 * @param params
 * @returns
 */
export function getPostSelectListApi() {
  return apiRequest({
    method: 'get',
    url: '/system/post/optionselect'
  });
}

/**
 * 获取岗位信息
 *
 * @param postId
 * @returns
 */
export function getPostInfoApi(postId: number) {
  return apiRequest({
    method: 'get',
    url: `/system/post/${postId}`
  });
}

/**
 * 修改角色
 *
 * @param postId
 * @param data
 * @returns
 */
export function updatePostApi(data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: `/system/post`
  });
}

/**
 * 新增岗位
 *
 * @param data
 * @returns
 */
export function addPostAPi(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: `/system/post`
  });
}

/**
 * 删除角色
 *
 * @param postId(多个roleId之间用小写的逗号分隔)
 * @returns
 */
export function deletePostApi(postId: number | string) {
  return apiRequest({
    method: 'delete',
    url: `/system/post/${postId}`
  });
}

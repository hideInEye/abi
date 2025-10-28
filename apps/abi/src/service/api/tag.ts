import { apiRequest } from '../request';

/**
 * 查询标签术语列表
 *
 * @param params
 * @returns
 */
export function queryTerms(params: { groupId: number; spaceId: number; termName: string }) {
  return apiRequest({
    data: params,
    method: 'get',
    url: '/abi-copilot/v1/term/queryTerms'
  });
}

/**
 * 新增标签术语
 *
 * @param params
 * @returns
 */
export function addTerms(params: {
  alias: string;
  bizName: string;
  engName: string;
  exp: string;
  groupId: number;
  spaceId: number;
  tagName: string;
}) {
  return apiRequest({
    data: params,
    method: 'post',
    url: '/abi-copilot/v1/term/addTerm'
  });
}

/**
 * 编辑标签术语
 *
 * @param params
 * @returns
 */
export function editTerms(params: {
  alias: string;
  bizName: string;
  engName: string;
  exp: string;
  groupId: number;
  spaceId: number;
  tagId: number;
  tagName: string;
}) {
  return apiRequest({
    data: params,
    method: 'post',
    url: '/abi-copilot/v1/term/editTerm'
  });
}

/**
 * 删除标签术语
 *
 * @param params
 * @returns
 */
export function deleteTerms(params: { tagId: number }) {
  return apiRequest({
    data: params,
    method: 'post',
    url: '/abi-copilot/v1/term/deleteTerm'
  });
}

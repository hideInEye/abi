import { apiRequest } from '../request';
/**
 * 查询行业术语列表
 *
 * @param params
 * @returns
 */
export function queryTerms(params: { groupId: number; spaceId: number; techName: string }) {
  return apiRequest({
    data: params,
    method: 'post',
    url: '/copilot/v1/term/queryTerms'
  });
}

/**
 * 新增行业术语
 *
 * @param params
 * @returns
 */
export function addTerms(params: {
  alias: string;
  bizName: string;
  engName: string;
  expr: string;
  groupId: number;
  relViewid: string;
  spaceId: number;
  termName: string;
  viewName: string;
}) {
  return apiRequest({
    data: params,
    method: 'post',
    url: '/copilot/v1/term/addTerms'
  });
}

/**
 * 编辑行业术语
 *
 * @param params
 * @returns
 */
export function editTerms(params: {
  alias: string;
  bizName: string;
  engName: string;
  expr: string;
  groupId: number;
  relViewid: string;
  spaceId: number;
  termId: number;
  termName: string;
}) {
  return apiRequest({
    data: params,
    method: 'post',
    url: '/copilot/v1/term/editTerms'
  });
}

/**
 * 删除行业术语
 *
 * @param params
 * @returns
 */
export function deleteTerms(params: { termId: number }) {
  return apiRequest({
    data: params,
    method: 'post',
    url: '/copilot/v1/term/deleteTerms'
  });
}

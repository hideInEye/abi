import { apiRequest } from '../request';

/**
 * 查询标签语义
 *
 * @param params
 * @returns
 */
export function queryTag(params: {
  alias?: string;
  createBy?: string;
  engName?: string;
  groupId: number;
  spaceId: number;
  tagName?: string;
}) {
  return apiRequest({
    data: params,
    method: 'POST',
    url: '/api/abi-copilot/v1/tag/queryTag'
  });
}

/**
 * 删除标签语义
 *
 * @param params
 * @returns
 */
export function delTag(params: { tagId: number }) {
  return apiRequest({
    data: params,
    method: 'POST',
    url: '/api/abi-copilot/v1/tag/deleteTag'
  });
}

interface ITag {
  alias: string;
  bizName: string;
  description: string;
  engName: string;
  exp: string;
  groupId: number;
  relItemId: string;
  remark: string;
  spaceId: number;
  tagName: string;
  viewId: number;
}

/**
 * 新增标签语义
 *
 * @param params
 * @returns
 */
export function addTag(params: ITag) {
  return apiRequest({
    data: params,
    method: 'POST',
    url: '/api/abi-copilot/v1/tag/addTag'
  });
}

/**
 * 编辑标签语义
 *
 * @param params
 * @returns
 */
export function editTag(params: ITag) {
  return apiRequest({
    data: params,
    method: 'POST',
    url: '/api/abi-copilot/v1/tag/editTag'
  });
}

import { apiRequest } from '../request';

/**
 * 查询推荐问题列表
 *
 * @param params
 */
export function queryQuestion(params: { groupId: number; question: string; spaceId: number }) {
  return apiRequest({
    data: params,
    method: 'post',
    url: '/copilot/v1/question/queryQuestion'
  });
}

/**
 * 新增推荐问题
 *
 * @param params
 */
export function addQuestion(params: { agentId: number; groupId: number; question: string; spaceId: number }) {
  return apiRequest({
    data: params,
    method: 'post',
    url: '/abi-copilot/v1/question/addQuestion'
  });
}

/**
 * 编辑推荐问题
 *
 * @param params
 */
export function editQuestion(params: {
  agentId: number;
  groupId: number;
  problemId: number;
  question: string;
  spaceId: number;
}) {
  return apiRequest({
    data: params,
    method: 'post',
    url: '/abi-copilot/v1/question/editQuestion'
  });
}

/**
 * 删除推荐问题
 *
 * @param params
 */
export function deleteQuestion(id: number) {
  return apiRequest({
    data: {
      problemId: id
    },
    method: 'post',
    url: '/abi-copilot/v1/question/deleteQuestion'
  });
}

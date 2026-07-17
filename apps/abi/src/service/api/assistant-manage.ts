import { apiRequest } from '../request';

/** get data-source list */
export async function fetchAssistantConfigList(params?: Api.DataPreparation.DataSourceSearchParamsType) {
  const res = (await apiRequest<Api.DataPreparation.DatasourceListType>({
    method: 'get',
    params,
    url: '/api/copilot/v1/agentConfig/list'
  })) as any;

  return { data: { ...res?.response?.data, data: res?.response?.data?.rows || [] } };
}

// 修改智能助手配置
export async function putAgentConfig(data: any) {
  return await apiRequest({
    data,
    method: 'put',
    url: '/api/copilot/v1/agentConfig/config'
  });
}
// 新增智能助手配置
export async function postAgentConfig(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/api/copilot/v1/agentConfig'
  });
}
// 配置智能助手
export async function putAgentConfigConfig(data: any) {
  return await apiRequest({
    data,
    method: 'put',
    url: '/api/copilot/v1/agentConfig/config'
  });
}
// 导出智能助手配置列表
export async function postAgentConfigExport(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/api/copilot/v1/agentConfig/export'
  });
}
// 获取智能助手配置详细信息/v1/agentConfig/{agentId}
export function getAgentDetailById(agentId: number) {
  return apiRequest({
    method: 'get',
    url: `/api/copilot/v1/agentConfig/${agentId}`
  });
}

// 根据智能助手agentId获取数据源列表 /v1/agentConfig/ds/{agentId}
export function getAgentConfigDs(agentId: any) {
  return apiRequest({
    data: {},
    method: 'get',
    url: `/api/copilot/v1/agentConfig/ds/${agentId}`
  });
}
// 删除智能助手配置 /v1/agentConfig/{agentIds}
export function delAgentConfigDs(agentIds: number) {
  return apiRequest({
    method: 'delete',
    url: `/api/copilot/v1/agentConfig/${agentIds}`
  });
}

export function fetchCheckBeforeDelete(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: `/api/copilot/v1/chatConfig/checkConfig`
  });
}

// 同步知识库
export function syncKnowledgeBase(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: `/api/chat-proxy/api/v1/semantic/prepare`
  });
}

// 获取第三方插件
export function fetchPluginList(params?: any) {
  return apiRequest({
    method: 'get',
    params,
    url: `/api/system/v1/plugin/list`
  });
}

// 获取标签语义
export function fetchTags(data?: any) {
  return apiRequest({
    data,
    method: 'post',
    url: `/api/copilot/v1/tag/queryTag`
  });
}

// 获取行业术语列表
export function fetchTerms(data?: any) {
  return apiRequest({
    data,
    method: 'post',
    url: `/api/copilot/v1/term/queryTerms`
  });
}

// 获取推荐问题列表
export function fetchQuestions(data?: any) {
  return apiRequest({
    data,
    method: 'post',
    url: `/api/copilot/v1/question/queryQuestion`
  });
}

/** 效果评审接口基础路径（abi-chat 后端） */
const FEEDBACK_BASE = '/api/abi-chat/v1/app/message/feedback';

/**
 * 效果评审 - 查询列表（inquire）
 * @param data 支持 spaceId、page、pageSize、chatMode、status 等 camelCase 参数
 */
export function fetchMemoryList(data?: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: `${FEEDBACK_BASE}/inquire`
  });
}

/**
 * 效果评审 - 编辑反馈/专家评估（edit）
 * 后端在编辑成功后会同步向量库，前端无需再单独调用向量存储接口
 * @param data 支持 fbId、status、evalExpert、expertOpinion、evalLlm、llmOpinion、remark
 */
export function fetchEditMemory(data?: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: `${FEEDBACK_BASE}/edit`
  });
}

/**
 * 效果评审 - 删除（delete）
 * 后端在删除反馈记录的同时会清理向量数据，前端无需再单独调用向量删除接口
 */
export function fetchDeleteMemory(fbId: string | number) {
  return apiRequest<any>({
    data: { fbId },
    method: 'post',
    url: `${FEEDBACK_BASE}/delete`
  });
}

// 删除助手 额外调用的删除接口
export function fetchDeleteAgent(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: `/api/chat-proxy/api/v1/semantic/delete`
  });
}

/** 字典 - 列表 */
export function fetchDictionariesList(params?: any) {
  return apiRequest<any>({
    method: 'get',
    params,
    url: '/api/chat-proxy/v1/dictionarydata/list'
  });
}

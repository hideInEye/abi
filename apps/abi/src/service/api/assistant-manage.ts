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

/** 获取记忆管理列表 */
export async function fetchMemoryList(params?: any) {
  const res = (await apiRequest<any>({
    method: 'post',
    params,
    url: '/api/chat-proxy/api/v1/feedback/inquire'
  })) as any;

  return { data: res };
}

/** 记忆管理 - 同步数据库 */
export function fetchVectorStorage(data?: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: '/api/chat-proxy/api/v1/feedback/vectorstorage'
  });
}

/** 记忆管理 - 模型评估 */
export function fetchModelEval(data?: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: '/api/chat-proxy/api/v2/workflow/chat/feedback/llmeval'
  });
}

/** 记忆管理 - 删除 */
export function fetchDeleteMemory(fbId: string) {
  return apiRequest<any>({
    method: 'post',
    url: `/api/chat-proxy/api/v1/feedback/delete?fb_id=${fbId}`
  });
}

/** 记忆管理 - 删除同步数据库 */
export function fetchVectorsDelete(fbId: string) {
  return apiRequest<any>({
    data: { fb_id: fbId },
    method: 'post',
    url: `/api/chat-proxy/api/v1/feedback/vectorsdelete`
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

// 删除前检查


/** 记忆管理 - 编辑 */
export function fetchEditMemory(data?: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: '/api/chat-proxy/api/v1/feedback/edit'
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

import { apiRequest } from '../request';

const TOOL_BASE = '/api/abi-copilot/v1/tool';

export interface ToolItem {
  toolId: number | string;
  toolName: string;
  toolLabel?: string;
  description?: string;
  toolType?: string;
  icon?: string;
  scriptContent?: string;
  startupParams?: string;
  inputSchema?: string;
  outputSchema?: string;
  status?: string;
  delFlag?: string;
  createDept?: string | null;
  createBy?: string | null;
  createTime?: string;
  updateBy?: string | null;
  updateTime?: string;
}

/**
 * 查询内置工具列表
 *
 * @param data toolName 可选模糊匹配；toolLabel 可选标签模糊匹配
 */
export function queryToolListApi(data: { toolName?: string; toolLabel?: string } = {}) {
  return apiRequest({
    data,
    method: 'post',
    url: `${TOOL_BASE}/list`
  });
}

/**
 * 查询工具详情
 *
 * @param data toolId 工具ID
 */
export function getToolDetailApi(data: { toolId: string | number }) {
  return apiRequest({
    data,
    method: 'post',
    url: `${TOOL_BASE}/get`
  });
}

/** 新增工具请求参数 */
export interface CreateToolParams {
  toolName: string;
  toolLabel: string;
  description?: string;
  toolType?: string;
  icon?: string;
  scriptContent?: string;
  startupParams?: string;
  inputSchema?: string;
  outputSchema?: string;
  status?: string;
  mode_type?: number;
}

/**
 * 新增工具
 */
export function createToolApi(data: CreateToolParams) {
  return apiRequest({
    data,
    method: 'post',
    url: `${TOOL_BASE}/create`
  });
}

/** 修改工具请求参数 */
export interface UpdateToolParams extends CreateToolParams {
  toolId: string | number;
}

/**
 * 修改工具
 */
export function updateToolApi(data: UpdateToolParams) {
  return apiRequest({
    data,
    method: 'post',
    url: `${TOOL_BASE}/update`
  });
}

/** 生成 Schema 请求参数 */
export interface GenerateSchemaParams {
  name: string;
  description: string;
  param: {
    paramName: string;
    paramType: string;
    paramDescription: string;
    required: boolean;
  }[];
}

/**
 * 根据表单参数生成 JSON Schema
 */
export function generateSchemaApi(data: GenerateSchemaParams) {
  return apiRequest({
    data,
    method: 'post',
    url: `${TOOL_BASE}/generate-schema`
  });
}

/**
 * 删除工具
 *
 * @param data toolId 工具ID
 */
export function deleteToolApi(data: { toolId: string | number }) {
  return apiRequest({
    data,
    method: 'post',
    url: `${TOOL_BASE}/delete`
  });
}

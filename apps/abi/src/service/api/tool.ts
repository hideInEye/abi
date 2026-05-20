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
 * @param data toolName 可选模糊匹配
 */
export function queryToolListApi(data: { toolName?: string } = {}) {
  return apiRequest({
    data,
    method: 'post',
    url: `${TOOL_BASE}/list`
  });
}

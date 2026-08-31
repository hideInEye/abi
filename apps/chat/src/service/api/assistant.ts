import request from '../request/index';

const BASE_URL = '/abi-chat/v1/app';

// ============ 类型定义 ============

/** 表语义配置子项 */
export interface SchemaSemanticItem {
  schemaConfig?: Record<string, any>; // 格式: [{"type":"schema","id":101}]
  sort?: number;
}

/** 技能配置子项 */
export interface SkillItem {
  skillConfig?: Record<string, any>; // 格式: [{"type":"skill","id":101}]
  sort?: number;
}

/** 工具配置子项 */
export interface ToolItem {
  toolType?: string; // 工具类型 (1: 内置工具 2: MCP工具)
  toolConfig?: Record<string, any>; // 格式: [{"type":"tool","id":101}]
  sort?: number;
}

/** AI智能体应用实体 */
export interface AppItem {
  appId: number | string;
  appName: string;
  spaceId?: number | string;
  groupId?: string;
  description?: string;
  icon?: string;
  /** 应用类型: 1-预置流程模板 / 2-自定义workflow / 3-自定义Agent */
  appType?: string;
  /** 智能体级提示词，Markdown格式 */
  appPrompt?: string;
  /** 开场白 */
  prologue?: string;
  /** 推荐问题列表，JSON数组 */
  recQuery?: any;
  /** 模型配置 (JSON) */
  modelSetting?: any;
  /** 知识库配置 (JSON) */
  knowledgeSetting?: any;
  /** 工作流配置 (JSON) */
  workflowConfig?: any;
  /** 前端画布数据 (JSON) */
  graphData?: any;
  /** 工作流 DSL 配置 (JSON) */
  dslData?: any;
  /** 应用参数配置 (JSON) */
  parameters?: any;
  /** 关联嵌入模型 ID */
  embedModelId?: number | string;
  /** 关联对话模型 ID */
  chatModelId?: number | string;
  /** 状态 (0:禁用 1:启用) */
  status?: string;
  /** 调试模式: 0-禁用 / 1-启用 */
  enableDebug?: string;
  /** 公开访问: 0-关闭 / 1-开启 */
  publicAccess?: string;
  /** 创建部门 */
  createDept?: number | string;
  /** 备注 */
  remark?: string;
  /** 表语义配置列表 */
  schemaSemantics?: SchemaSemanticItem[];
  /** 技能配置列表 */
  skills?: SkillItem[];
  /** 工具配置列表 */
  tools?: ToolItem[];
  createBy?: string;
  createTime?: string;
  updateBy?: string;
  updateTime?: string;
}

/** 查询应用列表参数 */
export interface FetchAppListParams {
  appName?: string;
  spaceId?: number | string;
  groupId?: string;
  status?: string;
  enableDebug?: string;
  publicAccess?: string;
}

/** 新增/修改应用参数（新增时 appName + spaceId 必传） */
export type AddAppParams = Partial<AppItem> & { appName: string; spaceId: number | string };
export type UpdateAppParams = Partial<AppItem> & { appId: number | string };

// ============ 接口封装 ============

/** 1. 查询AI智能体应用列表 */
export function fetchAssistantList(data?: FetchAppListParams) {
  return request({
    url: `${BASE_URL}/list`,
    method: 'post',
    data,
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  });
}

/** 2. 获取AI智能体应用详情 */
export function fetchAssistantDetail(data: { appId: number | string }) {
  return request({
    url: `${BASE_URL}/get`,
    method: 'post',
    data,
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  });
}

/** 3. 新增AI智能体应用 */
export function addAssistant(data: AddAppParams) {
  return request({
    url: `${BASE_URL}/add`,
    method: 'post',
    data,
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  });
}

/** 4. 修改应用 */
export function updateAssistant(data: UpdateAppParams) {
  return request({
    url: `${BASE_URL}/update`,
    method: 'post',
    data,
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  });
}

/** 5. 删除应用 */
export function deleteAssistant(data: { appId: number | string }) {
  return request({
    url: `${BASE_URL}/delete`,
    method: 'post',
    data,
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  });
}

/**
 * 统一分享接口（助手与大屏共用，type 区分：chat端助手分享=react，abi助手=workflow，数据大屏=dashboard）。
 * 网关完整路径对齐大屏：VITE_BASE_API('/api') + '/dashboard/api/v1/project/share'，
 * 与大屏 FetchUtil 的 VITE_API_TARGET('/api') + '/dashboard/api/v1/project/share' 一致。
 */
const SHARE_BASE_URL = '/dashboard/api/v1/project';

/** 6. 分享助手 */
export function shareAssistant(data: {
  /** 助手 appId 作为 projectId 下发 */
  projectId: number | string;
  spaceId: number | string;
  sharePasswordFlag?: boolean;
  /** 过期天数（1/7/30），不传由后端默认 */
  expirationDays?: number;
  /** 自定义过期时间，格式 "YYYY-MM-DD HH:mm:ss" */
  expirationDate?: string;
}) {
  return request({
    url: `${SHARE_BASE_URL}/share`,
    method: 'post',
    data: { type: 'react', ...data },
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  });
}

/** 7. 校验分享密码 / 获取分享信息（与大屏同接口；sharePassword 传空串即探测是否需要密码） */
export function checkAssistantShare(data: { shareCode: string; sharePassword: string }) {
  return request({
    url: `${SHARE_BASE_URL}/checkSharePassword`,
    method: 'post',
    data,
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  });
}

/** 8. 分享记录分页查询（统一分享接口，type 区分：react=chat端助手 / workflow=abi助手 / dashboard=数据大屏） */
export function fetchShareRecordList(data: {
  type: 'react' | 'workflow' | 'dashboard';
  spaceId?: number | string;
  current: number;
  size: number;
}) {
  return request({
    url: `${SHARE_BASE_URL}/share/list`,
    method: 'post',
    data,
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  });
}

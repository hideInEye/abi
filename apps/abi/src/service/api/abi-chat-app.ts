import { apiRequest } from '../request';

const BASE = '/api/abi-chat/v1/app';

/** 应用实体类型 */
export interface AppItem {
  appId: number | string;
  appName: string;
  spaceId?: number | string;
  groupId?: number | string;
  description?: string;
  icon?: string;
  appType?: string;
  appPrompt?: string;
  prologue?: string;
  recQuery?: any[];
  modelSetting?: any;
  chatModelId?: number | string;
  status?: string;
  enableDebug?: string;
  publicAccess?: string;
  createDept?: number | string;
  remark?: string;
  knowledgeSetting?: any;
  schemaSemantics?: any;
  skills?: any;
  tools?: any;
  createBy?: string;
  createTime?: string;
  updateBy?: string;
  updateTime?: string;
}

/** 查询应用列表 */
export function fetchAppListApi(data?: {
  appName?: string;
  spaceId?: number | string;
  groupId?: number | string;
  status?: string;
  enableDebug?: string;
  publicAccess?: string;
}) {
  return apiRequest({
    data,
    method: 'post',
    url: `${BASE}/list`
  });
}

/** 查询应用详情 */
export function fetchAppDetailApi(data: { appId: number | string }) {
  return apiRequest({
    data,
    method: 'post',
    url: `${BASE}/get`
  });
}

/** 新增应用 */
export function addAppApi(data: Partial<AppItem>) {
  return apiRequest({
    data,
    method: 'post',
    url: `${BASE}/add`
  });
}

/** 更新应用 */
export function updateAppApi(data: Partial<AppItem> & { appId: number | string }) {
  return apiRequest({
    data,
    method: 'post',
    url: `${BASE}/update`
  });
}

/** 删除应用 */
export function deleteAppApi(data: { appId: number | string }) {
  return apiRequest({
    data,
    method: 'post',
    url: `${BASE}/delete`
  });
}

// ── 版本管理 ──
const VERSION_BASE = '/api/abi-chat/v1/app/version';

/** 发布版本 */
export function publishVersionApi(data: { versionId: number | string }) {
  return apiRequest({ data, method: 'post', url: `${VERSION_BASE}/publish` });
}

/** 下线版本 */
export function offlineVersionApi(data: { versionId: number | string }) {
  return apiRequest({ data, method: 'post', url: `${VERSION_BASE}/offline` });
}

/** 选择版本（切换当前使用版本） */
export function selectVersionApi(data: { versionId: number | string }) {
  return apiRequest({ data, method: 'post', url: `${VERSION_BASE}/select` });
}

/** 删除版本 */
export function deleteVersionApi(data: { versionId: number | string }) {
  return apiRequest({ data, method: 'post', url: `${VERSION_BASE}/delete` });
}

/** 查询版本详情 */
export function getVersionDetailApi(data: { versionId: number | string }) {
  return apiRequest({ data, method: 'post', url: `${VERSION_BASE}/get` });
}

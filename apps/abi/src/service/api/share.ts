import { apiRequest } from '../request';

/** 获取分享列表 */
export function fetchShareList() {
  return apiRequest({
    method: 'get',
    url: '/api/abi-system/share/list'
  });
}

/** 删除分享 */
export function deleteShare(shareIds: string) {
  return apiRequest({
    method: 'delete',
    url: `/api/abi-system/share/${shareIds}`
  });
}

/**
 * 统一分享接口（助手与大屏共用，type 区分：react=自主助手(chat/abi) / workflow=工作流助手(暂未开发) / dashboard=数据大屏）。
 * 网关路径与大屏一致：/api + /dashboard/api/v1/project/share。
 * configs 为分享配置列表：每项一组「主题 UI 配置 + API-Key」，一条分享可绑多组。
 */
export function shareProjectApi(data: {
  /** 助手 appId 作为 projectId 下发 */
  projectId: number | string;
  spaceId: number | string;
  type: 'react' | 'workflow' | 'dashboard';
  /** 分享配置列表：每项一组「主题 UI 配置 + API-Key」 */
  configs: {
    /** 前端主题 UI 配置 JSON 字符串 */
    uiConfig: string;
    /** API-Key（sys_client.client_id），分享校验时按 AK/SK 使用 */
    apiKey: string;
  }[];
  /** 过期天数（1/7/30） */
  expirationDays?: number;
  /** 自定义过期时间，格式 "YYYY-MM-DD HH:mm:ss" */
  expirationDate?: string;
}) {
  return apiRequest({
    method: 'post',
    url: '/api/dashboard/api/v1/project/share',
    data
  });
}

/**
 * 分享记录分页查询（助手与大屏共用，type 区分：react=自主助手(chat/abi) / workflow=工作流助手(暂未开发) / dashboard=数据大屏）。
 * 网关路径与分享接口一致：/api + /dashboard/api/v1/project/share/list。
 */
export function fetchProjectShareListApi(data: {
  type: 'react' | 'workflow' | 'dashboard';
  spaceId?: number | string;
  current: number;
  size: number;
}) {
  return apiRequest({
    method: 'post',
    url: '/api/dashboard/api/v1/project/share/list',
    data
  });
}

/**
 * 按 share_code 查询绑定的 API-Key 列表（分享记录「API Key查看」兜底，行内 apiKeys 缺失时单查）。
 * 网关路径与分享接口一致：/api + /dashboard/api/v1/project/sharelist/{shareCode}。
 */
export function fetchShareApiKeyListApi(shareCode: string) {
  return apiRequest({
    method: 'get',
    url: `/api/dashboard/api/v1/project/sharelist/${shareCode}`
  });
}

/**
 * 按 API-Key 查询其绑定的分享列表（shareKey 为查询参数；type 可选过滤，支持逗号分隔多选 react/workflow/dashboard，不传查全部）。
 * 网关路径与分享接口一致：/api + /dashboard/api/v1/project/shareByApiKey。
 */
export function fetchShareListByApiKeyApi(params: {
  /** API-Key 查询参数名：网关拦截 x-api-key/X-API-Key/api_key/apiKey 四个关键词，约定用 shareKey */
  shareKey: string;
  /** 逗号分隔多选，如 'react' 或 'react,workflow' */
  type?: string;
}) {
  return apiRequest({
    method: 'get',
    url: '/api/dashboard/api/v1/project/shareByApiKey',
    params
  });
}

/**
 * 更新分享记录的应用状态（shareCodes 以重复 query key 传多个：?shareCodes=a&shareCodes=b）。
 * appStatus: 0-已删除 1-启用中 2-已离线(历史版本) 3-编辑中。
 * 手动拼 query 而非 axios 数组序列化，避免默认带 [] 后缀与后端 repeat 形式不符。
 */
export function updateShareStatusApi(shareCodes: string[], appStatus: number | string) {
  const qs = [
    ...shareCodes.map(c => `shareCodes=${encodeURIComponent(c)}`),
    `appStatus=${encodeURIComponent(String(appStatus))}`,
  ].join('&');
  return apiRequest({
    method: 'put',
    url: `/api/dashboard/api/v1/project/share/status?${qs}`
  });
}

/**
 * 应用状态变更后同步其名下的分享记录：列表接口无“按应用筛”参数，故拉全量后前端挑出
 * projectId 命中的行、收集 shareCode 逗号拼接一次 PUT；无分享记录则不发请求。
 * 内部吞错（仅 console），同步失败不阻塞应用侧主流程。
 */
export async function syncShareAppStatus(o: {
  projectId: number | string;
  type: 'react' | 'workflow' | 'dashboard';
  spaceId?: number | string;
  appStatus: number | string;
}) {
  try {
    const { data, error } = await fetchProjectShareListApi({
      type: o.type,
      spaceId: o.spaceId || undefined,
      current: 1,
      size: 999,
    });
    if (error) return;
    const page = data ?? {};
    const list = Array.isArray(page) ? page : (page.records ?? page.rows ?? page.list ?? []);
    const codes = (Array.isArray(list) ? list : [])
      .filter((r: any) => String(r?.projectId) === String(o.projectId))
      .map((r: any) => r?.shareCode)
      .filter(Boolean);
    if (!codes.length) return;
    await updateShareStatusApi(codes, o.appStatus);
  } catch (e) {
    console.error('同步分享记录应用状态失败', e);
  }
}

import { apiRequest } from '../request';

const SKILL_BASE = '/api/abi-copilot/v1/skill';

/**
 * 发布技能包
 *
 * @param formData 必须包含 file / spaceId，可选 version / changelog
 * @returns
 */
export function publishSkillApi(formData: FormData) {
  return apiRequest({
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    method: 'post',
    url: `${SKILL_BASE}/publish`
  });
}

/**
 * 查询技能列表
 *
 * @param data spaceId 不传则查询所有公开技能；status 0 禁用 / 1 启用；createdBy 传当前登录用户名可过滤本人创建
 * @returns
 */
export function querySkillListApi(
  data: { spaceId?: number | string; status?: string; createdBy?: string } = {}
) {
  return apiRequest({
    data,
    method: 'post',
    url: `${SKILL_BASE}/list`
  });
}

/**
 * 获取技能详情
 *
 * @param data skillId
 * @returns
 */
export function getSkillDetailApi(data: { skillId: number | string }) {
  return apiRequest({
    data,
    method: 'post',
    url: `${SKILL_BASE}/get`
  });
}

/**
 * 删除技能
 *
 * @param data skillId
 * @returns
 */
export function deleteSkillApi(data: { skillId: number | string }) {
  return apiRequest({
    data,
    method: 'post',
    url: `${SKILL_BASE}/delete`
  });
}

/**
 * 下载整个技能包（zip）
 *
 * @param data skillId（后端定义为 String）
 * @returns Blob 二进制流 application/octet-stream
 */
export function downloadSkillPackageApi(data: { skillId: number | string }) {
  return apiRequest({
    data: { skillId: String(data.skillId) },
    method: 'post',
    responseType: 'blob',
    url: `${SKILL_BASE}/download`
  });
}

/**
 * 获取版本列表
 *
 * @param data skillId
 * @returns
 */
export function getSkillVersionListApi(data: { skillId: number | string }) {
  return apiRequest({
    data,
    method: 'post',
    url: `${SKILL_BASE}/versions`
  });
}

/**
 * 获取版本详情
 *
 * @param data versionId
 * @returns
 */
export function getSkillVersionDetailApi(data: { versionId: number | string }) {
  return apiRequest({
    data,
    method: 'post',
    url: `${SKILL_BASE}/version/get`
  });
}

/**
 * 发布版本（仅 DRAFT 状态可发布，发布后会更新技能的 latestVersionId）
 *
 * @param data versionId
 * @returns
 */
export function publishSkillVersionApi(data: { versionId: number | string }) {
  return apiRequest({
    data,
    method: 'post',
    url: `${SKILL_BASE}/version/publish`
  });
}

/**
 * 获取技能包文件列表
 *
 * @param data versionId
 * @returns
 */
export function getSkillFileListApi(data: { versionId: number | string }) {
  return apiRequest({
    data,
    method: 'post',
    url: `${SKILL_BASE}/files`
  });
}

/**
 * 下载技能包中单个文件
 *
 * @param data versionId + path（后端定义为 String）
 * @returns Blob 二进制流
 */
export function downloadSkillFileApi(data: { path: string; versionId: number | string }) {
  return apiRequest({
    data: { path: data.path, versionId: String(data.versionId) },
    method: 'post',
    responseType: 'blob',
    url: `${SKILL_BASE}/file/download`
  });
}

/**
 * 添加技能标签
 *
 * @param data skillId + tagName
 * @returns
 */
export function addSkillTagApi(data: { skillId: number | string; tagName: string }) {
  return apiRequest({
    data,
    method: 'post',
    url: `${SKILL_BASE}/tag/add`
  });
}

/**
 * 删除技能标签
 *
 * @param data tagId（标签列表项的 id）
 * @returns
 */
export function deleteSkillTagApi(data: { tagId: number | string }) {
  return apiRequest({
    data,
    method: 'post',
    url: `${SKILL_BASE}/tag/delete`
  });
}

/**
 * 获取技能标签列表
 *
 * @param data skillId
 * @returns
 */
export function getSkillTagListApi(data: { skillId: number | string }) {
  return apiRequest({
    data,
    method: 'post',
    url: `${SKILL_BASE}/tags`
  });
}

/**
 * 获取技能介绍（概览 Markdown）
 *
 * @param data skillId
 * @returns Markdown 字符串
 */
export function getSkillIntroductionApi(data: { skillId: number | string }) {
  return apiRequest({
    data,
    method: 'post',
    url: `${SKILL_BASE}/introduction`
  });
}

/**
 * 选择当前版本（切换技能当前生效版本）
 *
 * @param data skillId + versionId
 * @returns boolean
 */
export function selectSkillVersionApi(data: { skillId: number | string; versionId: number | string }) {
  return apiRequest({
    data,
    method: 'post',
    url: `${SKILL_BASE}/version/select`
  });
}

/**
 * 删除版本
 *
 * @param data versionId
 * @returns boolean
 */
export function deleteSkillVersionApi(data: { versionId: number | string }) {
  return apiRequest({
    data,
    method: 'post',
    url: `${SKILL_BASE}/version/delete`
  });
}

/**
 * 更新技能启用/禁用状态
 *
 * @param data skillId + status (1=启用, 0=隐藏)
 * @returns boolean
 */
export function updateSkillStatusApi(data: { skillId: number | string; status: number | string }) {
  return apiRequest({
    data,
    method: 'post',
    url: `${SKILL_BASE}/status`
  });
}

import request from '../request/index'

// 查询技能列表
export function querySkillList(data: { spaceId?: number | string; status?: string; createdBy?: string } = {}) {
  return request({
    url: '/api/abi-copilot/v1/skill/list',
    method: 'post',
    data,
  })
}

// 获取技能详情
export function getSkillDetail(data: { skillId: number | string }) {
  return request({
    url: '/api/abi-copilot/v1/skill/get',
    method: 'post',
    data,
  })
}

// 更新技能启用/禁用状态（1=启用, 0=隐藏）
export function updateSkillStatus(data: { skillId: number | string; status: number | string }) {
  return request({
    url: '/api/abi-copilot/v1/skill/status',
    method: 'post',
    data,
  })
}

// 修改技能（与 abi 同一接口；添加技能复用此接口，后续参数由后端提供）
export function updateSkillInfo(data: { skillId: number | string; [key: string]: any }) {
  return request({
    url: '/api/abi-copilot/v1/skill/update',
    method: 'post',
    data,
  })
}

const SKILL_BASE = '/api/abi-copilot/v1/skill'

// 获取版本列表
export function getSkillVersionList(data: { skillId: number | string }) {
  return request({ url: `${SKILL_BASE}/versions`, method: 'post', data })
}

// 获取版本详情
export function getSkillVersionDetail(data: { versionId: number | string }) {
  return request({ url: `${SKILL_BASE}/version/get`, method: 'post', data })
}

// 获取技能包文件列表
export function getSkillFileList(data: { versionId: number | string }) {
  return request({ url: `${SKILL_BASE}/files`, method: 'post', data })
}

// 获取技能标签列表
export function getSkillTagList(data: { skillId: number | string }) {
  return request({ url: `${SKILL_BASE}/tags`, method: 'post', data })
}

// 获取技能介绍（概览 Markdown）
export function getSkillIntroduction(data: { skillId: number | string }) {
  return request({ url: `${SKILL_BASE}/introduction`, method: 'post', data })
}

// 下载整个技能包（zip）
export function downloadSkillPackage(data: { skillId: number | string }) {
  return request({ url: `${SKILL_BASE}/download`, method: 'post', responseType: 'blob', data: { skillId: String(data.skillId) } })
}

// 下载技能包中单个文件
export function downloadSkillFile(data: { path: string; versionId: number | string }) {
  return request({ url: `${SKILL_BASE}/file/download`, method: 'post', responseType: 'blob', data: { path: data.path, versionId: String(data.versionId) } })
}

// 添加技能标签
export function addSkillTag(data: { skillId: number | string; tagName: string }) {
  return request({ url: `${SKILL_BASE}/tag/add`, method: 'post', data })
}

// 删除技能标签
export function deleteSkillTag(data: { tagId: number | string }) {
  return request({ url: `${SKILL_BASE}/tag/delete`, method: 'post', data })
}

// 发布版本（仅 DRAFT 状态可发布）
export function publishSkillVersion(data: { versionId: number | string }) {
  return request({ url: `${SKILL_BASE}/version/publish`, method: 'post', data })
}

// 选择当前版本
export function selectSkillVersion(data: { skillId: number | string; versionId: number | string }) {
  return request({ url: `${SKILL_BASE}/version/select`, method: 'post', data })
}

// 删除版本
export function deleteSkillVersion(data: { versionId: number | string }) {
  return request({ url: `${SKILL_BASE}/version/delete`, method: 'post', data })
}

// 删除技能
export function deleteSkill(data: { skillId: number | string }) {
  return request({ url: `${SKILL_BASE}/delete`, method: 'post', data })
}

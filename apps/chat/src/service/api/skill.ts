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

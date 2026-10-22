// 技能类型读取侧判定（0 内置技能 / 1 外部技能）：内置技能系统下发恒可见恒启用、仅可查看

import { describe, expect, it } from 'vitest'

import { filterSkillsByTab, isBuiltinSkill } from './skill-type'

describe('isBuiltinSkill', () => {
  it('skillType 为 0 或 "0" 视为内置技能', () => {
    expect(isBuiltinSkill(0)).toBe(true)
    expect(isBuiltinSkill('0')).toBe(true)
  })

  it('skillType 为 1/"1"/其他/缺省视为外部技能', () => {
    expect(isBuiltinSkill(1)).toBe(false)
    expect(isBuiltinSkill('1')).toBe(false)
    expect(isBuiltinSkill('2')).toBe(false)
    expect(isBuiltinSkill(undefined)).toBe(false)
    expect(isBuiltinSkill('')).toBe(false)
    expect(isBuiltinSkill(null)).toBe(false)
  })
})

describe('filterSkillsByTab', () => {
  const spaceId = 100
  const items = [
    // 内置技能：私有 + 系统空间，也必须两个 tab 恒可见
    { id: 'b1', skillType: 0, visibility: 'PRIVATE', spaceId: 0 },
    // 公开外部技能
    { id: 'p1', skillType: 1, visibility: 'PUBLIC', spaceId: 999 },
    // 本空间私有外部技能
    { id: 'v1', skillType: 1, visibility: 'PRIVATE', spaceId: 100 },
    // 其他空间私有外部技能
    { id: 'v2', skillType: 1, visibility: 'PRIVATE', spaceId: 200 },
  ]
  const myIds = ['p1']

  it('广场：公开全平台可见、私有仅本空间可见、内置技能恒可见', () => {
    const result = filterSkillsByTab(items, { tab: 'plaza', myIds, spaceId })
    expect(result.map(i => i.id)).toEqual(['b1', 'p1', 'v1'])
  })

  it('我的技能：内置技能无需收藏即展示，其余以收藏集合为准', () => {
    const result = filterSkillsByTab(items, { tab: 'mine', myIds, spaceId })
    expect(result.map(i => i.id)).toEqual(['b1', 'p1'])
  })

  it('我的技能：本空间私有技能即使被收藏也正常展示，不重复不遗漏', () => {
    const result = filterSkillsByTab(items, { tab: 'mine', myIds: ['p1', 'v1'], spaceId })
    expect(result.map(i => i.id)).toEqual(['b1', 'p1', 'v1'])
  })
})

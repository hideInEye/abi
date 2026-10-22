// 技能类型读取侧判定（0 内置技能 / 1 外部技能）：内置技能系统下发恒可见恒启用、仅可查看

import { describe, expect, it } from 'vitest'

import { filterSkillCardsByTab, isBuiltinSkill } from './skill-type'

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

describe('filterSkillCardsByTab', () => {
  const curSpaceId = 100
  const rawMap: Record<string, { visibility?: string; spaceId?: number }> = {
    b1: { visibility: 'PRIVATE', spaceId: 0 },
    p1: { visibility: 'PUBLIC', spaceId: 999 },
    v1: { visibility: 'PRIVATE', spaceId: 100 },
    v2: { visibility: 'PRIVATE', spaceId: 200 },
  }
  const cards = [
    { key: 'b1', skillType: 0 },
    { key: 'p1', skillType: 1 },
    { key: 'v1', skillType: 1 },
    { key: 'v2', skillType: 1 },
  ]
  const getRaw = (c: (typeof cards)[number]) => rawMap[c.key]
  const myIds = new Set(['p1'])

  it('广场：公开全平台可见、私有仅本空间可见、内置技能恒可见', () => {
    const result = filterSkillCardsByTab(cards, { tab: 'plaza', myIds, curSpaceId, getRaw })
    expect(result.map((c) => c.key)).toEqual(['b1', 'p1', 'v1'])
  })

  it('我的技能：内置技能无需收藏即展示，其余以收藏集合为准', () => {
    const result = filterSkillCardsByTab(cards, { tab: 'mine', myIds, curSpaceId, getRaw })
    expect(result.map((c) => c.key)).toEqual(['b1', 'p1'])
  })

  it('我的技能：本空间私有技能未被收藏时不展示', () => {
    const result = filterSkillCardsByTab(cards, { tab: 'mine', myIds: new Set(['p1', 'v1']), curSpaceId, getRaw })
    expect(result.map((c) => c.key)).toEqual(['b1', 'p1', 'v1'])
  })
})

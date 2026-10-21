/** 技能类型读取侧判定：列表/收藏接口已带 skillType（0 内置技能 / 1 外部技能），前端按此区分展示与操作 */

/** 内置技能（skillType=0）判定：系统下发的基本能力，权限上恒可见恒启用，且仅可查看（不可添加/移除/开关/删除） */
export function isBuiltinSkill(skillType?: number | string | null): boolean {
  return String(skillType ?? '') === '0'
}

/** 技能可见性过滤的最小字段集（列表项子集） */
export type SkillVisibilityItem = {
  id: number | string
  spaceId?: number | string
  visibility?: string
  skillType?: number | string
}

/**
 * 技能管理页「广场 / 我的技能」tab 可见性过滤（纯函数）。
 * 广场：公开（PUBLIC）全平台可见；私有（PRIVATE）仅所属空间可见；内置技能（skillType=0）为系统基本能力恒可见。
 * 我的技能：内置技能由系统默认下发（无需收藏）；其余仅展示已添加（收藏接口返回）的。
 */
export function filterSkillsByTab<T extends SkillVisibilityItem>(
  list: T[],
  opts: {
    tab: 'plaza' | 'mine'
    myIds: ReadonlyArray<string>
    spaceId?: number | string
  }
): T[] {
  const { tab, myIds, spaceId } = opts
  return list.filter(it => {
    if (isBuiltinSkill(it.skillType)) return true
    const v = String(it.visibility || '').toUpperCase()
    if (v !== 'PRIVATE') return true
    const inMySpace = String(it.spaceId ?? '') === String(spaceId ?? '')
    return tab === 'mine' ? inMySpace || myIds.includes(String(it.id)) : inMySpace
  }).filter(it => (tab === 'mine' ? isBuiltinSkill(it.skillType) || myIds.includes(String(it.id)) : true))
}

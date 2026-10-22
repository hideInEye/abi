/** 技能类型读取侧判定：列表接口已带 skillType（0 内置技能 / 1 外部技能），前端按此区分展示与操作 */

/** 内置技能（skillType=0）判定：系统下发的基本能力，权限上恒可见恒启用，且仅可查看（不可添加/移除/开关/删除） */
export function isBuiltinSkill(skillType?: number | string | null): boolean {
  return String(skillType ?? '') === '0'
}

/** 技能商店卡片（constant/layout.tsx SkillCard 的最小字段集） */
export type SkillCardLike = {
  key: string
  skillType?: number | string
}

/** 卡片对应的原始列表项（可见性字段挂在 rawMap[key] 上） */
export type SkillRawLike = {
  visibility?: string
  spaceId?: number | string
}

/**
 * 技能商店「广场 / 我的技能」tab 可见性过滤（纯函数）。
 * 广场：内置技能（skillType=0）为系统基本能力恒可见；公开（PUBLIC）全平台可见；私有（PRIVATE）仅所属空间可见。
 * 我的技能：内置技能由系统默认下发（无需收藏）；其余仅展示已添加（收藏接口返回）的。
 */
export function filterSkillCardsByTab<T extends SkillCardLike>(
  cards: T[],
  opts: {
    tab: 'plaza' | 'mine'
    myIds: ReadonlySet<string>
    curSpaceId?: number | string
    getRaw: (card: T) => SkillRawLike | undefined
  }
): T[] {
  const { tab, myIds, curSpaceId, getRaw } = opts
  return cards.filter((c) => {
    if (isBuiltinSkill(c.skillType)) return true
    if (tab === 'mine') return myIds.has(c.key)
    const raw = getRaw(c)
    if (String(raw?.visibility || '').toUpperCase() !== 'PRIVATE') return true
    return String(raw?.spaceId ?? '') === String(curSpaceId ?? '')
  })
}

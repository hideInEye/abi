import { schemalist } from '@/service/api/data-table-meaning'
import { querySkillListApi } from '@/service/api/skill'
import { normalizeRows } from '@/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper'

import type { PickerOption, PickerTabConfig } from './capability-picker-drawer'

/**
 * 能力选择抽屉的 tab 配置：接口调用方式与各自管理页保持一致
 * id 统一带业务前缀（schema_/skill_），避免跨类冲突
 */

/** 数据语义：表语义分组 + 列表 */
export const semanticPickerTabs: PickerTabConfig[] = [
  {
    key: 'schema',
    label: '表语义',
    groupType: 'shema',
    fetchList: async ({ groupId }) => {
      // groupId 为后端下发的字符串，直接透传（与语义表页 useSemanticsTable 一致，不转 number）
      const res: any = await schemalist({ groupId: groupId as any, pageNum: 1, pageSize: 200 })
      const rows = normalizeRows(res)
      return rows.map(
        (r: any): PickerOption => ({
          id: `schema_${r.schemaId}`,
          name: r.bizName || r.techName || '-',
          description: r.techName || '',
        }),
      )
    },
  },
]

/** 已添加到「我的技能」的技能 id（与技能管理页共用同一本地存储 key） */
const MY_SKILLS_KEY = 'mySkills'
function getMySkillIdSet(): Set<string> {
  try {
    const arr = JSON.parse(localStorage.getItem(MY_SKILLS_KEY) || '[]')
    return new Set(Array.isArray(arr) ? arr.map(String) : [])
  } catch {
    return new Set()
  }
}

/** 拉取技能列表并归一化（rawId 为后端原始 id，用于「我的技能」本地筛选） */
async function fetchSkillEntries(): Promise<Array<{ option: PickerOption; rawId: string }>> {
  const res: any = await querySkillListApi({})
  const rows = res?.response?.data?.data?.rows || res?.response?.data?.rows || res?.data?.rows || res?.data?.data || res?.data || []
  return (Array.isArray(rows) ? rows : []).map((r: any) => {
    const rawId = String(r.id ?? r.skillId)
    return {
      rawId,
      option: {
        id: `skill_${rawId}`,
        name: r.bizName || r.skillName || '-',
        description: r.summary || '',
      },
    }
  })
}

/** 技能：广场（全部可见）/ 我的技能（本地已添加），对齐技能管理页图三双 tab */
export const skillPickerTabs: PickerTabConfig[] = [
  {
    key: 'plaza',
    label: '广场',
    fetchList: async () => (await fetchSkillEntries()).map((e) => e.option),
  },
  {
    key: 'mine',
    label: '我的技能',
    fetchList: async () => {
      const mine = getMySkillIdSet()
      return (await fetchSkillEntries()).filter((e) => mine.has(e.rawId)).map((e) => e.option)
    },
  },
]

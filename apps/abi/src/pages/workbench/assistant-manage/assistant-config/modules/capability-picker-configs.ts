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

/** 技能：技能列表（与技能管理页一致，不传 spaceId 查全部可见技能） */
export const skillPickerTabs: PickerTabConfig[] = [
  {
    key: 'skill',
    label: '技能列表',
    fetchList: async () => {
      const res: any = await querySkillListApi({})
      const rows = res?.response?.data?.data?.rows || res?.response?.data?.rows || res?.data?.rows || res?.data?.data || res?.data || []
      return (Array.isArray(rows) ? rows : []).map(
        (r: any): PickerOption => ({
          id: `skill_${r.id ?? r.skillId}`,
          name: r.bizName || r.skillName || '-',
          description: r.summary || '',
        }),
      )
    },
  },
]

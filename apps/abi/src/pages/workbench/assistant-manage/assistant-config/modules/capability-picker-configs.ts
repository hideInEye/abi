import { schemalist } from '@/service/api/data-table-meaning'
import { queryDimensionList } from '@/service/api/dimension-modeling'
import { queryKnowledgeIndicators } from '@/service/api/knowledge-extraction'
import { queryOntologyEntityList, queryOntologyRelationList } from '@/service/api/ontology-network'
import { querySkillListApi } from '@/service/api/skill'
import { queryTag } from '@/service/api/tag-meaning'
import { normalizeRows } from '@/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper'

import type { PickerOption, PickerTabConfig } from './capability-picker-drawer'

/**
 * 能力选择抽屉的 tab 配置：接口调用方式与各自管理页保持一致
 * id 统一带业务前缀（schema_/tag_/dim_/ind_/entity_/rel_/skill_），避免跨类冲突
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

/** 本体网络：属性建模三个分组（语义标签/维度/指标）+ 实体语义 + 关系配置 */
export const ontologyPickerTabs: PickerTabConfig[] = [
  {
    key: 'tag',
    label: '语义标签',
    groupType: 'tag',
    fetchList: async ({ groupId, spaceId }) => {
      const res: any = await queryTag({ groupId: groupId!, spaceId })
      const rows: any[] = Array.isArray(res?.data) ? res.data : (res?.response?.data?.data ?? [])
      return rows.map(
        (r: any): PickerOption => ({
          id: `tag_${r.tagId}`,
          name: r.tagName || '-',
          description: r.alias || r.engName || '',
        }),
      )
    },
  },
  {
    key: 'dimension',
    label: '维度',
    groupType: 'ontology-dimension',
    fetchList: async ({ groupId, spaceId }) => {
      const res: any = await queryDimensionList({ groupId: groupId!, pageNum: 1, pageSize: 200, spaceId })
      const rows = normalizeRows(res)
      return rows.map(
        (r: any): PickerOption => ({
          id: `dim_${r.dimId}`,
          name: r.bizName || r.techName || '-',
          description: r.techName || '',
        }),
      )
    },
  },
  {
    key: 'indicator',
    label: '指标',
    groupType: 'ontology',
    fetchList: async ({ groupId, spaceId }) => {
      const res: any = await queryKnowledgeIndicators({ groupId, pageNum: 1, pageSize: 200, spaceId })
      const pageData = res?.data ?? res?.response?.data?.data ?? {}
      const rows: any[] = pageData?.list ?? []
      return rows.map(
        (r: any): PickerOption => ({
          id: `ind_${r.indId ?? r.termId}`,
          name: r.bizName || r.techName || '-',
          description: r.techName || '',
        }),
      )
    },
  },
  {
    key: 'entity',
    label: '实体语义',
    fetchList: async ({ spaceId }) => {
      const res: any = await queryOntologyEntityList({ pageNum: 1, pageSize: 200, spaceId })
      const rows: any[] = res?.data?.records ?? []
      return rows.map(
        (r: any): PickerOption => ({
          id: `entity_${r.id}`,
          name: r.entityName || r.entityCode || '-',
          description: r.entityCode || '',
        }),
      )
    },
  },
  {
    key: 'relation',
    label: '关系配置',
    fetchList: async ({ spaceId }) => {
      const res: any = await queryOntologyRelationList({ pageNum: 1, pageSize: 200, spaceId })
      const rows: any[] = res?.data?.records ?? []
      return rows.map(
        (r: any): PickerOption => ({
          id: `rel_${r.id}`,
          name: r.relation || '-',
          description: r.remark || '',
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
          description: r.description || '',
        }),
      )
    },
  },
]

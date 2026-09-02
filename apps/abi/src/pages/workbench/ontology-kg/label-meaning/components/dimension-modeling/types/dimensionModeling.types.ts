import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types'

export type DimensionType = 'std' | 'time'

export interface DimensionGroup {
  groupId: number | string
  groupName?: string
}

export interface DimensionFieldOption {
  bizName: string
  fieldName?: string
  fieldType?: string
  key: string
  originName?: string
  rtableName?: string
  relViewId?: number | string
  sourceId?: string
  sourceTableName?: string
  tableName?: string
  tableRemarks?: string
  tdesc?: string
  techId: string
  techName?: string
  tfieldName?: string
  timeFormat?: string
}

export interface DimensionBatchMappingRow {
  disabled?: boolean
  dimType: DimensionType
  field: DimensionFieldOption
  fieldType?: string
  key: string
  relSchemaId: number | string
  relViewId?: number | string
  semanticSchemaName: string
  semanticSchemaTechName?: string
  semanticsGroupId?: number | string
}

export interface DimensionBatchCreatePayloadItem {
  spaceId: number
  techId: DimensionFieldOption[]
  semanticsGroupId?: number | string
  groupId?: number | string
  relSchemaId: number | string
  relViewId?: number | string
}

export interface DimensionHierarchyNode {
  fieldKey: string
  fieldName: string
  level: number
}

export interface DimensionHierarchyEditItem {
  childDimId?: number
  configJson?: Record<string, unknown> | string
  dimId: number
  drillDirection?: 'DOWN' | 'UP'
  hierarchyId?: null | number
  hierarchyName: string
  isDefault?: '0' | '1'
  levelName: string
  levelOrder: number
  parentDimId?: number
  remark?: string
  spaceId: number
  status?: '0' | '1'
}

export interface DimensionHierarchyLevelPayload {
  configJson: Record<string, unknown>
  levelName: string
  levelOrder: number
}

export interface DimensionHierarchyGroupPayload {
  drillDirection?: 'DOWN' | 'UP'
  hierarchyId?: number
  hierarchyName: string
  isDefault?: '0' | '1'
  levels: DimensionHierarchyLevelPayload[]
  remark?: string
  status?: '0' | '1'
}

export interface DimensionHierarchyEditPayload {
  dimId: number
  groups: DimensionHierarchyGroupPayload[]
  spaceId: number
}

export interface DimensionRelatedMetric {
  groupName?: string
  id?: number | string
  name: string
  refType?: string
  updateTime?: string
}

export interface DimensionModelItem {
  alias?: string
  bizDesc?: string
  dimCategory?: string
  dimType: DimensionType
  drillDirection?: string
  englishName: string
  createBy?: string
  createTime?: string
  groupId?: number | string
  groupName?: string
  id: number
  levelPath?: string
  modelDetail?: string
  owner: string
  ownerEmail?: string
  path: string
  relatedFields: DimensionFieldOption[]
  relatedMetrics?: DimensionRelatedMetric[]
  rawEnglishName?: string
  rawZhName?: string
  sampleValues?: string
  semanticGroupId?: number
  semanticSchemaId?: number | string
  semanticSchemaName?: string
  semanticsGroupId?: number
  status: number
  timeField?: string
  timeFormat?: string
  timeGranularity?: string[]
  updateFreq?: string
  updateTime: string
  viewId?: number
  zhName: string
}

export interface DimensionSearchParams {
  /** 中文名搜索（主搜索框） */
  bizName: string
  /** 英文名搜索（高级筛选） */
  techName: string
}

export interface DimensionFormValues {
  alias?: string
  bizDesc?: string
  dimCategory?: string
  dimCategoryName?: string
  dimType: DimensionType
  drillDirection?: string
  englishName: string
  groupId?: number | string
  id?: number
  mappedBizNameTableName?: string
  mappedTechNameTableName?: string
  owner: string
  ownerEmail?: string
  relatedFieldKeys: string[]
  sampleValues?: string
  semanticGroupId?: number
  semanticSchemaId?: number | string
  semanticsGroupId?: number
  status: number
  timeField?: string
  timeFormat?: string
  timeGranularity: string[]
  updateFreq?: string
  zhName: string
}

export interface DimensionPagination {
  pageNum: number
  pageSize: number
  total: number
}

export interface DimensionSchemaInfo extends Omit<TableSemanticParams, 'modelDetail'> {
  modelDetail?: Record<string, unknown> | string
}

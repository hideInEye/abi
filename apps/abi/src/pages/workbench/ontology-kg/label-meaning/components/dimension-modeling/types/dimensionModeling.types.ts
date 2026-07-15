import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types'

export type DimensionType = 'std' | 'time'

export interface DimensionGroup {
  groupId: number
  groupName?: string
}

export interface DimensionFieldOption {
  bizName: string
  fieldType?: string
  key: string
  originName?: string
  relViewId?: number | string
  sourceId?: string
  sourceTableName?: string
  techId: string
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
  groupId?: number
  groupName?: string
  id: number
  modelDetail?: string
  owner: string
  ownerEmail?: string
  path: string
  relatedFields: DimensionFieldOption[]
  relatedMetrics?: DimensionRelatedMetric[]
  sampleValues?: string
  semanticGroupId?: number
  semanticSchemaId?: number
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
  keyword: string
}

export interface DimensionFormValues {
  alias?: string
  bizDesc?: string
  dimCategory?: string
  dimType: DimensionType
  drillDirection?: string
  englishName: string
  groupId?: number
  id?: number
  owner: string
  ownerEmail?: string
  relatedFieldKeys: string[]
  sampleValues?: string
  semanticGroupId?: number
  semanticSchemaId?: number
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

export interface DimensionSchemaInfo extends TableSemanticParams {
  modelDetail?: string
}

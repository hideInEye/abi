/**
 * 本体网络模块的共享领域类型。
 *
 * 接口中的 Long 在浏览器端可能超过安全整数范围，因此统一保留为 string | number，
 * 后续页面不得将 ID 强制转换为 number。
 */
export type OntologyNetworkId = string | number

export type OntologyAttributeType = 'dimension' | 'field' | 'indicator' | 'label'

export interface OntologyNetworkPageRequest {
  pageNum: number
  pageSize: number
}

export interface OntologyNetworkPageResult<T> {
  current: number
  pages: number
  records: T[]
  size: number
  total: number
}

/** Returns the API list payload unchanged, with an empty fallback for absent data. */
export function getOntologyNetworkRecords<T>(data: Partial<Pick<OntologyNetworkPageResult<T>, 'records'>> | null | undefined): T[] {
  return data?.records ?? []
}

export interface OntologyLabel {
  bizName: string
  createdBy: string | null
  createdTime: string
  delFlag: string
  id: OntologyNetworkId
  moduleType: string
  sortOrder: number
  spaceId: OntologyNetworkId
  type: string
  updatedBy: string | null
  updatedTime: string
  visibleInFilter: boolean
}

export interface QueryOntologyLabelParams {
  spaceId: OntologyNetworkId
  type: 'RECOMMENDED'
}

export interface OntologyLabelOption {
  bizName: string
  label: string
  value: OntologyNetworkId
}

export interface OntologyEntityAttribute {
  attributeCode: string
  attributeName: string
  attributeType: OntologyAttributeType
  /** Detail responses may contain legacy source-type strings. */
  dataType?: number | string | null
  relateDictId?: OntologyNetworkId | null
  remark?: string | null
}

/** entity/attribute/save accepts only these numeric data-type values. */
export type OntologyEntityAttributeDataType = 0 | 1 | 2 | 3 | 4 | 5

export interface SaveOntologyEntityAttribute {
  attributeCode: string
  attributeName: string
  attributeType: OntologyAttributeType
  dataType?: OntologyEntityAttributeDataType
  relateDictId?: OntologyNetworkId
  remark?: string
}

export interface OntologyEntity {
  attributeCount: number
  color: string
  createBy: string | null
  createTime: string
  entityCode: string
  entityName: string
  id: OntologyNetworkId
  labelId: OntologyNetworkId | null
  remark: string | null
  spaceId: OntologyNetworkId
  updateTime: string
  validFlag: string
}

export interface QueryOntologyEntityListParams extends Partial<OntologyNetworkPageRequest> {
  entityCode?: string
  entityName?: string
  labelId?: OntologyNetworkId
  spaceId: OntologyNetworkId
}

export interface CreateOntologyEntityParams {
  color: string
  entityCode: string
  entityName: string
  labelBizName: string
  remark?: string
  spaceId: OntologyNetworkId
}

export interface UpdateOntologyEntityParams {
  color?: string
  id: OntologyNetworkId
  labelId?: OntologyNetworkId
  remark?: string
  spaceId?: OntologyNetworkId
}

export interface GetOntologyEntityParams {
  id: OntologyNetworkId
}

export interface DeleteOntologyEntityParams {
  id: OntologyNetworkId
}

export interface OntologyEntityDetail {
  attributes: OntologyEntityAttribute[]
  entity: OntologyEntity
}

export interface SaveOntologyEntityAttributesParams {
  attributes: SaveOntologyEntityAttribute[]
  entityId: OntologyNetworkId
  spaceId: OntologyNetworkId
}

export interface OntologyRelation {
  createBy: string | null
  createTime: string
  endEntityId: OntologyNetworkId
  id: OntologyNetworkId
  inverseFlag: number
  labelId: OntologyNetworkId | null
  relation: string
  remark: string | null
  spaceId: OntologyNetworkId
  startEntityId: OntologyNetworkId
  updateTime: string
}

export interface QueryOntologyRelationListParams extends Partial<OntologyNetworkPageRequest> {
  endEntityId?: OntologyNetworkId
  relation?: string
  spaceId: OntologyNetworkId
  startEntityId?: OntologyNetworkId
}

export interface CreateOntologyRelationParams {
  endEntityId: OntologyNetworkId
  inverseFlag?: number
  relation: string
  remark?: string
  spaceId: OntologyNetworkId
  startEntityId: OntologyNetworkId
}

export interface UpdateOntologyRelationParams {
  endEntityId?: OntologyNetworkId
  id: OntologyNetworkId
  inverseFlag?: number
  relation?: string
  remark?: string
  startEntityId?: OntologyNetworkId
}

export interface DeleteOntologyRelationParams {
  id: OntologyNetworkId
}

export interface QueryOntologyGraphParams {
  degree?: number
  endEntityId?: OntologyNetworkId
  relationKeyword?: string
  spaceId: OntologyNetworkId
  startEntityId?: OntologyNetworkId
}

export interface OntologyGraphNode extends OntologyEntity {
  attributes: OntologyEntityAttribute[]
}

export type OntologyGraphEdge = Omit<OntologyRelation, 'inverseFlag'> & {
  /** The graph endpoint may still return historical string values. */
  inverseFlag: number | string
}

export interface OntologyGraphData {
  edges: OntologyGraphEdge[]
  nodes: OntologyGraphNode[]
}

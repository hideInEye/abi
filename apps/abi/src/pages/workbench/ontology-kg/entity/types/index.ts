import type { OntologyEntity, OntologyEntityAttribute, OntologyNetworkId, OntologyNetworkPageResult } from '@/pages/workbench/ontology-kg/shared-network-types'

export interface EntitySearchValues {
  entityCode: string
  entityName: string
  labelId?: OntologyNetworkId
}

export interface EntityFormValues {
  color: string
  entityCode: string
  entityName: string
  labelSelection: OntologyNetworkId | string | Array<OntologyNetworkId | string>
  remark?: string
}

export interface EntityPagination {
  pageNum: number
  pageSize: number
  total: number
}

export interface EntityPageData {
  entities: OntologyEntity[]
  page: OntologyNetworkPageResult<OntologyEntity>
}

export interface AttributeAsset {
  attributeCode: string
  attributeName: string
  /** The source module data type. It is normalized to the entity API enum before saving. */
  dataType?: unknown
  id: OntologyNetworkId
  relateDictId?: OntologyNetworkId | null
  remark?: string | null
}

export interface AttributeBindingValues {
  assetCode?: string
  attributeType?: Exclude<OntologyEntityAttribute['attributeType'], 'field'>
  remark?: string
}

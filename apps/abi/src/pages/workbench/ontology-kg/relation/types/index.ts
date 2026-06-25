import type { OntologyNetworkId } from '@/pages/workbench/ontology-kg/shared-network-types'

export interface RelationSearchValues {
  endEntityId?: OntologyNetworkId
  relation: string
  startEntityId?: OntologyNetworkId
}

export interface RelationFormValues {
  endEntityId: OntologyNetworkId
  inverseFlag: number
  relation: string
  remark?: string
  startEntityId: OntologyNetworkId
}

export interface RelationPagination {
  pageNum: number
  pageSize: number
  total: number
}

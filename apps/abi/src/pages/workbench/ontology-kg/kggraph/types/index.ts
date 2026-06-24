import type { OntologyGraphEdge, OntologyGraphNode, OntologyNetworkId } from '@/pages/workbench/ontology-kg/shared-network-types'

export interface GraphQueryValues {
  degree: number
  endEntityId?: OntologyNetworkId
  relationKeyword: string
  startEntityId?: OntologyNetworkId
}

export interface GraphSelection {
  id: string
  type: 'edge' | 'node'
}

export interface FilteredGraphData {
  edges: OntologyGraphEdge[]
  nodes: OntologyGraphNode[]
}

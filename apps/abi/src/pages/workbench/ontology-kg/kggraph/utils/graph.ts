import type { OntologyEntity, OntologyGraphData, OntologyGraphEdge, OntologyRelation } from '@/pages/workbench/ontology-kg/shared-network-types'

import type { FilteredGraphData } from '../types'

export function shouldRequestGraph(filtersLoaded: boolean, entities: OntologyEntity[], relations: OntologyRelation[]): boolean {
  return filtersLoaded && (entities.length > 0 || relations.length > 0)
}

/** Invokes the graph API request only after the loaded-filter gate has passed. */
export async function requestGraphWhenAllowed(
  filtersLoaded: boolean,
  entities: OntologyEntity[],
  relations: OntologyRelation[],
  request: () => Promise<void>,
): Promise<boolean> {
  if (!shouldRequestGraph(filtersLoaded, entities, relations)) return false
  await request()
  return true
}

export function deduplicateEdges(edges: OntologyGraphEdge[]): OntologyGraphEdge[] {
  const ids = new Set<string>()
  return edges.filter((edge) => {
    const id = String(edge.id)
    if (ids.has(id)) return false
    ids.add(id)
    return true
  })
}

export function filterGraphData(data: OntologyGraphData, selectedEntityIds: string[], selectedRelations: string[]): FilteredGraphData {
  const entityIds = new Set(selectedEntityIds)
  const relationNames = new Set(selectedRelations)
  const nodes = data.nodes.filter((node) => entityIds.has(String(node.id)))
  const visibleIds = new Set(nodes.map((node) => String(node.id)))
  const edges = data.edges.filter((edge) => relationNames.has(edge.relation) && visibleIds.has(String(edge.startEntityId)) && visibleIds.has(String(edge.endEntityId)))
  return { edges, nodes }
}

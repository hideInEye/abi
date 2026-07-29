import type { OntologyNetworkId } from '@/pages/workbench/ontology-kg/shared-network-types'

export interface HierarchicalLayoutNode {
  entityName: string
  id: OntologyNetworkId
}

export interface HierarchicalLayoutEdge {
  endEntityId: OntologyNetworkId
  id: OntologyNetworkId
  relation?: string | null
  startEntityId: OntologyNetworkId
}

export interface HierarchicalLayoutPoint {
  x: number
  y: number
}

export interface HierarchicalLayoutBounds {
  height: number
  width: number
  x: number
  y: number
}

export interface HierarchicalLayoutOptions {
  componentGapX?: number
  componentGapY?: number
  componentPadding?: number
  layerGap?: number
  manualPositions?: Map<string, HierarchicalLayoutPoint>
  maxRowWidth?: number
  nodeGap?: number
  nodeHeight?: number
  nodeWidth?: number
}

export interface HierarchicalLayoutResult {
  bounds: HierarchicalLayoutBounds
  layers: Map<string, number>
  positions: Map<string, HierarchicalLayoutPoint>
}

interface NormalizedNode extends HierarchicalLayoutNode {
  id: string
}

interface NormalizedEdge extends HierarchicalLayoutEdge {
  endEntityId: string
  id: string
  startEntityId: string
}

interface ComponentLayout {
  height: number
  layers: Map<string, number>
  positions: Map<string, HierarchicalLayoutPoint>
  rootKey: string
  width: number
}

interface StrongComponent {
  id: string
  layer: number
  members: string[]
  predecessors: Set<string>
  successors: Set<string>
}

const DEFAULT_NODE_WIDTH = 172
const DEFAULT_NODE_HEIGHT = 72
const DEFAULT_LAYER_GAP = 140
const DEFAULT_NODE_GAP = 48
const DEFAULT_COMPONENT_GAP_X = 140
const DEFAULT_COMPONENT_GAP_Y = 120
const DEFAULT_COMPONENT_PADDING = 40
const DEFAULT_MAX_ROW_WIDTH = 900
const BARYCENTER_ROUNDS = 3

const compareByText = (left: string, right: string): number => left.localeCompare(right, 'zh-Hans-CN', { numeric: true })

const getNodeKey = (node: Pick<HierarchicalLayoutNode, 'entityName' | 'id'>): string => `${node.entityName}\u0000${node.id}`

const normalizeNodes = (nodes: HierarchicalLayoutNode[]): NormalizedNode[] =>
  nodes
    .map((node) => ({ ...node, id: String(node.id) }))
    .sort((left, right) => {
      const nameCompare = compareByText(left.entityName, right.entityName)
      if (nameCompare !== 0) return nameCompare
      return compareByText(left.id, right.id)
    })

const normalizeEdges = (edges: HierarchicalLayoutEdge[], nodeIds: Set<string>): NormalizedEdge[] =>
  edges
    .map((edge) => ({
      ...edge,
      endEntityId: String(edge.endEntityId),
      id: String(edge.id),
      startEntityId: String(edge.startEntityId),
    }))
    .filter((edge) => nodeIds.has(edge.startEntityId) && nodeIds.has(edge.endEntityId))
    .sort((left, right) => {
      const startCompare = compareByText(left.startEntityId, right.startEntityId)
      if (startCompare !== 0) return startCompare
      const endCompare = compareByText(left.endEntityId, right.endEntityId)
      if (endCompare !== 0) return endCompare
      return compareByText(left.id, right.id)
    })

const splitComponents = (nodes: NormalizedNode[], edges: NormalizedEdge[]): string[][] => {
  const adjacency = new Map<string, Set<string>>()
  nodes.forEach((node) => adjacency.set(node.id, new Set()))
  edges.forEach((edge) => {
    adjacency.get(edge.startEntityId)?.add(edge.endEntityId)
    adjacency.get(edge.endEntityId)?.add(edge.startEntityId)
  })

  const visited = new Set<string>()
  const components: string[][] = []

  nodes.forEach((node) => {
    if (visited.has(node.id)) return
    const stack = [node.id]
    const component: string[] = []
    visited.add(node.id)

    while (stack.length > 0) {
      const currentId = stack.pop()
      if (!currentId) continue
      component.push(currentId)

      Array.from(adjacency.get(currentId) ?? [])
        .sort(compareByText)
        .reverse()
        .forEach((nextId) => {
          if (visited.has(nextId)) return
          visited.add(nextId)
          stack.push(nextId)
        })
    }

    components.push(component.sort(compareByText))
  })

  return components.sort((left, right) => compareByText(left.join('|'), right.join('|')))
}

const createTarjanComponents = (nodeIds: string[], edges: NormalizedEdge[]): StrongComponent[] => {
  const adjacency = new Map<string, string[]>()
  nodeIds.forEach((nodeId) => adjacency.set(nodeId, []))
  edges.forEach((edge) => {
    if (edge.startEntityId === edge.endEntityId) return
    adjacency.get(edge.startEntityId)?.push(edge.endEntityId)
  })
  adjacency.forEach((targets, nodeId) => adjacency.set(nodeId, targets.sort(compareByText)))

  let index = 0
  const indices = new Map<string, number>()
  const lowLinks = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const components: string[][] = []

  const visit = (nodeId: string): void => {
    indices.set(nodeId, index)
    lowLinks.set(nodeId, index)
    index += 1
    stack.push(nodeId)
    onStack.add(nodeId)
    ;(adjacency.get(nodeId) ?? []).forEach((targetId) => {
      if (!indices.has(targetId)) {
        visit(targetId)
        lowLinks.set(nodeId, Math.min(lowLinks.get(nodeId) ?? 0, lowLinks.get(targetId) ?? 0))
      } else if (onStack.has(targetId)) {
        lowLinks.set(nodeId, Math.min(lowLinks.get(nodeId) ?? 0, indices.get(targetId) ?? 0))
      }
    })

    if (lowLinks.get(nodeId) !== indices.get(nodeId)) return

    const component: string[] = []
    let poppedId: string | undefined
    do {
      poppedId = stack.pop()
      if (!poppedId) break
      onStack.delete(poppedId)
      component.push(poppedId)
    } while (poppedId !== nodeId)

    components.push(component.sort(compareByText))
  }

  nodeIds.forEach((nodeId) => {
    if (!indices.has(nodeId)) visit(nodeId)
  })

  const componentByNodeId = new Map<string, string>()
  const strongComponents = components
    .sort((left, right) => compareByText(left.join('|'), right.join('|')))
    .map((members, componentIndex): StrongComponent => {
      const componentId = `component-${componentIndex}`
      members.forEach((nodeId) => componentByNodeId.set(nodeId, componentId))
      return {
        id: componentId,
        layer: 0,
        members,
        predecessors: new Set(),
        successors: new Set(),
      }
    })

  const strongComponentById = new Map(strongComponents.map((component) => [component.id, component]))
  edges.forEach((edge) => {
    if (edge.startEntityId === edge.endEntityId) return
    const sourceComponentId = componentByNodeId.get(edge.startEntityId)
    const targetComponentId = componentByNodeId.get(edge.endEntityId)
    if (!sourceComponentId || !targetComponentId || sourceComponentId === targetComponentId) return
    strongComponentById.get(sourceComponentId)?.successors.add(targetComponentId)
    strongComponentById.get(targetComponentId)?.predecessors.add(sourceComponentId)
  })

  return strongComponents
}

const assignComponentLayers = (components: StrongComponent[]): void => {
  const componentById = new Map(components.map((component) => [component.id, component]))
  const indegree = new Map(components.map((component) => [component.id, component.predecessors.size]))
  const queue = components.filter((component) => component.predecessors.size === 0).sort((left, right) => compareByText(left.members.join('|'), right.members.join('|')))

  while (queue.length > 0) {
    const component = queue.shift()
    if (!component) continue

    Array.from(component.successors)
      .sort(compareByText)
      .forEach((successorId) => {
        const successor = componentById.get(successorId)
        if (!successor) return
        successor.layer = Math.max(successor.layer, component.layer + 1)
        indegree.set(successorId, (indegree.get(successorId) ?? 1) - 1)
        if (indegree.get(successorId) === 0) {
          queue.push(successor)
          queue.sort((left, right) => compareByText(left.members.join('|'), right.members.join('|')))
        }
      })
  }
}

const createLayerMap = (components: StrongComponent[]): Map<string, number> => {
  assignComponentLayers(components)

  const layerByNodeId = new Map<string, number>()
  components.forEach((component) => {
    component.members.forEach((nodeId) => layerByNodeId.set(nodeId, component.layer))
  })
  return layerByNodeId
}

const getAverageNeighborOrder = (nodeIds: string[], orderByNodeId: Map<string, number>, fallback: number): number => {
  if (nodeIds.length === 0) return fallback
  const values = nodeIds.map((nodeId) => orderByNodeId.get(nodeId)).filter((value): value is number => value !== undefined)
  if (values.length === 0) return fallback
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const reduceCrossings = (layers: Map<number, string[]>, edges: NormalizedEdge[], nodeById: Map<string, NormalizedNode>): void => {
  const maxLayer = Math.max(...Array.from(layers.keys()))
  const predecessors = new Map<string, string[]>()
  const successors = new Map<string, string[]>()

  edges.forEach((edge) => {
    if (edge.startEntityId === edge.endEntityId) return
    const sourceLayer = Array.from(layers.entries()).find(([, ids]) => ids.includes(edge.startEntityId))?.[0]
    const targetLayer = Array.from(layers.entries()).find(([, ids]) => ids.includes(edge.endEntityId))?.[0]
    if (sourceLayer === undefined || targetLayer === undefined || sourceLayer === targetLayer) return
    const leftId = sourceLayer < targetLayer ? edge.startEntityId : edge.endEntityId
    const rightId = sourceLayer < targetLayer ? edge.endEntityId : edge.startEntityId
    predecessors.set(rightId, [...(predecessors.get(rightId) ?? []), leftId])
    successors.set(leftId, [...(successors.get(leftId) ?? []), rightId])
  })

  for (let round = 0; round < BARYCENTER_ROUNDS; round += 1) {
    for (let layer = 1; layer <= maxLayer; layer += 1) {
      const previousOrder = new Map((layers.get(layer - 1) ?? []).map((nodeId, index) => [nodeId, index]))
      const current = layers.get(layer) ?? []
      layers.set(
        layer,
        current.slice().sort((leftId, rightId) => {
          const leftBarycenter = getAverageNeighborOrder(predecessors.get(leftId) ?? [], previousOrder, current.indexOf(leftId))
          const rightBarycenter = getAverageNeighborOrder(predecessors.get(rightId) ?? [], previousOrder, current.indexOf(rightId))
          if (leftBarycenter !== rightBarycenter) return leftBarycenter - rightBarycenter
          return compareByText(getNodeKey(nodeById.get(leftId) ?? { entityName: leftId, id: leftId }), getNodeKey(nodeById.get(rightId) ?? { entityName: rightId, id: rightId }))
        }),
      )
    }

    for (let layer = maxLayer - 1; layer >= 0; layer -= 1) {
      const nextOrder = new Map((layers.get(layer + 1) ?? []).map((nodeId, index) => [nodeId, index]))
      const current = layers.get(layer) ?? []
      layers.set(
        layer,
        current.slice().sort((leftId, rightId) => {
          const leftBarycenter = getAverageNeighborOrder(successors.get(leftId) ?? [], nextOrder, current.indexOf(leftId))
          const rightBarycenter = getAverageNeighborOrder(successors.get(rightId) ?? [], nextOrder, current.indexOf(rightId))
          if (leftBarycenter !== rightBarycenter) return leftBarycenter - rightBarycenter
          return compareByText(getNodeKey(nodeById.get(leftId) ?? { entityName: leftId, id: leftId }), getNodeKey(nodeById.get(rightId) ?? { entityName: rightId, id: rightId }))
        }),
      )
    }
  }
}

const layoutComponent = (nodeIds: string[], edges: NormalizedEdge[], nodeById: Map<string, NormalizedNode>, options: Required<Omit<HierarchicalLayoutOptions, 'manualPositions'>>): ComponentLayout => {
  const strongComponents = createTarjanComponents(nodeIds, edges)
  const layerByNodeId = createLayerMap(strongComponents)
  const layers = new Map<number, string[]>()

  nodeIds.forEach((nodeId) => {
    const layer = layerByNodeId.get(nodeId) ?? 0
    const nodesInLayer = layers.get(layer) ?? []
    nodesInLayer.push(nodeId)
    layers.set(layer, nodesInLayer)
  })

  layers.forEach((ids, layer) => {
    layers.set(
      layer,
      ids.slice().sort((leftId, rightId) => {
        const leftNode = nodeById.get(leftId)
        const rightNode = nodeById.get(rightId)
        return compareByText(getNodeKey(leftNode ?? { entityName: leftId, id: leftId }), getNodeKey(rightNode ?? { entityName: rightId, id: rightId }))
      }),
    )
  })

  reduceCrossings(layers, edges, nodeById)

  const maxLayer = Math.max(...Array.from(layers.keys()))
  const layerHeights = Array.from(layers.values()).map((ids) => ids.length * options.nodeHeight + Math.max(0, ids.length - 1) * options.nodeGap)
  const componentHeight = Math.max(options.nodeHeight, ...layerHeights)
  const componentWidth = maxLayer * (options.nodeWidth + options.layerGap) + options.nodeWidth
  const positions = new Map<string, HierarchicalLayoutPoint>()

  layers.forEach((ids, layer) => {
    const layerHeight = ids.length * options.nodeHeight + Math.max(0, ids.length - 1) * options.nodeGap
    const offsetY = (componentHeight - layerHeight) / 2
    ids.forEach((nodeId, index) => {
      positions.set(nodeId, {
        x: layer * (options.nodeWidth + options.layerGap),
        y: offsetY + index * (options.nodeHeight + options.nodeGap),
      })
    })
  })

  return {
    height: componentHeight,
    layers: layerByNodeId,
    positions,
    rootKey: nodeIds.join('|'),
    width: componentWidth,
  }
}

const normalizeOptions = (options: HierarchicalLayoutOptions): Required<Omit<HierarchicalLayoutOptions, 'manualPositions'>> => ({
  componentGapX: options.componentGapX ?? DEFAULT_COMPONENT_GAP_X,
  componentGapY: options.componentGapY ?? DEFAULT_COMPONENT_GAP_Y,
  componentPadding: options.componentPadding ?? DEFAULT_COMPONENT_PADDING,
  layerGap: options.layerGap ?? DEFAULT_LAYER_GAP,
  maxRowWidth: options.maxRowWidth ?? DEFAULT_MAX_ROW_WIDTH,
  nodeGap: options.nodeGap ?? DEFAULT_NODE_GAP,
  nodeHeight: options.nodeHeight ?? DEFAULT_NODE_HEIGHT,
  nodeWidth: options.nodeWidth ?? DEFAULT_NODE_WIDTH,
})

const getBounds = (positions: Map<string, HierarchicalLayoutPoint>, nodeWidth: number, nodeHeight: number): HierarchicalLayoutBounds => {
  if (positions.size === 0) return { height: 0, width: 0, x: 0, y: 0 }
  const xs = Array.from(positions.values()).map((position) => position.x)
  const ys = Array.from(positions.values()).map((position) => position.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs) + nodeWidth
  const maxY = Math.max(...ys) + nodeHeight
  return {
    height: maxY - minY,
    width: maxX - minX,
    x: minX,
    y: minY,
  }
}

export function computeHierarchicalLayout(nodes: HierarchicalLayoutNode[], edges: HierarchicalLayoutEdge[], options: HierarchicalLayoutOptions = {}): HierarchicalLayoutResult {
  const normalizedOptions = normalizeOptions(options)
  const normalizedNodes = normalizeNodes(nodes)
  const nodeIds = new Set(normalizedNodes.map((node) => node.id))
  const normalizedEdges = normalizeEdges(edges, nodeIds)
  const nodeById = new Map(normalizedNodes.map((node) => [node.id, node]))
  const components = splitComponents(normalizedNodes, normalizedEdges)
  const componentLayouts = components.map((componentNodeIds) =>
    layoutComponent(
      componentNodeIds,
      normalizedEdges.filter((edge) => componentNodeIds.includes(edge.startEntityId) && componentNodeIds.includes(edge.endEntityId)),
      nodeById,
      normalizedOptions,
    ),
  )

  const positions = new Map<string, HierarchicalLayoutPoint>()
  const layers = new Map<string, number>()
  let cursorX = normalizedOptions.componentPadding
  let cursorY = normalizedOptions.componentPadding
  let rowHeight = 0

  componentLayouts
    .sort((left, right) => compareByText(left.rootKey, right.rootKey))
    .forEach((component) => {
      if (cursorX > normalizedOptions.componentPadding && cursorX + component.width > normalizedOptions.maxRowWidth - normalizedOptions.componentPadding) {
        cursorX = normalizedOptions.componentPadding
        cursorY += rowHeight + normalizedOptions.componentGapY
        rowHeight = 0
      }

      component.positions.forEach((position, nodeId) => {
        positions.set(nodeId, {
          x: cursorX + position.x,
          y: cursorY + position.y,
        })
      })
      component.layers.forEach((layer, nodeId) => layers.set(nodeId, layer))

      cursorX += component.width + normalizedOptions.componentGapX
      rowHeight = Math.max(rowHeight, component.height)
    })

  options.manualPositions?.forEach((position, nodeId) => {
    if (!positions.has(nodeId)) return
    positions.set(nodeId, position)
  })

  return {
    bounds: getBounds(positions, normalizedOptions.nodeWidth, normalizedOptions.nodeHeight),
    layers,
    positions,
  }
}

import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force'

import type { OntologyGraphEdge, OntologyGraphNode } from '@/pages/workbench/ontology-kg/shared-network-types'

const INITIAL_SPREAD = 360
const CHARGE_STRENGTH = -1400
const LINK_DISTANCE = 300
const LINK_STRENGTH = 0.24
const COLLIDE_RADIUS = 190
const COLLIDE_STRENGTH = 0.95

interface SimNode {
  id: string
  index?: number
  x?: number
  y?: number
  vx?: number
  vy?: number
}

interface SimLink {
  source: string | SimNode
  target: string | SimNode
}

interface LayoutResult {
  positions: Map<string, { x: number; y: number }>
}

export function computeForceLayout(
  nodes: OntologyGraphNode[],
  edges: OntologyGraphEdge[],
  width: number,
  height: number,
): LayoutResult {
  if (nodes.length === 0) {
    return { positions: new Map() }
  }

  const simNodes: SimNode[] = nodes.map((node) => ({
    id: String(node.id),
    x: width / 2 + (Math.random() - 0.5) * INITIAL_SPREAD,
    y: height / 2 + (Math.random() - 0.5) * INITIAL_SPREAD,
  }))

  const nodeIds = new Set(simNodes.map((n) => n.id))
  const simLinks: SimLink[] = edges
    .filter((edge) => nodeIds.has(String(edge.startEntityId)) && nodeIds.has(String(edge.endEntityId)))
    .map((edge) => ({
      source: String(edge.startEntityId),
      target: String(edge.endEntityId),
    }))

  const simulation = forceSimulation<SimNode>(simNodes)
    .force('charge', forceManyBody().strength(CHARGE_STRENGTH))
    .force('link', forceLink<SimNode, SimLink>(simLinks).id((d) => d.id).distance(LINK_DISTANCE).strength(LINK_STRENGTH))
    .force('center', forceCenter(width / 2, height / 2))
    .force('collide', forceCollide<SimNode>().radius(COLLIDE_RADIUS).strength(COLLIDE_STRENGTH))
    .alpha(1)
    .alphaDecay(0.02)
    .stop()

  for (let i = 0; i < 300; i++) {
    simulation.tick()
  }

  const positions = new Map<string, { x: number; y: number }>()
  simNodes.forEach((node) => {
    if (node.x !== undefined && node.y !== undefined) {
      positions.set(node.id, { x: node.x, y: node.y })
    }
  })

  return { positions }
}

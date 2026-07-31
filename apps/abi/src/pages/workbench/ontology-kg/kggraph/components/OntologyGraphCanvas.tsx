import { FullscreenExitOutlined, FullscreenOutlined, MinusOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Graph, type Edge, type Node } from '@antv/x6'
import { MiniMap } from '@antv/x6/es/plugin/minimap'
import { Tooltip } from 'antd'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { OntologyGraphEdge, OntologyGraphNode } from '@/pages/workbench/ontology-kg/shared-network-types'

import type { GraphSelection } from '../types'
import { computeHierarchicalLayout, type HierarchicalLayoutOptions, type HierarchicalLayoutPoint } from '../utils/hierarchicalLayout'
import { TARGET_MARKER_HEIGHT, TARGET_MARKER_WIDTH, computeOrthogonalEdgeRoute, type OrthogonalEdgeRouteNode } from '../utils/orthogonalEdgeRouting'
import styles from './canvas.module.css'

export interface GraphViewportInsets {
  bottom?: number
  left?: number
  right?: number
  top?: number
}

interface OntologyGraphCanvasProps {
  readonly backgroundColor?: string
  readonly degreeMap: Record<string, number>
  readonly emptyDescription?: string
  readonly edges: OntologyGraphEdge[]
  readonly isFullscreen: boolean
  readonly nodes: OntologyGraphNode[]
  readonly onSelect: (selection: GraphSelection) => void
  readonly onToggleFullscreen: () => void
  readonly selection: GraphSelection | null
  readonly viewportInsets?: GraphViewportInsets
}

interface EntityNodeData {
  degree: number
  entity: OntologyGraphNode
  hovered: boolean
  selected: boolean
}

interface RelationEdgeData {
  edge: OntologyGraphEdge
  hovered: boolean
  labelPosition: number
  relation: string
  selected: boolean
}

const CARD_WIDTH = 240
const CARD_HEIGHT = 80
const DEFAULT_NODE_COLOR = '#5B7CF7'
const GRAPH_FONT_FAMILY = '"SF Pro Display", "PingFang SC", "Hiragino Sans GB", sans-serif'
const DEFAULT_GRAPH_SCALE = 0.74
const FIT_VIEW_MAX_SCALE = 0.92
const FIT_VIEW_MIN_SCALE = 0.35
const FIT_VIEW_PADDING = 24
const LAYER_GAP = 140
const NODE_GAP = 56
const COMPONENT_GAP_X = 140
const COMPONENT_GAP_Y = 120
const COMPONENT_PADDING = 40
const TARGET_LAYOUT_SCALE = 0.82
const DEFAULT_MAX_ROW_WIDTH = 900
const VIEWPORT_MIN_WIDTH = 320
const VIEWPORT_MIN_HEIGHT = 240
const DEFAULT_VIEWPORT_INSETS: Required<GraphViewportInsets> = {
  bottom: 24,
  left: 24,
  right: 24,
  top: 24,
}
const RELATION_LABEL_DISTANCE = 0.5
const RELATION_LABEL_DISTANCE_STEP = 0.08
const RELATION_LABEL_OFFSET = -15

Graph.registerNode(
  'ontology-entity-card',
  {
    attrs: {
      bg: {
        fill: '#FFFFFF',
        height: 76,
        rx: 14,
        ry: 14,
        width: 238,
        x: 0,
        y: 0,
      },
      body: {
        fill: 'transparent',
        height: 76,
        rx: 14,
        ry: 14,
        stroke: 'rgba(130, 140, 200, 0.3)',
        strokeWidth: 2,
        width: 238,
        x: 0,
        y: 0,
      },
      degree: {
        fill: '#8fa0b5',
        fontFamily: GRAPH_FONT_FAMILY,
        fontSize: 11,
        fontWeight: 400,
        textAnchor: 'start',
        x: 54,
        y: 62,
      },
      dot: { cx: 30, cy: 38, fill: '#5B7CF7', r: 8 },
      portBottom: { cx: 120, cy: 80, fill: '#FFFFFF', opacity: 0, r: 5, stroke: '#5B7CF7', strokeWidth: 1.5 },
      portLeft: { cx: 0, cy: 40, fill: '#FFFFFF', opacity: 0, r: 5, stroke: '#5B7CF7', strokeWidth: 1.5 },
      portRight: { cx: 240, cy: 40, fill: '#FFFFFF', opacity: 0, r: 5, stroke: '#5B7CF7', strokeWidth: 1.5 },
      portTop: { cx: 120, cy: 0, fill: '#FFFFFF', opacity: 0, r: 5, stroke: '#5B7CF7', strokeWidth: 1.5 },
      shadow: {
        fill: '#AAB6C8',
        height: 70,
        opacity: 0.15,
        rx: 14,
        ry: 14,
        width: 230,
        x: 8,
        y: 10,
      },
      title: {
        fill: '#1a2744',
        fontFamily: GRAPH_FONT_FAMILY,
        fontSize: 17,
        fontWeight: 700,
        textAnchor: 'start',
        x: 54,
        y: 36,
      },
    },
    height: CARD_HEIGHT,
    markup: [
      { selector: 'shadow', tagName: 'rect' },
      { selector: 'bg', tagName: 'rect' },
      { selector: 'body', tagName: 'rect' },
      { selector: 'dot', tagName: 'circle' },
      { selector: 'title', tagName: 'text' },
      { selector: 'degree', tagName: 'text' },
      { className: 'port-anchor', selector: 'portTop', tagName: 'circle' },
      { className: 'port-anchor', selector: 'portBottom', tagName: 'circle' },
      { className: 'port-anchor', selector: 'portLeft', tagName: 'circle' },
      { className: 'port-anchor', selector: 'portRight', tagName: 'circle' },
    ],
    width: CARD_WIDTH,
  },
  true,
)

function isRelationLabelTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('.x6-edge-label') !== null
}

function createRelationLabel(relation: string, selected = false, hovered = false, dimmed = false, distance = RELATION_LABEL_DISTANCE) {
  const baseOpacity = dimmed ? 0.15 : 1
  return {
    attrs: {
      body: {
        fill: selected ? 'rgba(91, 124, 247, 0.15)' : hovered ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.85)',
        height: 26,
        opacity: baseOpacity,
        rx: 10,
        ry: 10,
        stroke: selected ? '#5b7cf7' : hovered ? 'rgba(91, 124, 247, 0.4)' : 'rgba(130, 140, 200, 0.25)',
        strokeWidth: 1.5,
        width: 92,
        x: -46,
        y: -17,
      },
      label: {
        fill: selected ? '#5b7cf7' : hovered ? '#3d4f6f' : '#64748b',
        fontFamily: GRAPH_FONT_FAMILY,
        fontSize: 12,
        fontWeight: selected ? 700 : hovered ? 600 : 500,
        opacity: baseOpacity,
        text: relation,
        textAnchor: 'middle',
        x: 0,
        y: 0,
      },
    },
    markup: [
      { selector: 'body', tagName: 'rect' },
      { selector: 'label', tagName: 'text' },
    ],
    position: { distance, offset: RELATION_LABEL_OFFSET },
  }
}

function createTargetMarker(stroke: string) {
  return {
    fill: stroke,
    height: TARGET_MARKER_HEIGHT,
    name: 'block',
    stroke,
    strokeWidth: 0,
    width: TARGET_MARKER_WIDTH,
  }
}

function getEntityColor(entity: OntologyGraphNode | null | undefined): string {
  const color = entity?.color?.trim()
  return color || DEFAULT_NODE_COLOR
}

function getColorAlpha(color: string, alpha: number): string {
  const hex = color.trim()
  const shortHexMatch = hex.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i)
  const longHexMatch = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)

  if (shortHexMatch) {
    const [, r, g, b] = shortHexMatch
    return `rgba(${Number.parseInt(`${r}${r}`, 16)}, ${Number.parseInt(`${g}${g}`, 16)}, ${Number.parseInt(`${b}${b}`, 16)}, ${alpha})`
  }

  if (longHexMatch) {
    const [, r, g, b] = longHexMatch
    return `rgba(${Number.parseInt(r, 16)}, ${Number.parseInt(g, 16)}, ${Number.parseInt(b, 16)}, ${alpha})`
  }

  const rgbMatch = hex.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (rgbMatch) return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`

  return `rgba(91, 124, 247, ${alpha})`
}

function compositeOnWhite(color: string): string {
  const match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/)
  if (!match) return color
  const r = Number(match[1])
  const g = Number(match[2])
  const b = Number(match[3])
  const a = match[4] !== undefined ? Number(match[4]) : 1
  const cr = Math.round(r * a + 255 * (1 - a))
  const cg = Math.round(g * a + 255 * (1 - a))
  const cb = Math.round(b * a + 255 * (1 - a))
  return `#${cr.toString(16).padStart(2, '0')}${cg.toString(16).padStart(2, '0')}${cb.toString(16).padStart(2, '0')}`
}

const compareText = (left: string, right: string): number => left.localeCompare(right, 'zh-Hans-CN', { numeric: true })

function createTopologyKey(nodes: OntologyGraphNode[], edges: OntologyGraphEdge[]): string {
  const nodePart = nodes
    .map((node) => String(node.id))
    .sort(compareText)
    .join('|')
  const edgePart = edges
    .map((edge) => `${edge.id}:${edge.startEntityId}->${edge.endEntityId}`)
    .sort(compareText)
    .join('|')
  return `${nodePart}::${edgePart}`
}

function normalizeViewportInsets(insets?: GraphViewportInsets): Required<GraphViewportInsets> {
  return {
    bottom: insets?.bottom ?? DEFAULT_VIEWPORT_INSETS.bottom,
    left: insets?.left ?? DEFAULT_VIEWPORT_INSETS.left,
    right: insets?.right ?? DEFAULT_VIEWPORT_INSETS.right,
    top: insets?.top ?? DEFAULT_VIEWPORT_INSETS.top,
  }
}

function getSafeViewportArea(host: HTMLElement, insets: Required<GraphViewportInsets>) {
  const width = Math.max(VIEWPORT_MIN_WIDTH, host.clientWidth - insets.left - insets.right)
  const height = Math.max(VIEWPORT_MIN_HEIGHT, host.clientHeight - insets.top - insets.bottom)
  return {
    height,
    width,
    x: insets.left,
    y: insets.top,
  }
}

function createLayoutOptions(safeViewportWidth: number, manualPositions: Map<string, HierarchicalLayoutPoint>): HierarchicalLayoutOptions {
  return {
    componentGapX: COMPONENT_GAP_X,
    componentGapY: COMPONENT_GAP_Y,
    componentPadding: COMPONENT_PADDING,
    layerGap: LAYER_GAP,
    manualPositions,
    maxRowWidth: Math.max(DEFAULT_MAX_ROW_WIDTH, safeViewportWidth / TARGET_LAYOUT_SCALE),
    nodeGap: NODE_GAP,
    nodeHeight: CARD_HEIGHT,
    nodeWidth: CARD_WIDTH,
  }
}

function fitGraphToSafeViewport(graph: Graph, host: HTMLElement, insets: Required<GraphViewportInsets>): void {
  if (graph.getCells().length === 0) return
  graph.zoomToFit({
    maxScale: FIT_VIEW_MAX_SCALE,
    minScale: FIT_VIEW_MIN_SCALE,
    padding: FIT_VIEW_PADDING,
    useCellGeometry: true,
    viewportArea: getSafeViewportArea(host, insets),
  })
}

function getRelationLabelPositions(edges: OntologyGraphEdge[]): Map<string, number> {
  const groups = new Map<string, OntologyGraphEdge[]>()

  edges.forEach((edge) => {
    const key = `${edge.startEntityId}->${edge.endEntityId}:${edge.relation}`
    const groupEdges = groups.get(key) ?? []
    groupEdges.push(edge)
    groups.set(key, groupEdges)
  })

  const positions = new Map<string, number>()
  groups.forEach((groupEdges) => {
    const sortedEdges = groupEdges.slice().sort((left, right) => compareText(String(left.id), String(right.id)))
    const centerIndex = (sortedEdges.length - 1) / 2
    sortedEdges.forEach((edge, index) => {
      positions.set(String(edge.id), RELATION_LABEL_DISTANCE + (index - centerIndex) * RELATION_LABEL_DISTANCE_STEP)
    })
  })

  return positions
}

function toRouteNode(node: Node): OrthogonalEdgeRouteNode {
  const position = node.getPosition()
  return {
    height: CARD_HEIGHT,
    id: node.id,
    width: CARD_WIDTH,
    x: position.x,
    y: position.y,
  }
}

function getRelationRoute(edge: OntologyGraphEdge, graph: Graph, layerByNodeId: Map<string, number>) {
  const sourceId = String(edge.startEntityId)
  const targetId = String(edge.endEntityId)
  const sourceNode = graph.getCellById(sourceId)
  const targetNode = graph.getCellById(targetId)
  if (!sourceNode?.isNode() || !targetNode?.isNode()) return null

  return computeOrthogonalEdgeRoute(toRouteNode(sourceNode), toRouteNode(targetNode), {
    sourceLayer: layerByNodeId.get(sourceId),
    targetLayer: layerByNodeId.get(targetId),
  })
}

function updateGraphEdgeRoutes(graph: Graph, layerByNodeId: Map<string, number>): void {
  graph.getEdges().forEach((edge) => {
    const relation = edge.getData<RelationEdgeData>()?.edge
    if (!relation) return
    const route = getRelationRoute(relation, graph, layerByNodeId)
    if (!route) return
    edge.setSource(route.sourceAnchor)
    edge.setTarget(route.targetAnchor)
    edge.setVertices(route.vertices)
  })
}

function setNodeVisualState(node: Node, selected: boolean, hovered: boolean, dimmed = false): void {
  const data = node.getData<EntityNodeData>()
  const degree = data?.degree ?? 0
  const entity = data?.entity
  const prominence = Math.min(1, degree / 6)
  const entityColor = getEntityColor(entity)
  const borderColor = selected || hovered ? entityColor : getColorAlpha(entityColor, 0.5)
  const backgroundColor = selected ? getColorAlpha(entityColor, 0.16) : hovered ? getColorAlpha(entityColor, 0.1) : '#FFFFFF'
  const shadowColor = selected || hovered ? entityColor : '#AAB6C8'
  const baseOpacity = dimmed ? 0.25 : 1
  const bodyFill = hovered || selected ? compositeOnWhite(backgroundColor) : '#FFFFFF'

  node.attr('bg', { fill: bodyFill, opacity: baseOpacity })
  node.attr('body', {
    fill: bodyFill,
    opacity: baseOpacity,
    paintOrder: 'stroke',
    stroke: borderColor,
    strokeWidth: 2,
  })
  node.attr('dot', {
    fill: entityColor,
    opacity: baseOpacity,
    r: 8 + prominence * 3,
  })
  node.attr('shadow', {
    fill: shadowColor,
    opacity: dimmed ? 0.05 : selected ? 0.35 : hovered ? 0.25 : 0.12 + prominence * 0.08,
  })
  node.attr('title', { fill: '#1a2744', fontWeight: 700, opacity: baseOpacity })
  node.attr('degree', { fill: '#8fa0b5', fontWeight: 400, opacity: baseOpacity })

  const portOpacity = hovered || selected ? baseOpacity : 0
  node.attr('portTop', { opacity: portOpacity, stroke: entityColor })
  node.attr('portBottom', { opacity: portOpacity, stroke: entityColor })
  node.attr('portLeft', { opacity: portOpacity, stroke: entityColor })
  node.attr('portRight', { opacity: portOpacity, stroke: entityColor })
}

function setEdgeVisualState(edge: Edge, selected: boolean, hovered: boolean, dimmed = false): void {
  const data = edge.getData<RelationEdgeData>()
  const relation = data?.relation ?? ''
  const stroke = selected ? '#5b7cf7' : hovered ? '#5b7cf7' : '#64748b'
  const lineOpacity = dimmed ? 0.12 : selected ? 1 : hovered ? 0.9 : 0.55

  edge.attr('line', {
    opacity: lineOpacity,
    stroke,
    strokeLinecap: 'round',
    strokeWidth: selected ? 2.5 : hovered ? 2 : 1.5,
    targetMarker: createTargetMarker(stroke),
  })
  edge.setLabels([createRelationLabel(relation, selected, hovered, dimmed, data?.labelPosition)])
}

function getHopNeighborhood(graph: Graph, startNodeId: string, maxHops: number): { edgeIds: Set<string>; nodeIds: Set<string> } {
  const adjacency = new Map<string, Array<{ edgeId: string; nodeId: string }>>()
  graph.getEdges().forEach((edge) => {
    const relation = edge.getData<RelationEdgeData>()?.edge
    if (!relation) return
    const sourceId = String(relation.startEntityId)
    const targetId = String(relation.endEntityId)
    adjacency.set(sourceId, [...(adjacency.get(sourceId) ?? []), { edgeId: edge.id, nodeId: targetId }])
    adjacency.set(targetId, [...(adjacency.get(targetId) ?? []), { edgeId: edge.id, nodeId: sourceId }])
  })

  const nodeIds = new Set<string>([startNodeId])
  const edgeIds = new Set<string>()
  let frontier = [startNodeId]

  for (let hop = 0; hop < maxHops; hop += 1) {
    const nextFrontier: string[] = []
    frontier.forEach((nodeId) => {
      ;(adjacency.get(nodeId) ?? []).forEach((neighbor) => {
        edgeIds.add(neighbor.edgeId)
        if (nodeIds.has(neighbor.nodeId)) return
        nodeIds.add(neighbor.nodeId)
        nextFrontier.push(neighbor.nodeId)
      })
    })
    frontier = nextFrontier
  }

  return { edgeIds, nodeIds }
}

export const OntologyGraphCanvas: React.FC<OntologyGraphCanvasProps> = ({
  backgroundColor = 'transparent',
  degreeMap,
  emptyDescription,
  edges,
  isFullscreen,
  nodes,
  selection,
  viewportInsets,
  onSelect,
  onToggleFullscreen,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const minimapContainerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<Graph | null>(null)
  const manualPositionsRef = useRef<Map<string, HierarchicalLayoutPoint>>(new Map())
  const isApplyingGraphRef = useRef(false)
  const layerByNodeIdRef = useRef<Map<string, number>>(new Map())
  const previousTopologyKeyRef = useRef('')
  const selectionRef = useRef<GraphSelection | null>(selection)
  const viewportInsetsRef = useRef<Required<GraphViewportInsets>>(normalizeViewportInsets(viewportInsets))
  const onSelectRef = useRef(onSelect)
  const [graphError, setGraphError] = useState<string | null>(null)
  const [layoutVersion, setLayoutVersion] = useState(0)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [safeViewportWidth, setSafeViewportWidth] = useState(DEFAULT_MAX_ROW_WIDTH)

  const topologyKey = useMemo(() => createTopologyKey(nodes, edges), [edges, nodes])
  const layoutOptions = useMemo(() => createLayoutOptions(safeViewportWidth, manualPositionsRef.current), [layoutVersion, safeViewportWidth])
  const hierarchicalLayout = useMemo(() => computeHierarchicalLayout(nodes, edges, layoutOptions), [edges, layoutOptions, nodes])

  const syncSafeViewportWidth = useCallback((): void => {
    const host = hostRef.current
    if (!host) return
    const safeArea = getSafeViewportArea(host, viewportInsetsRef.current)
    setSafeViewportWidth(safeArea.width)
  }, [])

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    selectionRef.current = selection
  }, [selection])

  useEffect(() => {
    layerByNodeIdRef.current = hierarchicalLayout.layers
  }, [hierarchicalLayout.layers])

  useEffect(() => {
    viewportInsetsRef.current = normalizeViewportInsets(viewportInsets)
    syncSafeViewportWidth()
  }, [syncSafeViewportWidth, viewportInsets])

  useEffect(() => {
    if (previousTopologyKeyRef.current === topologyKey) return
    previousTopologyKeyRef.current = topologyKey
    manualPositionsRef.current.clear()
    setLayoutVersion((value) => value + 1)
  }, [topologyKey])

  const zoomIn = useCallback((): void => {
    const graph = graphRef.current
    if (!graph) return
    const startZoom = graph.zoom()
    const targetZoom = Math.min(2.4, startZoom * 1.18)
    const startedAt = performance.now()
    const duration = 200
    const step = (now: number): void => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const easedProgress = 1 - (1 - progress) ** 3
      graph.zoom(startZoom + (targetZoom - startZoom) * easedProgress, { absolute: true })
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [])

  const zoomOut = useCallback((): void => {
    const graph = graphRef.current
    if (!graph) return
    const startZoom = graph.zoom()
    const targetZoom = Math.max(0.35, startZoom * 0.85)
    const startedAt = performance.now()
    const duration = 200
    const step = (now: number): void => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const easedProgress = 1 - (1 - progress) ** 3
      graph.zoom(startZoom + (targetZoom - startZoom) * easedProgress, { absolute: true })
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [])

  const resetView = useCallback((): void => {
    manualPositionsRef.current.clear()
    setLayoutVersion((value) => value + 1)
  }, [])

  useEffect(() => {
    const host = hostRef.current
    const container = containerRef.current
    if (!host || !container || graphRef.current) return undefined
    const initialWidth = Math.max(host.clientWidth, 1)
    const initialHeight = Math.max(host.clientHeight, 1)

    const graph = new Graph({
      background: { color: backgroundColor },
      container,
      grid: { args: { color: 'rgba(130, 140, 200, 0.12)', thickness: 2 }, type: 'dot', visible: true },
      height: initialHeight,
      interacting: { edgeMovable: false, nodeMovable: true },
      mousewheel: { enabled: true, maxScale: 2.4, minScale: 0.35, modifiers: null },
      panning: { enabled: true, eventTypes: ['leftMouseDown'] },
      width: initialWidth,
    })
    graph.zoom(DEFAULT_GRAPH_SCALE, { absolute: true })
    graphRef.current = graph
    syncSafeViewportWidth()

    graph.on('node:mouseenter', ({ node }) => {
      const data = node.getData<EntityNodeData>()
      const selected = data?.selected ?? false
      const neighborhood = getHopNeighborhood(graph, node.id, 2)
      setNodeVisualState(node, selected, true, false)
      setHoveredNodeId(node.id)

      graph.getNodes().forEach((otherNode) => {
        if (otherNode.id === node.id) return
        const otherData = otherNode.getData<EntityNodeData>()
        const otherSelected = otherData?.selected ?? false
        setNodeVisualState(otherNode, otherSelected, false, !neighborhood.nodeIds.has(otherNode.id))
      })
      graph.getEdges().forEach((otherEdge) => {
        const otherData = otherEdge.getData<RelationEdgeData>()
        const otherSelected = otherData?.selected ?? false
        setEdgeVisualState(otherEdge, otherSelected, false, !neighborhood.edgeIds.has(otherEdge.id))
      })
    })
    graph.on('node:mouseleave', ({ node }) => {
      const data = node.getData<EntityNodeData>()
      const selected = data?.selected ?? false
      setNodeVisualState(node, selected, false, false)
      setHoveredNodeId(null)

      graph.getNodes().forEach((otherNode) => {
        if (otherNode.id === node.id) return
        const otherData = otherNode.getData<EntityNodeData>()
        const otherSelected = otherData?.selected ?? false
        setNodeVisualState(otherNode, otherSelected, false, false)
      })
      graph.getEdges().forEach((otherEdge) => {
        const otherData = otherEdge.getData<RelationEdgeData>()
        const otherSelected = otherData?.selected ?? false
        setEdgeVisualState(otherEdge, otherSelected, false, false)
      })
    })
    graph.on('edge:mouseenter', ({ edge }) => {
      const data = edge.getData<RelationEdgeData>()
      const selected = data?.selected ?? false
      setEdgeVisualState(edge, selected, true)
    })
    graph.on('edge:mouseleave', ({ edge }) => {
      const data = edge.getData<RelationEdgeData>()
      const selected = data?.selected ?? false
      setEdgeVisualState(edge, selected, false)
    })
    graph.on('node:click', ({ node }) => {
      const entity = node.getData<EntityNodeData>()?.entity
      onSelectRef.current({ id: String(entity?.id ?? node.id), type: 'node' })
    })
    graph.on('edge:click', ({ e, edge }) => {
      if (!isRelationLabelTarget(e.target)) return
      const relation = edge.getData<RelationEdgeData>()?.edge
      onSelectRef.current({ id: String(relation?.id ?? edge.id.replace(/^relation-/, '')), type: 'edge' })
    })
    graph.on('node:change:position', ({ node }) => {
      if (isApplyingGraphRef.current) return
      const position = node.getPosition()
      manualPositionsRef.current.set(node.id, position)
      updateGraphEdgeRoutes(graph, layerByNodeIdRef.current)
    })

    let resizeFrame: number | undefined
    const resizeObserver = new ResizeObserver(() => {
      if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = undefined
        graph.resize(Math.max(host.clientWidth, 1), Math.max(host.clientHeight, 1))
        syncSafeViewportWidth()
        fitGraphToSafeViewport(graph, host, viewportInsetsRef.current)
      })
    })
    resizeObserver.observe(host)

    if (minimapContainerRef.current) {
      graph.use(
        new MiniMap({
          container: minimapContainerRef.current,
          height: 120,
          padding: 20,
          width: 180,
        }),
      )
    }

    return () => {
      resizeObserver.disconnect()
      if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame)
      graph.dispose()
      if (graphRef.current === graph) graphRef.current = null
    }
  }, [backgroundColor, syncSafeViewportWidth])

  useEffect(() => {
    const graph = graphRef.current
    const host = hostRef.current
    if (!graph || !host) return

    try {
      setGraphError(null)

      if (edges.length === 0) {
        graph.clearCells()
        return
      }

      const labelPositions = getRelationLabelPositions(edges)
      const graphNodes = nodes.map((node) => {
        const id = String(node.id)
        const degree = degreeMap[id] || 0
        const position = hierarchicalLayout.positions.get(id) ?? { x: 100, y: 100 }
        const entityColor = getEntityColor(node)

        return graph.createNode({
          attrs: {
            body: { fill: '#FFFFFF', stroke: getColorAlpha(entityColor, 0.5), strokeWidth: 2 },
            degree: { text: `${degree} 条关系` },
            dot: { fill: entityColor },
            shadow: { fill: '#AAB6C8', opacity: 0.15 },
            title: { text: node.entityName },
          },
          data: {
            degree,
            entity: node,
            hovered: false,
            selected: false,
          } satisfies EntityNodeData,
          id,
          position,
          shape: 'ontology-entity-card',
          zIndex: 2,
        })
      })
      const graphNodeIds = new Set(graphNodes.map((node) => node.id))
      const graphEdges = edges.flatMap((edge) => {
        const id = String(edge.id)
        const sourceId = String(edge.startEntityId)
        const targetId = String(edge.endEntityId)
        if (!graphNodeIds.has(sourceId) || !graphNodeIds.has(targetId)) return []

        const sourcePosition = hierarchicalLayout.positions.get(sourceId)
        const targetPosition = hierarchicalLayout.positions.get(targetId)
        if (!sourcePosition || !targetPosition) return []
        const route = computeOrthogonalEdgeRoute(
          { height: CARD_HEIGHT, id: sourceId, width: CARD_WIDTH, ...sourcePosition },
          { height: CARD_HEIGHT, id: targetId, width: CARD_WIDTH, ...targetPosition },
          {
            sourceLayer: hierarchicalLayout.layers.get(sourceId),
            targetLayer: hierarchicalLayout.layers.get(targetId),
          },
        )

        return graph.createEdge({
          attrs: {
            line: {
              opacity: 0.55,
              sourceMarker: null,
              stroke: '#64748b',
              strokeLinecap: 'round',
              strokeWidth: 1.5,
              targetMarker: createTargetMarker('#64748b'),
            },
          },
          connector: { args: { radius: 8 }, name: 'rounded' },
          data: {
            edge,
            hovered: false,
            labelPosition: labelPositions.get(id) ?? RELATION_LABEL_DISTANCE,
            relation: edge.relation,
            selected: false,
          } satisfies RelationEdgeData,
          defaultLabel: createRelationLabel(''),
          id: `relation-${id}`,
          labels: [createRelationLabel(edge.relation, false, false, false, labelPositions.get(id))],
          source: route.sourceAnchor,
          target: route.targetAnchor,
          vertices: route.vertices,
          zIndex: 1,
        })
      })

      isApplyingGraphRef.current = true
      graph.fromJSON({ cells: [...graphNodes, ...graphEdges].map((cell) => cell.toJSON()) })
      isApplyingGraphRef.current = false

      graph.getNodes().forEach((node) => {
        const selected = selectionRef.current?.type === 'node' && selectionRef.current.id === node.id
        node.setData({ ...node.getData<EntityNodeData>(), selected })
        setNodeVisualState(node, selected, false)
      })
      graph.getEdges().forEach((edge) => {
        const relation = edge.getData<RelationEdgeData>()?.edge
        const selected = Boolean(relation && selectionRef.current?.type === 'edge' && selectionRef.current.id === String(relation.id))
        edge.setData({ ...edge.getData<RelationEdgeData>(), selected })
        setEdgeVisualState(edge, selected, false)
      })

      fitGraphToSafeViewport(graph, host, viewportInsetsRef.current)
    } catch (error) {
      isApplyingGraphRef.current = false
      console.error('[OntologyGraphCanvas] X6 operation failed', error)
      setGraphError('图谱渲染失败，可重新查询后再试')
    }
  }, [degreeMap, edges, hierarchicalLayout, nodes])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return

    graph.getNodes().forEach((node) => {
      const selected = selection?.type === 'node' && selection.id === node.id
      node.setData({ ...node.getData<EntityNodeData>(), selected })
      setNodeVisualState(node, selected, false)
    })
    graph.getEdges().forEach((edge) => {
      const relation = edge.getData<RelationEdgeData>()?.edge
      const selected = Boolean(relation && selection?.type === 'edge' && selection.id === String(relation.id))
      edge.setData({ ...edge.getData<RelationEdgeData>(), selected })
      setEdgeVisualState(edge, selected, false)
    })
  }, [selection])

  const hoveredNode = useMemo(() => {
    if (!hoveredNodeId) return null
    return nodes.find((node) => String(node.id) === hoveredNodeId) ?? null
  }, [hoveredNodeId, nodes])

  const noGraphRelations = edges.length === 0

  return (
    <div className={styles.canvasShell}>
      <div ref={hostRef} className={styles.canvasHost}>
        <div ref={containerRef} className={styles.canvasContainer} />
      </div>
      {noGraphRelations && (
        <div className={styles.emptyOverlay}>
          <span>{emptyDescription ?? '暂无匹配的实体或关系'}</span>
        </div>
      )}
      {graphError && <div className={styles.errorOverlay}>{graphError}</div>}
      <div className={styles.controls}>
        <Tooltip placement="left" title="放大">
          <AButton icon={<PlusOutlined />} type="text" onClick={zoomIn} />
        </Tooltip>
        <Tooltip placement="left" title="缩小">
          <AButton icon={<MinusOutlined />} type="text" onClick={zoomOut} />
        </Tooltip>
        <Tooltip placement="left" title="重置视图">
          <AButton icon={<ReloadOutlined />} type="text" onClick={resetView} />
        </Tooltip>
        <Tooltip placement="left" title={isFullscreen ? '退出全屏' : '全屏'}>
          <AButton icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} type="text" onClick={onToggleFullscreen} />
        </Tooltip>
      </div>
      <div ref={minimapContainerRef} className={styles.minimap} />
      {hoveredNode && (
        <div className={styles.nodeTooltip}>
          <div className={styles.nodeTooltipTitle}>{hoveredNode.entityName}</div>
          <div className={styles.nodeTooltipMeta}>
            <span className={styles.nodeTooltipDot} style={{ backgroundColor: getEntityColor(hoveredNode) }} />
            <span>{degreeMap[String(hoveredNode.id)] || 0} 条关系</span>
          </div>
          {hoveredNode.remark && <div className={styles.nodeTooltipRemark}>{hoveredNode.remark}</div>}
        </div>
      )}
    </div>
  )
}

export default OntologyGraphCanvas

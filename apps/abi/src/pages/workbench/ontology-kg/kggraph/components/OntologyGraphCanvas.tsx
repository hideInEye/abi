import { FullscreenExitOutlined, FullscreenOutlined, MinusOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Graph, type Edge, type Node } from '@antv/x6'
import { MiniMap } from '@antv/x6/es/plugin/minimap'
import { Tooltip } from 'antd'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { OntologyGraphEdge, OntologyGraphNode } from '@/pages/workbench/ontology-kg/shared-network-types'

import type { GraphSelection } from '../types'
import { computeForceLayout } from '../utils/forceLayout'
import styles from './canvas.module.css'

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
  relation: string
  selected: boolean
}

interface NodePosition {
  x: number
  y: number
}

const CARD_WIDTH = 240
const CARD_HEIGHT = 80
const DEFAULT_NODE_COLOR = '#5B7CF7'
const GRAPH_FONT_FAMILY = '"SF Pro Display", "PingFang SC", "Hiragino Sans GB", sans-serif'

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
      dot: { cx: 30, cy: 38, fill: '#5B7CF7', r: 8 },
      degree: { fill: '#8fa0b5', fontFamily: GRAPH_FONT_FAMILY, fontSize: 11, fontWeight: 400, textAnchor: 'start', x: 54, y: 62 },
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
      title: { fill: '#1a2744', fontFamily: GRAPH_FONT_FAMILY, fontSize: 17, fontWeight: 700, textAnchor: 'start', x: 54, y: 36 },
      portTop: { cx: 120, cy: 0, r: 5, fill: '#FFFFFF', stroke: '#5B7CF7', strokeWidth: 1.5, opacity: 0 },
      portBottom: { cx: 120, cy: 80, r: 5, fill: '#FFFFFF', stroke: '#5B7CF7', strokeWidth: 1.5, opacity: 0 },
      portLeft: { cx: 0, cy: 40, r: 5, fill: '#FFFFFF', stroke: '#5B7CF7', strokeWidth: 1.5, opacity: 0 },
      portRight: { cx: 240, cy: 40, r: 5, fill: '#FFFFFF', stroke: '#5B7CF7', strokeWidth: 1.5, opacity: 0 },
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
// 关系标签 — 浅色胶囊
function createRelationLabel(relation: string, selected = false, hovered = false, dimmed = false) {
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
    position: { distance: 0.5, offset: -15 },
  }
}

function createTargetMarker(stroke: string) {
  return {
    fill: stroke,
    height: 9,
    name: 'block',
    stroke,
    strokeWidth: 0,
    width: 13,
  }
}

type AnchorSide = 'top' | 'bottom' | 'left' | 'right'

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
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`
  }

  return `rgba(91, 124, 247, ${alpha})`
}

/** Pick which port anchor side to connect from/to, based on relative node positions. */
function pickAnchorSide(fromPos: NodePosition, toPos: NodePosition): AnchorSide {
  const dx = toPos.x - fromPos.x
  const dy = toPos.y - fromPos.y
  // Weight by card aspect ratio so the chosen side faces the other node
  if (Math.abs(dx) * CARD_HEIGHT >= Math.abs(dy) * CARD_WIDTH) {
    return dx >= 0 ? 'right' : 'left'
  }
  return dy >= 0 ? 'bottom' : 'top'
}

/** Composite a semi-transparent color onto white, returning an opaque hex string. */
function compositeOnWhite(color: string): string {
  const match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/)
  if (!match) return color // already hex or unrecognized — pass through
  const r = Number(match[1])
  const g = Number(match[2])
  const b = Number(match[3])
  const a = match[4] !== undefined ? Number(match[4]) : 1
  const cr = Math.round(r * a + 255 * (1 - a))
  const cg = Math.round(g * a + 255 * (1 - a))
  const cb = Math.round(b * a + 255 * (1 - a))
  return `#${cr.toString(16).padStart(2, '0')}${cg.toString(16).padStart(2, '0')}${cb.toString(16).padStart(2, '0')}`
}

function setNodeVisualState(node: Node, selected: boolean, hovered: boolean, dimmed = false): void {
  const data = node.getData<EntityNodeData>()
  const degree = data?.degree ?? 0
  const entity = data?.entity
  const prominence = Math.min(1, degree / 6)

  const entityColor = getEntityColor(entity)
  const borderColor = selected || hovered ? entityColor : getColorAlpha(entityColor, 0.5)
  const backgroundColor = selected ? getColorAlpha(entityColor, 0.16) : hovered ? getColorAlpha(entityColor, 0.10) : '#FFFFFF'
  const shadowColor = selected || hovered ? entityColor : '#AAB6C8'

  const baseOpacity = dimmed ? 0.25 : 1

  // body: stroke rendered BEHIND fill via paint-order, fill covers inner stroke half
  // Pre-composite semi-transparent color onto white for opaque fill — eliminates edge blending
  const bodyFill = (hovered || selected) ? compositeOnWhite(backgroundColor) : '#FFFFFF'

  // bg rect: same fill as body so sub-pixel gaps at stroke outer edge are invisible
  node.attr('bg', {
    fill: bodyFill,
    opacity: baseOpacity,
  })

  node.attr('body', {
    fill: bodyFill,
    stroke: borderColor,
    strokeWidth: 2,
    paintOrder: 'stroke',
    opacity: baseOpacity,
  })

  node.attr('dot', {
    fill: entityColor,
    r: 8 + prominence * 3,
    opacity: baseOpacity,
  })

  node.attr('shadow', {
    fill: shadowColor,
    opacity: dimmed ? 0.05 : (selected ? 0.35 : hovered ? 0.25 : 0.12 + prominence * 0.08),
  })

  node.attr('title', {
    fill: '#1a2744',
    fontWeight: 700,
    opacity: baseOpacity,
  })

  node.attr('degree', {
    fill: '#8fa0b5',
    fontWeight: 400,
    opacity: baseOpacity,
  })

  // Port anchor points: visible on hover/selected, hidden otherwise
  const portOpacity = (hovered || selected) ? baseOpacity : 0
  node.attr('portTop', { opacity: portOpacity, stroke: entityColor })
  node.attr('portBottom', { opacity: portOpacity, stroke: entityColor })
  node.attr('portLeft', { opacity: portOpacity, stroke: entityColor })
  node.attr('portRight', { opacity: portOpacity, stroke: entityColor })
}

function setEdgeVisualState(edge: Edge, selected: boolean, hovered: boolean, dimmed = false): void {
  const relation = edge.getData<RelationEdgeData>()?.relation ?? ''
  const stroke = selected ? '#5b7cf7' : hovered ? '#5b7cf7' : '#64748b'
  const lineOpacity = dimmed ? 0.12 : (selected ? 1 : hovered ? 0.9 : 0.55)

  edge.attr('line', {
    opacity: lineOpacity,
    stroke,
    strokeWidth: selected ? 2.5 : hovered ? 2 : 1.5,
    targetMarker: createTargetMarker(stroke),
  })
  edge.setLabelAt(0, createRelationLabel(relation, selected, hovered, dimmed))
}

function getHopNeighborhood(graph: Graph, startNodeId: string, maxHops: number): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const nodeIds = new Set<string>([startNodeId])
  const edgeIds = new Set<string>()
  let frontier = [startNodeId]

  for (let hop = 0; hop < maxHops; hop++) {
    const nextFrontier: string[] = []
    for (const nid of frontier) {
      for (const edge of graph.getConnectedEdges(nid)) {
        const eid = edge.id
        if (!edgeIds.has(eid)) {
          edgeIds.add(eid)
          const sourceId = edge.getSourceCellId()
          const targetId = edge.getTargetCellId()
          if (!nodeIds.has(sourceId)) {
            nodeIds.add(sourceId)
            nextFrontier.push(sourceId)
          }
          if (!nodeIds.has(targetId)) {
            nodeIds.add(targetId)
            nextFrontier.push(targetId)
          }
        }
      }
    }
    frontier = nextFrontier
  }

  return { nodeIds, edgeIds }
}

export const OntologyGraphCanvas: React.FC<OntologyGraphCanvasProps> = ({ backgroundColor = 'transparent', degreeMap, emptyDescription, edges, isFullscreen, nodes, onSelect, onToggleFullscreen, selection }) => {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const minimapContainerRef = useRef<HTMLDivElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<Graph | null>(null)
  const nodePositionsRef = useRef<Map<string, NodePosition>>(new Map())
  const onSelectRef = useRef(onSelect)
  const [graphError, setGraphError] = useState<string | null>(null)
  const [layoutVersion, setLayoutVersion] = useState(0)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

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
    nodePositionsRef.current.clear()
    setLayoutVersion((value) => value + 1)
  }, [])

  useEffect(() => {
    const host = hostRef.current
    const container = containerRef.current
    if (!host || !container || graphRef.current) return undefined
    const initialWidth = Math.max(host.clientWidth, 1)
    const initialHeight = Math.max(host.clientHeight, 1)

    const graph = new Graph({
      background: { color: 'transparent' },
      container,
      grid: { args: { color: 'rgba(130, 140, 200, 0.12)', thickness: 2 }, type: 'dot', visible: true },
      height: initialHeight,
      interacting: { edgeMovable: false, nodeMovable: true },
      mousewheel: { enabled: true, maxScale: 2.4, minScale: 0.35, modifiers: null },
      panning: { enabled: true, eventTypes: ['leftMouseDown'] },
      width: initialWidth,
    })
    graph.zoom(0.88, { absolute: true })

    graph.on('node:mouseenter', ({ node }) => {
      const data = node.getData<EntityNodeData>()
      const selected = data?.selected ?? false
      const neighborhood = getHopNeighborhood(graph, node.id, 2)
      setNodeVisualState(node, selected, true, false)
      setHoveredNodeId(node.id)

      // Highlight 2-hop neighbors, dim others
      for (const otherNode of graph.getNodes()) {
        if (otherNode.id === node.id) continue
        const otherData = otherNode.getData<EntityNodeData>()
        const otherSelected = otherData?.selected ?? false
        const inNeighborhood = neighborhood.nodeIds.has(otherNode.id)
        setNodeVisualState(otherNode, otherSelected, false, !inNeighborhood)
      }
      for (const otherEdge of graph.getEdges()) {
        const otherData = otherEdge.getData<RelationEdgeData>()
        const otherSelected = otherData?.selected ?? false
        const inNeighborhood = neighborhood.edgeIds.has(otherEdge.id)
        setEdgeVisualState(otherEdge, otherSelected, false, !inNeighborhood)
      }
    })
    graph.on('node:mouseleave', ({ node }) => {
      const data = node.getData<EntityNodeData>()
      const selected = data?.selected ?? false
      setNodeVisualState(node, selected, false, false)
      setHoveredNodeId(null)

      // Restore all nodes/edges to normal state
      for (const otherNode of graph.getNodes()) {
        if (otherNode.id === node.id) continue
        const otherData = otherNode.getData<EntityNodeData>()
        const otherSelected = otherData?.selected ?? false
        setNodeVisualState(otherNode, otherSelected, false, false)
      }
      for (const otherEdge of graph.getEdges()) {
        const otherData = otherEdge.getData<RelationEdgeData>()
        const otherSelected = otherData?.selected ?? false
        setEdgeVisualState(otherEdge, otherSelected, false, false)
      }
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
      if (isRelationLabelTarget(e.target)) {
        const relation = edge.getData<RelationEdgeData>()?.edge
        onSelectRef.current({ id: String(relation?.id ?? edge.id.replace(/^relation-/, '')), type: 'edge' })
      }
    })
    graph.on('node:change:position', ({ node }) => {
      const position = node.getPosition()
      nodePositionsRef.current.set(node.id, position)
    })

    let resizeFrame: number | undefined
    const resizeObserver = new ResizeObserver(() => {
      if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = undefined
        graph.resize(Math.max(host.clientWidth, 1), Math.max(host.clientHeight, 1))
        if (graph.getCells().length > 0) graph.zoomToFit({ maxScale: 1.2, minScale: 0.5, padding: 80 })
      })
    })
    resizeObserver.observe(host)
    graphRef.current = graph

    if (minimapContainerRef.current) {
      graph.use(
        new MiniMap({
          container: minimapContainerRef.current,
          width: 180,
          height: 120,
          padding: 20,
        }),
      )
    }

    return () => {
      resizeObserver.disconnect()
      if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame)
      graph.dispose()
      if (graphRef.current === graph) graphRef.current = null
    }
  }, [backgroundColor])

  const forceLayout = useMemo(() => {
    const host = hostRef.current
    if (!host) return null
    const width = Math.max(host.clientWidth, CARD_WIDTH * 2 + 100)
    const height = Math.max(host.clientHeight, CARD_HEIGHT * 2 + 100)
    return computeForceLayout(nodes, edges, width, height)
  }, [nodes, edges, layoutVersion])

  useEffect(() => {
    const graph = graphRef.current
    const host = hostRef.current
    if (!graph || !host || !forceLayout) return

    try {
      setGraphError(null)

      if (edges.length === 0) {
        graph.clearCells()
        return
      }

      const graphNodes = nodes.map((node) => {
        const id = String(node.id)
        const degree = degreeMap[id] || 0
        const position = nodePositionsRef.current.get(id) ?? forceLayout.positions.get(id) ?? { x: 100, y: 100 }
        nodePositionsRef.current.set(id, position)
        const entityColor = getEntityColor(node)
        return graph.createNode({
          attrs: {
            body: { fill: '#FFFFFF', stroke: getColorAlpha(entityColor, 0.5), strokeWidth: 2 },
            dot: { fill: entityColor },
            degree: { text: `${degree} 条关系` },
            shadow: { fill: '#AAB6C8', opacity: 0.15 },
            title: { text: node.entityName },
          },
          data: { degree, entity: node, hovered: false, selected: false },
          id,
          position,
          shape: 'ontology-entity-card',
          zIndex: 2,
        })
      })
      const nodeIds = new Set(graphNodes.map((node) => node.id))
      const graphEdges = edges.flatMap((edge) => {
        const id = String(edge.id)
        const sourceId = String(edge.startEntityId)
        const targetId = String(edge.endEntityId)
        if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) return []
        const srcPos = nodePositionsRef.current.get(sourceId) ?? { x: 0, y: 0 }
        const tgtPos = nodePositionsRef.current.get(targetId) ?? { x: 0, y: 0 }
        const srcAnchor = pickAnchorSide(srcPos, tgtPos)
        const tgtAnchor = pickAnchorSide(tgtPos, srcPos)
        return graph.createEdge({
          attrs: {
            line: {
              sourceMarker: null,
              opacity: 0.55,
              stroke: '#64748b',
              strokeLinecap: 'round',
              strokeWidth: 1.5,
              targetMarker: createTargetMarker('#64748b'),
            },
          },
          connector: { name: 'smooth' },
          data: { edge, hovered: false, relation: edge.relation, selected: false },
          defaultLabel: createRelationLabel(''),
          id: `relation-${id}`,
          labels: [createRelationLabel(edge.relation)],
          source: { anchor: { name: srcAnchor }, cell: sourceId, connectionPoint: { name: 'anchor' } },
          target: { anchor: { name: tgtAnchor }, cell: targetId, connectionPoint: { name: 'anchor' } },
          zIndex: 3,
        })
      })
      graph.fromJSON({ cells: [...graphNodes, ...graphEdges].map((cell) => cell.toJSON()) })
      graph.getNodes().forEach((node) => {
        const selected = selection?.type === 'node' && selection.id === node.id
        node.setData({ ...node.getData<EntityNodeData>(), selected })
        setNodeVisualState(node, selected, false)
      })
      graph.getEdges().forEach((edge) => {
        const selected = selection?.type === 'edge' && selection.id === edge.id.replace(/^relation-/, '')
        edge.setData({ ...edge.getData<RelationEdgeData>(), selected })
        setEdgeVisualState(edge, selected, false)
      })

      if (nodes.length > 0) graph.zoomToFit({ maxScale: 1.2, minScale: 0.5, padding: 80 })
    } catch (error) {
      console.error('[OntologyGraphCanvas] X6 operation failed', error)
      setGraphError('图谱渲染失败，可重新查询后再试')
    }
  }, [degreeMap, edges, forceLayout, layoutVersion, nodes, selection])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return

    graph.getNodes().forEach((node) => {
      const selected = selection?.type === 'node' && selection.id === node.id
      node.setData({ ...node.getData<EntityNodeData>(), selected })
      setNodeVisualState(node, selected, false)
    })
    graph.getEdges().forEach((edge) => {
      const selected = selection?.type === 'edge' && selection.id === edge.id.replace(/^relation-/, '')
      edge.setData({ ...edge.getData<RelationEdgeData>(), selected })
      setEdgeVisualState(edge, selected, false)
    })
  }, [selection])

  const hoveredNode = useMemo(() => {
    if (!hoveredNodeId) return null
    return nodes.find((n) => String(n.id) === hoveredNodeId) ?? null
  }, [hoveredNodeId, nodes])

  const noGraphRelations = edges.length === 0

  return (
    <div ref={shellRef} className={styles.canvasShell}>
      <div ref={hostRef} className={styles.canvasHost}>
        <div ref={containerRef} className={styles.canvasContainer} />
      </div>
      {noGraphRelations && (
        <div className={styles.emptyOverlay}>
          <span>{emptyDescription ?? '暂无匹配的实体或关系'}</span>
        </div>
      )}
      {graphError && <div className={styles.errorOverlay}>{graphError}</div>}
      {hoveredNode && (
        <div className={styles.nodeTooltip}>
          <div className={styles.nodeTooltipTitle}>{hoveredNode.entityName}</div>
          <div className={styles.nodeTooltipMeta}>
            <span className={styles.nodeTooltipDot} style={{ backgroundColor: getEntityColor(hoveredNode) }} />
            <span>编码: {hoveredNode.entityCode}</span>
          </div>
          {hoveredNode.remark && <div className={styles.nodeTooltipRemark}>{hoveredNode.remark}</div>}
        </div>
      )}
      <div className={styles.controls}>
        <Tooltip getPopupContainer={() => shellRef.current || document.body} title="放大">
          <AButton icon={<PlusOutlined />} type="text" onClick={zoomIn} />
        </Tooltip>
        <Tooltip getPopupContainer={() => shellRef.current || document.body} title="缩小">
          <AButton icon={<MinusOutlined />} type="text" onClick={zoomOut} />
        </Tooltip>
        <Tooltip getPopupContainer={() => shellRef.current || document.body} title="重置视图">
          <AButton icon={<ReloadOutlined />} type="text" onClick={resetView} />
        </Tooltip>
        <Tooltip getPopupContainer={() => shellRef.current || document.body} title={isFullscreen ? '退出全屏' : '全屏'}>
          <AButton icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} type="text" onClick={onToggleFullscreen} />
        </Tooltip>
      </div>
      <div ref={minimapContainerRef} className={styles.minimap} />
    </div>
  )
}

export default OntologyGraphCanvas

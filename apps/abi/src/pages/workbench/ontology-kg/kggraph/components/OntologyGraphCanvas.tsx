import { MinusOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Graph, type Edge, type Node } from '@antv/x6'
import { Empty, Tooltip } from 'antd'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import type { OntologyGraphEdge, OntologyGraphNode } from '@/pages/workbench/ontology-kg/shared-network-types'

import type { GraphSelection } from '../types'

interface OntologyGraphCanvasProps {
  readonly emptyDescription?: string
  readonly edges: OntologyGraphEdge[]
  readonly nodes: OntologyGraphNode[]
  readonly onSelect: (selection: GraphSelection) => void
  readonly selection: GraphSelection | null
}

interface EntityNodeData {
  selected: boolean
}

interface RelationEdgeData {
  relation: string
  selected: boolean
}

interface NodePosition {
  x: number
  y: number
}

const CARD_WIDTH = 238
const CARD_HEIGHT = 76
const GRAPH_FONT_FAMILY = '"SF Pro Display", "PingFang SC", "Hiragino Sans GB", sans-serif'

Graph.registerNode(
  'ontology-entity-card',
  {
    attrs: {
      body: {
        fill: '#FFFFFF',
        height: 72,
        rx: 10,
        ry: 10,
        stroke: '#DFE5EE',
        strokeWidth: 1,
        width: 236,
        x: 0,
        y: 0,
      },
      dot: { cx: 28, cy: 36, fill: '#5B7CF7', r: 7 },
      shadow: {
        fill: '#AAB6C8',
        height: 66,
        opacity: 0.18,
        rx: 10,
        ry: 10,
        width: 228,
        x: 7,
        y: 9,
      },
      title: { fill: '#1F2937', fontFamily: GRAPH_FONT_FAMILY, fontSize: 16, fontWeight: 600, textAnchor: 'start', x: 52, y: 42 },
    },
    height: CARD_HEIGHT,
    markup: [
      { selector: 'shadow', tagName: 'rect' },
      { selector: 'body', tagName: 'rect' },
      { selector: 'dot', tagName: 'circle' },
      { selector: 'title', tagName: 'text' },
    ],
    width: CARD_WIDTH,
  },
  true,
)

function isRelationLabelTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('.x6-edge-label') !== null
}

function createRelationLabel(relation: string, selected = false, hovered = false) {
  const stroke = selected ? '#3B82F6' : hovered ? '#7C93B7' : '#B5BECC'

  return {
    attrs: {
      body: {
        fill: '#FFFFFF',
        height: 24,
        rx: 8,
        ry: 8,
        stroke: selected ? '#93C5FD' : '#E6EAF0',
        strokeWidth: 1,
        width: 88,
        x: -44,
        y: -16,
      },
      label: {
        fill: selected ? '#2563EB' : '#586579',
        fontFamily: GRAPH_FONT_FAMILY,
        fontSize: 12,
        fontWeight: selected ? 600 : 500,
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
    position: { distance: 0.5, offset: -14 },
  }
}

function getDefaultNodePosition(index: number, count: number, width: number, height: number): NodePosition {
  if (count <= 1) return { x: Math.max(48, width / 2 - CARD_WIDTH / 2), y: Math.max(48, height / 2 - CARD_HEIGHT / 2) }

  const horizontalGap = 96
  const verticalGap = 96
  const horizontalStep = CARD_WIDTH + horizontalGap
  const verticalStep = CARD_HEIGHT + verticalGap
  const columns = Math.max(2, Math.floor((Math.max(width, CARD_WIDTH * 2 + horizontalGap) - 64) / horizontalStep))
  const rows = Math.ceil(count / columns)
  const currentRow = Math.floor(index / columns)
  const currentColumn = index % columns
  const layoutWidth = Math.min(count, columns) * CARD_WIDTH + Math.max(0, Math.min(count, columns) - 1) * horizontalGap
  const layoutHeight = rows * CARD_HEIGHT + Math.max(0, rows - 1) * verticalGap

  return {
    x: Math.max(32, (width - layoutWidth) / 2) + currentColumn * horizontalStep,
    y: Math.max(32, (height - layoutHeight) / 2) + currentRow * verticalStep,
  }
}

function animateZoom(graph: Graph, factor: number): void {
  const startZoom = graph.zoom()
  const targetZoom = Math.min(2.4, Math.max(0.35, startZoom * factor))
  const startedAt = performance.now()
  const duration = 180

  const step = (now: number): void => {
    const progress = Math.min(1, (now - startedAt) / duration)
    const easedProgress = 1 - (1 - progress) ** 3
    graph.zoom(startZoom + (targetZoom - startZoom) * easedProgress, { absolute: true })
    if (progress < 1) requestAnimationFrame(step)
  }

  requestAnimationFrame(step)
}

function setNodeVisualState(node: Node, selected: boolean, hovered: boolean): void {
  node.attr({
    body: {
      fill: '#FFFFFF',
      stroke: selected ? '#4169F6' : hovered ? '#B7C5DA' : '#DFE5EE',
      strokeWidth: selected ? 4 : 1,
    },
    shadow: { fill: selected ? '#9FB3FF' : '#AAB6C8', opacity: selected ? 0.3 : hovered ? 0.28 : 0.18 },
  })
}

function setEdgeVisualState(edge: Edge, selected: boolean, hovered: boolean): void {
  const relation = edge.getData<RelationEdgeData>()?.relation ?? ''
  const stroke = selected ? '#3B82F6' : hovered ? '#7C93B7' : '#B5BECC'

  edge.attr('line', {
    stroke,
    strokeWidth: selected ? 2.4 : hovered ? 1.8 : 1.3,
    targetMarker: {
      d: 'M 9 -5 L 0 0 L 9 5',
      fill: 'none',
      name: 'path',
      stroke,
      strokeWidth: 1.5,
    },
  })
  edge.setLabelAt(0, createRelationLabel(relation, selected, hovered))
}

export const OntologyGraphCanvas: React.FC<OntologyGraphCanvasProps> = ({ emptyDescription, edges, nodes, onSelect, selection }) => {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<Graph | null>(null)
  const nodePositionsRef = useRef<Map<string, NodePosition>>(new Map())
  const onSelectRef = useRef(onSelect)
  const [graphError, setGraphError] = useState<string | null>(null)
  const [layoutVersion, setLayoutVersion] = useState(0)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  const zoomIn = useCallback((): void => {
    const graph = graphRef.current
    if (graph) animateZoom(graph, 1.16)
  }, [])

  const zoomOut = useCallback((): void => {
    const graph = graphRef.current
    if (graph) animateZoom(graph, 0.86)
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
      background: { color: '#F8FAFC' },
      container,
      grid: { args: { color: '#E7ECF4', thickness: 3 }, type: 'dot', visible: true },
      height: initialHeight,
      interacting: { edgeMovable: false, nodeMovable: true },
      mousewheel: { enabled: true, maxScale: 2.4, minScale: 0.35, modifiers: null },
      panning: { enabled: true, eventTypes: ['leftMouseDown'], modifiers: 'space' },
      width: initialWidth,
    })
    graph.zoom(0.86, { absolute: true })

    graph.on('node:mouseenter', ({ node }) => {
      const selected = node.getData<EntityNodeData>()?.selected ?? false
      setNodeVisualState(node, selected, true)
    })
    graph.on('node:mouseleave', ({ node }) => {
      const selected = node.getData<EntityNodeData>()?.selected ?? false
      setNodeVisualState(node, selected, false)
    })
    graph.on('edge:mouseenter', ({ edge }) => {
      const selected = edge.getData<RelationEdgeData>()?.selected ?? false
      setEdgeVisualState(edge, selected, true)
    })
    graph.on('edge:mouseleave', ({ edge }) => {
      const selected = edge.getData<RelationEdgeData>()?.selected ?? false
      setEdgeVisualState(edge, selected, false)
    })
    graph.on('node:click', ({ node }) => {
      onSelectRef.current({ id: node.id, type: 'node' })
    })
    graph.on('edge:click', ({ e, edge }) => {
      if (isRelationLabelTarget(e.target)) onSelectRef.current({ id: edge.id.replace(/^relation-/, ''), type: 'edge' })
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
        if (graph.getCells().length > 0) graph.centerContent({ padding: 120 })
      })
    })
    resizeObserver.observe(host)
    graphRef.current = graph

    return () => {
      resizeObserver.disconnect()
      if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame)
      graph.dispose()
      if (graphRef.current === graph) graphRef.current = null
    }
  }, [])

  useEffect(() => {
    const graph = graphRef.current
    const host = hostRef.current
    if (!graph || !host) return

    try {
      setGraphError(null)
      const width = Math.max(host.clientWidth, CARD_WIDTH * 2 + 96)
      const height = Math.max(host.clientHeight, CARD_HEIGHT * 2 + 96)
      const graphNodes = nodes.map((node, index) => {
        const id = String(node.id)
        const position = nodePositionsRef.current.get(id) ?? getDefaultNodePosition(index, nodes.length, width, height)
        nodePositionsRef.current.set(id, position)
        return graph.createNode({
          attrs: {
            body: { fill: '#FFFFFF', stroke: '#DFE5EE', strokeWidth: 1 },
            dot: { fill: node.color || '#5B7CF7' },
            shadow: { fill: '#AAB6C8', opacity: 0.18 },
            title: { text: node.entityName },
          },
          data: { selected: false },
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
        return graph.createEdge({
          attrs: {
            line: {
              sourceMarker: null,
              stroke: '#B5BECC',
              strokeWidth: 1.3,
              targetMarker: {
                d: 'M 9 -5 L 0 0 L 9 5',
                fill: 'none',
                name: 'path',
                stroke: '#B5BECC',
                strokeWidth: 1.5,
              },
            },
          },
          connector: { name: 'smooth' },
          data: { relation: edge.relation, selected: false },
          defaultLabel: createRelationLabel(''),
          id: `relation-${id}`,
          labels: [createRelationLabel(edge.relation)],
          source: sourceId,
          target: targetId,
          zIndex: 1,
        })
      })
      graph.resetCells([...graphNodes, ...graphEdges])
      graph.getNodes().forEach((node) => {
        const selected = selection?.type === 'node' && selection.id === node.id
        node.setData({ selected })
        setNodeVisualState(node, selected, false)
      })
      graph.getEdges().forEach((edge) => {
        const selected = selection?.type === 'edge' && selection.id === edge.id.replace(/^relation-/, '')
        edge.setData({ selected })
        setEdgeVisualState(edge, selected, false)
      })

      if (nodes.length > 0) graph.centerContent({ padding: 120 })
    } catch (error) {
      console.error('[OntologyGraphCanvas] X6 operation failed', error)
      setGraphError('图谱渲染失败，可重新查询后再试')
    }
  }, [edges, layoutVersion, nodes])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return

    graph.getNodes().forEach((node) => {
      const selected = selection?.type === 'node' && selection.id === node.id
      node.setData({ selected })
      setNodeVisualState(node, selected, false)
    })
    graph.getEdges().forEach((edge) => {
      const selected = selection?.type === 'edge' && selection.id === edge.id.replace(/^relation-/, '')
      edge.setData({ selected })
      setEdgeVisualState(edge, selected, false)
    })
  }, [selection])

  const noNodes = nodes.length === 0
  const hasNoRelations = nodes.length > 0 && edges.length === 0

  return (
    <div className="relative isolate h-full min-h-500px w-full overflow-hidden rounded-16px border border-slate-200 bg-slate-50 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
      <div ref={hostRef} className="relative h-full min-h-500px w-full">
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      </div>
      {noNodes && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center text-slate-400">
          <div className="relative z-10 rounded-full bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} imageStyle={{ height: 56, margin: 0 }} description={false} />
          </div>
          <span className="relative z-0 mt-3 text-sm">{emptyDescription ?? '暂无匹配的实体或关系'}</span>
        </div>
      )}
      {hasNoRelations && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/94 px-4 py-2 text-xs text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
          <span className="relative z-10 h-2 w-2 rounded-full bg-amber-400" />
          <span className="relative z-0">暂无可展示关系</span>
        </div>
      )}
      {graphError && <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-white/75 text-sm text-slate-500 backdrop-blur-sm">{graphError}</div>}
      <div className="absolute right-5 top-5 z-30 flex overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.1)] backdrop-blur">
        <Tooltip title="放大">
          <AButton icon={<PlusOutlined />} type="text" onClick={zoomIn} />
        </Tooltip>
        <Tooltip title="缩小">
          <AButton icon={<MinusOutlined />} type="text" onClick={zoomOut} />
        </Tooltip>
        <Tooltip title="重置视图">
          <AButton icon={<ReloadOutlined />} type="text" onClick={resetView} />
        </Tooltip>
      </div>
    </div>
  )
}

export default OntologyGraphCanvas

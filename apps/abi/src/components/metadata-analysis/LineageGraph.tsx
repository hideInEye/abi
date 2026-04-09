/* eslint-disable react/prop-types */
import { FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons'
import { Graph } from '@antv/g6'

import { NODE_TYPE_COLORS, NODE_TYPE_LABELS, RELATION_TYPE_COLORS } from './constants'
import type { AnalysisMode, LineageRelation, MetadataAnalysisContext } from './types'

interface Props {
  defaultExpandLevel?: number
  mode?: AnalysisMode
  relations: LineageRelation[]
  rootContext?: MetadataAnalysisContext | null
  title?: string
}

interface GraphNode {
  canToggle?: boolean
  count?: number | string
  fullLabel: string
  id: string
  label: string
  nodeType: string
  style: Record<string, any>
  toggleAction?: 'collapse' | 'expand'
}

interface EnsureNodePayload {
  count?: number | string
  key: string
  name?: string
  nodeType: string
}

interface GraphEdge {
  id: string
  relationType: string
  source: string
  status: string
  target: string
}

interface NodeMeta {
  count?: number | string
  name: string
  nodeType: string
}

interface ConnectPayload {
  id: string
  relationType: string
  source: string
  status: string
  target: string
}

type ToggleStateMap = Record<string, 'collapse' | 'expand'>

function resolveNodeLabel(nodeType: string, nodeName?: string) {
  const typeLabel = NODE_TYPE_LABELS[nodeType] || '节点'
  const cleanName = `${nodeName || ''}`.trim()
  if (cleanName) return cleanName
  return typeLabel
}

function resolveNodeCount(count?: number | string) {
  if (count === undefined || count === null || `${count}` === '') return undefined
  return count
}

function buildDisplayLabel(name: string, count?: number | string) {
  const safeName = `${name || ''}`.trim()
  if (!safeName) return '-'
  if (count === undefined) return safeName
  return `${safeName} (${count})`
}

function truncateLabel(text: string) {
  if (text.length <= 16) return text
  return `${text.slice(0, 14)}...`
}

function resolveNodeStyle(nodeType: string) {
  const color = NODE_TYPE_COLORS[nodeType] || '#64748b'

  if (nodeType === 'DATA_SOURCE') {
    return {
      fill: '#3388ff',
      labelFill: '#ffffff',
      lineDash: undefined,
      stroke: '#3388ff'
    }
  }

  if (nodeType === 'PHYSICAL_TABLE') {
    return {
      fill: '#f8fafc',
      labelFill: '#334155',
      lineDash: [6, 4],
      stroke: '#64748b'
    }
  }

  if (nodeType === 'TABLE_SEMANTIC') {
    return {
      fill: '#f0fdf4',
      labelFill: '#334155',
      lineDash: undefined,
      stroke: '#22c55e'
    }
  }

  if (nodeType === 'DATASET') {
    return {
      fill: '#eff6ff',
      labelFill: '#334155',
      lineDash: undefined,
      stroke: '#3b82f6'
    }
  }

  if (nodeType === 'COLLAPSED') {
    return {
      fill: '#f1f5f9',
      labelFill: '#475569',
      lineDash: [5, 5],
      stroke: '#94a3b8'
    }
  }

  return {
    fill: `${color}14`,
    labelFill: '#333d46',
    lineDash: undefined,
    stroke: color
  }
}

// eslint-disable-next-line complexity
function resolveClickedNodeId(event: any, nodeMap: Map<string, GraphNode>) {
  const candidates = [
    event?.data?.id,
    event?.item?.id,
    event?.target?.id,
    event?.target?.config?.id,
    event?.target?.context?.model?.id,
    event?.target?.context?.element?.id,
    event?.target?.__data__?.id
  ]

  for (let index = 0; index < candidates.length; index += 1) {
    const raw = candidates[index]
    if (typeof raw === 'string' && raw && nodeMap.has(raw)) return raw
  }

  return undefined
}

const LineageGraph: React.FC<Props> = ({
  defaultExpandLevel = 2,
  mode = 'lineage',
  relations,
  rootContext,
  title = '关系图'
}) => {
  const cardWrapRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<Graph | null>(null)
  const nodeMapRef = useRef<Map<string, GraphNode>>(new Map())
  const isInitialViewportRef = useRef(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [toggleStates, setToggleStates] = useState<ToggleStateMap>({})
  const [viewportHeight, setViewportHeight] = useState(() => {
    if (typeof window === 'undefined') return 900
    return window.innerHeight
  })

  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    setToggleStates({})
  }, [mode, relations, rootContext?.nodeId, rootContext?.nodeType])

  const graphHeight = useMemo(() => {
    if (isFullscreen) return Math.max(viewportHeight - 92, 560)
    // 预留抽屉标题、分析切换区、Card 标题和上下边距，避免出现外层滚动条
    return Math.max(viewportHeight - 360, 420)
  }, [isFullscreen, viewportHeight])

  const wrapperStyle = useMemo<React.CSSProperties>(() => {
    if (!isFullscreen) {
      return { width: '100%' }
    }

    return {
      background: '#fff',
      height: '100vh',
      width: '100vw'
    }
  }, [isFullscreen])

  const handleNodeClick = useCallback((event: any) => {
    const nodeId = resolveClickedNodeId(event, nodeMapRef.current)
    if (!nodeId) return

    const nodeData = nodeMapRef.current.get(nodeId)
    if (!nodeData?.canToggle || !nodeData.toggleAction) return

    setToggleStates(prev => ({
      ...prev,
      [nodeId]: nodeData.toggleAction
    }))
  }, [])

  const data = useMemo(() => {
    const nodesMetaMap = new Map<string, NodeMeta>()
    const allEdges: GraphEdge[] = []
    const inMap = new Map<string, Set<string>>()
    const outMap = new Map<string, Set<string>>()
    const inDegreeMap = new Map<string, number>()

    const ensureNodeMeta = (payload: EnsureNodePayload) => {
      const { count, key, name, nodeType } = payload
      const exists = nodesMetaMap.get(key)
      if (exists) {
        if (!exists.name || exists.name === (NODE_TYPE_LABELS[nodeType] || '节点')) {
          exists.name = resolveNodeLabel(nodeType, name)
        }
        if (exists.count === undefined && count !== undefined && count !== null && `${count}` !== '') {
          exists.count = count
        }
        return
      }

      nodesMetaMap.set(key, {
        count: resolveNodeCount(count),
        name: resolveNodeLabel(nodeType, name),
        nodeType
      })
    }

    const connect = (payload: ConnectPayload) => {
      const { id, relationType, source, status, target } = payload
      if (!outMap.has(source)) outMap.set(source, new Set())
      outMap.get(source)!.add(target)
      if (!inMap.has(target)) inMap.set(target, new Set())
      inMap.get(target)!.add(source)
      inDegreeMap.set(target, (inDegreeMap.get(target) || 0) + 1)
      if (!inDegreeMap.has(source)) inDegreeMap.set(source, inDegreeMap.get(source) || 0)

      allEdges.push({
        id,
        relationType,
        source,
        status,
        target
      })
    }

    const relationMode = mode || 'lineage'
    relations.forEach(item => {
      const sourceKey = `${item.source_node_type}:${item.source_node_id}`
      const targetKey = `${item.target_node_type}:${item.target_node_id}`

      const orientedSource = relationMode === 'impact'
        ? {
            count: item.target_node_count,
            key: targetKey,
            name: item.target_node_name,
            nodeType: item.target_node_type
          }
        : {
            count: item.source_node_count,
            key: sourceKey,
            name: item.source_node_name,
            nodeType: item.source_node_type
          }

      const orientedTarget = relationMode === 'impact'
        ? {
            count: item.source_node_count,
            key: sourceKey,
            name: item.source_node_name,
            nodeType: item.source_node_type
          }
        : {
            count: item.target_node_count,
            key: targetKey,
            name: item.target_node_name,
            nodeType: item.target_node_type
          }

      ensureNodeMeta(orientedSource)
      ensureNodeMeta(orientedTarget)

      connect({
        id: `${item.lineage_id}`,
        relationType: item.relation_type,
        source: orientedSource.key,
        status: `${item.status ?? '0'}`,
        target: orientedTarget.key
      })
    })

    const resolveRootKey = () => {
      if (!nodesMetaMap.size) return undefined

      if (rootContext?.nodeId !== undefined) {
        const exactKey = `${rootContext.nodeType}:${rootContext.nodeId}`
        if (nodesMetaMap.has(exactKey)) return exactKey
      }

      if (rootContext?.nodeType) {
        const sameTypeKeys = Array.from(nodesMetaMap.keys()).filter(key => key.startsWith(`${rootContext.nodeType}:`))
        if (sameTypeKeys.length === 1) return sameTypeKeys[0]
        const sameTypeWithChildren = sameTypeKeys.find(key => (outMap.get(key)?.size || 0) > 0)
        if (sameTypeWithChildren) return sameTypeWithChildren
      }

      const structuralRoot = Array.from(nodesMetaMap.keys()).find(key => (inDegreeMap.get(key) || 0) === 0 && (outMap.get(key)?.size || 0) > 0)
      if (structuralRoot) return structuralRoot

      const withChildren = Array.from(nodesMetaMap.keys()).find(key => (outMap.get(key)?.size || 0) > 0)
      if (withChildren) return withChildren

      return nodesMetaMap.keys().next().value
    }

    const rootKey = resolveRootKey()
    if (!rootKey) return { edges: [], nodes: [] }

    const traversalChildrenCache = new Map<string, string[]>()
    const getTraversalChildren = (nodeKey: string) => {
      const cached = traversalChildrenCache.get(nodeKey)
      if (cached) return cached

      const outChildren = Array.from(outMap.get(nodeKey) || [])
      const inChildren = Array.from(inMap.get(nodeKey) || [])
      const nextChildren = Array.from(new Set([...outChildren, ...inChildren]))
      traversalChildrenCache.set(nodeKey, nextChildren)
      return nextChildren
    }

    if (rootContext?.nodeName && nodesMetaMap.has(rootKey)) {
      const rootMeta = nodesMetaMap.get(rootKey)!
      if (rootMeta.nodeType === rootContext.nodeType) {
        rootMeta.name = rootContext.nodeName
      }
    }

    const depthMap = new Map<string, number>()
    depthMap.set(rootKey, 0)
    const queue = [rootKey]
    while (queue.length) {
      const current = queue.shift()!
      const currentDepth = depthMap.get(current) || 0
      const nextNodes = getTraversalChildren(current)
      nextNodes.forEach(nextKey => {
        if (!depthMap.has(nextKey)) {
          depthMap.set(nextKey, currentDepth + 1)
          queue.push(nextKey)
        }
      })
    }

    const expandLevel = Math.max(defaultExpandLevel ?? 2, 1)
    const isExpandedByState = (nodeKey: string) => {
      const childrenSize = getTraversalChildren(nodeKey).length
      if (!childrenSize) return false

      const depth = depthMap.get(nodeKey) || 0
      const defaultExpanded = depth < expandLevel
      const overrideState = toggleStates[nodeKey]
      if (overrideState === 'expand') return true
      if (overrideState === 'collapse') return false
      return defaultExpanded
    }

    const visibleKeys = new Set<string>([rootKey])
    const bfsQueue = [rootKey]
    const handled = new Set<string>()

    while (bfsQueue.length) {
      const current = bfsQueue.shift()!
      if (!handled.has(current)) {
        handled.add(current)

        const children = getTraversalChildren(current)
        const shouldExpand = children.length > 0 && isExpandedByState(current)
        if (shouldExpand) {
          children.forEach(child => {
            visibleKeys.add(child)
            if (!handled.has(child)) bfsQueue.push(child)
          })
        }
      }
    }

    const visibleNodes: GraphNode[] = Array.from(visibleKeys).map(key => {
      const meta = nodesMetaMap.get(key)!
      const childrenSize = getTraversalChildren(key).length
      const displayCount = meta.count === undefined ? (childrenSize || undefined) : meta.count
      const baseLabel = buildDisplayLabel(meta.name, displayCount)
      const isExpanded = isExpandedByState(key)
      const canToggle = childrenSize > 0
      const actionLabel = isExpanded ? '[-]' : '[+]'
      const displayLabel = canToggle ? `${baseLabel} ${actionLabel}` : baseLabel
      const style = resolveNodeStyle(meta.nodeType)
      const toggleAction = isExpanded ? 'collapse' : 'expand'
      return {
        canToggle,
        count: displayCount,
        fullLabel: baseLabel,
        id: key,
        label: displayLabel,
        nodeType: meta.nodeType,
        style: {
          fill: style.fill,
          labelFill: style.labelFill,
          labelText: truncateLabel(displayLabel),
          lineDash: style.lineDash,
          size: [240, 36],
          stroke: style.stroke
        },
        toggleAction: canToggle ? toggleAction : undefined
      }
    })

    const visibleEdges = allEdges.filter(edge => visibleKeys.has(edge.source) && visibleKeys.has(edge.target))
    const edges = [...visibleEdges]

    const nodes = [...visibleNodes].map(node => ({
      ...node,
      style: {
        ...node.style,
        lineWidth: 1.4,
        radius: 4,
        shadowBlur: 0
      }
    }))

    return { edges, nodes }
  }, [defaultExpandLevel, mode, relations, rootContext, toggleStates])

  const hasGraphData = data.nodes.length > 0

  useEffect(() => {
    nodeMapRef.current = new Map<string, GraphNode>(data.nodes.map((node: GraphNode) => [node.id, node]))
  }, [data.nodes])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const handleToggleFullscreen = useCallback(async () => {
    if (!cardWrapRef.current) return

    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    await cardWrapRef.current.requestFullscreen()
  }, [])

  useEffect(() => {
    if (!containerRef.current) return undefined
    if (!hasGraphData) return undefined

    if (graphRef.current) return undefined

    const width = containerRef.current.clientWidth || 1200
    const graph = new Graph({
      autoFit: false,
      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
      container: containerRef.current,
      data: data as any,
      edge: {
        style: (edgeData: any) => {
          const style = RELATION_TYPE_COLORS[edgeData.relationType] || RELATION_TYPE_COLORS.DEPENDENCY
          return {
            endArrow: true,
            lineDash: style.dash || undefined,
            lineWidth: edgeData.status === '1' ? 1 : 2.2,
            opacity: edgeData.status === '1' ? 0.4 : 0.95,
            stroke: style.color
          }
        },
        type: 'polyline'
      },
      height: graphHeight,
      layout: {
        controlPoints: true,
        nodesep: 120,
        rankdir: 'LR',
        ranksep: 240,
        type: 'dagre'
      } as any,
      node: {
        style: {
          labelFontSize: 13,
          labelMaxWidth: '90%',
          labelMaxLines: 1,
          labelPlacement: 'center',
          labelTextOverflow: 'ellipsis',
          labelWordWrap: false,
          ports: [{ placement: 'left' }, { placement: 'right' }]
        },
        type: 'rect'
      },
      plugins: [
        {
          enable: (event: any) => event?.targetType === 'node',
          getContent: (_: any, items: any[]) => {
            const item = items?.[0]
            const fullLabel = `${item?.fullLabel || item?.label || ''}`
            if (!fullLabel || fullLabel.length <= 16) return ''

            return `
              <div style="max-width:360px;word-break:break-all;padding:8px 10px;line-height:1.4">
                ${fullLabel}
              </div>
            `
          },
          type: 'tooltip'
        },
        {
          containerStyle: {
            background: '#fff',
            border: '1px solid #d1d5db',
            bottom: '16px',
            left: 'auto',
            right: '16px',
            top: 'auto',
            zIndex: '9'
          },
          key: 'lineage-minimap',
          position: 'right-bottom',
          shape: (_id: string, elementType: string, element: any) => {
            if (elementType === 'node') return element
            return element.getShape('key').cloneNode()
          },
          size: [220, 132],
          type: 'minimap'
        }
      ],
      width
    } as any)

    ;(graph as any).on?.('node:click', handleNodeClick)
    graphRef.current = graph
    let disposed = false
    ;(async () => {
      await graph.render()
      if (disposed) return
      await (graph as any).fitView?.()
      isInitialViewportRef.current = false
    })()

    return () => {
      disposed = true
      ;(graph as any).off?.('node:click', handleNodeClick)
      graph.destroy()
      if (graphRef.current === graph) graphRef.current = null
      isInitialViewportRef.current = true
    }
  }, [handleNodeClick, hasGraphData])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph || !hasGraphData || isInitialViewportRef.current) return undefined

    ;(async () => {
      graph.setData(data as any)
      await graph.render()
    })()

    return undefined
  }, [data])

  useEffect(() => {
    if (!containerRef.current || !graphRef.current) return undefined

    const graph = graphRef.current
    const resize = () => {
      const width = containerRef.current?.clientWidth || 1200
      const height = containerRef.current?.clientHeight || graphHeight
      ;(graph as any).resize?.(width, height)
      ;(graph as any).fitView?.()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [graphHeight])

  if (!relations.length) {
    return (
      <div className="min-h-500px flex-center border border-gray-200 rounded-12px bg-white">
        <AEmpty description="暂无关系数据" />
      </div>
    )
  }

  return (
    <div
      ref={cardWrapRef}
      style={wrapperStyle}
    >
      <ACard
        bodyStyle={isFullscreen
          ? { boxSizing: 'border-box', height: `calc(100vh - 56px)`, padding: '12px 16px' }
          : undefined}
        extra={(
          <ATooltip title={isFullscreen ? '退出全屏' : '全屏'}>
            <AButton
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              type="text"
              onClick={handleToggleFullscreen}
            />
          </ATooltip>
        )}
        style={isFullscreen ? { borderRadius: 0, height: '100vh', width: '100vw' } : undefined}
        title={title}
      >
        <div
          ref={containerRef}
          style={{ height: isFullscreen ? '100%' : graphHeight, width: '100%' }}
        />
      </ACard>
    </div>
  )
}

export default LineageGraph

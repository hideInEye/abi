/* eslint-disable react/prop-types */
import { FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons'
import { Graph } from '@antv/g6'

import { NODE_TYPE_LABELS, RELATION_TYPE_COLORS } from './constants'
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
  count?: number
  fullLabel: string
  id: string
  label: string
  nodeType: string
  style: Record<string, any>
  toggleAction?: 'collapse' | 'expand'
  tooltipLabel?: string
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
  count?: number
  name: string
  nodeType: string
}

interface DisplayNodeMeta {
  count?: number
  isGroup?: boolean
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
  const parsed = Number(count)
  if (Number.isFinite(parsed)) return parsed
  return undefined
}

function truncateName(text: string) {
  if (text.length <= 16) return text
  return `${text.slice(0, 14)}...`
}

function resolveGroupNodeStyle(_nodeType: string) {
  return {
    // 类型节点：统一配色（数据源/数据集/表语义等类型标题）
    fill: '#eef2ff',
    labelFill: '#1d4ed8',
    lineDash: undefined,
    stroke: '#93c5fd'
  }
}

function resolveNodeStyle(nodeType: string) {
  if (nodeType === 'PHYSICAL_TABLE') {
    return {
      // 数据表节点：单独暖色背景，便于和实例区分
      fill: '#fff7ed',
      labelFill: '#7c2d12',
      lineDash: [6, 4],
      stroke: '#fb923c'
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

  // 实例节点：统一配色（接口返回 nodeName 的实例）
  return {
    fill: '#f8fafc',
    labelFill: '#1f2937',
    lineDash: undefined,
    stroke: '#60a5fa'
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

function toFiniteNumber(value: unknown, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function parseNodeSize(size: unknown) {
  if (Array.isArray(size)) {
    const width = Math.max(toFiniteNumber(size[0], 240), 1)
    const height = Math.max(toFiniteNumber(size[1], width), 1)
    return { height, width }
  }

  const scalar = Math.max(toFiniteNumber(size, 240), 1)
  return { height: scalar, width: scalar }
}

function normalizeControlPoints(points: unknown) {
  if (!Array.isArray(points)) return []

  return points
    .map(point => {
      if (Array.isArray(point) && point.length >= 2) {
        return [toFiniteNumber(point[0]), toFiniteNumber(point[1])]
      }

      if (point && typeof point === 'object') {
        const pointData = point as Record<string, unknown>
        return [toFiniteNumber(pointData.x), toFiniteNumber(pointData.y)]
      }

      return null
    })
    .filter((point): point is [number, number] => Boolean(point))
}

function isSameControlPoints(a: unknown, b: unknown, epsilon = 0.5) {
  const left = normalizeControlPoints(a)
  const right = normalizeControlPoints(b)
  if (left.length !== right.length) return false

  for (let index = 0; index < left.length; index += 1) {
    const [lx, ly] = left[index]
    const [rx, ry] = right[index]
    if (Math.abs(lx - rx) > epsilon || Math.abs(ly - ry) > epsilon) return false
  }

  return true
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

async function applyGroupedEdgeRouting(graph: Graph) {
  const edges = ((graph as any).getEdgeData?.() || []) as any[]
  if (!edges.length) return

  const nodeBoxCache = new Map<string, {
    bottom: number
    height: number
    left: number
    right: number
    top: number
    x: number
    y: number
  }>()

  const getNodeBox = (nodeId: string) => {
    if (nodeBoxCache.has(nodeId)) return nodeBoxCache.get(nodeId)!

    const position = (graph as any).getElementPosition?.(nodeId)
    if (!Array.isArray(position) || position.length < 2) return null

    const renderStyle = (graph as any).getElementRenderStyle?.(nodeId) || {}
    const { height, width } = parseNodeSize(renderStyle.size)
    const x = toFiniteNumber(position[0])
    const y = toFiniteNumber(position[1])

    const box = {
      bottom: y + height / 2,
      height,
      left: x - width / 2,
      right: x + width / 2,
      top: y - height / 2,
      x,
      y
    }
    nodeBoxCache.set(nodeId, box)
    return box
  }

  const groupedEdges = new Map<string, Array<{
    edge: any
    sourceBox: ReturnType<typeof getNodeBox>
    targetBox: ReturnType<typeof getNodeBox>
  }>>()

  edges.forEach(edge => {
    const source = `${edge.source || ''}`
    const target = `${edge.target || ''}`
    if (!source || !target || source === target) return

    const sourceBox = getNodeBox(source)
    const targetBox = getNodeBox(target)
    if (!sourceBox || !targetBox) return

    const direction = targetBox.x >= sourceBox.x ? 'R' : 'L'
    const groupKey = `${source}:${direction}`
    const bucket = groupedEdges.get(groupKey) || []
    bucket.push({ edge, sourceBox, targetBox })
    groupedEdges.set(groupKey, bucket)
  })

  const updates: Array<{ id: string; style: { controlPoints: [number, number][] } }> = []

  groupedEdges.forEach(group => {
    if (!group.length) return

    const sourceBox = group[0].sourceBox!
    const directionRight = group[0].targetBox!.x >= sourceBox.x
    const sourceBoundary = directionRight ? sourceBox.right : sourceBox.left
    const nearestTargetBoundary = directionRight
      ? Math.min(...group.map(item => item.targetBox!.left))
      : Math.max(...group.map(item => item.targetBox!.right))

    const availableSpan = directionRight
      ? nearestTargetBoundary - sourceBoundary
      : sourceBoundary - nearestTargetBoundary
    const offset = clampNumber(Math.abs(availableSpan) * 0.35, 56, 160)
    const splitX = directionRight ? sourceBoundary + offset : sourceBoundary - offset

    group.forEach(item => {
      const edgeId = `${item.edge.id || ''}`
      if (!edgeId) return

      const yGap = Math.abs(item.targetBox!.y - sourceBox.y)
      const useElbow = group.length > 1 || yGap > 1
      let controlPoints: [number, number][] = []
      if (useElbow && yGap <= 1) {
        controlPoints = [[splitX, sourceBox.y]]
      } else if (useElbow) {
        controlPoints = [[splitX, sourceBox.y], [splitX, item.targetBox!.y]]
      }

      const currentPoints = item.edge?.style?.controlPoints
      if (isSameControlPoints(currentPoints, controlPoints)) return

      updates.push({
        id: edgeId,
        style: { controlPoints }
      })
    })
  })

  if (!updates.length) return
  ;(graph as any).updateEdgeData?.(updates)
  await (graph as any).draw?.()
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
    const instanceMetaMap = new Map<string, NodeMeta>()
    const directOutMap = new Map<string, Set<string>>()
    const directInDegreeMap = new Map<string, number>()
    const directEdgeMetaMap = new Map<string, { id: string; relationType: string; status: string }>()

    const ensureNodeMeta = (payload: EnsureNodePayload) => {
      const { count, key, name, nodeType } = payload
      const exists = instanceMetaMap.get(key)
      if (exists) {
        if (!exists.name || exists.name === (NODE_TYPE_LABELS[nodeType] || '节点')) {
          exists.name = resolveNodeLabel(nodeType, name)
        }
        if (exists.count === undefined && count !== undefined && count !== null && `${count}` !== '') {
          exists.count = resolveNodeCount(count)
        }
        return
      }

      instanceMetaMap.set(key, {
        count: resolveNodeCount(count),
        name: resolveNodeLabel(nodeType, name),
        nodeType
      })
      if (!directInDegreeMap.has(key)) directInDegreeMap.set(key, 0)
    }

    const connectDirect = (payload: ConnectPayload) => {
      const { id, relationType, source, status, target } = payload
      if (!source || !target || source === target) return

      if (!directOutMap.has(source)) directOutMap.set(source, new Set())
      const sourceChildren = directOutMap.get(source)!
      if (!sourceChildren.has(target)) {
        sourceChildren.add(target)
        directInDegreeMap.set(target, (directInDegreeMap.get(target) || 0) + 1)
      }

      if (!directInDegreeMap.has(source)) directInDegreeMap.set(source, directInDegreeMap.get(source) || 0)
      directEdgeMetaMap.set(`${source}->${target}`, {
        id,
        relationType,
        status
      })
    }

    relations.forEach(item => {
      const sourceKey = `${item.source_node_type}:${item.source_node_id}`
      const targetKey = `${item.target_node_type}:${item.target_node_id}`

      const sourcePayload = {
        count: item.source_node_count,
        key: sourceKey,
        name: item.source_node_name,
        nodeType: item.source_node_type
      }
      const targetPayload = {
        count: item.target_node_count,
        key: targetKey,
        name: item.target_node_name,
        nodeType: item.target_node_type
      }

      // 数据表展示要求与业务实例同层：将 physicalTableName 拆分出的关系统一按 父实例 -> 数据表
      if (sourcePayload.nodeType === 'PHYSICAL_TABLE' && targetPayload.nodeType !== 'PHYSICAL_TABLE') {
        const temp = { ...sourcePayload }
        sourcePayload.count = targetPayload.count
        sourcePayload.key = targetPayload.key
        sourcePayload.name = targetPayload.name
        sourcePayload.nodeType = targetPayload.nodeType

        targetPayload.count = temp.count
        targetPayload.key = temp.key
        targetPayload.name = temp.name
        targetPayload.nodeType = temp.nodeType
      }

      ensureNodeMeta(sourcePayload)
      ensureNodeMeta(targetPayload)
      connectDirect({
        id: `${item.lineage_id}`,
        relationType: item.relation_type,
        source: sourcePayload.key,
        status: `${item.status ?? '0'}`,
        target: targetPayload.key
      })
    })

    const resolveRootKey = () => {
      if (!instanceMetaMap.size) return undefined

      if (rootContext?.nodeId !== undefined) {
        const exactKey = `${rootContext.nodeType}:${rootContext.nodeId}`
        if (instanceMetaMap.has(exactKey)) return exactKey
      }

      if (rootContext?.nodeType) {
        const sameTypeKeys = Array.from(instanceMetaMap.keys()).filter(key => key.startsWith(`${rootContext.nodeType}:`))
        if (sameTypeKeys.length === 1) return sameTypeKeys[0]
        const sameTypeWithChildren = sameTypeKeys.find(key => (directOutMap.get(key)?.size || 0) > 0)
        if (sameTypeWithChildren) return sameTypeWithChildren
      }

      const structuralRoot = Array.from(instanceMetaMap.keys()).find(
        key => (directInDegreeMap.get(key) || 0) === 0 && (directOutMap.get(key)?.size || 0) > 0
      )
      if (structuralRoot) return structuralRoot

      const withChildren = Array.from(instanceMetaMap.keys()).find(key => (directOutMap.get(key)?.size || 0) > 0)
      if (withChildren) return withChildren

      return instanceMetaMap.keys().next().value
    }

    const rootKey = resolveRootKey()
    if (!rootKey) return { edges: [], nodes: [] }

    if (rootContext?.nodeName && instanceMetaMap.has(rootKey)) {
      const rootMeta = instanceMetaMap.get(rootKey)!
      if (rootMeta.nodeType === rootContext.nodeType) {
        rootMeta.name = rootContext.nodeName
      }
    }

    const displayMetaMap = new Map<string, DisplayNodeMeta>()
    const displayOutMap = new Map<string, Set<string>>()
    const displayInMap = new Map<string, Set<string>>()
    const displayInDegreeMap = new Map<string, number>()
    const displayEdges: GraphEdge[] = []
    const displayEdgeSet = new Set<string>()

    const buildTypeLabel = (nodeType: string, count?: number) =>
      `${NODE_TYPE_LABELS[nodeType] || nodeType || '节点'}[${count ?? 0}]`
    const toRootTypeKey = (instanceKey: string) => `TYPE_ROOT:${instanceKey}`
    const toChildTypeKey = (parentKey: string, childType: string) => `TYPE_CHILD:${parentKey}:${childType}`

    const ensureDisplayNode = (nodeId: string, meta: DisplayNodeMeta) => {
      if (!displayMetaMap.has(nodeId)) displayMetaMap.set(nodeId, meta)
      if (!displayInDegreeMap.has(nodeId)) displayInDegreeMap.set(nodeId, displayInDegreeMap.get(nodeId) || 0)
    }

    const connectDisplay = (payload: ConnectPayload) => {
      const { id, relationType, source, status, target } = payload
      if (!source || !target || source === target) return

      if (!displayOutMap.has(source)) displayOutMap.set(source, new Set())
      const children = displayOutMap.get(source)!
      if (!children.has(target)) {
        children.add(target)
        displayInDegreeMap.set(target, (displayInDegreeMap.get(target) || 0) + 1)
      }
      if (!displayInMap.has(target)) displayInMap.set(target, new Set())
      displayInMap.get(target)!.add(source)

      const edgeKey = `${source}->${target}`
      if (displayEdgeSet.has(edgeKey)) return
      displayEdgeSet.add(edgeKey)
      displayEdges.push({ id, relationType, source, status, target })
    }

    instanceMetaMap.forEach((meta, instanceKey) => {
      ensureDisplayNode(instanceKey, {
        count: meta.count,
        isGroup: false,
        name: meta.name,
        nodeType: meta.nodeType
      })
    })

    const rootMeta = instanceMetaMap.get(rootKey)!
    const rootTypeKey = toRootTypeKey(rootKey)
    ensureDisplayNode(rootTypeKey, {
      count: rootMeta.count,
      isGroup: true,
      name: buildTypeLabel(rootMeta.nodeType, rootMeta.count),
      nodeType: rootMeta.nodeType
    })
    connectDisplay({
      id: `root-type-${rootKey}`,
      relationType: 'DEPENDENCY',
      source: rootTypeKey,
      status: '0',
      target: rootKey
    })

    directOutMap.forEach((targets, sourceKey) => {
      const childrenByType = new Map<string, string[]>()
      targets.forEach(targetKey => {
        const targetMeta = instanceMetaMap.get(targetKey)
        if (!targetMeta) return
        const bucket = childrenByType.get(targetMeta.nodeType) || []
        bucket.push(targetKey)
        childrenByType.set(targetMeta.nodeType, bucket)
      })

      childrenByType.forEach((instanceKeys, childType) => {
        if (!instanceKeys.length) return
        const typeNodeKey = toChildTypeKey(sourceKey, childType)
        ensureDisplayNode(typeNodeKey, {
          count: instanceKeys.length,
          isGroup: true,
          name: buildTypeLabel(childType, instanceKeys.length),
          nodeType: childType
        })

        const firstEdgeMeta = directEdgeMetaMap.get(`${sourceKey}->${instanceKeys[0]}`)
        connectDisplay({
          id: `instance-type-${sourceKey}-${childType}`,
          relationType: firstEdgeMeta?.relationType || 'DEPENDENCY',
          source: sourceKey,
          status: firstEdgeMeta?.status || '0',
          target: typeNodeKey
        })

        instanceKeys.forEach((targetKey, index) => {
          const edgeMeta = directEdgeMetaMap.get(`${sourceKey}->${targetKey}`)
          connectDisplay({
            id: edgeMeta?.id || `type-instance-${sourceKey}-${childType}-${index}`,
            relationType: edgeMeta?.relationType || 'DEPENDENCY',
            source: typeNodeKey,
            status: edgeMeta?.status || '0',
            target: targetKey
          })
        })
      })
    })

    const resolvedDisplayRootKey = rootTypeKey

    if (!resolvedDisplayRootKey) return { edges: [], nodes: [] }

    const getTraversalChildren = (nodeKey: string) => {
      const outChildren = Array.from(displayOutMap.get(nodeKey) || [])
      const inChildren = Array.from(displayInMap.get(nodeKey) || [])
      return Array.from(new Set([...outChildren, ...inChildren]))
    }

    const depthMap = new Map<string, number>()
    depthMap.set(resolvedDisplayRootKey, 0)
    const queue = [resolvedDisplayRootKey]
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
    const effectiveExpandLevel = Math.max(expandLevel * 2 - 1, 1)
    const isExpandedByState = (nodeKey: string) => {
      const childrenSize = getTraversalChildren(nodeKey).length
      if (!childrenSize) return false

      const depth = depthMap.get(nodeKey) || 0
      const defaultExpanded = depth < effectiveExpandLevel
      const overrideState = toggleStates[nodeKey]
      if (overrideState === 'expand') return true
      if (overrideState === 'collapse') return false
      return defaultExpanded
    }

    const visibleKeys = new Set<string>([resolvedDisplayRootKey])
    const bfsQueue = [resolvedDisplayRootKey]
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
      const meta = displayMetaMap.get(key)!
      const childrenSize = getTraversalChildren(key).length
      const isExpanded = isExpandedByState(key)
      const canToggle = childrenSize > 0
      const actionLabel = isExpanded ? '[-]' : '[+]'
      const baseLabel = meta.isGroup ? meta.name : truncateName(meta.name)
      const fullBaseLabel = meta.name
      const displayLabel = canToggle ? `${baseLabel} ${actionLabel}` : baseLabel
      const fullLabel = canToggle ? `${fullBaseLabel} ${actionLabel}` : fullBaseLabel
      const isNameTruncated = !meta.isGroup && meta.name.length > 16
      const nodeStyle = meta.isGroup ? resolveGroupNodeStyle(meta.nodeType) : resolveNodeStyle(meta.nodeType)
      const toggleAction = isExpanded ? 'collapse' : 'expand'

      return {
        canToggle,
        count: meta.count,
        fullLabel,
        id: key,
        label: displayLabel,
        nodeType: meta.nodeType,
        style: {
          fill: nodeStyle.fill,
          labelFill: nodeStyle.labelFill,
          labelFontWeight: meta.isGroup ? 500 : 600,
          labelText: displayLabel,
          lineDash: nodeStyle.lineDash,
          size: [240, 42],
          stroke: nodeStyle.stroke
        },
        toggleAction: canToggle ? toggleAction : undefined,
        tooltipLabel: isNameTruncated ? fullLabel : undefined
      }
    })

    const visibleEdges = displayEdges.filter(edge => visibleKeys.has(edge.source) && visibleKeys.has(edge.target))
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
    containerRef.current.style.opacity = '0'
    const graph = new Graph({
      animation: false,
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
            radius: 0,
            router: { padding: 12, type: 'orth' },
            stroke: style.color,
            zIndex: 0
          }
        },
        type: 'polyline'
      },
      height: graphHeight,
      layout: {
        animation: false,
        controlPoints: false,
        nodesep: 120,
        rankdir: 'LR',
        ranksep: 100,
        type: 'dagre'
      } as any,
      node: {
        style: {
          labelFontSize: 13,
          labelFontWeight: 600,
          labelMaxWidth: '90%',
          labelMaxLines: 1,
          labelPlacement: 'center',
          labelTextOverflow: 'ellipsis',
          labelWordWrap: false,
          zIndex: 2
        },
        type: 'rect'
      },
      plugins: [
        {
          enable: (event: any) => event?.targetType === 'node',
          getContent: (_: any, items: any[]) => {
            const item = items?.[0]
            const tooltipLabel = `${item?.tooltipLabel || ''}`
            if (!tooltipLabel) return ''

            return `
              <div style="max-width:360px;word-break:break-all;padding:8px 10px;line-height:1.4">
                ${tooltipLabel.replace(/\n/g, '<br/>')}
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
      try {
        await graph.render()
        if (disposed) return
        await applyGroupedEdgeRouting(graph)
        if (disposed) return
        await (graph as any).fitView?.()
        isInitialViewportRef.current = false
      } finally {
        if (!disposed && containerRef.current) containerRef.current.style.opacity = '1'
      }
    })()

    return () => {
      disposed = true
      if (containerRef.current) containerRef.current.style.opacity = '1'
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
      if (containerRef.current) containerRef.current.style.opacity = '0'
      try {
        graph.setData(data as any)
        await graph.render()
        await applyGroupedEdgeRouting(graph)
      } finally {
        if (containerRef.current) containerRef.current.style.opacity = '1'
      }
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

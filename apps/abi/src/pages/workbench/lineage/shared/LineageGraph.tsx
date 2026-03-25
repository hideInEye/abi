/* eslint-disable react/prop-types */
import { Graph } from '@antv/g6'

import { NODE_TYPE_COLORS, NODE_TYPE_LABELS, RELATION_TYPE_COLORS, RELATION_TYPE_LABELS } from './constants'
import type { LineageNode, LineageRelation } from './types'

interface Props {
  onNodeClick?: (node: LineageNode) => void
  relations: LineageRelation[]
}

function hasChinese(text?: string) {
  if (!text) return false
  return /[\u4e00-\u9fa5]/.test(text)
}

function resolveNodeLabel(nodeType: string, nodeId: number | string, nodeName?: string) {
  const typeLabel = NODE_TYPE_LABELS[nodeType] || '节点'
  const cleanName = `${nodeName || ''}`.trim()
  if (cleanName && hasChinese(cleanName)) return cleanName
  return `${typeLabel}-${nodeId}`
}

function getDisplayLength(text: string) {
  return Array.from(text).reduce((total, char) => {
    return total + (/[\u4e00-\u9fa5]/.test(char) ? 2 : 1)
  }, 0)
}

function createNodeSize(label: string): [number, number] {
  // 至少保证5个中文字符 + 内边距的可视宽度
  const minWidth = 170
  const maxWidth = 320
  const displayLength = getDisplayLength(label)
  const width = Math.min(maxWidth, Math.max(minWidth, displayLength * 10 + 40))
  const lineCapacity = Math.max(1, Math.floor((width - 34) / 14))
  const lineCount = Math.max(1, Math.ceil(displayLength / lineCapacity))
  const height = Math.min(92, Math.max(46, 24 + lineCount * 18))
  return [width, height]
}

const LineageGraph: React.FC<Props> = ({ onNodeClick, relations }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<Graph | null>(null)
  const onNodeClickRef = useRef<Props['onNodeClick']>(onNodeClick)

  useEffect(() => {
    onNodeClickRef.current = onNodeClick
  }, [onNodeClick])

  const data = useMemo(() => {
    const nodesMap = new Map<string, any>()
    const edges: any[] = []

    relations.forEach(item => {
      const sourceKey = `${item.source_node_type}:${item.source_node_id}`
      const targetKey = `${item.target_node_type}:${item.target_node_id}`
      const sourceLabel = resolveNodeLabel(item.source_node_type, item.source_node_id, item.source_node_name)
      const targetLabel = resolveNodeLabel(item.target_node_type, item.target_node_id, item.target_node_name)

      if (!nodesMap.has(sourceKey)) {
        const nodeSize = createNodeSize(sourceLabel)
        nodesMap.set(sourceKey, {
          id: sourceKey,
          label: sourceLabel,
          nodeType: item.source_node_type,
          style: {
            labelText: sourceLabel,
            size: nodeSize
          }
        })
      }
      if (!nodesMap.has(targetKey)) {
        const nodeSize = createNodeSize(targetLabel)
        nodesMap.set(targetKey, {
          id: targetKey,
          label: targetLabel,
          nodeType: item.target_node_type,
          style: {
            labelText: targetLabel,
            size: nodeSize
          }
        })
      }

      const relationStyle = RELATION_TYPE_COLORS[item.relation_type] || RELATION_TYPE_COLORS.DEPENDENCY
      edges.push({
        id: `${item.lineage_id}`,
        relationType: item.relation_type,
        source: sourceKey,
        status: item.status,
        target: targetKey,
        ...relationStyle
      })
    })

    const nodes = Array.from(nodesMap.values()).map(node => {
      const color = NODE_TYPE_COLORS[node.nodeType] || '#64748b'
      return {
        ...node,
        style: {
          ...node.style,
          fill: `${color}1A`,
          labelFill: '#0f172a',
          lineWidth: 1.4,
          radius: 10,
          shadowBlur: 14,
          shadowColor: `${color}33`,
          stroke: color
        }
      }
    })

    return { edges, nodes }
  }, [relations])

  useEffect(() => {
    if (!containerRef.current || !data.nodes.length) {
      graphRef.current?.destroy()
      graphRef.current = null
      return () => {}
    }

    graphRef.current?.destroy()
    const graph = new Graph({
      autoFit: 'view',
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
        type: 'cubic-horizontal'
      },
      height: 560,
      layout: {
        controlPoints: true,
        nodesep: 120,
        rankdir: 'LR',
        ranksep: 240,
        type: 'dagre'
      } as any,
      node: {
        style: {
          labelFontSize: 12,
          labelMaxWidth: '92%',
          labelMaxLines: 3,
          labelPlacement: 'center',
          labelTextOverflow: 'clip',
          labelWordWrap: true,
          ports: [{ placement: 'left' }, { placement: 'right' }]
        },
        type: 'rect'
      },
      plugins: [
        {
          enable: (event: any) => event?.targetType === 'node',
          getContent: (_: any, items: any[]) => {
            const item = items?.[0]
            const label = item?.style?.labelText || item?.label
            if (!label) return ''

            return `
              <div style="padding:8px 10px;line-height:1.4">
                <div style="font-weight:600;color:#111827;margin-bottom:4px">${label}</div>
                <div style="color:#4b5563">类型：${NODE_TYPE_LABELS[item.nodeType] || item.nodeType || '-'}</div>
              </div>
            `
          },
          type: 'tooltip'
        }
      ]
    } as any)

    graph.on('node:click', event => {
      const fullId = `${event.target?.id || ''}`
      const [type, ...rest] = fullId.split(':')
      onNodeClickRef.current?.({
        id: rest.join(':'),
        label: event.target?.attributes?.labelText || event.target?.attributes?.label,
        type
      })
    })

    graph.render()
    graph.zoomTo(0.5)
    graphRef.current = graph

    return () => {
      graph.destroy()
      graphRef.current = null
    }
  }, [data])

  if (!relations.length) {
    return (
      <div className="min-h-500px flex-center border border-gray-200 rounded-12px bg-white">
        <AEmpty description="暂无关系数据" />
      </div>
    )
  }

  return (
    <ACard
      title="逻辑关系图"
      extra={
        <ASpace size={12}>
          {Object.entries(RELATION_TYPE_LABELS).map(([value, label]) => {
            const style = RELATION_TYPE_COLORS[value]
            return (
              <ASpace
                key={value}
                size={6}
              >
                <span
                  style={{
                    borderTop: style?.dash ? `2px dashed ${style.color}` : `2px solid ${style.color}`,
                    display: 'inline-block',
                    width: 24
                  }}
                />
                <span style={{ color: '#4b5563', fontSize: 12 }}>{label}</span>
              </ASpace>
            )
          })}
        </ASpace>
      }
    >
      <div
        ref={containerRef}
        style={{ width: '100%' }}
      />
    </ACard>
  )
}

export default LineageGraph

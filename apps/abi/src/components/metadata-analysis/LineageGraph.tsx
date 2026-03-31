/* eslint-disable react/prop-types */
import { Graph } from '@antv/g6'

import { NODE_TYPE_COLORS, NODE_TYPE_LABELS, RELATION_TYPE_COLORS } from './constants'
import type { LineageRelation } from './types'

interface Props {
  relations: LineageRelation[]
  title?: string
}

function resolveNodeLabel(nodeType: string, nodeName?: string) {
  const typeLabel = NODE_TYPE_LABELS[nodeType] || '节点'
  const cleanName = `${nodeName || ''}`.trim()
  if (cleanName) return cleanName
  return typeLabel
}

function truncateLabel(text: string) {
  if (text.length <= 14) return text
  return `${text.slice(0, 12)}...`
}

const LineageGraph: React.FC<Props> = ({ relations, title = '逻辑关系图' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<Graph | null>(null)

  const data = useMemo(() => {
    const nodesMap = new Map<string, any>()
    const edges: any[] = []

    relations.forEach(item => {
      const sourceKey = `${item.source_node_type}:${item.source_node_id}`
      const targetKey = `${item.target_node_type}:${item.target_node_id}`
      const sourceLabel = resolveNodeLabel(item.source_node_type, item.source_node_name)
      const targetLabel = resolveNodeLabel(item.target_node_type, item.target_node_name)

      if (!nodesMap.has(sourceKey)) {
        const isSourceRoot = item.source_node_type === 'DATA_SOURCE'
        nodesMap.set(sourceKey, {
          id: sourceKey,
          label: sourceLabel,
          fullLabel: sourceLabel,
          nodeType: item.source_node_type,
          style: {
            fill: isSourceRoot ? '#3388ff' : '#ffffff',
            labelText: truncateLabel(sourceLabel),
            size: [190, 32],
            stroke: isSourceRoot ? '#ffffff' : '#3388ff'
          }
        })
      }

      if (!nodesMap.has(targetKey)) {
        const isTargetRoot = item.target_node_type === 'DATA_SOURCE'
        nodesMap.set(targetKey, {
          id: targetKey,
          label: targetLabel,
          fullLabel: targetLabel,
          nodeType: item.target_node_type,
          style: {
            fill: isTargetRoot ? '#3388ff' : '#ffffff',
            labelText: truncateLabel(targetLabel),
            size: [190, 32],
            stroke: isTargetRoot ? '#ffffff' : '#3388ff'
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
      const isDataSource = node.nodeType === 'DATA_SOURCE'
      return {
        ...node,
        style: {
          ...node.style,
          fill: node.style?.fill || `${color}12`,
          labelFill: isDataSource ? '#ffffff' : '#333d46',
          lineWidth: 1.4,
          radius: 4,
          shadowBlur: 0,
          stroke: node.style?.stroke || color
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
        type: 'polyline'
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
            if (!fullLabel || fullLabel.length <= 14) return ''

            return `
              <div style="max-width:360px;word-break:break-all;padding:8px 10px;line-height:1.4">
                ${fullLabel}
              </div>
            `
          },
          type: 'tooltip'
        }
      ]
    } as any)

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
    <ACard title={title}>
      <div
        ref={containerRef}
        style={{ width: '100%' }}
      />
    </ACard>
  )
}

export default LineageGraph

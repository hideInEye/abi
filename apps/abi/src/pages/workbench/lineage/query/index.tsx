/* eslint-disable react/prop-types */
import { Segmented, message } from 'antd'

import { queryLineageRelationList } from '@/service/api'

import { normalizeRelations } from '../shared/adapter'
import LineageGraph from '../shared/LineageGraph'
import NodeDetailDrawer from '../shared/NodeDetailDrawer'
import RelationTable from '../shared/RelationTable'
import type { LineageNode, LineageRelation } from '../shared/types'

const relationTypeOptions = [
  { label: '依赖', value: 'DEPENDENCY' },
  { label: '派生', value: 'DERIVED' },
  { label: '拆解', value: 'DECOMPOSION' },
  { label: '映射', value: 'MAPPED_TO' }
]

const directionOptions = [
  { label: '双向', value: 'BIDIRECTIONAL' },
  { label: '上游', value: 'UPSTREAM' },
  { label: '下游', value: 'DOWNSTREAM' }
]

const viewOptions = [
  { label: '逻辑关系图', value: 'graph' },
  { label: '关系表格', value: 'table' }
] as const

export function Component() {
  const [loading, setLoading] = useState(false)
  const [allRelations, setAllRelations] = useState<LineageRelation[]>([])
  const [viewMode, setViewMode] = useState<(typeof viewOptions)[number]['value']>('graph')
  const [selectedNode, setSelectedNode] = useState<LineageNode | null>(null)
  const [filters, setFilters] = useState({
    direction: 'BIDIRECTIONAL',
    relationType: undefined as string | undefined,
    sourceId: '',
    status: undefined as '0' | '1' | undefined
  })

  const localSpaceId = Number(localStorage.getItem('spaceId'))
  const spaceId = Number.isFinite(localSpaceId) && localSpaceId > 0 ? localSpaceId : undefined

  const queryRelations = useCallback(async () => {
    setLoading(true)
    try {
      const response = await queryLineageRelationList({ spaceId })
      const payload = response?.data
      if (payload?.success === false) {
        throw new Error(payload?.errMsg || payload?.Code || '查询失败')
      }
      setAllRelations(normalizeRelations(payload?.data ?? payload))
    } catch (error: any) {
      setAllRelations([])
      message.error(error?.message || '查询失败，请检查筛选条件')
    } finally {
      setLoading(false)
    }
  }, [spaceId])

  useEffect(() => {
    queryRelations()
  }, [queryRelations])

  const handleNodeClick = useCallback((node: LineageNode) => {
    setSelectedNode(node)
  }, [])

  const handleNodeDrawerClose = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const relations = useMemo(() => {
    const sourceId = filters.sourceId.trim()
    return allRelations.filter(item => {
      if (filters.relationType && item.relation_type !== filters.relationType) return false
      if (filters.status && item.status !== filters.status) return false

      if (!sourceId) return true

      if (filters.direction === 'UPSTREAM') {
        return `${item.target_node_id}` === sourceId
      }
      if (filters.direction === 'DOWNSTREAM') {
        return `${item.source_node_id}` === sourceId
      }
      return `${item.source_node_id}` === sourceId || `${item.target_node_id}` === sourceId
    })
  }, [allRelations, filters.direction, filters.relationType, filters.sourceId, filters.status])

  return (
    <div className="flex flex-col gap-16px p-16px">
      <ACard title="血缘查询中心">
        <div className="flex flex-wrap items-center gap-12px">
          <AInput
            className="w-220px"
            placeholder="节点ID"
            value={filters.sourceId}
            onChange={event => setFilters(prev => ({ ...prev, sourceId: event.target.value }))}
          />
          {/* <ASelect
            allowClear
            className="w-140px"
            options={directionOptions}
            placeholder="关系方向"
            value={filters.direction}
            onChange={value => setFilters(prev => ({ ...prev, direction: value }))}
          />
          <ASelect
            allowClear
            className="w-140px"
            options={relationTypeOptions}
            placeholder="关系类型"
            value={filters.relationType}
            onChange={value => setFilters(prev => ({ ...prev, relationType: value }))}
          />
          <ASelect
            allowClear
            className="w-120px"
            options={[
              { label: '启用', value: '0' },
              { label: '关闭', value: '1' }
            ]}
            placeholder="状态"
            value={filters.status}
            onChange={value => setFilters(prev => ({ ...prev, status: value }))}
          /> */}
          <AButton loading={loading} type="primary" onClick={queryRelations}>
            查询
          </AButton>
          <Segmented
            className="ml-auto"
            options={viewOptions as any}
            value={viewMode}
            onChange={value => setViewMode(value as (typeof viewOptions)[number]['value'])}
          />
        </div>
      </ACard>

      {viewMode === 'graph' ? (
        <LineageGraph relations={relations} onNodeClick={handleNodeClick} />
      ) : (
        <RelationTable relations={relations} onNodeClick={handleNodeClick} />
      )}

      <NodeDetailDrawer
        node={selectedNode}
        open={Boolean(selectedNode)}
        relations={relations}
        onClose={handleNodeDrawerClose}
      />
    </div>
  )
}

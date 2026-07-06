/* eslint-disable react/prop-types */
import { ApartmentOutlined, BranchesOutlined, CloseOutlined, NodeIndexOutlined, PartitionOutlined } from '@ant-design/icons'
import { Segmented, message } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'

import { queryLineageRelationList } from '@/service/api'

import LineageGraph from './LineageGraph'
import LineageTree from './LineageTree'
import { normalizeRelations } from './adapter'
import { NODE_TYPE_LABELS } from './constants'
import type { AnalysisMode, AnalysisViewMode, LineageRelation, MetadataAnalysisContext } from './types'

interface Props {
  context?: MetadataAnalysisContext | null
  onClose: () => void
  open: boolean
}

const analysisOptions = [
  { icon: <NodeIndexOutlined />, label: '血缘分析', value: 'lineage' },
  { icon: <PartitionOutlined />, label: '影响分析', value: 'impact' },
] as const

const viewOptions = [
  { icon: <ApartmentOutlined />, label: '关系图', value: 'graph' },
  { icon: <BranchesOutlined />, label: '树形图', value: 'tree' },
] as const

function normalizeId(value: string | number | undefined) {
  if (value === undefined || value === null || `${value}` === '') return undefined
  return `${value}`
}

function toApiNodeType(value?: string) {
  if (!value) return value
  return value === 'DATA_SOURCE' ? 'Data_Source' : value
}

function unwrapLineageResponse(raw: any) {
  if (!raw) return raw
  return raw?.data ?? raw
}

function resolveSpaceId(spaceId?: number) {
  if (Number.isFinite(spaceId) && Number(spaceId) > 0) return Number(spaceId)
  const localSpaceId = Number(localStorage.getItem('spaceId'))
  if (Number.isFinite(localSpaceId) && localSpaceId > 0) return localSpaceId
  return undefined
}

const MetadataAnalysisDrawer: React.FC<Props> = ({ context, onClose, open }) => {
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('lineage')
  const [viewMode, setViewMode] = useState<AnalysisViewMode>('graph')
  const [loading, setLoading] = useState(false)
  const [relations, setRelations] = useState<LineageRelation[]>([])

  const fetchRelations = useCallback(async () => {
    if (!open || !context) return

    setLoading(true)
    try {
      const spaceId = resolveSpaceId(context.spaceId)
      if (spaceId === undefined) {
        throw new Error('未获取到空间ID')
      }

      const nodeType = toApiNodeType(context.nodeType)
      const params: Record<string, any> = {
        spaceId,
      }
      const nodeId = normalizeId(context.nodeId)

      if (analysisMode === 'lineage') {
        params.targetNodeType = nodeType
        if (nodeId !== undefined) params.targetNodeId = nodeId
      } else {
        params.sourceNodeType = nodeType
        if (nodeId !== undefined) params.sourceNodeId = nodeId
      }

      const response = await queryLineageRelationList(params)
      const payload = unwrapLineageResponse(response)
      if (payload?.success === false) {
        throw new Error(payload?.errMsg || payload?.Code || '查询失败')
      }
      setRelations(normalizeRelations(payload))
    } catch (error: any) {
      setRelations([])
      message.error(error?.message || '查询失败')
    } finally {
      setLoading(false)
    }
  }, [analysisMode, context, open])

  useEffect(() => {
    if (!open) return
    fetchRelations()
  }, [fetchRelations, open])

  useEffect(() => {
    if (!open) {
      setViewMode('graph')
      setAnalysisMode('lineage')
      setRelations([])
    }
  }, [open])

  const nodeTypeLabel = NODE_TYPE_LABELS[context?.nodeType || ''] || context?.nodeType || '-'
  const relationCount = relations.length

  return (
    <CommonDrawer
      className="ma-drawer"
      destroyOnClose
      open={open}
      styles={{
        body: {
          overflow: viewMode === 'graph' ? 'hidden' : 'auto',
          padding: 0,
        },
      }}
      icon={<NodeIndexOutlined />}
      title="元数据分析"
      width={1280}
      onClose={onClose}
    >
      {/* Toolbar */}
      <div className="ma-toolbar">
        <div className="ma-toolbar-left">
          <div className="ma-node-badge">
            <span className="ma-node-badge-name">{context?.nodeName || '-'}</span>
            <span className="ma-node-badge-type">{nodeTypeLabel}</span>
          </div>
          {relationCount > 0 && <span className="ma-relation-count">共 {relationCount} 条关系</span>}
        </div>
        <div className="ma-toolbar-right">
          <div className="ma-control-group">
            <span className="ma-control-label">分析类型</span>
            <Segmented options={analysisOptions as any} value={analysisMode} onChange={(value) => setAnalysisMode(value as AnalysisMode)} size="small" />
          </div>
          <div className="ma-control-divider" />
          <div className="ma-control-group">
            <span className="ma-control-label">展示方式</span>
            <Segmented options={viewOptions as any} value={viewMode} onChange={(value) => setViewMode(value as AnalysisViewMode)} size="small" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="ma-content">
        <ASpin spinning={loading}>
          {relations.length === 0 && !loading ? (
            <div className="ma-empty">
              <NodeIndexOutlined className="ma-empty-icon" />
              <p className="ma-empty-text">暂无血缘关系数据</p>
              <p className="ma-empty-hint">当前节点未关联任何上下游数据</p>
            </div>
          ) : viewMode === 'graph' ? (
            <LineageGraph defaultExpandLevel={2} mode={analysisMode} relations={relations} rootContext={context} />
          ) : (
            <LineageTree mode={analysisMode} relations={relations} rootContext={context} />
          )}
        </ASpin>
      </div>
    </CommonDrawer>
  )
}

export default MetadataAnalysisDrawer

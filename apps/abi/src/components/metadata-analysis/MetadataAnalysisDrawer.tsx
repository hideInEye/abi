/* eslint-disable react/prop-types */
import { Segmented, message } from 'antd'

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
  { label: '血缘分析', value: 'lineage' },
  { label: '影响性分析', value: 'impact' }
] as const

const viewOptions = [
  { label: '逻辑关系图', value: 'graph' },
  { label: '树形展示', value: 'tree' }
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
        spaceId
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

  return (
    <ADrawer
      destroyOnClose
      open={open}
      title="元数据分析"
      width={1280}
      onClose={onClose}
    >
      <div className="mb-12px flex items-center justify-between">
        <div className="flex items-center gap-8px text-14px text-[#4b5563]">
          <span className="font-600 text-[#111827]">{context?.nodeName || '-'}</span>
          <span>({NODE_TYPE_LABELS[context?.nodeType || ''] || context?.nodeType || '-'})</span>
        </div>
        <ASpace size={12}>
          <Segmented
            options={analysisOptions as any}
            value={analysisMode}
            onChange={value => setAnalysisMode(value as AnalysisMode)}
          />
          <Segmented
            options={viewOptions as any}
            value={viewMode}
            onChange={value => setViewMode(value as AnalysisViewMode)}
          />
        </ASpace>
      </div>

      <ASpin spinning={loading}>
        {viewMode === 'graph' ? (
          <LineageGraph relations={relations} />
        ) : (
          <LineageTree
            mode={analysisMode}
            relations={relations}
            rootContext={context}
          />
        )}
      </ASpin>
    </ADrawer>
  )
}

export default MetadataAnalysisDrawer

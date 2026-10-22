/* eslint-disable react/prop-types */
import { ApartmentOutlined, BranchesOutlined, NodeIndexOutlined, PartitionOutlined } from '@ant-design/icons'
import { Segmented, message } from 'antd'
import { useEffect, useState } from 'react'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'

import LineageGraph from './LineageGraph'
import LineageTree from './LineageTree'
import { NODE_TYPE_LABELS } from './constants'
import { queryMetadataRelations } from './request'
import type { AnalysisMode, AnalysisViewMode, LineageRelation, MetadataAnalysisDrawerProps } from './types'

const analysisOptions = [
  { icon: <NodeIndexOutlined />, label: '血缘分析', value: 'lineage' },
  { icon: <PartitionOutlined />, label: '影响分析', value: 'impact' },
] as const

const viewOptions = [
  { icon: <ApartmentOutlined />, label: '关系图', value: 'graph' },
  { icon: <BranchesOutlined />, label: '树形图', value: 'tree' },
] as const

const MetadataAnalysisDrawer: React.FC<MetadataAnalysisDrawerProps> = ({ context, onClose, open }) => {
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('lineage')
  const [viewMode, setViewMode] = useState<AnalysisViewMode>('graph')
  const [loading, setLoading] = useState(false)
  const [relations, setRelations] = useState<LineageRelation[]>([])

  useEffect(() => {
    if (!open || !context) return
    let active = true
    setLoading(true)
    setRelations([])
    const fetchRelations = async () => {
      try {
        const nextRelations = await queryMetadataRelations(context, analysisMode, localStorage.getItem('spaceId'))
        if (active) setRelations(nextRelations)
      } catch (error: any) {
        if (active) message.error(error?.message || '查询失败')
      } finally {
        if (active) setLoading(false)
      }
    }
    void fetchRelations()
    // 切换记录、分析方向或关闭后，旧请求不能覆盖新节点的分析结果。
    return () => { active = false }
  }, [analysisMode, context, open])

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

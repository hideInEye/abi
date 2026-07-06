/* eslint-disable react/prop-types */
import { CloseOutlined, NodeIndexOutlined } from '@ant-design/icons'

import { buildNodeDetail } from '@/components/metadata-analysis/adapter'
import { RELATION_TYPE_LABELS, STATUS_LABELS } from '@/components/metadata-analysis/constants'
import type { LineageNode, LineageRelation } from '@/components/metadata-analysis/types'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'

interface Props {
  node: LineageNode | null
  onClose: () => void
  open: boolean
  relations: LineageRelation[]
}

const NodeDetailDrawer: React.FC<Props> = ({ node, onClose, open, relations }) => {
  const detail = useMemo(() => {
    if (!node) return null
    return buildNodeDetail(relations, node.id, node.type)
  }, [node, relations])

  const columns = [
    {
      dataIndex: 'source_node_name',
      key: 'source',
      render: (_: string, row: LineageRelation) => (
        <ATooltip title={row.source_node_name || '-'}>
          <span className="ma-cell-ellipsis">{row.source_node_name || '-'}</span>
        </ATooltip>
      ),
      title: '源节点',
    },
    {
      dataIndex: 'target_node_name',
      key: 'target',
      render: (_: string, row: LineageRelation) => (
        <ATooltip title={row.target_node_name || '-'}>
          <span className="ma-cell-ellipsis">{row.target_node_name || '-'}</span>
        </ATooltip>
      ),
      title: '目标节点',
    },
    {
      dataIndex: 'relation_type',
      key: 'relation_type',
      render: (value: string) => RELATION_TYPE_LABELS[value] || value,
      title: '关系类型',
    },
    {
      dataIndex: 'status',
      key: 'status',
      render: (value: '0' | '1') => <ATag color={value === '0' ? 'green' : 'default'}>{STATUS_LABELS[value]}</ATag>,
      title: '状态',
    },
  ]

  return (
    <CommonDrawer className="ma-node-drawer" open={open} icon={<NodeIndexOutlined />} title="节点详情" width={720} onClose={onClose}>
      {!node || !detail ? (
        <div className="ma-panel">
          <AEmpty description="暂无数据" image={AEmpty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <div className="ma-node-detail">
          <div className="ma-node-info-cards">
            <div className="ma-node-info-card">
              <span className="ma-node-info-label">节点类型</span>
              <span className="ma-node-info-value">{node.type}</span>
            </div>
            <div className="ma-node-info-card ma-node-info-card-wide">
              <span className="ma-node-info-label">节点名称</span>
              <span className="ma-node-info-value" title={node.label || '-'}>
                {node.label || '-'}
              </span>
            </div>
            <div className="ma-node-info-card ma-node-info-card-stat">
              <span className="ma-node-info-stat-num" style={{ color: '#5b7cf7' }}>
                {detail.inCount}
              </span>
              <span className="ma-node-info-label">上游关系</span>
            </div>
            <div className="ma-node-info-card ma-node-info-card-stat">
              <span className="ma-node-info-stat-num" style={{ color: '#059669' }}>
                {detail.outCount}
              </span>
              <span className="ma-node-info-label">下游关系</span>
            </div>
          </div>

          <ATabs
            className="ma-node-tabs"
            items={[
              {
                children: (
                  <div
                    style={{
                      border: '1px solid rgba(130,140,200,0.18)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                    }}
                  >
                    <ATable<LineageRelation>
                      columns={columns}
                      dataSource={detail.inboundRelations}
                      pagination={{ pageSize: 5, showSizeChanger: false }}
                      rowKey="lineage_id"
                      size="small"
                      className="abi-std-table"
                    />
                  </div>
                ),
                key: 'inbound',
                label: `上游关系 (${detail.inCount})`,
              },
              {
                children: (
                  <div
                    style={{
                      border: '1px solid rgba(130,140,200,0.18)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                    }}
                  >
                    <ATable<LineageRelation>
                      columns={columns}
                      dataSource={detail.outboundRelations}
                      pagination={{ pageSize: 5, showSizeChanger: false }}
                      rowKey="lineage_id"
                      size="small"
                      className="abi-std-table"
                    />
                  </div>
                ),
                key: 'outbound',
                label: `下游关系 (${detail.outCount})`,
              },
            ]}
          />
        </div>
      )}
    </CommonDrawer>
  )
}

export default NodeDetailDrawer

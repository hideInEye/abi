/* eslint-disable react/prop-types */
import { buildNodeDetail } from './adapter'
import { RELATION_TYPE_LABELS, STATUS_LABELS } from './constants'
import type { LineageNode, LineageRelation } from './types'

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
      render: (_: string, row: LineageRelation) => row.source_node_name || row.source_node_id,
      title: '源节点'
    },
    {
      dataIndex: 'target_node_name',
      key: 'target',
      render: (_: string, row: LineageRelation) => row.target_node_name || row.target_node_id,
      title: '目标节点'
    },
    {
      dataIndex: 'relation_type',
      key: 'relation_type',
      render: (value: string) => RELATION_TYPE_LABELS[value] || value,
      title: '关系类型'
    },
    {
      dataIndex: 'status',
      key: 'status',
      render: (value: '0' | '1') => <ATag color={value === '0' ? 'green' : 'default'}>{STATUS_LABELS[value]}</ATag>,
      title: '状态'
    }
  ]

  return (
    <ADrawer
      open={open}
      title="节点详情"
      width={720}
      onClose={onClose}
    >
      {!node || !detail ? (
        <AEmpty description="暂无数据" />
      ) : (
        <ASpace
          direction="vertical"
          size={16}
          style={{ width: '100%' }}
        >
          <ADescriptions
            bordered
            column={2}
            items={[
              { children: `${node.id}`, key: 'id', label: '节点ID' },
              { children: node.type, key: 'type', label: '节点类型' },
              { children: node.label || '-', key: 'name', label: '节点名称' },
              { children: detail.inCount, key: 'inCount', label: '上游关系数' },
              { children: detail.outCount, key: 'outCount', label: '下游关系数' }
            ]}
            size="small"
          />
          <ATabs
            items={[
              {
                children: (
                  <ATable<LineageRelation>
                    columns={columns}
                    dataSource={detail.inboundRelations}
                    pagination={{ pageSize: 6 }}
                    rowKey="lineage_id"
                    size="small"
                  />
                ),
                key: 'inbound',
                label: `上游关系 (${detail.inCount})`
              },
              {
                children: (
                  <ATable<LineageRelation>
                    columns={columns}
                    dataSource={detail.outboundRelations}
                    pagination={{ pageSize: 6 }}
                    rowKey="lineage_id"
                    size="small"
                  />
                ),
                key: 'outbound',
                label: `下游关系 (${detail.outCount})`
              }
            ]}
          />
        </ASpace>
      )}
    </ADrawer>
  )
}

export default NodeDetailDrawer

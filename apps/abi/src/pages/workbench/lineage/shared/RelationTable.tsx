/* eslint-disable react/prop-types */
import type { TableColumnsType } from 'antd'

import { RELATION_TYPE_LABELS, STATUS_LABELS } from './constants'
import type { LineageNode, LineageRelation } from './types'

interface Props {
  onNodeClick?: (node: LineageNode) => void
  relations: LineageRelation[]
  title?: string
}

const RelationTable: React.FC<Props> = ({ onNodeClick, relations, title = '关系列表' }) => {
  const [keyword, setKeyword] = useState('')

  const filteredData = useMemo(() => {
    const value = keyword.trim().toLowerCase()
    if (!value) return relations
    return relations.filter(item => {
      const source = `${item.source_node_name || ''}${item.source_node_id}`.toLowerCase()
      const target = `${item.target_node_name || ''}${item.target_node_id}`.toLowerCase()
      return source.includes(value) || target.includes(value)
    })
  }, [keyword, relations])

  const columns: TableColumnsType<LineageRelation> = [
    {
      dataIndex: 'source_node_name',
      minWidth: 160,
      render: (_, row) => (
        <AButton
          type="link"
          onClick={() => onNodeClick?.({ id: row.source_node_id, label: row.source_node_name, type: row.source_node_type })}
        >
          {row.source_node_name || row.source_node_id}
        </AButton>
      ),
      title: '源节点'
    },
    {
      dataIndex: 'source_node_type',
      minWidth: 120,
      title: '源节点类型'
    },
    {
      dataIndex: 'target_node_name',
      minWidth: 160,
      render: (_, row) => (
        <AButton
          type="link"
          onClick={() => onNodeClick?.({ id: row.target_node_id, label: row.target_node_name, type: row.target_node_type })}
        >
          {row.target_node_name || row.target_node_id}
        </AButton>
      ),
      title: '目标节点'
    },
    {
      dataIndex: 'target_node_type',
      minWidth: 120,
      title: '目标节点类型'
    },
    {
      dataIndex: 'relation_type',
      minWidth: 100,
      render: (value: string) => RELATION_TYPE_LABELS[value] || value,
      title: '关系类型'
    },
    {
      dataIndex: 'status',
      minWidth: 100,
      render: (value: '0' | '1') => <ATag color={value === '0' ? 'green' : 'default'}>{STATUS_LABELS[value]}</ATag>,
      title: '状态'
    },
    {
      dataIndex: 'update_time',
      minWidth: 160,
      title: '更新时间'
    },
    {
      dataIndex: 'remark',
      minWidth: 180,
      title: '备注'
    }
  ]

  return (
    <ACard
      title={title}
      extra={
        <AInput
          allowClear
          placeholder="搜索节点名称/ID"
          style={{ width: 240 }}
          value={keyword}
          onChange={event => setKeyword(event.target.value)}
        />
      }
    >
      <ATable<LineageRelation>
        columns={columns}
        dataSource={filteredData}
        pagination={{ showSizeChanger: true }}
        rowKey="lineage_id"
        scroll={{ x: 1300 }}
        size="small"
      />
    </ACard>
  )
}

export default RelationTable

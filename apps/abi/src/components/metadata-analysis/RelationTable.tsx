/* eslint-disable react/prop-types */
import { SearchOutlined, UnorderedListOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'

import { RELATION_TYPE_LABELS, STATUS_LABELS } from '@/components/metadata-analysis/constants'
import type { LineageNode, LineageRelation } from '@/components/metadata-analysis/types'

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
      const source = `${item.source_node_name || ''}`.toLowerCase()
      const target = `${item.target_node_name || ''}`.toLowerCase()
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
          className="ma-link-btn"
          onClick={() => onNodeClick?.({ id: row.source_node_id, label: row.source_node_name, type: row.source_node_type })}
        >
          <ATooltip title={row.source_node_name || '-'}>
            <span className="ma-cell-ellipsis">
              {row.source_node_name || '-'}
            </span>
          </ATooltip>
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
          className="ma-link-btn"
          onClick={() => onNodeClick?.({ id: row.target_node_id, label: row.target_node_name, type: row.target_node_type })}
        >
          <ATooltip title={row.target_node_name || '-'}>
            <span className="ma-cell-ellipsis">
              {row.target_node_name || '-'}
            </span>
          </ATooltip>
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
      minWidth: 80,
      render: (value: '0' | '1') => <ATag color={value === '0' ? 'green' : 'default'}>{STATUS_LABELS[value]}</ATag>,
      title: '状态'
    },
    {
      dataIndex: 'update_time',
      minWidth: 150,
      title: '更新时间'
    },
    {
      dataIndex: 'remark',
      minWidth: 160,
      title: '备注'
    }
  ]

  return (
    <div className="ma-panel">
      <div className="ma-panel-header">
        <UnorderedListOutlined />
        <span>{title}</span>
        <span className="ma-panel-count">{filteredData.length} 条</span>
        <div style={{ marginLeft: 'auto' }}>
          <AInput
            allowClear
            placeholder="搜索节点名称"
            prefix={<SearchOutlined style={{ color: '#a3b3c8', fontSize: 13 }} />}
            style={{ width: 220 }}
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            size="small"
          />
        </div>
      </div>
      <div
        style={{
          border: '1px solid rgba(130,140,200,0.18)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '500px' }}>
          <ATable<LineageRelation>
            columns={columns}
            dataSource={filteredData}
            pagination={{ pageSize: 5, showSizeChanger: false }}
            rowKey="lineage_id"
            scroll={{ x: 1200 }}
            size="middle"
            className="abi-std-table"
          />
        </div>
      </div>
    </div>
  )
}

export default RelationTable

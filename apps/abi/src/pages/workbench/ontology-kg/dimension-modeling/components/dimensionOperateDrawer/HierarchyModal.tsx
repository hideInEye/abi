import { Modal, Table, Tag } from 'antd'
import React from 'react'

import type { DimensionHierarchyNode, DimensionModelItem } from '../../types'

interface Props {
  readonly onCancel: () => void
  readonly onSave: (nodes: DimensionHierarchyNode[]) => void
  readonly open: boolean
  readonly record?: DimensionModelItem | null
}

export const HierarchyModal: React.FC<Props> = ({ onCancel, onSave, open, record }) => {
  const [nodes, setNodes] = useState<DimensionHierarchyNode[]>([])

  useEffect(() => {
    if (!open) {
      return
    }
    setNodes([])
  }, [open, record?.dimType])

  const columns = useMemo(
    () => [
      {
        dataIndex: 'fieldName',
        key: 'fieldName',
        title: '层级名称'
      },
      {
        dataIndex: 'fieldKey',
        key: 'fieldKey',
        render: (value: string) => <Tag color="blue">{value}</Tag>,
        title: '关联字段'
      },
      {
        dataIndex: 'level',
        key: 'level',
        title: '层级等级',
        width: 120
      }
    ],
    []
  )

  return (
    <Modal
      destroyOnClose
      open={open}
      title={record?.dimType === 'time' ? '时间层级关系配置' : '层级关系配置'}
      width={980}
      onCancel={onCancel}
      onOk={() => onSave(nodes)}
    >
      <AAlert
        showIcon
        className="mb-4"
        message={record?.dimType === 'time' ? '时间维支持年/季/月/周/日等层级组合' : '可按业务层级维护上下级关系'}
        type="info"
      />
      <Table
        columns={columns as any}
        dataSource={nodes}
        pagination={false}
        rowKey={item => `${item.fieldKey}-${item.level}`}
        size="small"
      />
    </Modal>
  )
}

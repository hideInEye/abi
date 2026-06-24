import { DeleteOutlined, SettingOutlined } from '@ant-design/icons'
import { Button, Popconfirm, Table, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useCallback, useMemo } from 'react'

import type { OntologyEntity, OntologyLabel, OntologyNetworkId } from '@/pages/workbench/ontology-kg/shared-network-types'
import { formatBoolean, formatDateTime, formatDisplayValue } from '@/pages/workbench/ontology-kg/utils/table-display'

import type { EntityPagination } from '../types'

interface EntityTableProps {
  readonly data: OntologyEntity[]
  readonly deletingId?: OntologyNetworkId
  readonly labels: OntologyLabel[]
  readonly loading: boolean
  readonly onAttributes: (entity: OntologyEntity) => void
  readonly onDelete: (id: OntologyNetworkId) => void
  readonly onEdit: (entity: OntologyEntity) => void
  readonly onPageChange: (page: number, pageSize: number) => void
  readonly pagination: EntityPagination
}

export const EntityTable: React.FC<EntityTableProps> = ({ data, deletingId, labels, loading, onAttributes, onDelete, onEdit, onPageChange, pagination }) => {
  const labelMap = useMemo(() => new Map(labels.map((label) => [String(label.id), label.bizName])), [labels])

  const renderActions = useCallback(
    (record: OntologyEntity): React.ReactNode => {
      const deleting = String(deletingId) === String(record.id)
      return (
        <div className="flex items-center justify-center" style={{ gap: 4 }}>
          <Button className="abi-action-link" size="small" type="link" onClick={() => onEdit(record)}>
            编辑
          </Button>
          <Tooltip title="属性配置">
            <Button className="abi-action-link" icon={<SettingOutlined />} size="small" type="link" onClick={() => onAttributes(record)} />
          </Tooltip>
          <Popconfirm cancelText="取消" description="删除实体后不可恢复，确定要删除吗？" disabled={deleting} okText="确定" title="删除确认" onConfirm={() => onDelete(record.id)}>
            <Tooltip title="删除">
              <Button className="abi-action-link-danger" icon={<DeleteOutlined />} loading={deleting} size="small" type="link" />
            </Tooltip>
          </Popconfirm>
        </div>
      )
    },
    [deletingId, onAttributes, onDelete, onEdit],
  )

  const columns = useMemo<ColumnsType<OntologyEntity>>(
    () => [
      { align: 'center', dataIndex: 'entityName', ellipsis: true, key: 'entityName', render: formatDisplayValue, title: '实体名称', width: 160 },
      { align: 'center', dataIndex: 'entityCode', ellipsis: true, key: 'entityCode', render: formatDisplayValue, title: '实体编码', width: 160 },
      {
        align: 'center',
        key: 'labelId',
        title: '标签类型',
        width: 140,
        render: (_, record) => (record.labelId === null ? '-' : formatDisplayValue(labelMap.get(String(record.labelId)))),
      },
      {
        align: 'center',
        dataIndex: 'color',
        key: 'color',
        title: '颜色',
        width: 80,
        render: (color: string) =>
          color ? <span aria-label={`颜色 ${color}`} style={{ background: color, borderRadius: '50%', display: 'inline-block', height: 14, width: 14 }} /> : '-',
      },
      { align: 'center', dataIndex: 'attributeCount', key: 'attributeCount', title: '属性数量', width: 100 },
      { align: 'center', dataIndex: 'validFlag', key: 'validFlag', render: (value: string) => formatBoolean(value, '有效', '无效'), title: '有效状态', width: 100 },
      { align: 'center', dataIndex: 'createBy', ellipsis: true, key: 'createBy', title: '创建人', width: 120, render: formatDisplayValue },
      { align: 'center', dataIndex: 'createTime', ellipsis: true, key: 'createTime', render: formatDateTime, title: '创建时间', width: 180 },
      { align: 'center', fixed: 'right', key: 'actions', render: (_, record) => renderActions(record), title: '操作', width: 150 },
    ],
    [labelMap, renderActions],
  )

  return (
    <Table<OntologyEntity>
      className="abi-std-table"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={{
        current: pagination.pageNum,
        pageSize: pagination.pageSize,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`,
        total: pagination.total,
        onChange: onPageChange,
      }}
      rowKey="id"
      scroll={{ x: 1180 }}
    />
  )
}

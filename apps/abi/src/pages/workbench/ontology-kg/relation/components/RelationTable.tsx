import { Popconfirm, Table } from 'antd'
import type { TableColumnsType } from 'antd'
import React, { useMemo } from 'react'

import type { OntologyRelation } from '@/pages/workbench/ontology-kg/shared-network-types'
import { formatBoolean, formatDateTime, formatDisplayValue } from '@/pages/workbench/ontology-kg/utils/table-display'

import type { RelationPagination } from '../types'

interface RelationTableProps {
  readonly entityNameMap: Map<string, string>
  readonly loading: boolean
  readonly onDelete: (relation: OntologyRelation) => void
  readonly onEdit: (relation: OntologyRelation) => void
  readonly onPageChange: (page: number, pageSize: number) => void
  readonly pagination: RelationPagination
  readonly relations: OntologyRelation[]
}

export const RelationTable: React.FC<RelationTableProps> = ({ entityNameMap, loading, pagination, relations, onDelete, onEdit, onPageChange }) => {
  const columns = useMemo<TableColumnsType<OntologyRelation>>(
    () => [
      {
        align: 'center',
        dataIndex: 'startEntityId',
        fixed: 'left',
        key: 'startEntityId',
        render: (value) => formatDisplayValue(entityNameMap.get(String(value))),
        title: '开始节点',
        width: 180,
      },
      { align: 'center', dataIndex: 'relation', fixed: 'left', key: 'relation', render: formatDisplayValue, title: '关系名称', width: 180 },
      {
        align: 'center',
        dataIndex: 'endEntityId',
        fixed: 'left',
        key: 'endEntityId',
        render: (value) => formatDisplayValue(entityNameMap.get(String(value))),
        title: '结束节点',
        width: 180,
      },
      {
        align: 'center',
        dataIndex: 'inverseFlag',
        key: 'inverseFlag',
        render: (value) => formatBoolean(value),
        title: '是否可逆',
        width: 120,
      },
      { align: 'center', dataIndex: 'createBy', key: 'createBy', render: formatDisplayValue, title: '创建人', width: 140 },
      { align: 'center', dataIndex: 'createTime', key: 'createTime', render: formatDateTime, title: '创建时间', width: 180 },
      {
        align: 'center',
        fixed: 'right',
        key: 'action',
        render: (_, record) => (
          <div className="flex items-center justify-center gap-2">
            <AButton className="abi-action-link" size="small" type="link" onClick={() => onEdit(record)}>
              编辑
            </AButton>
            <Popconfirm cancelText="取消" description="删除后无法恢复，确定删除该关系吗？" okText="确定" title="删除关系" onConfirm={() => onDelete(record)}>
              <AButton className="abi-action-link-danger" size="small" type="link">
                删除
              </AButton>
            </Popconfirm>
          </div>
        ),
        title: '操作',
        width: 140,
      },
    ],
    [entityNameMap, onDelete, onEdit],
  )

  return (
    <Table<OntologyRelation>
      className="abi-std-table relation-table"
      columns={columns}
      dataSource={relations}
      loading={loading}
      pagination={{
        current: pagination.pageNum,
        onChange: onPageChange,
        pageSize: pagination.pageSize,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`,
        total: pagination.total,
      }}
      rowKey="id"
      scroll={{ x: 1080 }}
    />
  )
}

export default RelationTable

import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Popconfirm, Table } from 'antd'
import type { TableColumnsType } from 'antd'
import React, { useMemo } from 'react'

import { OntologyCardList } from '@/pages/workbench/ontology-kg/components/OntologyCardList'
import { OntologyTablePagination } from '@/pages/workbench/ontology-kg/components/OntologyTablePagination'
import type { OntologyViewMode } from '@/pages/workbench/ontology-kg/hooks/useOntologyViewControls'
import type { OntologyRelation } from '@/pages/workbench/ontology-kg/shared-network-types'
import { formatBoolean, formatDateTime, formatDisplayValue } from '@/pages/workbench/ontology-kg/utils/table-display'
import { shouldDisplayColumn } from '@/pages/workbench/ontology-kg/utils/view-controls'

import type { RelationPagination } from '../types'

interface RelationTableProps {
  readonly entityNameMap: Map<string, string>
  readonly loading: boolean
  readonly onDelete: (relation: OntologyRelation) => void
  readonly onEdit: (relation: OntologyRelation) => void
  readonly onPageChange: (page: number, pageSize: number) => void
  readonly pagination: RelationPagination
  readonly relations: OntologyRelation[]
  readonly viewMode: OntologyViewMode
  readonly visibleColumnKeys: ReadonlySet<string>
}

export const RelationTable: React.FC<RelationTableProps> = ({ entityNameMap, loading, pagination, relations, viewMode, visibleColumnKeys, onDelete, onEdit, onPageChange }) => {
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
          <div className="ds-action-group">
            <AButton className="abi-action-link" icon={<EditOutlined />} size="small" type="link" onClick={() => onEdit(record)}>
              编辑
            </AButton>
            <Popconfirm cancelText="取消" description="删除后无法恢复，确定删除该关系吗？" okText="确定" title="删除关系" onConfirm={() => onDelete(record)}>
              <AButton className="abi-action-link-danger" icon={<DeleteOutlined />} size="small" type="link">
                删除
              </AButton>
            </Popconfirm>
          </div>
        ),
        title: '操作',
        width: 168,
      },
    ],
    [entityNameMap, onDelete, onEdit],
  )
  const visibleColumns = useMemo(() => columns.filter(column => shouldDisplayColumn(column.key, visibleColumnKeys)), [columns, visibleColumnKeys])
  const tableColumns = useMemo(
    () =>
      relations.length
        ? visibleColumns
        : visibleColumns.map((column) => ({
            ...column,
            fixed: undefined,
            width: undefined,
          })),
    [relations.length, visibleColumns],
  )
  const tableWidth = useMemo(() => visibleColumns.reduce((sum, column) => sum + (Number(column.width) || 120), 0), [visibleColumns])
  const cardFields = useMemo(
    () =>
      [
        { key: 'createBy', label: '创建人', render: (record: OntologyRelation) => formatDisplayValue(record.createBy) },
        { key: 'createTime', label: '创建时间', render: (record: OntologyRelation) => formatDateTime(record.createTime) },
        { key: 'updateTime', label: '操作时间', render: (record: OntologyRelation) => formatDateTime(record.updateTime) },
      ],
    [],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {viewMode === 'card' ? (
        <OntologyCardList
          actions={record => (
            <div className="flex items-center gap-1">
              <AButton className="abi-action-link" icon={<EditOutlined />} size="small" type="link" onClick={() => onEdit(record)}>
                编辑
              </AButton>
              <Popconfirm cancelText="取消" description="删除后无法恢复，确定删除该关系吗？" okText="确定" title="删除关系" onConfirm={() => onDelete(record)}>
                <AButton className="abi-action-link-danger" icon={<DeleteOutlined />} size="small" type="link">
                  删除
                </AButton>
              </Popconfirm>
            </div>
          )}
          dataSource={relations}
          emptyText="暂无关系"
          fields={cardFields}
          loading={loading}
          rowKey={record => record.id}
          title={record => formatDisplayValue(record.relation)}
          titleExtra={record => <span className="abi-db-tag tag-default">{formatBoolean(record.inverseFlag)}</span>}
        />
      ) : (
        <div style={{ border: '1px solid rgba(130,140,200,0.18)', borderRadius: '12px', flex: 1, minHeight: 0, overflow: 'hidden', width: '100%' }}>
          <div className="assistant-table-scroll" style={{ maxHeight: '100%', overflow: 'auto' }}>
            <Table<OntologyRelation>
              className="abi-std-table relation-table"
              columns={tableColumns}
              dataSource={relations}
              loading={loading}
              pagination={false}
              rowKey="id"
              scroll={relations.length > 0 ? { x: tableWidth } : undefined}
              size="middle"
            />
          </div>
        </div>
      )}
      <OntologyTablePagination {...pagination} onChange={onPageChange} />
    </div>
  )
}

export default RelationTable

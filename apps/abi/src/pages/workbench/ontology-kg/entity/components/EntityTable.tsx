import { DeleteOutlined, DownOutlined, EditOutlined, SettingOutlined } from '@ant-design/icons'
import { Button, Dropdown, Popconfirm, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useCallback, useMemo } from 'react'

import { OntologyCardList } from '@/pages/workbench/ontology-kg/components/OntologyCardList'
import { OntologyTablePagination } from '@/pages/workbench/ontology-kg/components/OntologyTablePagination'
import type { OntologyViewMode } from '@/pages/workbench/ontology-kg/hooks/useOntologyViewControls'
import type { OntologyEntity, OntologyLabel, OntologyNetworkId } from '@/pages/workbench/ontology-kg/shared-network-types'
import { formatBoolean, formatDateTime, formatDisplayValue } from '@/pages/workbench/ontology-kg/utils/table-display'
import { shouldDisplayColumn } from '@/pages/workbench/ontology-kg/utils/view-controls'

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
  readonly onSelectedRowKeysChange: (keys: string[]) => void
  readonly pagination: EntityPagination
  readonly selectedRowKeys: string[]
  readonly viewMode: OntologyViewMode
  readonly visibleColumnKeys: ReadonlySet<string>
}

export const EntityTable: React.FC<EntityTableProps> = ({
  data,
  deletingId,
  labels,
  loading,
  onAttributes,
  onDelete,
  onEdit,
  onPageChange,
  onSelectedRowKeysChange,
  pagination,
  selectedRowKeys,
  viewMode,
  visibleColumnKeys,
}) => {
  const labelMap = useMemo(() => new Map(labels.map((label) => [String(label.id), label.bizName])), [labels])

  const renderTableActions = useCallback(
    (record: OntologyEntity): React.ReactNode => {
      const deleting = String(deletingId) === String(record.id)
      return (
        <div className="ds-action-group">
          <Button className="abi-action-link" icon={<EditOutlined />} size="small" type="link" onClick={() => onEdit(record)}>
            编辑
          </Button>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'attributes',
                  label: <span><SettingOutlined style={{ marginRight: 4 }} />属性配置</span>,
                  onClick: () => onAttributes(record)
                },
                { type: 'divider' },
                {
                  key: 'delete',
                  danger: true,
                  label: (
                    <Popconfirm cancelText="取消" description="删除实体后不可恢复，确定要删除吗？" disabled={deleting} okText="确定" title="删除确认" onConfirm={() => onDelete(record.id)}>
                      <span><DeleteOutlined style={{ marginRight: 4 }} />删除</span>
                    </Popconfirm>
                  )
                }
              ]
            }}
          >
            <Button className="abi-action-link" loading={deleting} size="small" type="link">
              更多 <DownOutlined style={{ fontSize: '0.625rem' }} />
            </Button>
          </Dropdown>
        </div>
      )
    },
    [deletingId, onAttributes, onDelete, onEdit],
  )
  const renderCardActions = useCallback(
    (record: OntologyEntity): React.ReactNode => {
      const deleting = String(deletingId) === String(record.id)
      return (
        <div className="flex items-center justify-center" style={{ gap: 4 }}>
          <Button className="abi-action-link" icon={<EditOutlined />} size="small" type="link" onClick={() => onEdit(record)}>
            编辑
          </Button>
          <Button className="abi-action-link" icon={<SettingOutlined />} size="small" type="link" onClick={() => onAttributes(record)}>
            属性配置
          </Button>
          <Popconfirm cancelText="取消" description="删除实体后不可恢复，确定要删除吗？" disabled={deleting} okText="确定" title="删除确认" onConfirm={() => onDelete(record.id)}>
            <Button className="abi-action-link-danger" icon={<DeleteOutlined />} loading={deleting} size="small" type="link">
              删除
            </Button>
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
      { align: 'center', fixed: 'right', key: 'actions', render: (_, record) => renderTableActions(record), title: '操作', width: 168 },
    ],
    [labelMap, renderTableActions],
  )
  const visibleColumns = useMemo(() => columns.filter(column => shouldDisplayColumn(column.key, visibleColumnKeys)), [columns, visibleColumnKeys])
  const tableColumns = useMemo(
    () =>
      data.length
        ? visibleColumns
        : visibleColumns.map((column) => ({
            ...column,
            fixed: undefined,
            width: undefined,
          })),
    [data.length, visibleColumns],
  )
  const tableWidth = useMemo(() => visibleColumns.reduce((sum, column) => sum + (Number(column.width) || 120), 0), [visibleColumns])
  const cardFields = useMemo(
    () =>
      [
        { key: 'createBy', label: '创建人', render: (record: OntologyEntity) => formatDisplayValue(record.createBy) },
        { key: 'createTime', label: '创建时间', render: (record: OntologyEntity) => formatDateTime(record.createTime) },
        { key: 'updateTime', label: '操作时间', render: (record: OntologyEntity) => formatDateTime(record.updateTime) },
      ],
    [],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {viewMode === 'card' ? (
        <OntologyCardList
          actions={renderCardActions}
          dataSource={data}
          emptyText="暂无实体"
          fields={cardFields}
          loading={loading}
          rowKey={record => record.id}
          title={record => formatDisplayValue(record.entityName)}
          titleExtra={record => (record.labelId === null ? null : formatDisplayValue(labelMap.get(String(record.labelId))))}
          titlePrefix={record =>
            record.color ? <span aria-label={`颜色 ${record.color}`} style={{ background: record.color, borderRadius: '50%', display: 'inline-block', height: 14, width: 14 }} /> : null
          }
        />
      ) : (
        <div style={{ border: '1px solid rgba(130,140,200,0.18)', borderRadius: '12px', flex: 1, minHeight: 0, overflow: 'hidden', width: '100%' }}>
          <div className="assistant-table-scroll" style={{ maxHeight: '100%', overflow: 'auto' }}>
            <Table<OntologyEntity>
              className="entity-table abi-std-table"
              locale={{ emptyText: <TableEmpty description="暂无实体" /> }}
              columns={tableColumns}
              dataSource={data}
              loading={loading}
              pagination={false}
              rowKey={record => String(record.id)}
              rowSelection={{
                columnWidth: 48,
                fixed: true,
                selectedRowKeys,
                onChange: keys => onSelectedRowKeysChange(keys.map(String)),
              }}
              scroll={data.length > 0 ? { x: tableWidth } : undefined}
              size="middle"
            />
          </div>
        </div>
      )}
      <OntologyTablePagination {...pagination} onChange={onPageChange} />
    </div>
  )
}

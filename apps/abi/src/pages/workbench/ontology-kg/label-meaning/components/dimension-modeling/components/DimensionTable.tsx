import { DeleteOutlined, DownOutlined, EditOutlined, PartitionOutlined } from '@ant-design/icons'
import { Dropdown, Popconfirm, Table, Tag } from 'antd'
import React, { useMemo } from 'react'

import { OntologyCardList } from '@/pages/workbench/ontology-kg/components/OntologyCardList'
import { OntologyTablePagination } from '@/pages/workbench/ontology-kg/components/OntologyTablePagination'
import type { OntologyViewMode } from '@/pages/workbench/ontology-kg/hooks/useOntologyViewControls'
import { formatDateTime, formatDisplayValue } from '@/pages/workbench/ontology-kg/utils/table-display'
import { shouldDisplayColumn } from '@/pages/workbench/ontology-kg/utils/view-controls'

import { DIMENSION_STATUS_TEXT_MAP, DIMENSION_TYPE_TEXT_MAP } from '../constants/dimensionModeling.constants'
import type { DimensionModelItem, DimensionPagination } from '../types/dimensionModeling.types'

interface Props {
  readonly dataSource: DimensionModelItem[]
  readonly loading?: boolean
  readonly onDelete: (record: DimensionModelItem) => void
  readonly onEdit: (record: DimensionModelItem) => void
  readonly onHierarchy: (record: DimensionModelItem) => void
  readonly onPaginationChange: (page: number, pageSize: number) => void
  readonly onSelectedRowKeysChange: (keys: string[]) => void
  readonly pagination: DimensionPagination
  readonly selectedRowKeys: string[]
  readonly viewMode: OntologyViewMode
  readonly visibleColumnKeys: ReadonlySet<string>
}

const statusColorMap: Record<string, string> = {
  '0': 'default',
  '1': 'success'
}

export const DimensionTable: React.FC<Props> = ({
  dataSource,
  loading,
  onDelete,
  onEdit,
  onHierarchy,
  onPaginationChange,
  onSelectedRowKeysChange,
  pagination,
  selectedRowKeys,
  viewMode,
  visibleColumnKeys
}) => {
  const renderStatus = (value: string | number) => {
    const key = String(value ?? '0')
    return <Tag color={statusColorMap[key] || 'default'}>{DIMENSION_STATUS_TEXT_MAP[key] || '禁用'}</Tag>
  }

  const columns = useMemo(
    () => [
      {
        align: 'center',
        dataIndex: 'zhName',
        ellipsis: true,
        key: 'zhName',
        title: '中文名',
        width: 180
      },
      {
        align: 'center',
        dataIndex: 'englishName',
        ellipsis: true,
        key: 'englishName',
        title: '英文名',
        width: 180
      },
      {
        align: 'center',
        dataIndex: 'dimType',
        key: 'dimType',
        render: (value: string) => DIMENSION_TYPE_TEXT_MAP[value] || formatDisplayValue(value),
        title: '维度类型',
        width: 120
      },
      // {
      //   align: 'center',
      //   dataIndex: 'levelPath',
      //   ellipsis: true,
      //   key: 'levelPath',
      //   render: formatDisplayValue,
      //   title: '维度路径(目录)',
      //   width: 300
      // },
      {
        align: 'center',
        dataIndex: 'owner',
        ellipsis: true,
        key: 'owner',
        title: '负责人',
        width: 130
      },
      {
        align: 'center',
        dataIndex: 'status',
        key: 'status',
        render: renderStatus,
        title: '状态',
        width: 100
      },
      {
        align: 'center',
        dataIndex: 'updateTime',
        key: 'updateTime',
        render: formatDateTime,
        title: '更新时间',
        width: 180
      },
      {
        align: 'center',
        fixed: 'right',
        key: 'action',
        render: (_: unknown, record: DimensionModelItem) => (
          <div className="ds-action-group">
            <AButton className="abi-action-link" icon={<EditOutlined />} size="small" variant="link" onClick={() => onEdit(record)}>
              编辑
            </AButton>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'hierarchy',
                    label: <span><PartitionOutlined style={{ marginRight: 4 }} />层级配置</span>,
                    onClick: () => onHierarchy(record)
                  },
                  { type: 'divider' },
                  {
                    key: 'delete',
                    danger: true,
                    label: (
                      <Popconfirm cancelText="取消" description="确定删除该维度吗？" okText="确定" title="提示" onConfirm={() => onDelete(record)}>
                        <span><DeleteOutlined style={{ marginRight: 4 }} />删除</span>
                      </Popconfirm>
                    )
                  }
                ]
              }}
            >
              <AButton className="abi-action-link" size="small" variant="link">
                更多 <DownOutlined style={{ fontSize: '0.625rem' }} />
              </AButton>
            </Dropdown>
          </div>
        ),
        title: '操作',
        width: 168
      }
    ],
    [onDelete, onEdit, onHierarchy]
  )

  const visibleColumns = useMemo(() => columns.filter((column: any) => shouldDisplayColumn(column.key, visibleColumnKeys)), [columns, visibleColumnKeys])
  const tableWidth = useMemo(() => visibleColumns.reduce((sum, item: any) => sum + (item.width || 120), 0), [visibleColumns])
  const tableColumns = useMemo(
    () =>
      dataSource.length
        ? visibleColumns
        : visibleColumns.map((item: any) => ({
            ...item,
            fixed: undefined,
            width: undefined
          })),
    [dataSource.length, visibleColumns]
  )
  const cardFields = useMemo(
    () =>
      [
        { key: 'createBy', label: '创建人', render: (record: DimensionModelItem) => formatDisplayValue(record.createBy) },
        { key: 'createTime', label: '创建时间', render: (record: DimensionModelItem) => formatDateTime(record.createTime) },
        { key: 'updateTime', label: '操作时间', render: (record: DimensionModelItem) => formatDateTime(record.updateTime) },
      ],
    [],
  )

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {viewMode === 'card' ? (
        <OntologyCardList
          actions={record => (
            <div className="flex items-center gap-1">
              <AButton className="abi-action-link" icon={<EditOutlined />} size="small" variant="link" onClick={() => onEdit(record)}>
                编辑
              </AButton>
              <AButton className="abi-action-link" icon={<PartitionOutlined />} size="small" variant="link" onClick={() => onHierarchy(record)}>
                层级配置
              </AButton>
              <Popconfirm cancelText="取消" description="确定删除该维度吗？" okText="确定" title="提示" onConfirm={() => onDelete(record)}>
                <AButton className="abi-action-link-danger" icon={<DeleteOutlined />} size="small" variant="link">
                  删除
                </AButton>
              </Popconfirm>
            </div>
          )}
          dataSource={dataSource}
          emptyText="暂无维度"
          fields={cardFields}
          loading={loading}
          rowKey={record => String(record.id)}
          title={record => formatDisplayValue(record.zhName)}
          titleExtra={record => DIMENSION_STATUS_TEXT_MAP[String(record.status ?? '0')] || '禁用'}
        />
      ) : (
        <div style={{ border: '1px solid rgba(130,140,200,0.18)', borderRadius: '12px', overflow: 'hidden', flex: 1, minHeight: 0, width: '100%' }}>
          <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
            <Table
              className="abi-std-table"
              locale={{ emptyText: <TableEmpty description="暂无维度" /> }}
              columns={tableColumns as any}
              dataSource={dataSource}
              loading={loading}
              rowKey={record => String(record.id)}
              rowSelection={{
                columnWidth: 48,
                fixed: true,
                selectedRowKeys,
                onChange: keys => onSelectedRowKeysChange(keys.map(String))
              }}
              scroll={dataSource.length > 0 ? { x: tableWidth } : undefined}
              size="middle"
              pagination={false}
            />
          </div>
        </div>
      )}
      <OntologyTablePagination {...pagination} onChange={onPaginationChange} />
    </div>
  )
}

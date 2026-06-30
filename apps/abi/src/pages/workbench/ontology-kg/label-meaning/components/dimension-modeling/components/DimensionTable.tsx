import { Popconfirm, Table, Tag } from 'antd'
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
  readonly pagination: DimensionPagination
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
  pagination,
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
      {
        align: 'center',
        dataIndex: 'path',
        ellipsis: true,
        key: 'path',
        title: '维度路径(目录)',
        width: 300
      },
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
          <div className="flex items-center justify-center" style={{ gap: 2 }}>
            <AButton className="abi-action-link" size="small" variant="link" onClick={() => onEdit(record)}>
              编辑
            </AButton>
            <AButton className="abi-action-link" size="small" variant="link" onClick={() => onHierarchy(record)}>
              层级配置
            </AButton>
            <Popconfirm
              cancelText="取消"
              description="确定删除该维度吗？"
              okText="确定"
              title="提示"
              onConfirm={() => onDelete(record)}
            >
              <AButton className="abi-action-link-danger" size="small" variant="link">删除</AButton>
            </Popconfirm>
          </div>
        ),
        title: '操作',
        width: 180
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
        { key: 'englishName', label: '英文名', render: (record: DimensionModelItem) => formatDisplayValue(record.englishName) },
        { key: 'dimType', label: '维度类型', render: (record: DimensionModelItem) => DIMENSION_TYPE_TEXT_MAP[record.dimType] || formatDisplayValue(record.dimType) },
        { key: 'path', label: '维度路径(目录)', render: (record: DimensionModelItem) => formatDisplayValue(record.path) },
        { key: 'owner', label: '负责人', render: (record: DimensionModelItem) => formatDisplayValue(record.owner) },
        { key: 'status', label: '状态', render: (record: DimensionModelItem) => renderStatus(record.status) },
        { key: 'updateTime', label: '更新时间', render: (record: DimensionModelItem) => formatDateTime(record.updateTime) },
      ].filter(field => visibleColumnKeys.has(field.key)),
    [visibleColumnKeys],
  )

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {viewMode === 'card' ? (
        <OntologyCardList
          actions={record => (
            <div className="flex items-center gap-1">
              <AButton className="abi-action-link" size="small" variant="link" onClick={() => onEdit(record)}>
                编辑
              </AButton>
              <AButton className="abi-action-link" size="small" variant="link" onClick={() => onHierarchy(record)}>
                层级配置
              </AButton>
              <Popconfirm cancelText="取消" description="确定删除该维度吗？" okText="确定" title="提示" onConfirm={() => onDelete(record)}>
                <AButton className="abi-action-link-danger" size="small" variant="link">
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
          titleExtra={record => renderStatus(record.status)}
        />
      ) : (
        <div style={{ border: '1px solid rgba(130,140,200,0.18)', borderRadius: '12px', overflow: 'hidden', flex: 1, minHeight: 0, width: '100%' }}>
          <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
            <Table
              className="assistant-table-scroll abi-std-table"
              columns={tableColumns as any}
              dataSource={dataSource}
              loading={loading}
              rowKey={record => String(record.id)}
              scroll={dataSource.length > 0 ? { x: tableWidth } : undefined}
              size="middle"
              pagination={false}
            />
          </div>
        </div>
      )}
      <OntologyTablePagination current={pagination.current} pageSize={pagination.pageSize} total={pagination.total} onChange={onPaginationChange} />
    </div>
  )
}
